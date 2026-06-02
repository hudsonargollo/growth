// ─────────────────────────────────────────────────────────────────────────────
// higgsfieldService — Higgsfield AI generative backend client
//
// Edge-compatible: uses fetch() + resolveKey() only. No Node APIs, no SDK that
// pulls in Node built-ins (the official @higgsfield/client targets Node and must
// NOT be bundled into the Worker — we call the REST API directly instead).
//
// ⚠️ VERIFY BEFORE PRODUCTION: every endpoint path, model id, and credit cost
// below is transcribed from the PRD and has NOT been confirmed against live
// Higgsfield docs. Centralised here so confirming them is a single-file edit.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveKey } from '../lib/resolveKey.js'
import { buildMcslaPrompt } from '../lib/mcsla.js'

// ── API surface (VERIFY) ──────────────────────────────────────────────────────
const HF_BASE = 'https://platform.higgsfield.ai' // VERIFY base origin
const ENDPOINTS = {
  generate:      '/v1/generate',                  // POST — mode auto-detected
  status:        (id) => `/v2/requests/status/${id}`,
  createCharacter: '/v1/characters',              // POST — Soul V2 character training
}

// ── Model router ──────────────────────────────────────────────────────────────
// The agent passes a semantic `intent`; we resolve the concrete model id, kind,
// and (illustrative) credit cost. Costs are used by creditLedgerService for the
// pre-flight estimate — they are NOT authoritative billing values.
export const MODELS = {
  // images
  storyboard:   { id: 'nano-banana-pro', kind: 'image', credits: 2  }, // cheap iteration (default)
  infographic:  { id: 'flux-2',          kind: 'image', credits: 6  }, // stylized / data-viz
  product:      { id: 'gpt-image-2',     kind: 'image', credits: 8  }, // photoreal plates
  character:    { id: 'soul-v2',         kind: 'image', credits: 10 }, // consistent identity
  // video
  kinetic:      { id: 'seedance-2.0',    kind: 'video', credits: 30 }, // short-form, native A/V
  motion:       { id: 'kling-3.0',       kind: 'video', credits: 50 }, // heavy movement
  cinematic:    { id: 'veo-3.1',         kind: 'video', credits: 60 }, // 4K establishing shots
}

const ALLOWED_RATIOS = ['16:9', '9:16', '1:1']

/**
 * Resolve a model spec from a semantic intent. Throws on unknown intent so the
 * agent self-corrects instead of silently picking the wrong (expensive) model.
 */
export function routeModel(intent) {
  const spec = MODELS[intent]
  if (!spec) {
    throw new Error(`routeModel: unknown intent "${intent}". Valid: ${Object.keys(MODELS).join(', ')}`)
  }
  return spec
}

async function authHeaders(env) {
  const key = await resolveKey(env, 'HIGGSFIELD_API_KEY')
  if (!key) throw new Error('HIGGSFIELD_API_KEY not configured (Wrangler secret or encrypted KV)')
  // VERIFY auth scheme — single `credentials` field per PRD; sent as Bearer here.
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

/**
 * Dispatch a generation job. Asynchronous: returns { requestId } immediately;
 * completion arrives at the webhook URL (preferred) or via getStatus polling.
 *
 * @param {object} env       Worker env (for resolveKey)
 * @param {object} opts
 * @param {string} opts.intent        model-router key (see MODELS)
 * @param {object} opts.mcsla         MCSLA prompt parts (see lib/mcsla.js)
 * @param {string} [opts.aspectRatio] '16:9' | '9:16' | '1:1'
 * @param {string} [opts.imageUrl]    reference image → triggers image-to-video mode
 * @param {string} [opts.characterId] Soul V2 id → triggers character continuity
 * @param {string} [opts.webhookUrl]  X-Webhook-URL for completion callback
 * @param {number} [opts.seed]        for deterministic retries on stuck jobs
 * @returns {Promise<{ requestId: string, model: string, credits: number }>}
 */
export async function generate(env, opts) {
  const { intent, mcsla, aspectRatio = '9:16', imageUrl, characterId, webhookUrl, seed } = opts
  const model = routeModel(intent)

  if (!ALLOWED_RATIOS.includes(aspectRatio)) {
    throw new Error(`generate: invalid aspectRatio "${aspectRatio}" — must be ${ALLOWED_RATIOS.join(', ')}`)
  }

  const prompt = buildMcslaPrompt({ model: model.id, ...mcsla })

  const payload = {
    model: model.id,
    prompt,
    aspect_ratio: aspectRatio,        // VERIFY param name
    ...(imageUrl ? { image_url: imageUrl } : {}),        // VERIFY → image-to-video
    ...(characterId ? { character_id: characterId } : {}), // VERIFY → Soul mode
    ...(typeof seed === 'number' ? { seed } : {}),
  }

  const headers = await authHeaders(env)
  if (webhookUrl) headers['X-Webhook-URL'] = webhookUrl

  const res = await fetch(`${HF_BASE}${ENDPOINTS.generate}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `Higgsfield generate failed (${res.status})`)
    err.status = res.status
    err.body = data
    throw err
  }

  // VERIFY response field name for the request id.
  const requestId = data.request_id || data.id
  if (!requestId) throw new Error('Higgsfield generate: no request_id in response')

  return { requestId, model: model.id, credits: model.credits }
}

/**
 * Poll a job's status. Used only as a reconciliation fallback — webhooks are the
 * primary completion path. Returns the raw provider payload normalised to:
 *   { status, mediaUrl[], mediaType, raw }
 * status ∈ 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ERROR'
 */
export async function getStatus(env, requestId) {
  const headers = await authHeaders(env)
  const res = await fetch(`${HF_BASE}${ENDPOINTS.status(requestId)}`, { headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Higgsfield status failed (${res.status})`)

  return {
    status: (data.status || 'PENDING').toUpperCase(),
    mediaUrl: data.output?.media_url || [],
    mediaType: data.output?.media_type || null,
    raw: data,
  }
}

/**
 * Train a persistent Soul V2 character from reference images. Long-form only.
 * Returns { characterId } once training is queued/complete (VERIFY async shape —
 * may itself be a request that completes via webhook).
 *
 * @param {object} env
 * @param {object} opts
 * @param {string}   opts.name
 * @param {string[]} opts.referenceImageUrls
 */
export async function createCharacter(env, { name, referenceImageUrls }) {
  if (!referenceImageUrls?.length) {
    throw new Error('createCharacter: at least one reference image url is required')
  }
  const headers = await authHeaders(env)
  const res = await fetch(`${HF_BASE}${ENDPOINTS.createCharacter}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, reference_images: referenceImageUrls }), // VERIFY param names
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Higgsfield createCharacter failed (${res.status})`)

  const characterId = data.character_id || data.id
  if (!characterId) throw new Error('Higgsfield createCharacter: no character_id in response')
  return { characterId, raw: data }
}
