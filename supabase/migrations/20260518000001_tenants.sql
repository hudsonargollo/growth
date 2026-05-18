-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Multi-tenancy foundation tables
--
-- Creates:
--   tenants          — one row per tenant (individual creator or agency)
--   tenant_members   — maps auth.users → tenants with a role
--   tenant_api_keys  — per-tenant encrypted API credentials
--   audit_log        — immutable record of admin actions & impersonation
--
-- Run once against your Supabase project via the SQL editor or:
--   supabase db push  (if using Supabase CLI with supabase/config.toml)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── tenants ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending',
  plan        text        NOT NULL DEFAULT 'free',

  -- The Supabase auth user who owns (and first created) this tenant.
  -- SET NULL on delete so the tenant record survives if the owner account
  -- is removed; a new owner can be assigned manually.
  owner_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Non-null only for sub-tenants created by an agency.
  -- Points to the parent agency tenant.
  agency_id   uuid        REFERENCES tenants(id) ON DELETE SET NULL,

  -- Audit fields set by the root admin on approval/rejection.
  approved_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,

  -- Custom system prompt for the YouTube comment agent (Q4 = B).
  -- NULL means: use the platform default BRAND_TONE.
  brand_tone  text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb       NOT NULL DEFAULT '{}',

  CONSTRAINT tenants_status_check CHECK (status  IN ('pending','active','suspended','rejected')),
  CONSTRAINT tenants_plan_check   CHECK (plan    IN ('free','pro','agency')),
  CONSTRAINT tenants_slug_unique  UNIQUE (slug)
);

COMMENT ON TABLE  tenants              IS 'One row per platform tenant (creator, agency, or sub-tenant).';
COMMENT ON COLUMN tenants.brand_tone   IS 'Optional custom system prompt for the comment agent. NULL = use platform default.';
COMMENT ON COLUMN tenants.agency_id    IS 'Parent agency tenant. NULL for standalone tenants.';

CREATE INDEX IF NOT EXISTS tenants_owner_id_idx  ON tenants (owner_id);
CREATE INDEX IF NOT EXISTS tenants_agency_id_idx ON tenants (agency_id);
CREATE INDEX IF NOT EXISTS tenants_status_idx    ON tenants (status);

-- ── tenant_members ────────────────────────────────────────────────────────────
-- Joins auth.users to tenants with an explicit role.
-- A user may belong to more than one tenant (e.g. an agency owner who is
-- also a member of a client sub-tenant).
CREATE TABLE IF NOT EXISTS tenant_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id)      ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'tenant_member',
  invited_by uuid        REFERENCES auth.users(id)            ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tenant_members_unique       UNIQUE (tenant_id, user_id),
  CONSTRAINT tenant_members_role_check   CHECK  (role IN ('tenant_admin','tenant_member'))
);

COMMENT ON TABLE tenant_members IS 'Maps Supabase users to tenants with a role. One row per user-tenant pair.';

CREATE INDEX IF NOT EXISTS tenant_members_user_id_idx   ON tenant_members (user_id);
CREATE INDEX IF NOT EXISTS tenant_members_tenant_id_idx ON tenant_members (tenant_id);

-- ── tenant_api_keys ───────────────────────────────────────────────────────────
-- Stores one API credential per tenant per key_name.
-- Values are AES-GCM encrypted (ciphertext + IV) using the platform
-- CREDENTIALS_SECRET. The existing worker crypto.js module handles this.
--
-- Valid key_name values (enforced at the application layer, not the DB):
--   YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID, YOUTUBE_OAUTH_TOKEN,
--   OPENAI_API_KEY, ELEVENLABS_API_KEY,
--   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
--   SERPAPI_KEY, AMAZON_AFFILIATE_TAG, ML_AFFILIATE_ID
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_name        text        NOT NULL,
  value_encrypted text        NOT NULL,       -- AES-GCM ciphertext, base64url
  iv              text        NOT NULL,       -- Initialisation vector, base64url
  label           text,                       -- Human-readable label (optional)
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT tenant_api_keys_unique UNIQUE (tenant_id, key_name)
);

COMMENT ON TABLE  tenant_api_keys                 IS 'Encrypted per-tenant API credentials. One row per (tenant, key_name) pair.';
COMMENT ON COLUMN tenant_api_keys.value_encrypted IS 'AES-GCM ciphertext encoded as base64url.';
COMMENT ON COLUMN tenant_api_keys.iv              IS 'AES-GCM initialisation vector, base64url.';

CREATE INDEX IF NOT EXISTS tenant_api_keys_tenant_id_idx ON tenant_api_keys (tenant_id);

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Immutable append-only log of admin actions and impersonation sessions.
-- Rows are never updated or deleted.
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  -- action values:
  --   'approve_tenant'  | 'reject_tenant' | 'suspend_tenant' | 'reinstate_tenant'
  --   'impersonate_start' | 'impersonate_end'
  --   'create_subtenant'
  target_type text        NOT NULL,   -- 'tenant' | 'user'
  target_id   uuid,                   -- the tenant or user affected
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'Append-only audit trail for admin actions and impersonation sessions.';

CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx  ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_id_idx  ON audit_log (target_id);
