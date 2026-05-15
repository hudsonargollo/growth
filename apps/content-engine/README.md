# Content Engine

YouTube growth automation — product mining, script generation, voiceover, editor delivery, and comment automation. Runs entirely on Cloudflare Workers with Supabase as the database and storage layer.

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 19 + Vite + Tailwind v4             |
| Backend  | Cloudflare Worker (Hono)                  |
| Database | Supabase (PostgreSQL + Storage)           |
| Cron     | Cloudflare Cron Triggers (`0 */4 * * *`)  |
| LLM      | OpenAI `gpt-4o-mini`                      |
| TTS      | ElevenLabs `eleven_multilingual_v2`       |

## Live

- **App + API:** https://content-engine.hudsonargollo2.workers.dev

## Project Structure

```
apps/content-engine/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/           # Dashboard, Mining, Scripts, Voiceover, Delivery, Comments, Settings
│       └── components/      # PageHeader, StatCard, StatusBadge
└── worker/                  # Cloudflare Worker (serves client dist as static assets)
    └── src/
        ├── index.js         # Hono router + cron handler
        ├── routes/          # credentials (encrypted storage)
        ├── services/        # Business logic + API integrations
        └── lib/             # db.js (Supabase), uid.js, crypto.js
```

## Services

| Service       | Route prefix          | Description                                                  |
|---------------|-----------------------|--------------------------------------------------------------|
| Mining        | `/api/mining`         | MercadoLibre product search, scoring, catalog management     |
| Scripts       | `/api/scripts`        | Blueprint-driven YouTube script generation via OpenAI        |
| Voiceover     | `/api/voiceover`      | ElevenLabs TTS → MP3 uploaded to Supabase Storage            |
| Delivery      | `/api/delivery`       | WhatsApp Cloud API handoff to video editor                   |
| Comment Agent | `/api/comments`       | YouTube comment fetch, AI reply generation, human review     |
| Credentials   | `/api/credentials`    | AES-GCM encrypted secret storage                             |

## Local Development

### 1. Install dependencies

```bash
cd apps/content-engine
npm run install:all        # installs root + client + server deps
```

### 2. Run the client dev server

```bash
npm run dev:client         # http://localhost:5174
```

### 3. Run the worker locally

```bash
cd worker
npm run dev                # wrangler dev — http://localhost:8787
```

## Build & Deploy

### Build the client

```bash
cd client
npm run build              # outputs to client/dist/
```

### Deploy the worker (includes client dist as static assets)

```bash
cd worker
npm run deploy             # wrangler deploy
```

The worker serves the built client from `client/dist` via the `[assets]` binding, so a single deploy ships both frontend and API.

## Secrets

Set all secrets via Wrangler before deploying:

```bash
# Database
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Mining (MercadoLibre)
wrangler secret put ML_APP_ID
wrangler secret put ML_CLIENT_SECRET

# Scripts + Comment Agent
wrangler secret put OPENAI_API_KEY

# Voiceover
wrangler secret put ELEVENLABS_API_KEY

# Delivery
wrangler secret put WHATSAPP_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID

# Comment Agent
wrangler secret put YOUTUBE_API_KEY
wrangler secret put YOUTUBE_CHANNEL_ID        # or YOUTUBE_VIDEO_IDS="id1,id2,id3"
wrangler secret put YOUTUBE_OAUTH_TOKEN       # optional — needed to post replies

# Credentials encryption
wrangler secret put CREDENTIALS_SECRET        # 32-byte hex
```

## Environment Variables (wrangler.toml)

| Variable   | Default       | Description                                              |
|------------|---------------|----------------------------------------------------------|
| `NODE_ENV` | `production`  |                                                          |
| `LLM_MODEL`| `gpt-4o-mini` | OpenAI model used for scripts and comment replies        |
| `ML_SITE`  | `brazil`      | MercadoLibre site: `brazil` `argentina` `mexico` `chile` `colombia` |

## Cron

The comment agent runs automatically every 4 hours via Cloudflare Cron Triggers (`0 */4 * * *`). It fetches new YouTube comments, generates AI replies, posts them (if `YOUTUBE_OAUTH_TOKEN` is set), and flags sensitive comments for human review.

You can also trigger it manually:

```bash
POST /api/comments/run
```

## Script Blueprints

| Blueprint ID       | Name                    | Sections                                          |
|--------------------|-------------------------|---------------------------------------------------|
| `top-n-review`     | Top-N Product Review    | intro → product_highlights → value_proposition → cta |
| `single-deep-dive` | Single Product Deep Dive| intro → overview → pros_cons → demo → cta         |
| `comparison`       | Comparison (A vs B)     | intro → product_a → product_b → verdict → cta     |

## ElevenLabs Voices

| Name    | Voice ID                   |
|---------|----------------------------|
| Rachel  | `21m00Tcm4TlvDq8ikWAM`     |
| Antonio | `ErXwobaYiN019PkySvjV`     |
| Bella   | `EXAVITQu4vr4xnSDxMaL`     |
