-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Projects model + named mining sessions
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT        PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT,
  "tenantId"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add name + projectId to mining_sessions
ALTER TABLE mining_sessions
  ADD COLUMN IF NOT EXISTS name        TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- 3. Add projectId to scripts
ALTER TABLE scripts
  ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- 4. (Optional) Add projectId to voiceovers for full pipeline linking
ALTER TABLE voiceovers
  ADD COLUMN IF NOT EXISTS "projectId" TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mining_sessions_project ON mining_sessions ("projectId");
CREATE INDEX IF NOT EXISTS idx_scripts_project         ON scripts         ("projectId");
CREATE INDEX IF NOT EXISTS idx_voiceovers_project      ON voiceovers      ("projectId");
