import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { runMiningSession, getCatalog, getSessions }          from './services/miningService.js'
import { generateScript, listScripts }                        from './services/scriptService.js'
import { generateVoiceover, listVoiceovers }                  from './services/voiceoverService.js'
import { sendDelivery, listDeliveries }                       from './services/deliveryService.js'
import { runCommentAgent, listCommentJobs, reviewComment }    from './services/commentAgent.js'

const app = new Hono()

app.use('*', cors())

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Mining ────────────────────────────────────────────────────────────────────
app.get('/api/mining/catalog',  async (c) => {
  const products = await getCatalog(c.env)
  return c.json({ products })
})
app.get('/api/mining/sessions', async (c) => {
  const sessions = await getSessions(c.env)
  return c.json({ sessions })
})
app.post('/api/mining/run', async (c) => {
  const { marketplace = 'amazon', category = 'electronics' } = await c.req.json()
  const result = await runMiningSession(c.env, { marketplace, category })
  return c.json(result)
})

// ── Scripts ───────────────────────────────────────────────────────────────────
app.get('/api/scripts', async (c) => {
  const scripts = await listScripts(c.env)
  return c.json({ scripts })
})
app.post('/api/scripts/generate', async (c) => {
  const { blueprintId, catalogIds, language = 'en' } = await c.req.json()
  if (!blueprintId) return c.json({ error: 'blueprintId is required' }, 400)
  const script = await generateScript(c.env, { blueprintId, catalogIds, language })
  return c.json(script)
})

// ── Voiceover ─────────────────────────────────────────────────────────────────
app.get('/api/voiceover', async (c) => {
  const voiceovers = await listVoiceovers(c.env)
  return c.json({ voiceovers })
})
app.post('/api/voiceover/generate', async (c) => {
  const { scriptId, voiceModel = 'Rachel', stability = 0.75, similarityBoost = 0.80 } = await c.req.json()
  if (!scriptId) return c.json({ error: 'scriptId is required' }, 400)
  const result = await generateVoiceover(c.env, { scriptId, voiceModel, stability, similarityBoost })
  return c.json(result)
})

// ── Delivery ──────────────────────────────────────────────────────────────────
app.get('/api/delivery', async (c) => {
  const jobs = await listDeliveries(c.env)
  return c.json({ jobs })
})
app.post('/api/delivery/send', async (c) => {
  const { scriptId, voiceoverId, editorContact } = await c.req.json()
  if (!scriptId || !editorContact) return c.json({ error: 'scriptId and editorContact are required' }, 400)
  const result = await sendDelivery(c.env, { scriptId, voiceoverId, editorContact })
  return c.json(result)
})

// ── Comments ──────────────────────────────────────────────────────────────────
app.get('/api/comments', async (c) => {
  const jobs = await listCommentJobs(c.env)
  return c.json({ jobs })
})
app.post('/api/comments/run', async (c) => {
  const result = await runCommentAgent(c.env)
  return c.json({ status: 'ok', ...result })
})
app.post('/api/comments/:id/approve', async (c) => {
  const result = await reviewComment(c.env, c.req.param('id'), 'approved')
  return c.json(result)
})
app.post('/api/comments/:id/reject', async (c) => {
  const result = await reviewComment(c.env, c.req.param('id'), 'rejected')
  return c.json(result)
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

// ── Worker export ─────────────────────────────────────────────────────────────
export default {
  // HTTP requests
  fetch: app.fetch,

  // Cron trigger (wrangler.toml: crons = ["0 */4 * * *"])
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runCommentAgent(env))
  },
}
