-- ─────────────────────────────────────────────────────────────────────────────
-- "O Código Internacional" — lead → sale → commission pipeline (Cloudflare D1)
-- Binding: CI_DB
-- Apply local:  wrangler d1 execute CI_DB --local  --file=./migrations/0001_ci_pipeline.sql
-- Apply remote: wrangler d1 execute CI_DB --remote --file=./migrations/0001_ci_pipeline.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Partners: ambassadors / influencers / partners / mentors ──────────────────
-- Each owns a unique utm_source. commission_rate is a percentage (e.g. 10 = 10%).
-- mentor_id is a self-reference: which mentor recruited this partner.
CREATE TABLE IF NOT EXISTS partners (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'ambassador',  -- ambassador|influencer|partner|mentor
  utm_source      TEXT NOT NULL UNIQUE,                -- the tracking code, e.g. "joao_silva"
  commission_rate REAL NOT NULL DEFAULT 0,             -- percent of sale amount
  mentor_id       TEXT REFERENCES partners(id),        -- who recruited this partner
  whatsapp        TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',      -- active|paused|archived
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_partners_utm    ON partners(utm_source);
CREATE INDEX IF NOT EXISTS idx_partners_mentor ON partners(mentor_id);

-- ── Closers: the humans who work the leads ────────────────────────────────────
CREATE TABLE IF NOT EXISTS closers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  whatsapp   TEXT,                                     -- notified on each new assigned lead
  email      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Leads: every landing-page form capture ────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                 TEXT PRIMARY KEY,
  name               TEXT,
  email              TEXT,
  phone              TEXT,
  -- attribution
  utm_source         TEXT,
  utm_medium         TEXT,
  utm_campaign       TEXT,
  utm_content        TEXT,
  utm_term           TEXT,
  partner_id         TEXT REFERENCES partners(id),     -- resolved from utm_source
  referrer           TEXT,
  landing_path       TEXT,
  -- pipeline
  turma              TEXT,                              -- chosen cohort, e.g. "2026-07-12"
  status             TEXT NOT NULL DEFAULT 'new',       -- new|contacted|qualified|won|lost
  assigned_closer_id TEXT REFERENCES closers(id),
  lost_reason        TEXT,
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_partner ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_closer  ON leads(assigned_closer_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- ── Lead events: audit trail (status changes, notes, contact attempts) ────────
CREATE TABLE IF NOT EXISTS lead_events (
  id         TEXT PRIMARY KEY,
  lead_id    TEXT NOT NULL REFERENCES leads(id),
  type       TEXT NOT NULL,                            -- created|status_change|note|contact|assign
  payload    TEXT,                                     -- JSON blob
  actor      TEXT,                                     -- who did it (closer name / "system")
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);

-- ── Sales: created when a lead is marked "won" ────────────────────────────────
-- Commission rows are generated when status moves to 'onboarding'.
CREATE TABLE IF NOT EXISTS sales (
  id                   TEXT PRIMARY KEY,
  lead_id              TEXT NOT NULL REFERENCES leads(id),
  partner_id           TEXT REFERENCES partners(id),   -- snapshot of attribution at sale time
  closer_id            TEXT REFERENCES closers(id),
  amount               REAL NOT NULL DEFAULT 0,         -- gross paid amount
  currency             TEXT NOT NULL DEFAULT 'BRL',
  status               TEXT NOT NULL DEFAULT 'pending_payment',
                       -- pending_payment|paid|onboarding|journey|completed|refunded
  payment_ref          TEXT,                            -- MercadoPago id / receipt ref
  paid_at              TEXT,
  onboarding_started_at TEXT,                           -- commission trigger timestamp
  completed_at         TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_status  ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_partner ON sales(partner_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead    ON sales(lead_id);

-- ── Commissions: one row per beneficiary per sale ─────────────────────────────
-- beneficiary_type: 'house' (Hudson/Alison) or 'partner' (the attributed UTM owner)
CREATE TABLE IF NOT EXISTS commissions (
  id               TEXT PRIMARY KEY,
  sale_id          TEXT NOT NULL REFERENCES sales(id),
  beneficiary_type TEXT NOT NULL,                       -- house|partner
  beneficiary_key  TEXT NOT NULL,                       -- 'hudson' | 'alison' | partner id
  beneficiary_name TEXT NOT NULL,
  rate             REAL NOT NULL,                        -- percent applied
  amount           REAL NOT NULL,                        -- computed payout
  currency         TEXT NOT NULL DEFAULT 'BRL',
  status           TEXT NOT NULL DEFAULT 'pending',      -- pending|approved|paid|void
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commissions_sale        ON commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON commissions(beneficiary_key);
CREATE INDEX IF NOT EXISTS idx_commissions_status      ON commissions(status);

-- ── Journey stages: the concierge journey per buyer ───────────────────────────
CREATE TABLE IF NOT EXISTS journey_stages (
  id           TEXT PRIMARY KEY,
  sale_id      TEXT NOT NULL REFERENCES sales(id),
  stage        TEXT NOT NULL,                            -- machine key
  label        TEXT NOT NULL,                            -- human label (pt-BR)
  status       TEXT NOT NULL DEFAULT 'pending',          -- pending|in_progress|done
  sort         INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_journey_sale ON journey_stages(sale_id);

-- ── Settings: house commission rates + misc config (key/value) ────────────────
CREATE TABLE IF NOT EXISTS ci_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO ci_settings (key, value) VALUES
  ('house_rate_hudson', '5'),
  ('house_rate_alison', '5'),
  ('program_price',     '25000'),
  ('program_currency',  'BRL');
