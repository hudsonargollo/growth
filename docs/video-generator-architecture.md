# Agentic Video Generator — Technical Architecture

**Status:** Design (no code yet)
**Scope:** Maps the "Agentic Video Content Generator" PRD onto the actual `growth` repo.
**Author:** Core maintainer (Claude)
**Date:** 2026-05-30

---

## 1. Where this lands in the existing repo

The PRD speaks in generic terms ("the growth repository", "the backend"). Concretely, this feature belongs in **`apps/content-engine/worker`** — the Cloudflare Worker that already owns scripts, ElevenLabs voiceover, and delivery. It is a Hono app on `nodejs_compat`, deployed to `fabricadeconteudo.clubemkt.digital`, with two storage layers already in use:

- **KV (`KV1`)** — config, project index, session maps, encrypted API keys (`apikey:<ENV>`).
- **Supabase** (`getDb(env)`) — relational tables (`voiceovers`, scripts, etc.).

Secrets resolve through the existing `resolveKey(env, 'ELEVENLABS_API_KEY')` pattern: Wrangler secret first, encrypted-KV fallback. **Higgsfield credentials must use this exact path** — do not introduce a second secret mechanism.

### The one hard architectural constraint

A Cloudflare Worker **cannot run FFmpeg, Chromium/Puppeteer, or Remotion SSR.** No native binaries, 128 MB memory, sub-second-to-minutes CPU limits. Therefore the system is necessarily **two-tier**:

| Tier | Runs on | Responsibility |
|---|---|---|
| **Orchestrator** | `content-engine/worker` (Cloudflare) | Agent logic, Higgsfield job dispatch, webhook intake, ElevenLabs timestamps, building the Remotion JSON, cost gating, state in KV/Supabase. Fast, stateless, edge. |
| **Renderer** | **Remotion on Google Cloud Run (Docker)** | Receives the finished JSON blueprint, runs headless Chrome + FFmpeg, stitches assets, burns captions, uploads final `.mp4`. Long-running, heavy. |

The Worker never touches pixels. It produces a deterministic JSON document and hands it to Cloud Run. This cleanly matches the PRD's "decouple creative generation from temporal compositing" thesis — and it's also the only edge-compatible way to do it.

---

## 2. Component topology

```
                         ┌─────────────────────────────────────────────┐
   User (chat / UI) ────▶│  content-engine Worker  (Hono, Cloudflare)   │
                         │                                              │
                         │  /api/video/*  routes                        │
                         │   ├─ videoOrchestratorService  (the "Director")
                         │   ├─ higgsfieldService   (SDK + REST)         │
                         │   ├─ voiceoverService    (ELEVENLABS, exists) │
                         │   ├─ remotionComposer    (builds JSON)        │
                         │   └─ creditLedger        (cost gate)          │
                         └───┬───────────────┬──────────────┬───────────┘
                             │               │              │
              POST /v1/generate         timestamps      render job (JSON)
                             │               │              │
                  ┌──────────▼──┐    ┌───────▼──────┐  ┌────▼────────────────┐
                  │ Higgsfield  │    │  ElevenLabs  │  │  Cloud Run (Docker) │
                  │  AI backend │    │  /with-      │  │  Remotion SSR +     │
                  │  (R2 CDN)   │    │  timestamps  │  │  Chrome + FFmpeg    │
                  └──────┬──────┘    └──────────────┘  └────────┬────────────┘
                         │ webhook (COMPLETED)                  │ final.mp4
                         ▼                                      ▼
                  Worker  /api/video/webhooks/higgsfield   R2 bucket  VIDEO_ASSETS
```

Two async boundaries, both handled by **webhooks, not polling**, to respect Worker CPU limits:

1. **Higgsfield → Worker:** `X-Webhook-URL` header points at `/api/video/webhooks/higgsfield`. On `COMPLETED`, the Worker stores the asset URL and advances project state.
2. **Cloud Run → Worker:** the renderer POSTs back to `/api/video/webhooks/render` with the final `.mp4` location and status.

