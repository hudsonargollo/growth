# Infrastructure & Deployment

A cross-cutting map of the three apps that came out of this workspace, where they
live, how they deploy, and which Cloudflare account owns what. For per-app detail,
see each repo's own `README.md`.

## The three apps

| App | Repo | Frontend | Backend | Live domain |
|-----|------|----------|---------|-------------|
| **Growth Clube** | [`hudsonargollo/growth`](https://github.com/hudsonargollo/growth) (this repo) | Root React + Vite app (`/src` → `./dist`) | Worker `growth-clube` (`worker/index.js`, `ASSETS` + `KANBAN` KV) | _n/a confirmed_ |
| **Fábrica de Conteúdo** | [`hudsonargollo/fabrica-de-conteudo`](https://github.com/hudsonargollo/fabrica-de-conteudo) | React + Vite (`client/`), bundled into the worker as static assets | Worker `content-engine` (Hono) + Supabase; Remotion renderer on Cloud Run | `fabricadeconteudo.clubemkt.digital` |
| **O Código Internacional** | [`hudsonargollo/codigo-internacional`](https://github.com/hudsonargollo/codigo-internacional) | React + Vite on Cloudflare **Pages** | Worker `codigo-internacional-api` (Hono) + D1 + KV | `codigointernacional.com.br` |

> **Also in the growth repo:** `apps/design-system` — a **vendored** copy of
> [`tektone`](https://github.com/pbakaus/tektone) (Apache-2.0, by Paul Bakaus).
> Third-party; its own upstream READMEs apply.

## Cloudflare accounts

| Account | ID | Hosts |
|---------|----|-------|
| **TEKTONE** (personal) | `193882a3226d5fb9c3611ea50c95992e` | `codigo-internacional` **Pages** project + the `codigointernacional.com.br` zone |
| **ClubeMKT** | `cb27e1a67198789eb42d11ab90737652` | Workers (`content-engine`, `codigo-internacional-api`), D1, KV, the `clubemkt.digital` zone |

> ⚠️ **Código Internacional is split across both accounts**: Pages frontend on TEKTONE,
> API worker (+ D1/KV) on ClubeMKT. Deploy each piece to its own account.

## Deployment & CI

| App | Auto-deploy (push to `main`) | Manual command | Token (GitHub secret `CLOUDFLARE_API_TOKEN`) |
|-----|------------------------------|----------------|----------------------------------------------|
| **Código Internacional** (Pages) | ✅ `.github/workflows/deploy.yml` | `npm run deploy` | TEKTONE · **Pages → Edit** |
| **Fábrica de Conteúdo** (Worker) | ✅ `.github/workflows/deploy.yml` (builds client, then `wrangler deploy`) | `cd worker && CLOUDFLARE_ACCOUNT_ID=cb27… npx wrangler deploy` | ClubeMKT · **Workers Scripts → Edit** |
| **Código Internacional** API worker | ❌ manual | `cd worker && CLOUDFLARE_ACCOUNT_ID=cb27… npx wrangler deploy` | (uses local `wrangler` auth) |
| **Growth Clube** (root worker) | ❌ manual | `npm run build && npx wrangler deploy` | (uses local `wrangler` auth) |

- Both CI workflows run JS actions on **Node 24** (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`) and pin `wrangler@4.86.0`. The account id is inlined (public); only the API token is a secret, scoped per account as above.
- **Each repo's token is distinct** — TEKTONE/Pages for codigo, ClubeMKT/Workers for fabrica.

### Building from the right directory

The growth repo root has its **own** `vite build` (the Growth Clube app → `./dist`).
Always build/deploy an app **from its own directory** so you don't ship the wrong
`dist`. The standalone repos avoid this footgun entirely.

## Secrets (high level)

Set via `wrangler secret put …` on the owning account; never committed. Many of
Fábrica de Conteúdo's keys can alternatively be entered in its in-app Settings
(stored AES-GCM-encrypted in KV). See each repo's README for the full list.

- **Fábrica de Conteúdo** (ClubeMKT worker): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIALS_SECRET`, `ANTHROPIC_API_KEY`, `SERPAPI_KEY`, `ML_APP_ID`/`ML_CLIENT_SECRET`, `AMAZON_LWA_*`, `ELEVENLABS_API_KEY`, `WHATSAPP_*`, `YOUTUBE_*`. Client publishable Supabase anon key lives in `client/.env.production`.
- **Código Internacional** (ClubeMKT worker): `SESSION_SECRET`, `CI_EVOLUTION_KEY`, `EVOLUTION_INSTANCE_KEY`.

## History — how we got here

- **2026-06**: Extracted **Código Internacional** and **Fábrica de Conteúdo** out of the
  growth monorepo into their own standalone repos (fresh git history), reusing the
  existing Cloudflare projects. Added per-repo auto-deploy CI.
- Fábrica de Conteúdo's content-engine was **reconciled** before removal: a 3-way merge
  confirmed the extracted version was already a superset of `main`'s June-8 "deployed
  build" work (regional Spanish, clickable product strip, ML MLB/MLM, voiceover speed,
  Amazon Creators, ML token refresh + mining resilience). Then removed from growth via
  PR #4.
- Growth now contains the **Growth Clube** root app + the vendored **design-system**.
