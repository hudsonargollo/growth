-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Phase 3 — multi-video support (shorts + longform per project)
-- Run AFTER 20260526_projects_and_session_names.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. scripts: video type + parent relationship + position within parent
ALTER TABLE scripts
  ADD COLUMN IF NOT EXISTS "videoType"      TEXT    DEFAULT 'longform',
  ADD COLUMN IF NOT EXISTS "parentScriptId" TEXT    REFERENCES scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "videoIndex"     INTEGER DEFAULT 0;

-- 2. voiceovers: track which section each file covers (for per-section mode)
ALTER TABLE voiceovers
  ADD COLUMN IF NOT EXISTS "sectionLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sectionIndex" INTEGER;

-- 3. Index: fast lookup of shorts by parent
CREATE INDEX IF NOT EXISTS idx_scripts_parent ON scripts ("parentScriptId");
