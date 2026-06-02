// ─────────────────────────────────────────────────────────────────────────────
// videoOrchestratorService — the "Director"
//
// An explicit state machine over a `video_projects` row. Each function advances
// status one step and is idempotent on the project id, because Worker invocations
// are short-lived: the request that *dispatches* Higgsfield jobs ends long before
// the completion webhooks arrive. State therefore lives in Supabase, never memory.
//
//   draft → scripting → voiced → generating_assets → composing → rendering → done
//                                       │
//                                  (any node → failed, with statusReason)
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../lib/db.js'
import { generate, routeModel } from './higgsfieldService.js'
import { composeBlueprint, validateBlueprint } from './remotionComposer.js'
import { generateAlignedVoiceover } from './voiceoverService.js'
import { reserve as reserveCredits, commit as commitCredits, refund as refundCredits } from './creditLedgerService.js'
import { hmacHex } from '../lib/hmac.js'
import { resolveKey } from '../lib/resolveKey.js'

const TABLE = 'video_projects'

// Per-project hard ceiling on estimated credits — a coarse runaway-loop guard
// until creditLedgerService lands. Tune per format.
const CREDIT_CEILING = { short: 400, long: 1500 }

// Default model intent per format (cheap models during beta — see PRD phase 2).
const DEFAULT_VIDEO_INTENT = { short: 'kinetic', long: 'cinematic' }

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createVideoProject(env, { userId, scriptId, format = 'short' }) {
  if (!['short', 'long'].includes(format)) throw new Error(`invalid format "${format}"`)
  const db = getDb(env)
  const { data, error } = await db
    .from(TABLE)
    .insert({ userId, scriptId, format, status: 'draft' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listVideoProjects(env, userId) {
  const db = getDb(env)
  let q = db.from(TABLE).select('*').order('createdAt', { ascending: false })
  if (userId) q = q.eq('userId', userId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getVideoProject(env, id) {
  const db = getDb(env)
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

async function patch(env, id, fields) {
  const db = getDb(env)
  const { data, error } = await db
    .from(TABLE)
    .update({ ...fields, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function failProject(env, id, reason) {
  return patch(env, id, { status: 'failed', statusReason: String(reason).slice(0, 500) })
}

// ── Step: synthesize aligned voiceover ──────────────────────────────────────────

/**
 * Synthesize the project's voiceover with ElevenLabs word-level timestamps and
 * persist { audioUrl, alignment } onto the project, advancing to `voiced`. The
 * alignment is what the composer later converts to caption frame in/out points.
 *
 * @param {object} env
 * @param {string} projectId
 * @param {object} opts  { voiceId?, stability?, similarityBoost? }
 */
export async function voiceProject(env, projectId, opts = {}) {
  const project = await getVideoProject(env, projectId)
  if (!project.scriptId) throw new Error('project has no scriptId to voice')

  try {
    const { audioUrl, alignment } = await generateAlignedVoiceover(env, {
      scriptId: project.scriptId,
      voiceId: opts.voiceId,
      stability: opts.stability,
      similarityBoost: opts.similarityBoost,
    })
    return patch(env, projectId, { status: 'voiced', audioUrl, alignment })
  } catch (e) {
    await failProject(env, projectId, `voiceover failed: ${e.message}`)
    throw e
  }
}

// ── Step: dispatch asset generation ────────────────────────────────────────────

/**
 * Kick off one Higgsfield job per scene. Reads scenes from the project blueprint
 * (preferred) or a passed-in scenes array. Writes a pending manifest entry per
 * scene and moves the project to `generating_assets`. Completion is handled by
 * handleHiggsfieldWebhook.
 *
 * @param {object} env
 * @param {string} projectId
 * @param {object} opts
 * @param {Array}  opts.scenes        [{ mcsla, intent?, imageUrl?, characterId? }]
 * @param {string} opts.webhookBase   absolute origin for the callback (e.g. RENDER_SERVICE_URL host)
 */
export async function startAssetGeneration(env, projectId, { scenes, webhookBase }) {
  const project = await getVideoProject(env, projectId)
  if (!scenes?.length) throw new Error('startAssetGeneration: no scenes provided')

  const aspectRatio = project.format === 'long' ? '16:9' : '9:16'
  const defaultIntent = DEFAULT_VIDEO_INTENT[project.format]

  // Pre-flight credit estimate (coarse guard until creditLedgerService).
  const estimate = scenes.reduce((sum, s) => sum + routeModel(s.intent || defaultIntent).credits, 0)
  if (estimate > CREDIT_CEILING[project.format]) {
    throw new Error(
      `credit estimate ${estimate} exceeds ${project.format} ceiling ${CREDIT_CEILING[project.format]} — split the project`,
    )
  }

  // Reserve the estimated credits up front. With no userId (open/internal calls)
  // the ledger is skipped and only the coarse ceiling above applies.
  let reservationId = null
  if (project.userId) {
    const r = await reserveCredits(env, {
      userId: project.userId, projectId, amount: estimate,
      note: `${scenes.length} scenes (${project.format})`,
    })
    reservationId = r.reservationId
  }

  const webhookUrl = `${webhookBase}/api/video/webhooks/higgsfield?project=${projectId}`

  const manifest = []
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const intent = scene.intent || defaultIntent
    try {
      const { requestId, model, credits } = await generate(env, {
        intent,
        mcsla: scene.mcsla,
        aspectRatio,
        imageUrl: scene.imageUrl,
        characterId: scene.characterId || project.characterId,
        webhookUrl,
      })
      manifest.push({ sceneIndex: i, higgsfieldRequestId: requestId, model, credits, mediaUrl: null, mediaType: null, status: 'pending' })
    } catch (e) {
      manifest.push({ sceneIndex: i, higgsfieldRequestId: null, status: 'failed', error: e.message })
    }
  }

  const anyDispatched = manifest.some((m) => m.status === 'pending')

  // Nothing dispatched → release the whole hold immediately.
  if (!anyDispatched && reservationId) {
    await refundCredits(env, { reservationId, note: 'all scene dispatches failed' })
    reservationId = null
  }

  return patch(env, projectId, {
    status: anyDispatched ? 'generating_assets' : 'failed',
    statusReason: anyDispatched ? '' : 'all scene dispatches failed',
    assetManifest: manifest,
    creditReservationId: reservationId,
  })
}

// ── Step: Higgsfield completion webhook ─────────────────────────────────────────

/**
 * Match a completed Higgsfield request to its manifest entry and update it. When
 * every scene is complete, advance to `composing`. Idempotent: re-delivering a
 * webhook for an already-resolved scene is a no-op.
 *
 * @param {object} env
 * @param {string} projectId
 * @param {object} payload  { request_id|requestId, status, output:{ media_url[], media_type } }
 */
export async function handleHiggsfieldWebhook(env, projectId, payload) {
  const requestId = payload.request_id || payload.requestId
  const status = (payload.status || '').toUpperCase()
  if (!requestId) throw new Error('webhook missing request_id')

  const project = await getVideoProject(env, projectId)
  const manifest = Array.isArray(project.assetManifest) ? [...project.assetManifest] : []
  const entry = manifest.find((m) => m.higgsfieldRequestId === requestId)
  if (!entry) return project                      // unknown request — ignore
  if (entry.status === 'complete' || entry.status === 'failed') return project // idempotent

  if (status === 'COMPLETED') {
    entry.status = 'complete'
    entry.mediaUrl = payload.output?.media_url?.[0] || null
    entry.mediaType = payload.output?.media_type || null
  } else if (status === 'FAILED' || status === 'ERROR') {
    entry.status = 'failed'
    entry.error = payload.error || status
  } else {
    return project                                // PENDING/PROCESSING — nothing to persist
  }

  const allDone = manifest.every((m) => m.status === 'complete' || m.status === 'failed')
  const anyFailed = manifest.some((m) => m.status === 'failed')
  const spent = manifest.filter((m) => m.status === 'complete').reduce((s, m) => s + (m.credits || 0), 0)

  const next = { assetManifest: manifest, creditsSpent: spent }
  if (allDone) {
    next.status = anyFailed ? 'failed' : 'composing'
    if (anyFailed) next.statusReason = 'one or more scene generations failed'
    // Finalize the hold: charge only what completed, auto-refund the rest.
    if (project.creditReservationId) {
      await commitCredits(env, { reservationId: project.creditReservationId, actualAmount: spent })
      next.creditReservationId = null
    }
  }
  return patch(env, projectId, next)
}

// ── Step: compose blueprint + dispatch render to Cloud Run ──────────────────────

/**
 * Compose the deterministic blueprint from project state and hand it to the Cloud
 * Run Remotion renderer. Valid only from `composing`. Persists the blueprint,
 * signs the payload (HMAC), POSTs it, and moves the project to `rendering`. The
 * final .mp4 arrives later at the render webhook.
 *
 * @param {object} env
 * @param {string} projectId
 * @param {object} opts            forwarded to composeBlueprint (fps, audioUrl, musicUrl, alignment)
 * @param {string} opts.webhookBase public origin Cloud Run will call back on
 */
export async function dispatchRender(env, projectId, opts = {}) {
  const project = await getVideoProject(env, projectId)

  const blueprint = composeBlueprint(project, opts)
  const { ok, errors } = validateBlueprint(blueprint)
  if (!ok) {
    await failProject(env, projectId, `invalid blueprint: ${errors.join('; ')}`)
    throw new Error(`invalid blueprint: ${errors.join('; ')}`)
  }

  const renderUrl = env.RENDER_SERVICE_URL
  if (!renderUrl) throw new Error('RENDER_SERVICE_URL not configured')
  const secret = await resolveKey(env, 'RENDER_WEBHOOK_SECRET')
  if (!secret) throw new Error('RENDER_WEBHOOK_SECRET not configured')

  const webhookBase = opts.webhookBase || ''
  const callbackUrl = `${webhookBase}/api/video/webhooks/render?project=${projectId}`
  const body = JSON.stringify({ projectId, blueprint, callbackUrl })
  const signature = await hmacHex(secret, body)

  // Persist the blueprint and flip to rendering BEFORE the POST so a webhook that
  // races back can't find the project in the wrong state.
  await patch(env, projectId, { status: 'rendering', blueprint })

  const res = await fetch(`${renderUrl.replace(/\/$/, '')}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': `sha256=${signature}` },
    body,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    await failProject(env, projectId, `render dispatch failed (${res.status}): ${txt.slice(0, 200)}`)
    throw new Error(`render dispatch failed (${res.status})`)
  }

  return getVideoProject(env, projectId)
}

// ── Step: render completion webhook (from Cloud Run) ────────────────────────────

/**
 * Called by the Cloud Run Remotion renderer when the final .mp4 is ready.
 * @param {object} payload { status, finalUrl }
 */
export async function handleRenderWebhook(env, projectId, payload) {
  const status = (payload.status || '').toUpperCase()
  if (status === 'DONE' || status === 'COMPLETED') {
    return patch(env, projectId, { status: 'done', finalUrl: payload.finalUrl || null })
  }
  return failProject(env, projectId, payload.error || 'render failed')
}
