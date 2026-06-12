-- ─────────────────────────────────────────────────────────────────────────────
-- 0003 — Richer lead profile: company qualification fields captured in step 2
-- of the landing form. Step 1 (nome + WhatsApp) is always saved first, so even
-- abandoned / "curious only" leads are persisted; these columns fill on qualify.
-- Apply remote: wrangler d1 execute CI_DB --remote --file=./migrations/0003_lead_profile.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads ADD COLUMN segmento     TEXT;   -- business niche / segment (free text)
ALTER TABLE leads ADD COLUMN headcount    TEXT;   -- team-size band key (solo|2-5|6-10|11-50|acima-50)
ALTER TABLE leads ADD COLUMN revenue_band TEXT;   -- monthly-revenue band key (ate-50k|50-100k|100-500k|500k-1m|acima-1m)
ALTER TABLE leads ADD COLUMN instagram    TEXT;   -- @ handle
ALTER TABLE leads ADD COLUMN qualified_at TEXT;   -- set when step-2 qualification completes

CREATE INDEX IF NOT EXISTS idx_leads_revenue_band ON leads(revenue_band);
CREATE INDEX IF NOT EXISTS idx_leads_headcount    ON leads(headcount);
