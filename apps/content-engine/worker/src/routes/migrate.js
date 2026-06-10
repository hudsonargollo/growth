// ── One-time migration runner ─────────────────────────────────────────────────
// GET /api/admin/migrate?token=<MIGRATE_SECRET>
//
// Calls the Supabase Management API to execute the pending DDL migrations.
// Set MIGRATE_SECRET via: npx wrangler secret put MIGRATE_SECRET
// Set SUPABASE_ACCESS_TOKEN via: npx wrangler secret put SUPABASE_ACCESS_TOKEN
//   (generate at: https://supabase.com/dashboard/account/tokens)
//
// Usage (run once, then this route is safe to leave in place):
//   curl https://fabricadeconteudo.clubemkt.digital/api/admin/migrate?token=YOUR_SECRET

import { Hono } from 'hono'
const router = new Hono()

const MIGRATION_SQL = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT        PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT,
  "tenantId"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add name + projectId to mining_sessions
ALTER TABLE mining_sessions
  ADD COLUMN IF NOT EXISTS name        TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- Add projectId + video columns to scripts
ALTER TABLE scripts
  ADD COLUMN IF NOT EXISTS "projectId"      TEXT    REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "videoType"      TEXT    DEFAULT 'longform',
  ADD COLUMN IF NOT EXISTS "parentScriptId" TEXT    REFERENCES scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "videoIndex"     INTEGER DEFAULT 0;

-- Add section + project columns to voiceovers
ALTER TABLE voiceovers
  ADD COLUMN IF NOT EXISTS "projectId"    TEXT REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "sectionLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sectionIndex" INTEGER;

-- Real product review count (ML /reviews/item). rating already exists; this persists
-- the buyer review volume so it survives catalog reloads instead of being stripped.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mining_sessions_project ON mining_sessions ("projectId");
CREATE INDEX IF NOT EXISTS idx_scripts_project         ON scripts         ("projectId");
CREATE INDEX IF NOT EXISTS idx_voiceovers_project      ON voiceovers      ("projectId");
CREATE INDEX IF NOT EXISTS idx_scripts_parent          ON scripts         ("parentScriptId");
`

router.get('/migrate', async (c) => {
  // Token guard — prevent accidental or malicious invocation
  const token          = c.req.query('token') ?? ''
  const expectedToken  = c.env.MIGRATE_SECRET ?? ''
  if (!expectedToken || token !== expectedToken) {
    return c.json({ error: 'Unauthorized — set MIGRATE_SECRET and pass ?token=...' }, 401)
  }

  // Extract project ref from SUPABASE_URL (https://<ref>.supabase.co)
  const supabaseUrl   = (c.env.SUPABASE_URL ?? '').trim()
  const accessToken   = (c.env.SUPABASE_ACCESS_TOKEN ?? '').trim()
  const serviceKey    = (c.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

  if (!supabaseUrl) return c.json({ error: 'SUPABASE_URL not set' }, 500)

  // Try Management API first (requires SUPABASE_ACCESS_TOKEN PAT)
  const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (refMatch && accessToken) {
    const ref = refMatch[1]
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    })
    const mgmtData = await mgmtRes.json().catch(() => ({}))
    if (mgmtRes.ok) return c.json({ ok: true, method: 'management-api', result: mgmtData })
    // Fall through to try pg-meta
    console.error('Management API failed:', mgmtData)
  }

  // Fallback: try pg-meta internal API (available on Supabase hosted instances)
  if (supabaseUrl && serviceKey) {
    const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    })
    const pgData = await pgRes.json().catch(() => ({}))
    if (pgRes.ok) return c.json({ ok: true, method: 'pg-meta', result: pgData })
    console.error('pg-meta failed:', pgData)
  }

  return c.json({
    error: 'Could not run migration automatically. Set SUPABASE_ACCESS_TOKEN and MIGRATE_SECRET, or run SQL manually in the Supabase dashboard.',
    sql: MIGRATION_SQL,
  }, 500)
})

export default router