Polling (`/v2/requests/status/{id}`) is kept only as a reconciliation fallback driven by the existing cron trigger, not as the primary path.

---

## 3. New files (proposed)

Mirroring the existing `routes/` + `services/` split:

```
worker/src/
  routes/
    video.js                 # /api/video/* — thin Hono handlers
  services/
    videoOrchestratorService.js   # the Director: state machine over a "video project"
    higgsfieldService.js          # generate(), getStatus(), createCharacter(), model router
    remotionComposer.js           # ElevenLabs timestamps + assets → Remotion JSON blueprint
    creditLedgerService.js        # balance check + reservation before any paid call
  lib/
    mcsla.js                      # MCSLA prompt builder (Model/Composition/Subject/Lighting/Aesthetic)
```

```
apps/content-engine/renderer/    # NEW — separate deployable, NOT a Worker
  Dockerfile
  package.json                    # @remotion/renderer, @remotion/captions, @remotion/transitions
  src/
    server.js                     # HTTP endpoint: POST /render { blueprint } -> renders -> webhook
    Root.jsx                      # registers <Composition>s (ShortForm 9:16, LongForm 16:9)
    compositions/
      ShortForm.jsx
      LongForm.jsx
    components/                    # Caption, KenBurns, Transition wrappers
```

The renderer is its own repo subtree with its own `package.json` because its deps (Chromium, Remotion) must never enter the Worker bundle.

---

## 4. Storage: add an R2 bucket

The PRD repeatedly references "R2 CDN URLs" but **no R2 bucket exists in `worker/wrangler.toml` today.** This is a required new piece of infra:

```toml
# add to apps/content-engine/worker/wrangler.toml
[[r2_buckets]]
binding      = "VIDEO_ASSETS"
bucket_name  = "growth-video-assets"
```

