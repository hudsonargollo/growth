# GROWTH

Monorepo for **Tektone / ClubeMKT** growth tooling — edge-native apps that run on
Cloudflare (Workers, Pages, D1, KV) with Supabase where a relational DB is needed.
No servers, no containers.

## Apps

| App | Path | What it is | Status |
|-----|------|------------|--------|
| **Growth Clube** | [`/` (repo root)](src) | The Growth Clube marketing site — "Funis Automatizados. Lucros Previsíveis." (React + Vite). | **Active** |
| **Tektone Design System** | [`apps/design-system`](apps/design-system) | Vendored copy of [`tektone`](https://github.com/pbakaus/tektone) (Apache-2.0, by Paul Bakaus) — a frontend design skill + anti-pattern detection CLI + browser extension. | **Vendored (3rd-party)** |

> **Extracted to standalone repos** (no longer in this monorepo):
> - **Fábrica de Conteúdo** (YouTube growth automation — product mining, AI scripts, TTS, comment agent) → **[hudsonargollo/fabrica-de-conteudo](https://github.com/hudsonargollo/fabrica-de-conteudo)** (deploys to the `content-engine` worker on ClubeMKT).
> - **O Código Internacional** (Paraguay tax-residency mentorship funnel) → **[hudsonargollo/codigo-internacional](https://github.com/hudsonargollo/codigo-internacional)**.

## Cloudflare accounts

Resources are split across two accounts — know which one you're deploying to:

| Account | ID | Hosts |
|---------|----|-------|
| **TEKTONE** (personal) | `193882a3226d5fb9c3611ea50c95992e` | Pages frontends |
| **ClubeMKT** | `cb27e1a67198789eb42d11ab90737652` | API workers, D1, KV |

Pass the target account explicitly when deploying, e.g. `CLOUDFLARE_ACCOUNT_ID=… npx wrangler …`.

## Getting started

Each app is self-contained — `cd` into it and follow its own `README.md`:

```bash
cd apps/content-engine   && cat README.md   # active backend
cd apps/design-system    && cat README.md   # tektone (3rd-party)
```

## Conventions

- **Edge-compatible code only** — avoid Node-specific APIs that break on Workers/Pages unless polyfilled.
- **Wrangler-aligned** config and deploy commands; secrets via `wrangler secret put` (never committed).
- **Version control via GitHub**; deploy with Wrangler (per-app `npm run deploy` scripts where available).

See [`CLAUDE.md`](CLAUDE.md) for the full working agreement used by AI contributors on this repo.
