-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Add tenant_id to all content tables
--
-- Order of operations (safe for tables that may already have rows):
--   1. Seed the root "Growth Clube" tenant (plan = agency, status = active).
--   2. Add tenant_id as nullable to each content table.
--   3. Backfill all existing rows to the root tenant.
--   4. Promote tenant_id to NOT NULL.
--   5. Add indexes.
--   6. Drop tool_credentials (superseded by tenant_api_keys).
--
-- The root tenant UUID is pinned so it can be referenced by name in code:
--   ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
--
-- IMPORTANT: Run migration 001 first.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Seed the root "Growth Clube" tenant ───────────────────────────────
-- owner_id is NULL until hudsonargollo@gmail.com logs in for the first time
-- and we link their auth.users.id to this tenant (handled in the worker's
-- post-login hook / first-login middleware).

INSERT INTO tenants (id, name, slug, status, plan, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Growth Clube',
  'growth-clube',
  'active',
  'agency',
  now()
)
ON CONFLICT (id) DO NOTHING;  -- idempotent: safe to re-run

-- ── Step 2 + 3 + 4: Add tenant_id, backfill, enforce NOT NULL ─────────────────
-- We use a DO block so we can check whether each column already exists
-- (makes the migration safely re-runnable).

DO $$
DECLARE
  root_tenant uuid := '00000000-0000-0000-0000-000000000001';
BEGIN

  -- ── products ──────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='products' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE products ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE products SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── catalog_entries ───────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='catalog_entries' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE catalog_entries ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE catalog_entries SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE catalog_entries ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── scripts ───────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='scripts' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE scripts ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE scripts SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE scripts ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── voiceovers ────────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='voiceovers' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE voiceovers ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE voiceovers SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE voiceovers ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── delivery_jobs ─────────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='delivery_jobs' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE delivery_jobs ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE delivery_jobs SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE delivery_jobs ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── comment_reply_jobs ────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='comment_reply_jobs' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE comment_reply_jobs ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE comment_reply_jobs SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE comment_reply_jobs ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- ── mining_sessions ───────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='mining_sessions' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE mining_sessions ADD COLUMN tenant_id uuid REFERENCES tenants(id);
    UPDATE mining_sessions SET tenant_id = root_tenant WHERE tenant_id IS NULL;
    ALTER TABLE mining_sessions ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

END $$;

-- ── Step 5: Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS products_tenant_id_idx            ON products           (tenant_id);
CREATE INDEX IF NOT EXISTS catalog_entries_tenant_id_idx     ON catalog_entries    (tenant_id);
CREATE INDEX IF NOT EXISTS scripts_tenant_id_idx             ON scripts            (tenant_id);
CREATE INDEX IF NOT EXISTS voiceovers_tenant_id_idx          ON voiceovers         (tenant_id);
CREATE INDEX IF NOT EXISTS delivery_jobs_tenant_id_idx       ON delivery_jobs      (tenant_id);
CREATE INDEX IF NOT EXISTS comment_reply_jobs_tenant_id_idx  ON comment_reply_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS mining_sessions_tenant_id_idx     ON mining_sessions    (tenant_id);

-- ── Step 6: Deprecate tool_credentials ───────────────────────────────────────
-- tool_credentials is replaced by tenant_api_keys (migration 001).
-- We rename it rather than drop it immediately so any in-flight data can
-- be inspected and migrated to tenant_api_keys before final removal.
-- To fully drop after confirming data migration:
--   DROP TABLE tool_credentials_deprecated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tool_credentials'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tool_credentials_deprecated'
  ) THEN
    ALTER TABLE tool_credentials RENAME TO tool_credentials_deprecated;
    COMMENT ON TABLE tool_credentials_deprecated
      IS 'DEPRECATED — superseded by tenant_api_keys. Safe to drop after data migration.';
  END IF;
END $$;