Role split:
- **Higgsfield** returns its own CDN URLs for generated clips/images. The Worker may either reference them directly or copy them into `VIDEO_ASSETS` for permanence (recommended — Higgsfield CDN URLs can expire).
- **ElevenLabs audio** → store in R2 (current voiceover audio handling should be confirmed; if it's inline base64 in Supabase, large video-length audio should move to R2).
- **Final `.mp4`** from Cloud Run → R2, served via a public bucket binding or a signed-URL Worker route.

Video project metadata (status, asset manifest, blueprint JSON) lives in **Supabase** as a new `video_projects` table, not KV — it's relational and grows past KV's value-size comfort zone.

---

## 5. Data schemas

### 5.1 `video_projects` (Supabase)

```sql
create table video_projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  script_id       uuid references scripts(id),
  format          text not null check (format in ('short','long')), -- 9:16 | 16:9
  status          text not null default 'draft',
    -- draft → scripting → voiced → generating_assets → composing → rendering → done | failed
  character_id    text,            -- Higgsfield Soul V2 id (long-form)
  blueprint       jsonb,           -- the Remotion JSON (section 5.4)
  asset_manifest  jsonb,           -- [{ sceneIndex, higgsfield_request_id, media_url, media_type, status }]
  credits_spent   int default 0,
  final_url       text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### 5.2 Higgsfield job (what the orchestrator tracks)

Request → `{ request_id }`. Webhook payload → `output.media_url[]`, `output.media_type`, `created_at`, `completed_at`, `status`. Stored per-scene in `asset_manifest`.

### 5.3 ElevenLabs alignment (drives all timing)

Use `text-to-speech/with-timestamps`. Returns `audio_base64` + `alignment` (and `normalized_alignment`) arrays of `{ text, start, end, type }` in **seconds**. The composer converts seconds → frames: `frame = round(seconds * fps)`.

### 5.4 Remotion blueprint (Worker → Cloud Run) — the contract

This JSON is the **single source of truth** and must be fully deterministic (any ambiguity crashes the render):

```jsonc
{
  "compositionId": "ShortForm",         // maps to a registered <Composition>
  "fps": 30,
  "dimensions": { "width": 1080, "height": 1920 },
  "durationInFrames": 1830,              // = ceil(lastTimestamp.end * fps)
  "tracks": {
    "video": [
      { "assetUrl": "https://.../scene1.mp4", "startFrame": 0, "endFrame": 450,
        "fit": "cover", "transition": { "type": "fade", "durationInFrames": 8 },
        "effects": ["kenBurns"] }
    ],
    "audio": [
      { "assetUrl": "https://.../vo.mp3", "startFrame": 0, "gainDb": 0 },
      { "assetUrl": "https://.../music.mp3", "startFrame": 0, "gainDb": -18, "duck": true }
    ],
    "text": [
      { "text": "creating", "startFrame": 187, "endFrame": 204,
        "style": { "font": "Bebas Neue", "shadow": true }, "safeZone": "short" }
    ]
  }
}
```

The Worker computes every `startFrame`/`endFrame`; the renderer does zero timing logic — it just maps numbers to React components. JSON-schema validation lives in `remotionComposer.js` so the agent self-corrects bad payloads before they ever reach Cloud Run.

---

## 6. The orchestrator as a state machine

The PRD's "Director" is best implemented not as a free-running agent loop but as an explicit state machine the agent advances one step per request. This keeps cost bounded and makes failures recoverable. `status` transitions:

```
draft → scripting → voiced → generating_assets → composing → rendering → done
                                      │
                                   (failure at any node → failed, with structured reason)
```

Each transition is an idempotent function in `videoOrchestratorService.js` keyed on `video_projects.id`. Webhooks (Higgsfield, render) are what advance `generating_assets → composing` and `rendering → done`. This matters because Worker invocations are short-lived: state must survive between the dispatch and the callback, which is exactly why it's in Supabase, not in-memory.

---

## 7. Model routing (Higgsfield)

`higgsfieldService.js` exposes a `routeModel(intent)` map so the agent never hardcodes model names. Costs below are **from the PRD and must be verified against live Higgsfield pricing before billing logic ships** (see §10 risks):

| Intent | Model | ~Credits | Use |
|---|---|---|---|
| Fast storyboard / ideation image | Nano Banana Pro | 2 | default for cheap iteration |
| Stylized / infographic image | Flux 2 | 6 | data-viz, educational |
| Photoreal product image | GPT Image 2 | 8 | e-commerce plates |
| Consistent character image | Soul V2 | 10 | + `create_character`, long-form |
| Kinetic short video | Seedance 2.0 | 30 | TikTok/Reels, native A/V sync |
| High-motion video | Kling 3.0 | 50 | heavy subject movement |
| Cinematic 4K video | Veo 3.1 | 60 | establishing shots, long-form |

Prompts are built by `lib/mcsla.js` enforcing **M**odel · **C**omposition · **S**ubject · **L**ighting · **A**esthetic, so users send plain language and the agent emits a structured prompt. Auth uses the SDK's single-`credentials` field, resolved via `resolveKey(env, 'HIGGSFIELD_API_KEY')`.

---

## 8. Two pipelines

**Short-form (9:16)** — `script → ElevenLabs w/ timestamps → parallel Seedance/Kling 9:16 clips → webhook collect → composer maps clips + word-level captions (safe-zone aware) → Cloud Run render → R2`.

**Long-form (16:9)** — `script → create_character (Soul V2, returns Character ID) → per-scene GPT Image 2 base frames → user confirm → Veo/Kling image-to-video locked to Character ID → composer adds L/J-cuts, crossfades, music ducking → Cloud Run renders in chunks → combineChunks() → 4K → R2`. Long-form is where Cloud Run's no-timeout advantage is load-bearing.

---

## 9. Cost control — non-negotiable, build it first

An autonomous agent with `generate_video` access can burn an enterprise balance in a runaway loop. The PRD is explicit: **do not auto-approve heavy generation.** Implementation:

`creditLedgerService.js` sits **in front of every paid Higgsfield call.** Before dispatch it: (1) estimates credits from the model map × scene count, (2) checks the user's Supabase balance/tier, (3) reserves credits, (4) authorizes or returns a structured rejection to the agent. A per-project hard ceiling and a per-user daily cap prevent loops. Heavy ops (video, 4K) require an explicit approval gate surfaced to the user; cheap ops (Nano Banana stills) can pass freely. Real-time consumption is exposed in the UI. **This service must exist before Veo/Kling are ever enabled**, even though it's "phase 4" polish in the PRD — enabling expensive models without it is the single biggest financial risk in the design.

---

## 10. Risks & gaps in the PRD (engineering review)

1. **Pricing/credit numbers are unverified.** Every credit figure (Veo 60, Seedance 30, "16 credits per dollar") comes from the PRD narrative. Billing logic must read live pricing from Higgsfield, not these constants. Treat the table as illustrative.
2. **Higgsfield model/endpoint names need confirmation.** `flux-pro/kontext/max`, `/v1/generate`, `/v2/requests/status`, `mcp.higgsfield.ai/mcp`, `@higgsfield/client/v2` — validate against current Higgsfield docs before coding the client; vendor APIs drift.
3. **R2 bucket doesn't exist yet** — must be provisioned (§4).
4. **Cloud Run ↔ Worker auth** — the render webhook must be signed (HMAC shared secret) so arbitrary callers can't mark projects done or trigger renders.
5. **Higgsfield CDN URL expiry** — copy assets into R2 rather than trusting external CDN URLs to persist through a multi-minute render.
6. **Virality Predictor / TwelveLabs feedback loop** is genuinely phase-4; it adds another paid round-trip and re-render, so its cost must flow through the same ledger.
7. **Worker CPU budget** — building large blueprints and copying assets must stay within limits; asset copying should be offloaded to Cloud Run or done via R2-to-R2, not buffered through the Worker.

---

## 11. Phased plan (adjusted from the PRD)

- **Phase 0 (added):** Provision R2 (`VIDEO_ASSETS`), add `HIGGSFIELD_API_KEY` via `resolveKey`, create `video_projects` table, stand up an empty Cloud Run Remotion service with one hello-world composition. Verify Higgsfield API contract with a throwaway script.
- **Phase 1:** `higgsfieldService` (generate + webhook intake), `mcsla.js`, `creditLedgerService` (gate from day one). No rendering yet — prove asset generation + cost gating.
- **Phase 2 (MVP):** Short-form 9:16. ElevenLabs `with-timestamps` parser, `remotionComposer`, `@remotion/captions` burn-in, Cloud Run render → R2. Lock to cheap models (Nano Banana, Seedance) during beta.
- **Phase 3:** Long-form 16:9. Soul V2 `create_character`, image-to-video, L/J-cuts, music ducking, chunked render + `combineChunks()`. Conversational edit loop (mutate `blueprint` JSON, re-render).
- **Phase 4:** Virality Predictor / TwelveLabs closed-loop optimization, n8n auto-publish, polished credit dashboard.

### Local testing
Worker: `cd apps/content-engine/worker && npx wrangler dev` (Higgsfield/render webhooks need a tunnel, e.g. `cloudflared tunnel`, to receive callbacks locally). Renderer: `cd apps/content-engine/renderer && npm run dev` then `npx remotion studio` to preview compositions against a sample blueprint before wiring Cloud Run.

---

## 12. Summary

Build it as **orchestrator (Worker) + renderer (Cloud Run)**, joined by a deterministic Remotion JSON blueprint and two webhook callbacks. Reuse what already exists — Hono routing, `resolveKey`, Supabase, the ElevenLabs integration. Add three things the PRD assumes but the repo lacks: an **R2 bucket**, a **`video_projects` state table**, and a **credit ledger that gates every paid call from day one**. Verify all Higgsfield names and prices against live docs before writing the client.
