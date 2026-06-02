-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: credit ledger for the video generator
--
-- Hard money guard: every paid Higgsfield call goes through a reserve→commit
-- (or refund) cycle so an autonomous agent can't run a generation loop past the
-- user's balance. `credit_accounts.balance` is the spendable balance AFTER active
-- reservations (reserving decrements it immediately; refunding adds it back).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_accounts (
  "userId"     uuid PRIMARY KEY,
  balance      integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  "lifetimeSpent" integer NOT NULL DEFAULT 0,
  "updatedAt"  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"     uuid NOT NULL,
  "projectId"  uuid REFERENCES video_projects(id) ON DELETE SET NULL,

  -- grant: top-up (+) | reserve: hold (−) | commit: finalize a hold | refund: release (+)
  kind         text NOT NULL CHECK (kind IN ('grant', 'reserve', 'commit', 'refund')),
  amount       integer NOT NULL,            -- credits; signed by convention per kind
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'refunded')),
  note         text DEFAULT '',
  "createdAt"  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user    ON credit_ledger ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_project ON credit_ledger ("projectId");

-- Link a project to its active reservation so commit/refund can find it.
ALTER TABLE video_projects
  ADD COLUMN IF NOT EXISTS "creditReservationId" uuid REFERENCES credit_ledger(id) ON DELETE SET NULL;
