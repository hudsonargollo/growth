/**
 * /api/video — agentic video generator
 *
 *   GET    /api/video                      list projects (optional ?userId=)
 *   POST   /api/video                      create project { scriptId, format, userId? }
 *   GET    /api/video/:id                  get one project
 *   POST   /api/video/:id/generate-assets  dispatch Higgsfield jobs { scenes:[...] }
 *   POST   /api/video/webhooks/higgsfield  Higgsfield completion callback (HMAC/token)
 *   POST   /api/video/webhooks/render      Cloud Run render callback (HMAC)
 *
 * Webhook routes are PUBLIC (external callers) and therefore verified by signature
 * instead of auth. CRUD routes follow the codebase's existing open-route pattern.
 */
import { Hono } from 'hono'
import { resolveKey } from '../lib/resolveKey.js'
import { hmacHex, safeEqual } from '../lib/hmac.js'
import {
  createVideoProject,
  listVideoProjects,
  getVideoProject,
  voiceProject,
  startAssetGeneration,
  dispatchRender,
  handleHiggsfieldWebhook,
  handleRenderWebhook,
} from '../services/videoOrchestratorService.js'
import { composeBlueprint, validateBlueprint } from '../services/remotionComposer.js'
import { getAccount, grant } from '../services/creditLedgerService.js'

const router = new Hono()

/** Verify X-Signature header = HMAC-SHA256(secret, rawBody). Returns {ok, raw}. */
async function verifySignature(c, secret) {
  if (!secret) return { ok: false, raw: '' }
  const raw = await c.req.text()
  const provided = (c.req.header('X-Signature') || '').replace(/^sha256=/, '').trim()
  const expected = await hmacHex(secret, raw)
  return { ok: safeEqual(provided, expected), raw }
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

router.get('/', async (c) => {
  const userId = c.req.query('userId') || null
  const projects = await listVideoProjects(c.env, userId)
  return c.json({ projects })
})

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.scriptId) return c.json({ error: 'scriptId é obrigatório' }, 400)
  try {
    const project = await createVideoProject(c.env, {
      userId: body.userId || null,
      scriptId: body.scriptId,
      format: body.format || 'short',
    })
    return c.json({ project }, 201)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

router.get('/:id', async (c) => {
  try {
    const project = await getVideoProject(c.env, c.req.param('id'))
    return c.json({ project })
  } catch (e) {
    return c.json({ error: e.message }, 404)
  }
})

// Synthesize the aligned voiceover (ElevenLabs with-timestamps) → 'voiced'.
router.post('/:id/voice', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  try {
    const project = await voiceProject(c.env, id, {
      voiceId: body.voiceId,
      stability: body.stability,
      similarityBoost: body.similarityBoost,
    })
    return c.json({ project })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// Dispatch one Higgsfield job per scene. The webhook base must be a public origin
// Higgsfield can reach (the deployed Worker host), not localhost.
router.post('/:id/generate-assets', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (!Array.isArray(body.scenes) || body.scenes.length === 0) {
    return c.json({ error: 'scenes[] é obrigatório' }, 400)
  }
  const webhookBase = body.webhookBase || new URL(c.req.url).origin
  try {
    const project = await startAssetGeneration(c.env, id, { scenes: body.scenes, webhookBase })
    return c.json({ project })
  } catch (e) {
    if (e.code === 'INSUFFICIENT_CREDITS') {
      return c.json({ error: e.message, code: e.code, needed: e.needed, available: e.available }, 402)
    }
    return c.json({ error: e.message }, 400)
  }
})

// ── Credits ──────────────────────────────────────────────────────────────────
router.get('/account/:userId', async (c) => {
  try {
    const account = await getAccount(c.env, c.req.param('userId'))
    return c.json({ account })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// Admin/purchase top-up. (Gate behind real auth before exposing publicly.)
router.post('/account/:userId/grant', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.amount || body.amount <= 0) return c.json({ error: 'amount > 0 required' }, 400)
  try {
    const balance = await grant(c.env, { userId: c.req.param('userId'), amount: body.amount, note: body.note })
    return c.json({ balance })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// Preview the composed blueprint without rendering (debug / UI preview).
router.get('/:id/blueprint', async (c) => {
  try {
    const project = await getVideoProject(c.env, c.req.param('id'))
    const fps = Number(c.req.query('fps')) || 30
    const blueprint = composeBlueprint(project, { fps })
    const { ok, errors } = validateBlueprint(blueprint)
    return c.json({ blueprint, valid: ok, errors })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// Compose + dispatch the render to Cloud Run. Valid from `composing`.
router.post('/:id/render', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const webhookBase = body.webhookBase || new URL(c.req.url).origin
  try {
    const project = await dispatchRender(c.env, id, { ...body, webhookBase })
    return c.json({ project })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// ── Webhooks ─────────────────────────────────────────────────────────────────

// Higgsfield completion. VERIFY: Higgsfield's actual signing scheme. Until
// confirmed we accept either an HMAC X-Signature (HIGGSFIELD_WEBHOOK_SECRET) or a
// shared ?token= matching the same secret, plus the required ?project= id.
router.post('/webhooks/higgsfield', async (c) => {
  const projectId = c.req.query('project')
  if (!projectId) return c.json({ error: 'missing project' }, 400)

  const secret = await resolveKey(c.env, 'HIGGSFIELD_WEBHOOK_SECRET')
  const { ok, raw } = await verifySignature(c, secret)
  const tokenOk = secret && safeEqual(c.req.query('token') || '', secret)
  if (!ok && !tokenOk) return c.json({ error: 'invalid signature' }, 401)

  let payload = {}
  try { payload = raw ? JSON.parse(raw) : await c.req.json() } catch { /* tolerate */ }

  try {
    await handleHiggsfieldWebhook(c.env, projectId, payload)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// Cloud Run render completion. Signed with RENDER_WEBHOOK_SECRET.
router.post('/webhooks/render', async (c) => {
  const projectId = c.req.query('project')
  if (!projectId) return c.json({ error: 'missing project' }, 400)

  const secret = await resolveKey(c.env, 'RENDER_WEBHOOK_SECRET')
  const { ok, raw } = await verifySignature(c, secret)
  if (!ok) return c.json({ error: 'invalid signature' }, 401)

  let payload = {}
  try { payload = raw ? JSON.parse(raw) : {} } catch { /* tolerate */ }

  try {
    await handleRenderWebhook(c.env, projectId, payload)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
