# O Código Internacional

High-ticket mentorship funnel for **"O Código Internacional"** — a 7-day program that helps Brazilian
entrepreneurs obtain Paraguayan tax residency. The project is a complete, edge-native system:

**Animated landing page → lead capture (UTM attribution) → WhatsApp alerts → closer CRM → sale →
commissions → class (turma) management → KPI dashboard.**

Everything runs on **Cloudflare** (Pages + Workers + D1 + KV). No servers, no containers.

---

## Live URLs

| Surface | URL |
|---|---|
| Landing page | `https://codigointernacional.com.br` (also `/v2`) |
| Admin CRM | `https://codigointernacional.com.br/admin` |
| Partner portal | `https://codigointernacional.com.br/portal` |
| API (worker) | `https://codigo-internacional-api.hudsonargollo2.workers.dev` |

> Custom domain `codigointernacional.com.br` (apex + `www`) is attached to the
> `codigo-internacional` Pages project. The zone lives on the **TEKTONE** account
> (same account as Pages); apex + `www` are proxied CNAMEs → `codigo-internacional.pages.dev`.
> The Pages preview origin `https://codigo-internacional.pages.dev` still works and
> is also allowed by the worker CORS list.

---

## Architecture

```
                       ┌──────────────────────────────────────────────┐
   Visitor ──────────▶ │  LANDING  (Cloudflare Pages, React + Vite)    │
                       │  /  /v2  — gated VSL, animated SVG, lead form │
                       └───────────────┬──────────────────────────────┘
                                       │ POST /api/ci/leads  (UTM payload)
                                       ▼
        ┌────────────────────────────────────────────────────────────────────┐
        │  API WORKER  "codigo-internacional-api"  (Cloudflare Workers, Hono) │
        │  • UTM → partner attribution + round-robin closer assignment        │
        │  • Rate-limit (KV) · custom DB auth (PBKDF2 + HMAC sessions)         │
        │  • WhatsApp alerts via Evolution API (waitUntil, non-blocking)       │
        └───────────┬─────────────────────────────────────────┬──────────────┘
                    │                                          │
                    ▼ D1 (SQLite)                              ▼ Evolution API
        ┌───────────────────────────┐               ┌──────────────────────────┐
        │ leads · sales · partners  │               │ Lead → confirmation       │
        │ commissions · closers     │               │ Closer (Pedro) → new lead │
        │ journey · turmas · sources│               │ Owner (Hudson) → copy     │
        │ users · ci_settings       │               └──────────────────────────┘
        └───────────────────────────┘
                    ▲
                    │ /api/ci/admin/*  (Bearer session token)
        ┌───────────┴────────────────────────────────────────────────────────┐
        │  ADMIN CRM + PORTAL  (same Pages app, behind custom login)           │
        │  Dashboard · Pipeline · Turmas · Comissões · Parceiros & Fontes      │
        └─────────────────────────────────────────────────────────────────────┘
```

### The funnel, end to end

1. **Landing** — visitor lands (optionally via a partner/ad UTM), watches the gated VSL, submits the form.
2. **Capture** — the worker resolves the UTM to a partner, assigns a closer (round-robin), saves the lead to D1.
3. **Alerts** (instant, non-blocking) — three WhatsApps fire: a confirmation to the **lead**, a "novo lead" to the **closer** (Pedro), and a copy to the **owner** (Hudson).
4. **Work the lead** — the closer moves it through the pipeline (`Novo → Contatado → Qualificado → Fechado / Descartado`).
5. **Sale** — on **Fechado**, a sale is created. When marked **Pago**, commissions are generated.
6. **Commissions** — Hudson 2.5% + Alison 2.5% (house) + the attributed partner's %.
7. **Onboarding** — the concierge journey is seeded; the client appears in their **Turma**.

---

## Tech stack

