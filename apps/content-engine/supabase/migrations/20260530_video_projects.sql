-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Phase 0 — agentic video generator state machine
-- Run AFTER 20260526_phase3_video_types.sql
--
-- One row per video production. The orchestrator (videoOrchestratorService) is a
-- state machine that advances `status` one step per request/webhook. State must
-- live here (not in-memory) because Worker invocations are short-lived and the
-- Higgsfield/render callbacks arrive minutes after the dispatching request ends.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        uuid,
  "scriptId"      text REFERENCES scripts(id) ON DELETE SET NULL,

  -- 'short' = 9:16 (TikTok/Reels/Shorts) | 'long' = 16:9 (YouTube)
  format          text NOT NULL DEFAULT 'short' CHECK (format IN ('short', 'long')),

  -- State machine. Transitions:
  --   draft → scripting → voiced → generating_assets → composing → rendering → done
  --   any node → failed (with statusReason)
  status          text NOT NULL DEFAULT 'draft',
  "statusReason"  text DEFAULT '',

  -- Higgsfield Soul V2 character id (long-form character continuity)
  "characterId"   text,

  -- The deterministic Remotion JSON blueprint handed to the Cloud Run renderer.
  blueprint       jsonb DEFAULT '{}',

  -- Per-scene asset tracking, e.g.
  -- [{ sceneIndex, higgsfieldRequestId, mediaUrl, mediaType, status }]
  "assetManifest" jsonb DEFAULT '[]',

  -- ElevenLabs word-level alignment ({ text, start, end, type }[]) the composer
  -- converts to frame in/out points.
  alignment       jsonb DEFAULT '[]',
  "audioUrl"      text,

  "creditsSpent"  integer DEFAULT 0,
  "finalUrl"      text,

  "createdAt"     timestamptz DEFAULT now(),
  "updatedAt"     timestamptz DEFAULT now()
);

-- Fast lookup of a user's projects, newest first.
CREATE INDEX IF NOT EXISTS idx_video_projects_user
  ON video_projects ("userId", "createdAt" DESC);

-- Webhooks arrive keyed by Higgsfield request id; index the manifest for lookup.
CREATE INDEX IF NOT EXISTS idx_video_projects_manifest
  ON video_projects USING gin ("assetManifest");
