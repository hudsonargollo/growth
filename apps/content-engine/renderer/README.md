# content-engine renderer

Headless Remotion SSR service for the agentic video generator. **Not** a Cloudflare
Worker — it runs Chromium + FFmpeg, so it's deployed as a Docker container on
Google Cloud Run. The Worker (`apps/content-engine/worker`) composes a deterministic
blueprint and POSTs it here; this service renders the `.mp4`, uploads it, and calls
the Worker back.

## Contract

`POST /render` — body `{ projectId, blueprint, callbackUrl }`, header
`X-Signature: sha256=<hmac>` over the raw body using `RENDER_WEBHOOK_SECRET`.
Responds `202` immediately, then renders in the background and POSTs the result to
`callbackUrl` (also signed with the same secret):

```json
{ "projectId": "...", "status": "DONE", "finalUrl": "https://.../abc.mp4" }
```

`blueprint` is exactly what the Worker's `remotionComposer.composeBlueprint()`
produces — `compositionId` selects `ShortForm` (1080×1920) or `LongForm` (1920×1080);
`fps`, `durationInFrames`, and `dimensions` come straight from the blueprint via
`calculateMetadata`, so the Worker stays the single source of truth.

## Compositions

`src/Root.jsx` registers two compositions, both backed by `VideoTimeline.jsx`,
which maps blueprint tracks → React: `OffthreadVideo`/`Img` clips with fades and
optional Ken Burns, `Audio` (dB→linear gain, music ducking via `gainDb`), and
word-level `Caption`s positioned inside platform safe zones.

## Env

| Var | Purpose |
|---|---|
| `RENDER_WEBHOOK_SECRET` | HMAC shared secret with the Worker (**required**) |
| `PORT` | injected by Cloud Run (default 8080) |
| `RENDER_CONCURRENCY` | optional Remotion frame concurrency |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE` | upload final mp4 to R2 (S3 API). If unset, falls back to serving from `/artifacts`. |
| `PUBLIC_BASE_URL` | this service's public URL (local-fallback artifact links) |

## Local dev

```bash
npm install
npm run studio          # preview compositions in Remotion Studio
RENDER_WEBHOOK_SECRET=dev npm start   # run the render server on :8080
```

Smoke-test the endpoint (signature must match):

```bash
BODY='{"projectId":"test","blueprint":{...},"callbackUrl":""}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac dev | awk '{print $2}')
curl -s :8080/render -H "Content-Type: application/json" -H "X-Signature: sha256=$SIG" -d "$BODY"
```

## Deploy (Cloud Run)

```bash
gcloud run deploy content-engine-renderer \
  --source . \
  --region southamerica-east1 \
  --memory 4Gi --cpu 4 --timeout 3600 \
  --set-env-vars RENDER_WEBHOOK_SECRET=...,R2_ACCOUNT_ID=...,R2_BUCKET=growth-video-assets
```

Then set `RENDER_SERVICE_URL` (the deployed URL) and the matching
`RENDER_WEBHOOK_SECRET` as secrets on the Worker.
