# Video Generator — Runbook

Operational guide for the agentic video generator built across the Worker
(`apps/content-engine/worker`) and the Cloud Run renderer
(`apps/content-engine/renderer`). For the design rationale see
[`video-generator-architecture.md`](./video-generator-architecture.md).

---

## 1. Component map

| Piece | Location | Runtime |
|---|---|---|
| Orchestrator + API | `worker/src/routes/video.js`, `worker/src/services/videoOrchestratorService.js` | Cloudflare Worker (edge) |
| Higgsfield client | `worker/src/services/higgsfieldService.js` | Worker |
| MCSLA prompt builder | `worker/src/lib/mcsla.js` | Worker |
| ElevenLabs alignment | `worker/src/services/voiceoverService.js` (`generateAlignedVoiceover`, `charsToWords`) | Worker |
| Blueprint composer | `worker/src/services/remotionComposer.js` | Worker |
| Credit ledger | `worker/src/services/creditLedgerService.js` | Worker |
| HMAC helpers | `worker/src/lib/hmac.js` | Worker |
| Remotion renderer | `renderer/` (Dockerfile, `src/server.js`, compositions) | Google Cloud Run |

---

## 2. State machine

```
draft ──/voice──▶ voiced ──/generate-assets──▶ generating_assets
                                                     │ (higgsfield webhook, all scenes complete)
                                                     ▼
                                                composing ──/render──▶ rendering
                                                                          │ (render webhook)
                                                                          ▼
                                                                        done
   any step ──▶ failed (statusReason set; active credit reservation released)
```

State lives in `video_projects` (Supabase) because Worker invocations end long
before the Higgsfield/render webhooks call back. Every transition is idempotent
on the project id.

---

## 3. API surface (`/api/video`)

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/` | list projects (`?userId=`) |
| `POST` | `/` | create `{ scriptId, format: 'short'\|'long', userId? }` |
| `GET`  | `/:id` | get one project |
| `POST` | `/:id/voice` | ElevenLabs aligned VO `{ voiceId?, stability?, similarityBoost? }` → `voiced` |
| `POST` | `/:id/generate-assets` | dispatch Higgsfield `{ scenes:[{ mcsla, intent?, imageUrl?, characterId? }], webhookBase? }` → `generating_assets` (402 if credits short) |
| `GET`  | `/:id/blueprint` | preview composed Remotion JSON (`?fps=`) without rendering |
| `POST` | `/:id/render` | compose + dispatch to Cloud Run `{ fps?, musicUrl?, webhookBase? }` → `rendering` |
| `GET`  | `/account/:userId` | credit balance |
| `POST` | `/account/:userId/grant` | top-up `{ amount, note? }` (**needs auth before public use**) |
| `POST` | `/webhooks/higgsfield?project=:id` | Higgsfield completion (HMAC / `?token=`) |
| `POST` | `/webhooks/render?project=:id` | Cloud Run render completion (HMAC) |

Webhooks are public but verified via `X-Signature: sha256=<hmac>` over the raw
body. CRUD routes follow the codebase's existing open-route pattern.

---

## 4. One-time setup

### 4.1 R2 bucket
```bash
npx wrangler r2 bucket create growth-video-assets
```
Already declared in `worker/wrangler.toml` as binding `VIDEO_ASSETS`.

### 4.2 Database migrations (apply in order)
```
supabase/migrations/20260530_video_projects.sql
supabase/migrations/20260531_credit_ledger.sql
```
(Run after the existing `20260526_*` migrations.)

### 4.3 Worker secrets (`wrangler secret put <NAME>`)
| Secret | Used by |
|---|---|
| `HIGGSFIELD_API_KEY` | Higgsfield generation |
| `HIGGSFIELD_WEBHOOK_SECRET` | verify Higgsfield callbacks |
| `RENDER_WEBHOOK_SECRET` | sign render dispatch / verify render callback (**must match the renderer**) |
| `RENDER_SERVICE_URL` | Cloud Run renderer base URL |
| `ELEVENLABS_API_KEY` | already configured (voiceover) |

All resolve through the existing `resolveKey()` (Wrangler secret → encrypted KV).

### 4.4 Deploy the renderer
```bash
cd apps/content-engine/renderer
gcloud run deploy content-engine-renderer \
  --source . --region southamerica-east1 \
  --memory 4Gi --cpu 4 --timeout 3600 \
  --set-env-vars RENDER_WEBHOOK_SECRET=<same-as-worker>,\
