-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Row Level Security policies
--
-- Enables RLS on every table and applies three policy layers:
--   1. root_admin      — hudsonargollo@gmail.com can read/write everything.
--   2. tenant_isolation — users see only rows belonging to their own tenant(s).
--   3. agency_access   — agency owners can read (but not write) sub-tenant data.
--
-- Helper functions keep policy definitions DRY and efficient.
-- All functions are STABLE so Postgres can cache the result within a query.
--
-- IMPORTANT: The Cloudflare Worker must use a per-request Supabase client
-- built with the user's JWT (not the service role key) for tenant-scoped
-- queries so that these policies are enforced at the DB layer.
--
-- The service role key bypasses RLS entirely — use it only for:
--   - Cron jobs that need to iterate all tenants
--   - Root admin server-side approval operations
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Returns true if the current session belongs to the root administrator.
-- Matching by email is intentional: the root admin may have multiple
-- Supabase user records over time, but the email is the stable identifier.
CREATE OR REPLACE FUNCTION is_root_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT auth.email() = 'hudsonargollo@gmail.com'
$$;

-- Returns the set of tenant IDs the current user is a member of.
-- Used in USING clauses for tenant-scoped read/write access.
CREATE OR REPLACE FUNCTION auth_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM   tenant_members
  WHERE  user_id = auth.uid()
$$;

-- Returns the set of tenant IDs owned by sub-tenants of any agency
-- the current user administers. Used for agency read-only access.
CREATE OR REPLACE FUNCTION auth_agency_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id
  FROM   tenants
  WHERE  agency_id IN (
    SELECT tenant_id
    FROM   tenant_members
    WHERE  user_id = auth.uid()
  )
$$;

-- ── Enable RLS ────────────────────────────────────────────────────────────────
ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE voiceovers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reply_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- ── tenants ───────────────────────────────────────────────────────────────────

-- Root admin has full access to all tenant rows.
CREATE POLICY "tenants_root_admin"
  ON tenants FOR ALL
  USING (is_root_admin());

-- A user can read the tenant(s) they belong to.
CREATE POLICY "tenants_read_own"
  ON tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Agency owners can read their sub-tenants.
CREATE POLICY "tenants_agency_read_subtenants"
  ON tenants FOR SELECT
  USING (agency_id IN (auth_tenant_ids()));

-- Tenant admins can update their own tenant's metadata / brand_tone.
-- They cannot change status, plan, or agency_id (those are admin-only fields).
CREATE POLICY "tenants_admin_update_own"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE  user_id = auth.uid() AND role = 'tenant_admin'
    )
  )
  WITH CHECK (
    -- Prevent tenants from promoting themselves or changing ownership
    status    = (SELECT status    FROM tenants WHERE id = tenants.id) AND
    plan      = (SELECT plan      FROM tenants WHERE id = tenants.id) AND
    owner_id  = (SELECT owner_id  FROM tenants WHERE id = tenants.id) AND
    agency_id = (SELECT agency_id FROM tenants WHERE id = tenants.id)
  );

-- ── tenant_members ────────────────────────────────────────────────────────────

CREATE POLICY "tenant_members_root_admin"
  ON tenant_members FOR ALL
  USING (is_root_admin());

-- Users can read memberships for tenants they belong to (so they can see
-- their team), and can always read their own membership row.
CREATE POLICY "tenant_members_read"
  ON tenant_members FOR SELECT
  USING (
    user_id   = auth.uid()
    OR tenant_id IN (auth_tenant_ids())
  );

-- Only tenant admins can insert/update/delete memberships in their tenant.
CREATE POLICY "tenant_members_admin_write"
  ON tenant_members FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE  user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- ── tenant_api_keys ───────────────────────────────────────────────────────────

CREATE POLICY "tenant_api_keys_root_admin"
  ON tenant_api_keys FOR ALL
  USING (is_root_admin());

-- Only tenant admins can read or write their own API keys.
-- Regular tenant_members cannot see API keys at all.
CREATE POLICY "tenant_api_keys_admin_only"
  ON tenant_api_keys FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE  user_id = auth.uid() AND role = 'tenant_admin'
    )
  );

-- ── Content tables — shared three-policy pattern ──────────────────────────────
-- Macro applied to: products, catalog_entries, scripts, voiceovers,
--                   delivery_jobs, comment_reply_jobs, mining_sessions

-- products
CREATE POLICY "products_root_admin"
  ON products FOR ALL USING (is_root_admin());
CREATE POLICY "products_tenant_isolation"
  ON products FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "products_agency_read"
  ON products FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- catalog_entries
CREATE POLICY "catalog_entries_root_admin"
  ON catalog_entries FOR ALL USING (is_root_admin());
CREATE POLICY "catalog_entries_tenant_isolation"
  ON catalog_entries FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "catalog_entries_agency_read"
  ON catalog_entries FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- scripts
CREATE POLICY "scripts_root_admin"
  ON scripts FOR ALL USING (is_root_admin());
CREATE POLICY "scripts_tenant_isolation"
  ON scripts FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "scripts_agency_read"
  ON scripts FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- voiceovers
CREATE POLICY "voiceovers_root_admin"
  ON voiceovers FOR ALL USING (is_root_admin());
CREATE POLICY "voiceovers_tenant_isolation"
  ON voiceovers FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "voiceovers_agency_read"
  ON voiceovers FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- delivery_jobs
CREATE POLICY "delivery_jobs_root_admin"
  ON delivery_jobs FOR ALL USING (is_root_admin());
CREATE POLICY "delivery_jobs_tenant_isolation"
  ON delivery_jobs FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "delivery_jobs_agency_read"
  ON delivery_jobs FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- comment_reply_jobs
CREATE POLICY "comment_reply_jobs_root_admin"
  ON comment_reply_jobs FOR ALL USING (is_root_admin());
CREATE POLICY "comment_reply_jobs_tenant_isolation"
  ON comment_reply_jobs FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "comment_reply_jobs_agency_read"
  ON comment_reply_jobs FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- mining_sessions
CREATE POLICY "mining_sessions_root_admin"
  ON mining_sessions FOR ALL USING (is_root_admin());
CREATE POLICY "mining_sessions_tenant_isolation"
  ON mining_sessions FOR ALL USING (tenant_id IN (auth_tenant_ids()));
CREATE POLICY "mining_sessions_agency_read"
  ON mining_sessions FOR SELECT USING (tenant_id IN (auth_agency_tenant_ids()));

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Root admin sees all audit rows.
-- Other users can only read rows where they were the actor (their own actions).
-- No user can insert directly — inserts go through the worker's service role client.
CREATE POLICY "audit_log_root_admin"
  ON audit_log FOR ALL
  USING (is_root_admin());

CREATE POLICY "audit_log_read_own"
  ON audit_log FOR SELECT
  USING (actor_id = auth.uid());
