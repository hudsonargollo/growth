-- ─────────────────────────────────────────────────────────────────────────────
-- 0006 — Board feedback for the internal landing-page review (/pagereview).
-- Apply remote: wrangler d1 execute CI_DB --remote --file=./migrations/0006_review_feedback.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_feedback (
  id             TEXT PRIMARY KEY,
  name           TEXT,
  role           TEXT,
  prefer_urgency TEXT,   -- chosen urgency option key
  ready          TEXT,   -- ready | almost | no
  weakest        TEXT,   -- weakest part of the page (free text)
  copy_changes   TEXT,   -- copy they'd change (free text)
  notes          TEXT,   -- other notes (free text)
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
