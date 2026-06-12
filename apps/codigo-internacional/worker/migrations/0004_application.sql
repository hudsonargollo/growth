-- ─────────────────────────────────────────────────────────────────────────────
-- 0004 — Full application questionnaire (pré-venda campaign form).
-- `company` is promoted to a column; the long-form answers live in `application`
-- (JSON blob) so the questionnaire can evolve without schema churn.
-- Apply remote: wrangler d1 execute CI_DB --remote --file=./migrations/0004_application.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads ADD COLUMN company     TEXT;   -- nome da empresa
ALTER TABLE leads ADD COLUMN application TEXT;   -- JSON: years, tax_estimate, main_challenge, problem_to_solve, value_add, availability, decision_timeline, wants_call
