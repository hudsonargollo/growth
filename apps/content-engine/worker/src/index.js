import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { requireAuth }                                        from './lib/auth.js'
import { getDb, createUserClient }                            from './lib/db.js'
import { loadTenantKeys }                                     from './lib/keys.js'
import { runMiningSession, getCatalog, getSessions }          from './services/miningService.js'
import { generateScript, listScripts }                        from './services/scriptService.js'
import { generateVoiceover, listVoiceovers }                  from './services/voiceoverService.js'
import { sendDelivery, listDeliveries }                       from './services/deliveryService.js'
import { runCommentAgent, listCommentJobs, reviewComment }    from './services/commentAgent.js'
import credentialsRouter                                      from './routes/credentials.js'
import apikeysRouter                                          from './routes/apikeys.js'

const app = new Hono()

app.use('*', cors({
  origin: ['https://content-engine.hudsonargollo2.workers.dev', 'https://growth.clubemkt.digital', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8787'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// ── Health (unauthenticated) ──────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Auth middleware — all routes below require a valid Supabase JWT ────────────
app.use('/api/*', requireAuth)

// ── Mining ────────────────────────────────────────────────────────────────────
app.get('/api/mining/catalog', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const products = await getCatalog(c.env, tenantId, db)
  return c.json({ products })
})
app.get('/api/mining/sessions', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const sessions = await getSessions(c.env, tenantId, db)
  return c.json({ sessions })
})
app.post('/api/mining/run', async (c) => {
  const { marketplace = 'amazon', category = 'electronics' } = await c.req.json()
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await runMiningSession(c.env, tenantId, db, { marketplace, category })
  return c.json(result)
})

// ── Scripts ───────────────────────────────────────────────────────────────────
app.get('/api/scripts', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const scripts  = await listScripts(c.env, tenantId, db)
  return c.json({ scripts })
})
app.post('/api/scripts/generate', async (c) => {
  const { blueprintId, catalogIds, language = 'en' } = await c.req.json()
  if (!blueprintId) return c.json({ error: 'blueprintId is required' }, 400)
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const script   = await generateScript(c.env, tenantId, db, { blueprintId, catalogIds, language })
  return c.json(script)
})

// ── Voiceover ─────────────────────────────────────────────────────────────────
app.get('/api/voiceover', async (c) => {
  const db         = createUserClient(c.env, c.get('token'))
  const tenantId   = c.get('tenantId')
  const voiceovers = await listVoiceovers(c.env, tenantId, db)
  return c.json({ voiceovers })
})
app.post('/api/voiceover/generate', async (c) => {
  const { scriptId, voiceModel = 'Rachel', stability = 0.75, similarityBoost = 0.80 } = await c.req.json()
  if (!scriptId) return c.json({ error: 'scriptId is required' }, 400)
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await generateVoiceover(c.env, tenantId, db, { scriptId, voiceModel, stability, similarityBoost })
  return c.json(result)
})

// ── Delivery ──────────────────────────────────────────────────────────────────
app.get('/api/delivery', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const jobs     = await listDeliveries(c.env, tenantId, db)
  return c.json({ jobs })
})
app.post('/api/delivery/send', async (c) => {
  const { scriptId, voiceoverId, editorContact } = await c.req.json()
  if (!scriptId || !editorContact) return c.json({ error: 'scriptId and editorContact are required' }, 400)
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await sendDelivery(c.env, tenantId, db, { scriptId, voiceoverId, editorContact })
  return c.json(result)
})

// ── Comments ──────────────────────────────────────────────────────────────────
app.get('/api/comments', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const jobs     = await listCommentJobs(c.env, tenantId, db)
  return c.json({ jobs })
})
app.post('/api/comments/run', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await runCommentAgent(c.env, tenantId, db, null)
  return c.json({ status: 'ok', ...result })
})
app.post('/api/comments/:id/approve', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await reviewComment(c.env, tenantId, db, c.req.param('id'), 'approved')
  return c.json(result)
})
app.post('/api/comments/:id/reject', async (c) => {
  const db       = createUserClient(c.env, c.get('token'))
  const tenantId = c.get('tenantId')
  const result   = await reviewComment(c.env, tenantId, db, c.req.param('id'), 'rejected')
  return c.json(result)
})

// ── API Keys (per-tenant encrypted credentials) ───────────────────────────────
app.route('/api/apikeys', apikeysRouter)

// ── Credentials (legacy encrypted tool credentials) ───────────────────────────
app.route('/api/credentials', credentialsRouter)

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

// ── Worker export ─────────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,

  // Cron trigger — iterates all active tenants (Phase 4 adds per-tenant keys)
  // For now runs with env-level keys against the service role client
  async scheduled(_event, env, ctx) {
    const adminDb = getDb(env)
    const { data: activeTenants } = await adminDb
      .from('tenants')
      .select('id')
      .eq('status', 'active')

    if (!activeTenants?.length) {
      console.log('[cron] No active tenants found')
      return
    }

    for (const { id: tenantId } of activeTenants) {
      const keys = await loadTenantKeys(env, tenantId)
      if (!keys.YOUTUBE_API_KEY || !keys.YOUTUBE_CHANNEL_ID) {
        console.log(`[cron] Tenant ${tenantId} skipped — YouTube keys not configured`)
        continue
      }
      ctx.waitUntil(
        runCommentAgent(env, tenantId, adminDb, keys).catch((e) =>
          console.error(`[cron] Tenant ${tenantId} failed:`, e.message)
        )
      )
    }
  },
}
