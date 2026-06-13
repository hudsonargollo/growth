# Content Engine

YouTube growth automation — product mining, script generation, voiceover, editor delivery, and comment automation. Runs entirely on Cloudflare Workers with Supabase as the database and storage layer.

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 19 + Vite + Tailwind v4             |
| Backend  | Cloudflare Worker (Hono)                  |
| Database | Supabase (PostgreSQL + Storage)           |
| Cron     | Cloudflare Cron Triggers (`0 */4 * * *`)  |
| LLM      | Claude `claude-haiku-4-5` (OpenAI fallback) |
| TTS      | ElevenLabs `eleven_multilingual_v2` · OpenAI · Google |
| Mining   | SerpAPI · Amazon Creators · MercadoLibre (OAuth) |

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
| Mining        | `/api/mining`         | Product mining across SerpAPI, Amazon Creators, and MercadoLibre; scoring + catalog management. Resilient: if a primary source is empty (e.g. SerpAPI out of credits or the ML token expired), it falls back to Amazon Creators so a run never dead-ends. |
| Scripts       | `/api/scripts`        | Blueprint-driven YouTube script generation via Claude (LLM)  |
| Voiceover     | `/api/voiceover`      | TTS (ElevenLabs / OpenAI / Google) → MP3 uploaded to Supabase Storage |
| Delivery      | `/api/delivery`       | WhatsApp handoff to the video editor (Evolution API / WhatsApp Cloud) |
| Comment Agent | `/api/comments`       | YouTube comment fetch, AI reply generation, human review     |
| Credentials   | `/api/credentials`    | AES-GCM encrypted secret storage (keys resolved at runtime via `resolveKey`) |

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

## Secrets & API keys

Most third-party keys can be set **either** as a Wrangler secret **or** through the in-app
Settings page (stored AES-GCM-encrypted in KV and read at runtime via `resolveKey`). The few
that must be Wrangler secrets are the database and the encryption key itself.

```bash
# Database (Wrangler secrets)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put CREDENTIALS_SECRET        # 32-byte hex — encrypts the in-app key store

# LLM — scripts + comment replies (Claude is primary; OpenAI is a fallback)
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put OPENAI_API_KEY            # optional fallback

# Mining
wrangler secret put SERPAPI_KEY               # blog reviews + (opt-in) review images
wrangler secret put ML_APP_ID                 # MercadoLibre OAuth
wrangler secret put ML_CLIENT_SECRET
wrangler secret put ML_AFFILIATE_TAG          # optional
wrangler secret put AMAZON_LWA_CLIENT_ID      # Amazon Creators (LWA)
wrangler secret put AMAZON_LWA_CLIENT_SECRET
wrangler secret put AMAZON_AFFILIATE_TAG      # or AMAZON_ASSOCIATE_TAG

# Voiceover
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put GOOGLE_API_KEY            # Google TTS (optional)

# Delivery
wrangler secret put WHATSAPP_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID

# Comment Agent
wrangler secret put YOUTUBE_API_KEY
wrangler secret put YOUTUBE_CHANNEL_ID        # or YOUTUBE_VIDEO_IDS="id1,id2,id3"
wrangler secret put YOUTUBE_OAUTH_TOKEN       # optional — needed to post replies
```

> MercadoLibre OAuth issues a rotating refresh token (scope `offline_access read write`); the
> worker refreshes the user token on 401 and falls back to the app token, then public search.
> Connect/reconnect ML from the in-app Settings.

## Environment Variables (wrangler.toml)

| Variable   | Default       | Description                                              |
|------------|---------------|----------------------------------------------------------|
| `NODE_ENV` | `production`  |                                                          |
| `LLM_MODEL`| `claude-haiku-4-5-20251001` | Claude model used for scripts and comment replies |
| `ML_SITE`  | `brazil`      | MercadoLibre site: `brazil` `argentina` `mexico` `chile` `colombia` |
| `EVOLUTION_API_URL` | `https://evo.clubemkt.digital` | Evolution API base (WhatsApp delivery) |
| `EVOLUTION_INSTANCE` | `FABRICADECONTEUDO` | Evolution instance name |
| `MINING_REVIEW_IMAGES` | _(unset)_ | Opt-in (`true`) to fetch Google review images per product — costs one extra SerpAPI search each, so off by default |

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
