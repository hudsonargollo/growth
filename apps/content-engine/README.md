# Content Engine

YouTube growth automation — product mining, script generation, voiceover, editor delivery, and comment automation.

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 19 + Vite + Tailwind v4 |
| Backend  | Node.js + Express             |
| Cron     | node-cron                     |
| DB       | In-memory stubs (→ PostgreSQL)|

## Getting Started

### 1. Install dependencies

```bash
cd apps/content-engine
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Fill in your API keys in server/.env
```

### 3. Run (both client + server)

```bash
npm run dev
```

- Frontend: http://localhost:5174
- Backend API: http://localhost:3001

Or run separately:

```bash
npm run dev:client   # frontend only
npm run dev:server   # backend only
```

## Services

| Service         | Route prefix       | Description                                      |
|-----------------|--------------------|--------------------------------------------------|
| Mining          | `/api/mining`      | MercadoLibre + Amazon product catalog            |
| Scripts         | `/api/scripts`     | Blueprint-driven script generation (LLM)         |
| Voiceover       | `/api/voiceover`   | ElevenLabs TTS audio generation                  |
| Delivery        | `/api/delivery`    | WhatsApp editor handoff                          |
| Comment Agent   | `/api/comments`    | Cron-triggered YouTube comment replies           |

## Implementing Real API Calls

Each service file has `TODO` comments marking exactly where to plug in real API calls:

- `server/src/services/miningService.js` → MercadoLibre + Amazon PA-API
- `server/src/services/scriptService.js` → OpenAI / Anthropic
- `server/src/services/voiceoverService.js` → ElevenLabs
- `server/src/services/deliveryService.js` → WhatsApp Cloud API
- `server/src/services/commentAgent.js` → YouTube Data API + OpenAI

## Project Structure

```
apps/content-engine/
├── client/                  # React + Vite frontend (port 5174)
│   └── src/
│       ├── pages/           # Dashboard, Mining, Scripts, Voiceover, Delivery, Comments, Settings
│       └── components/      # Shared UI components
└── server/                  # Express backend (port 3001)
    └── src/
        ├── routes/          # REST endpoints
        └── services/        # Business logic + API integrations
```
