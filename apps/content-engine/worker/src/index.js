import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { runMiningSession, getCatalog, getSessions }          from './services/miningService.js'
import { generateNicheReport }                                from './services/nicheService.js'
import { getDb }                                              from './lib/db.js'
import { generateScript, listScripts, regenerateSection }     from './services/scriptService.js'
import { getChannelProfile, upsertChannelProfile }            from './services/channelProfileService.js'
import { listBlueprints, getBlueprint, upsertBlueprint, deleteBlueprint } from './services/blueprintService.js'
import { generateVoiceover, listVoiceovers, OPENAI_VOICES, ELEVENLABS_VOICES } from './services/voiceoverService.js'
import { sendDelivery, listDeliveries }                       from './services/deliveryService.js'
import { runCommentAgent, listCommentJobs, reviewComment }    from './services/commentAgent.js'
import credentialsRouter                                      from './routes/credentials.js'
import apikeysRouter                                          from './routes/apikeys.js'

const app = new Hono()

app.use('*', cors({
  origin: ['https://growth-clube.hudsonargollo2.workers.dev', 'http://localhost:5173', 'http://localhost:5174'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Mining ────────────────────────────────────────────────────────────────────
app.get('/api/mining/catalog',  async (c) => {
  const sessionId = c.req.query('sessionId') ?? null
  const products = await getCatalog(c.env, { sessionId })
  return c.json({ products })
})
app.get('/api/mining/sessions', async (c) => {
  const sessions = await getSessions(c.env)
  return c.json({ sessions })
})
app.post('/api/mining/run', async (c) => {
  const { marketplace = 'google_shopping', category = 'electronics', siteFilter = 'all' } = await c.req.json()
  const result = await runMiningSession(c.env, { marketplace, category, siteFilter })
  return c.json(result)
})

// ── Niche intelligence ────────────────────────────────────────────────────────
app.post('/api/mining/niches/generate', async (c) => {
  const { format = 'longform' } = await c.req.json().catch(() => ({}))
  const report = await generateNicheReport(c.env, { format })
  return c.json(report)
})

// ── Scripts ───────────────────────────────────────────────────────────────────
app.get('/api/scripts', async (c) => {
  const scripts = await listScripts(c.env)
  return c.json({ scripts })
})
app.post('/api/scripts/generate', async (c) => {
  const body = await c.req.json()
  const { blueprintId, blueprintData, catalogIds, productIds, language = 'pt', channelProfileId } = body
  const script = await generateScript(c.env, { blueprintId, blueprintData, catalogIds, productIds, language, channelProfileId })
  return c.json(script)
})
app.post('/api/scripts/:id/sections/:index/regenerate', async (c) => {
  const scriptId      = c.req.param('id')
  const sectionIndex  = parseInt(c.req.param('index'), 10)
  const { instructions } = await c.req.json().catch(() => ({}))
  const script = await regenerateSection(c.env, { scriptId, sectionIndex, instructions })
  return c.json(script)
})

// ── Channel Profile ───────────────────────────────────────────────────────────
app.get('/api/channel-profile', async (c) => {
  const profile = await getChannelProfile(c.env)
  return c.json({ profile })
})
app.put('/api/channel-profile', async (c) => {
  const body = await c.req.json()
  const profile = await upsertChannelProfile(c.env, body)
  return c.json(profile)
})

// ── Blueprints ────────────────────────────────────────────────────────────────
app.get('/api/blueprints', async (c) => {
  const blueprints = await listBlueprints(c.env)
  return c.json({ blueprints })
})
app.get('/api/blueprints/:id', async (c) => {
  const blueprint = await getBlueprint(c.env, c.req.param('id'))
  return c.json(blueprint)
})
app.post('/api/blueprints', async (c) => {
  const body = await c.req.json()
  const blueprint = await upsertBlueprint(c.env, body)
  return c.json(blueprint)
})
app.put('/api/blueprints/:id', async (c) => {
  const body = await c.req.json()
  const blueprint = await upsertBlueprint(c.env, { ...body, id: c.req.param('id') })
  return c.json(blueprint)
})
app.delete('/api/blueprints/:id', async (c) => {
  const result = await deleteBlueprint(c.env, c.req.param('id'))
  return c.json(result)
})

// ── Voiceover ─────────────────────────────────────────────────────────────────
app.get('/api/voiceover', async (c) => {
  const voiceovers = await listVoiceovers(c.env)
  return c.json({ voiceovers })
})
app.get('/api/voiceover/voices', (c) => {
  return c.json({ openai: OPENAI_VOICES, elevenlabs: ELEVENLABS_VOICES })
})
app.post('/api/voiceover/generate', async (c) => {
  const body = await c.req.json()
  const { scriptId, provider = 'openai', voiceId, voiceLabel, model, stability = 0.75, similarityBoost = 0.80 } = body
  if (!scriptId) return c.json({ error: 'scriptId é obrigatório' }, 400)
  const result = await generateVoiceover(c.env, { scriptId, provider, voiceId, voiceLabel, model, stability, similarityBoost })
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

// ── Products (affiliate link update) ─────────────────────────────────────────
app.put('/api/products/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  const body = await c.req.json()
  // Only allow updating affiliate links — nothing else
  const { amazonAffiliateLink, mlAffiliateLink, affiliateLink } = body
  const update = {}
  if (affiliateLink    !== undefined) update.affiliateLink    = affiliateLink
  if (amazonAffiliateLink !== undefined) update.amazonAffiliateLink = amazonAffiliateLink
  if (mlAffiliateLink  !== undefined) update.mlAffiliateLink  = mlAffiliateLink
  const { data, error } = await db.from('products').update(update).eq('id', id).select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})
app.route('/api/credentials', credentialsRouter)
app.route('/api/apikeys',     apikeysRouter)

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