- **Frontend:** React 19, Vite 8, React Router 6, Tailwind CSS v4, Framer Motion, Lucide icons.
- **Backend:** Cloudflare Workers + [Hono](https://hono.dev/) router.
- **Database:** Cloudflare **D1** (SQLite). **KV** for rate-limiting.
- **Auth:** custom, edge-safe — PBKDF2-SHA256 password hashing + HMAC-SHA256 stateless session tokens (no Node deps, no third-party auth).
- **WhatsApp:** [Evolution API](https://evolution-api.com/) (self-hosted at `evo.clubemkt.digital`).
- **Design system:** "TEKTONE" — Ivory Clay `#EFE8DC`, Mineral Black `#141618`, Mineral Green `#2E4A43`, Sand `#C7B79C`; Inter + EB Garamond (italic) + JetBrains Mono.

---

## Repository layout

```
apps/codigo-internacional/
├── README.md                  ← this file
├── public/brand/              ← logo, Pedro photo, background texture (.webp)
├── src/                       ← FRONTEND (Pages)
│   ├── App.jsx                ← top-level routes (landing / login / admin / portal)
│   ├── pages/
│   │   ├── LandingV2.jsx      ← the live landing (gated VSL, animated, all copy)
│   │   ├── Login.jsx          ← first-access password creation + login
│   │   ├── Portal.jsx         ← partner portal (own commissions/stats)
│   │   └── ci/                ← CRM pages
│   │       ├── CrmDashboard.jsx   ← KPIs + revenue goal tracker
│   │       ├── CrmLeads.jsx       ← kanban pipeline
│   │       ├── CrmLeadDetail.jsx  ← lead → sale → onboarding flow
│   │       ├── CrmTurmas.jsx      ← clients grouped by class
│   │       ├── CrmCommissions.jsx ← payout ledger
│   │       ├── CrmPartners.jsx    ← partners, closers, house rates, traffic sources
│   │       └── ciStatus.js        ← shared status metadata / helpers
│   ├── components/            ← AdminShell, VSL, DockedVSL, LeadForm, doodleIcons, scenesV2, illustrations, motion
│   ├── hooks/useApi.js        ← fetch wrapper (Bearer token) — useApi / apiPost / apiPatch / apiDelete
│   └── lib/{api.js, auth.jsx} ← API base + auth context
└── worker/                    ← BACKEND (Workers)
    ├── wrangler.toml
    ├── migrations/0001_ci_pipeline.sql
    └── src/
        ├── index.js           ← Hono app + CORS, mounts /api/ci
        ├── routes/ci.js       ← all endpoints
        ├── lib/{auth.js, ci-db.js, uid.js}
        └── services/ci/       ← lead, sale, commission, partner, closer, journey,
                                  settings, sources, dashboard, user, notify
```

> `src/pages/Landing.jsx` is the original V1 and is **unrouted** (kept for reference). `/` and `/v2`
> both render `LandingV2.jsx`.

---

## Cloudflare resources

| Resource | Name / ID | Account |
|---|---|---|
| Pages project | `codigo-internacional` | **Hudson@tektone** (`193882a3…95992e`) |
| Worker | `codigo-internacional-api` | **ClubeMKT** (`cb27e1a6…737652`) |
| D1 database | `codigo-internacional` (`3b79dd03-874f-4a40-9e2e-48ef3c055618`) | ClubeMKT |
| KV namespace | `CI_KV` (`1354acc9…727a1`) | ClubeMKT |

> ⚠️ The **worker lives on ClubeMKT** (where D1/KV are), the **Pages app on the personal account**.
> They talk over HTTPS; CORS on the worker allows the Pages domain. Always deploy each to its own account.

---

## Database schema (D1)

| Table | Purpose |
|---|---|
| `leads` | Every form capture — contact, UTM fields, `partner_id`, `turma`, status, assigned closer |
| `lead_events` | Audit trail (created, status_change, assign, note, turma_change) |
| `closers` | The humans who work leads (Pedro). WhatsApp = where alerts go |
| `partners` | Ambassadors / influencers / mentors with a unique `utm_source` + commission rate |
| `sales` | Created on "won"; `pending_payment → paid → onboarding → journey → completed` |
| `commissions` | One row per beneficiary per sale (house + partner), with payout status |
| `journey_stages` | Concierge journey per sale (checklist → travel → 7 days → residência → done) |
| `ci_sources` | Non-partner UTM origins (e.g. `trafego` for ads) — tracked, no commission |
| `ci_settings` | `house_rate_hudson`, `house_rate_alison`, `program_price`, `revenue_goal`, `program_currency` |
| `users` | CRM/portal accounts (email, role, beneficiary_key, password hash) |

---

## Auth & roles

Custom DB auth (no Supabase). **First access creates the password.**

Flow: `POST /auth/check {email}` → `{allowed, firstAccess}` → if first access `POST /auth/register
{email,password}`, else `POST /auth/login {email,password}`. Returns an HMAC-signed session token
(stored in `localStorage`, sent as `Authorization: Bearer …`).

| User | Role | Sees |
|---|---|---|
| `hudson@tektone.com.br` | **admin** | full CRM |
| `pedrosilvestrini@tektone.com.br` | **admin** | full CRM (also the closer + a mentor partner) |
| `alison@tektone.com.br` | partner | portal: own commission (house 2.5%) |
| `wanderson@tektone.com.br` | partner | portal: own embaixador results |
| `andressa@tektone.com.br` | partner | portal: own embaixador results |

Only these pre-seeded emails can register. Admin routes (`/api/ci/admin/*`) require an admin session token.

---

## UTM attribution & commissions

- Each **partner** owns a unique `utm_source`. Their share link: `…/?utm_source=<code>&utm_medium=instagram`.
- A lead arriving via that link is **auto-attributed** to the partner. Organic / unknown source → unattributed.
- **`trafego`** (and any source you add under "Fontes de tráfego") is tracked for origin but is **not a partner** and carries **no commission**: `…/?utm_source=trafego&utm_medium=paid` (append `&utm_campaign=…` per campaign).
- **Commissions are generated when a sale is marked _Pago_** (not at onboarding): Hudson 2.5% + Alison 2.5% (editable house rates) + the attributed partner's % (Pedro the mentor = 0%). Idempotent; existing commissions keep their snapshot rate.

---

## Landing page highlights

- **Video gate:** the page is locked after the hero until the visitor clicks *Iniciar processo de seleção*. The VSL then opens **big + centered**, scroll stays locked **10s**, then on first scroll it **docks** into a small bottom-right player (keeps playing; uses the YouTube IFrame API to auto-hide when the video ends).
- **Animated SVG** scenes (draw-in, dash-flow connectors, rotating seal, floating cubes, twinkling sparkles), hand-drawn **doodle icons** with springy pop-in, a 7-day timeline, brand-seal band, and turma calendar.
- **Lead form** captures first-touch UTM (sessionStorage) + turma choice (squared cards).

---

## API endpoints (worker, `/api/ci`)

**Public:** `GET /cohorts` · `POST /leads`
**Auth:** `POST /auth/check` · `POST /auth/register` · `POST /auth/login` · `GET /me`
**Admin (`/admin/*`, Bearer admin token):**
`dashboard` · `leads` (+ `/stats`, `/:id`, `/:id/status|assign|notes|turma`) · `clients` · `sales` (+ status) ·
`commissions` (+ `/summary`, `/:id/status`) · `partners` (CRUD) · `closers` (CRUD) · `sources` (CRUD) ·
`settings` (GET/PATCH) · `journey/:stageId`.

---

## Local development

```bash
# 1) API worker (from worker/)
cd worker
npx wrangler dev --local --port 8787       # serves /api on http://localhost:8787
#   apply schema to the local D1 first:
npx wrangler d1 execute codigo-internacional --local --file=./migrations/0001_ci_pipeline.sql

# 2) Frontend (from project root)
cd ..
npm install
npm run dev                                # http://localhost:5175 (Vite proxies /api → :8787)
```

`VITE_API_BASE` (in `.env.production`) points the deployed frontend at the worker. In dev it's empty and
Vite proxies `/api` to the local worker.

---

## Deployment

```bash
# ── API worker → ClubeMKT account ──────────────────────────────────────────────
cd worker
export CLOUDFLARE_ACCOUNT_ID=cb27e1a67198789eb42d11ab90737652
npx wrangler deploy

# ── Frontend → personal account ───────────────────────────────────────────────
cd ..
npm run build
export CLOUDFLARE_ACCOUNT_ID=193882a3226d5fb9c3611ea50c95992e
npx wrangler pages deploy dist --project-name codigo-internacional --branch main
```

### Worker config & secrets

`worker/wrangler.toml` vars: `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `CI_EVOLUTION_INSTANCE`
(`CODIGOINTERNACIONAL`), `CI_OWNER_WHATSAPP`. Bindings: `CI_DB` (D1), `CI_KV` (KV).

Secrets (set with `wrangler secret put <NAME>` on the **ClubeMKT** account):

| Secret | What |
|---|---|
| `SESSION_SECRET` | HMAC key for signing session tokens |
| `CI_EVOLUTION_KEY` | API key for the dedicated `CODIGOINTERNACIONAL` Evolution instance |
| `EVOLUTION_INSTANCE_KEY` | API key for the shared `FABRICADECONTEUDO` instance (fallback) |

---

## WhatsApp (Evolution API)

- The mentorship uses a **dedicated** instance `CODIGOINTERNACIONAL` (separate from the content-delivery
  `FABRICADECONTEUDO`). Its key is the `CI_EVOLUTION_KEY` secret.
- On every lead with a phone, three messages fire (non-blocking, `executionCtx.waitUntil`):
  the **lead** gets a confirmation, **Pedro** (closer) gets the alert, **Hudson** (`CI_OWNER_WHATSAPP`) gets a copy.
- If an instance shows `close`/`connecting`, re-link it by scanning the QR from
  `GET {EVOLUTION_API_URL}/instance/connect/{instance}` (`apikey` header).

---

## Operational notes / gotchas

- **`lucide-react` must stay a dependency** of this app — the CRM/portal/admin shell import it; without it the
  build externalizes the import and the admin renders blank.
- **Nested admin routes are relative** (`leads`, not `/admin/leads`) because `AdminShell` is mounted under
  `/admin/*`. Absolute paths there silently fail to match.
- The worker is on **ClubeMKT**; do not deploy it to the personal account (its KV/D1 live on ClubeMKT).
- Changing a partner's **commission rate** or the **house rates** affects future commissions only — generated
  ones keep their rate (snapshot at the moment of payment).

---

_Ordo Tekhnē · Permanentia._