R2_ACCOUNT_ID=<...>,R2_ACCESS_KEY_ID=<...>,R2_SECRET_ACCESS_KEY=<...>,\
R2_BUCKET=growth-video-assets,R2_PUBLIC_BASE=<cdn-url>
```
Set the returned URL as the Worker's `RENDER_SERVICE_URL`.

---

## 5. Pre-production verification (do before real traffic)

1. **Confirm Higgsfield contract.** Every `VERIFY`-tagged constant in
   `higgsfieldService.js` (base URL, endpoint paths, model ids, auth scheme,
   param names, response field names) is transcribed from the PRD and unconfirmed.
   Check against live Higgsfield docs and adjust the constants.
2. **Credit costs in `MODELS`** are illustrative — replace with live pricing or a
   pricing fetch before billing real balances.
3. **Renderer real-render smoke test** (could not run in the build sandbox —
   needs `npm install` to pull Remotion + Chromium):
   ```bash
   cd apps/content-engine/renderer && npm install
   RENDER_WEBHOOK_SECRET=dev npm start
   # then POST a sample blueprint with a matching X-Signature (see renderer/README.md)
   ```
4. **Webhook reachability.** Higgsfield and Cloud Run must reach the Worker's
   public host. For local dev, tunnel (`cloudflared tunnel`) and pass `webhookBase`.

---

## 6. End-to-end smoke test (once deployed)

```bash
BASE=https://fabricadeconteudo.clubemkt.digital/api/video

# 0. fund the account
curl -X POST $BASE/account/$USER/grant -d '{"amount":500}'

# 1. create
PID=$(curl -s -X POST $BASE -d '{"scriptId":"...","format":"short","userId":"'$USER'"}' | jq -r .project.id)

# 2. voice (→ voiced, populates alignment)
curl -X POST $BASE/$PID/voice -d '{"voiceId":"pFZP5JQG7iQjIQuC4Bku"}'

# 3. assets (→ generating_assets; webhooks flip to composing)
curl -X POST $BASE/$PID/generate-assets \
  -d '{"scenes":[{"mcsla":{"subject":"a neon city street at night","aesthetic":"35mm grain, moody"}}]}'

# 4. inspect the composed blueprint
curl $BASE/$PID/blueprint

# 5. render (→ rendering; render webhook sets done + finalUrl)
curl -X POST $BASE/$PID/render
```

Poll `GET $BASE/$PID` between steps to watch `status` advance.

---

## 7. Failure modes & recovery

| Symptom | Where | Handling |
|---|---|---|
| Insufficient credits | `/generate-assets` → 402 | top up via `/account/:userId/grant`; reservation never taken |
| Scene generation fails | Higgsfield webhook | that scene marked `failed`; on all-done, only completed scenes charged (auto-refund) |
| All scenes fail to dispatch | `startAssetGeneration` | project → `failed`, full reservation refunded |
| Invalid blueprint | `/render` / `dispatchRender` | project → `failed` with validation errors; no render dispatched |
| Render error | Cloud Run → render webhook | project → `failed` with renderer error |
| Reservation race | `reserve()` | CAS rejects → `RESERVE_CONFLICT`; retry the call |

Known limitations (see architecture doc §10): credit CAS is not a true DB
transaction; long-form chunked render + `combineChunks`, Soul V2 character
training, music ducking polish, and the Virality Predictor loop are later phases.
