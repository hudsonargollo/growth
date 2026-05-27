import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { runMiningSession, getCatalog, getCatalogStats, getSessions, fetchMLTrends, updateSession } from './services/miningService.js'
import { generateNicheReport }                                from './services/nicheService.js'
import { getDb }                                              from './lib/db.js'
import { generateScript, listScripts, regenerateSection, generateShorts } from './services/scriptService.js'
import { getChannelProfile, upsertChannelProfile }            from './services/channelProfileService.js'
import { listBlueprints, getBlueprint, upsertBlueprint, deleteBlueprint } from './services/blueprintService.js'
import { generateVoiceover, listVoiceovers, generateVoiceoverSections, OPENAI_VOICES, ELEVENLABS_VOICES } from './services/voiceoverService.js'
import { sendDelivery, listDeliveries }                       from './services/deliveryService.js'
import { runCommentAgent, listCommentJobs, reviewComment, postReadyJob } from './services/commentAgent.js'
import { resolveAndTrack, listShortLinks }                   from './services/shortLinkService.js'
import credentialsRouter                                      from './routes/credentials.js'
import apikeysRouter                                          from './routes/apikeys.js'
import financeRouter                                          from './routes/finance.js'
import youtubeRouter                                          from './routes/youtube.js'
import { uid }                                               from './lib/uid.js'

const app = new Hono()

app.use('*', cors({
  origin: [
    'https://growth-clube.hudsonargollo2.workers.dev',
    'https://growth.clubemkt.digital',
    'https://fabricadeconteudo.clubemkt.digital',
    'https://content-engine.hudsonargollo2.workers.dev',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Short link redirect ───────────────────────────────────────────────────────
app.get('/r/:code', async (c) => {
  const url = await resolveAndTrack(c.env, c.req.param('code'))
  if (!url) return c.text('Link não encontrado', 404)
  return c.redirect(url, 302)
})

// ── Short link analytics ──────────────────────────────────────────────────────
app.get('/api/short-links', async (c) => {
  const links = await listShortLinks(c.env)
  return c.json({ links })
})

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
app.delete('/api/mining/sessions', async (c) => {
  const db = getDb(c.env)
  await db.from('mining_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return c.json({ ok: true })
})

// PATCH /api/mining/sessions/:id — rename or assign to project
app.patch('/api/mining/sessions/:id', async (c) => {
  try {
    const body    = await c.req.json().catch(() => ({}))
    const updates = {}
    if (body.name      !== undefined) updates.name      = body.name
    if (body.projectId !== undefined) updates.projectId = body.projectId
    const data = await updateSession(c.env, c.req.param('id'), updates)
    return c.json(data)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// ── Projects CRUD ─────────────────────────────────────────────────────────────
app.get('/api/projects', async (c) => {
  const db = getDb(c.env)
  // Fetch projects and counts separately to avoid schema-cache issues with
  // embedded resource counts right after a migration.
  const { data: projects, error } = await db
    .from('projects')
    .select('*')
    .order('createdAt', { ascending: false })
  if (error) return c.json({ error: error.message }, 500)

  // Attach counts manually
  const ids = (projects ?? []).map(p => p.id)
  const [{ data: sessions }, { data: scripts }] = await Promise.all([
    db.from('mining_sessions').select('projectId').in('projectId', ids.length ? ids : ['__none__']),
    db.from('scripts').select('projectId').in('projectId', ids.length ? ids : ['__none__']),
  ])

  const sessionCount = {}
  const scriptCount  = {}
  ;(sessions ?? []).forEach(s => { sessionCount[s.projectId] = (sessionCount[s.projectId] ?? 0) + 1 })
  ;(scripts  ?? []).forEach(s => { scriptCount[s.projectId]  = (scriptCount[s.projectId]  ?? 0) + 1 })

  const enriched = (projects ?? []).map(p => ({
    ...p,
    _sessionCount: sessionCount[p.id] ?? 0,
    _scriptCount:  scriptCount[p.id]  ?? 0,
  }))

  return c.json({ projects: enriched })
})

app.post('/api/projects', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json().catch(() => ({}))
  if (!body.name?.trim()) return c.json({ error: 'Nome obrigatório' }, 400)
  const { data, error } = await db
    .from('projects')
    .insert({ id: uid(), name: body.name.trim(), description: body.description ?? null })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.patch('/api/projects/:id', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json().catch(() => ({}))
  const updates = { updatedAt: new Date().toISOString() }
  if (body.name        !== undefined) updates.name        = body.name.trim()
  if (body.description !== undefined) updates.description = body.description
  const { data, error } = await db
    .from('projects').update(updates).eq('id', c.req.param('id')).select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.delete('/api/projects/:id', async (c) => {
  const db = getDb(c.env)
  const { error } = await db.from('projects').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

app.get('/api/mining/catalog/stats', async (c) => {
  try {
    const stats = await getCatalogStats(c.env)
    return c.json(stats)
  } catch (e) {
    return c.json({ total: 0, avgPrice: 0, bestScore: 0, totalSold: 0, byMarketplace: {} })
  }
})
app.get('/api/mining/trends', async (c) => {
  try {
    const trends = await fetchMLTrends(c.env)
    return c.json({ trends })
  } catch (e) {
    return c.json({ trends: [] })
  }
})
app.post('/api/mining/run', async (c) => {
  const { marketplace = 'google_shopping', category = 'electronics', siteFilter = 'all', sortBy = 'relevance' } = await c.req.json()
  try {
    const result = await runMiningSession(c.env, { marketplace, category, siteFilter, sortBy })
    return c.json(result)
  } catch (e) {
    const msg = e?.message || e?.toString() || 'Unknown error'
    console.error('[mining/run]', msg, e?.stack)
    return c.json({ error: msg }, 500)
  }
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
  const { blueprintId, blueprintData, catalogIds, productIds, language = 'pt', channelProfileId, projectId, videoType, parentScriptId, videoIndex } = body
  const script = await generateScript(c.env, { blueprintId, blueprintData, catalogIds, productIds, language, channelProfileId, projectId, videoType, parentScriptId, videoIndex })
  return c.json(script)
})
app.patch('/api/scripts/:id', async (c) => {
  const id   = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const db   = (await import('./lib/db.js')).getDb(c.env)

  // ── Case 1: update title only
  if (body.title !== undefined && body.sectionIndex === undefined && body.text === undefined) {
    const { data, error } = await db.from('scripts').update({ title: body.title }).eq('id', id).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
  }

  // ── Case 2: update a single section's content
  if (body.sectionIndex !== undefined && body.content !== undefined) {
    const { data: current, error: fetchErr } = await db.from('scripts').select('sections').eq('id', id).single()
    if (fetchErr) return c.json({ error: fetchErr.message }, 500)
    const sections = current?.sections ?? []
    if (sections[body.sectionIndex] !== undefined) {
      sections[body.sectionIndex] = { ...sections[body.sectionIndex], content: body.content }
    }
    const { data, error } = await db.from('scripts').update({ sections }).eq('id', id).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
  }

  // ── Case 3: replace full raw text
  if (body.text !== undefined) {
    const updates = { text: body.text }
    if (body.title !== undefined) updates.title = body.title
    const { data, error } = await db.from('scripts').update(updates).eq('id', id).select().single()
    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
  }

  return c.json({ error: 'Nothing to update' }, 400)
})
app.post('/api/scripts/:id/sections/:index/regenerate', async (c) => {
  const scriptId      = c.req.param('id')
  const sectionIndex  = parseInt(c.req.param('index'), 10)
  const { instructions } = await c.req.json().catch(() => ({}))
  const script = await regenerateSection(c.env, { scriptId, sectionIndex, instructions })
  return c.json(script)
})

// POST /api/scripts/:id/generate-shorts — generate N short scripts from a longform parent
app.post('/api/scripts/:id/generate-shorts', async (c) => {
  try {
    const shorts = await generateShorts(c.env, c.req.param('id'))
    return c.json({ shorts, count: shorts.length })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// DELETE /api/scripts/:id — delete a single script (cascade voiceovers first)
app.delete('/api/scripts/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  // Remove dependent voiceovers first to satisfy the FK constraint
  await db.from('voiceovers').delete().eq('scriptId', id)
  const { error } = await db.from('scripts').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// DELETE /api/scripts — bulk delete; body: { ids: string[] } or { all: true }
app.delete('/api/scripts', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json().catch(() => ({}))

  if (body.all) {
    // Cascade: delete all voiceovers first, then all scripts
    await db.from('voiceovers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await db.from('scripts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return c.json({ error: error.message }, 500)
    return c.json({ ok: true })
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ error: 'ids array required' }, 400)
  }

  // Cascade: delete voiceovers for these scripts first
  await db.from('voiceovers').delete().in('scriptId', body.ids)
  const { error } = await db.from('scripts').delete().in('id', body.ids)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true, deleted: body.ids.length })
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

// POST /api/voiceover/generate-sections — generate one audio file per script section
app.post('/api/voiceover/generate-sections', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { scriptId, provider = 'elevenlabs', voiceId, voiceLabel, model, stability = 0.75, similarityBoost = 0.80 } = body
  if (!scriptId) return c.json({ error: 'scriptId é obrigatório' }, 400)
  try {
    const sections = await generateVoiceoverSections(c.env, { scriptId, provider, voiceId, voiceLabel, model, stability, similarityBoost })
    return c.json({ sections, count: sections.length })
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// DELETE /api/voiceover/:id — delete a single voiceover entry
app.delete('/api/voiceover/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('voiceovers').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// DELETE /api/voiceover — bulk delete; body: { ids: string[] } or { all: true }
app.delete('/api/voiceover', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json().catch(() => ({}))
  if (body.all) {
    await db.from('voiceovers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return c.json({ ok: true })
  }
  if (!body.ids?.length) return c.json({ error: 'ids é obrigatório' }, 400)
  await db.from('voiceovers').delete().in('id', body.ids)
  return c.json({ ok: true, deleted: body.ids.length })
})

// ── Delivery ──────────────────────────────────────────────────────────────────
app.get('/api/delivery', async (c) => {
  const jobs = await listDeliveries(c.env)
  return c.json({ jobs })
})
app.delete('/api/delivery/all', async (c) => {
  const db = getDb(c.env)
  await db.from('delivery_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return c.json({ ok: true })
})
app.post('/api/delivery/send', async (c) => {
  const body = await c.req.json()
  const { items, scriptId, voiceoverId, editorContact } = body

  if (!editorContact) return c.json({ error: 'editorContact is required' }, 400)
  // Support both new multi-item format and legacy single-item format
  const hasItems = Array.isArray(items) && items.length > 0
  if (!hasItems && !scriptId) return c.json({ error: 'items or scriptId is required' }, 400)

  const result = await sendDelivery(c.env, { items, scriptId, voiceoverId, editorContact })
  return c.json(result)
})

// Root tenant UUID — pinned in migration 002
const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// ── Comments ──────────────────────────────────────────────────────────────────
app.get('/api/comments', async (c) => {
  try {
    const jobs = await listCommentJobs(c.env)
    return c.json({ jobs: jobs ?? [] })
  } catch (e) {
    return c.json({ jobs: [], error: e.message }, 200) // 200 so UI can show the message
  }
})
app.post('/api/comments/run', async (c) => {
  const result = await runCommentAgent(c.env, ROOT_TENANT_ID)
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
// Manually post a 'ready' reply to YouTube
app.post('/api/comments/:id/post', async (c) => {
  try {
    const result = await postReadyJob(c.env, c.req.param('id'))
    return c.json(result)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

// DELETE /api/comments/:id — delete a single comment job
app.delete('/api/comments/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  const { error } = await db.from('comment_reply_jobs').delete().eq('id', id)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// DELETE /api/comments — delete all comment jobs (optionally scoped to ids[])
app.delete('/api/comments', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json().catch(() => ({}))
  if (body.ids?.length) {
    await db.from('comment_reply_jobs').delete().in('id', body.ids)
    return c.json({ ok: true, deleted: body.ids.length })
  }
  await db.from('comment_reply_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return c.json({ ok: true })
})

// ── Affiliate link builder ────────────────────────────────────────────────────
// POST /api/affiliate/ml
// body: { itemId | url }   (client just sends the raw ID or full ML URL)
//
// The worker fetches item data from api.mercadolibre.com via ML_PROXY_URL
// (same Deno proxy used by miningService) so Cloudflare Workers' egress IPs
// don't get blocked by ML's PolicyAgent.  ML_ACCESS_TOKEN (optional KV key)
// is forwarded as Authorization: Bearer if set.
app.post('/api/affiliate/ml', async (c) => {
  const { resolveKey } = await import('./lib/resolveKey.js')
  const body = await c.req.json().catch(() => ({}))

  // ── Extract itemId from raw ID or full ML URL ────────────────────────────
  let itemId = (body.itemId ?? body.url ?? '').trim()
  const match = itemId.match(/MLB[-]?(\d+)/i)
  itemId = match ? `MLB${match[1]}` : itemId.toUpperCase()
  if (!/^MLB\d+$/.test(itemId)) {
    return c.json({ error: 'ID inválido — use o formato MLB123456789 ou cole a URL completa' }, 400)
  }

  // ── Fetch item data via proxy (same pattern as miningService.mlFetch) ────
  const proxyBase   = (c.env.ML_PROXY_URL ?? '').replace(/\/$/, '') || 'https://api.mercadolibre.com'
  const proxySecret = c.env.ML_PROXY_SECRET ?? ''
  const mlToken     = await resolveKey(c.env, 'ML_ACCESS_TOKEN')

  const headers = new Headers({ 'User-Agent': 'FabricaDeConteudo/1.0', Accept: 'application/json' })
  if (mlToken)      headers.set('Authorization',  `Bearer ${mlToken}`)
  if (proxySecret && proxyBase !== 'https://api.mercadolibre.com') {
    headers.set('X-Proxy-Secret', proxySecret)
  }

  const mlRes = await fetch(`${proxyBase}/items/${itemId}`, { headers })
  if (!mlRes.ok) {
    const errText = await mlRes.text().catch(() => '')
    if (mlRes.status === 404) return c.json({ error: 'Produto não encontrado no Mercado Livre' }, 404)
    return c.json({ error: `ML API ${mlRes.status}: ${errText.slice(0, 200)}` }, 502)
  }
  const item = await mlRes.json()

  // ── Build affiliate-tagged permalink ─────────────────────────────────────
  const affiliateTag = await resolveKey(c.env, 'ML_AFFILIATE_TAG')
  const permalink    = (item.permalink ?? '').trim()
  let   affiliateLink = permalink

  if (affiliateTag && permalink) {
    try {
      const u = new URL(permalink)
      if (affiliateTag.startsWith('matt:')) {
        const parts = affiliateTag.split(':')
        if (parts.length >= 3) { u.searchParams.set('matt_word', parts[1]); u.searchParams.set('matt_tool', parts[2]) }
      } else {
        u.searchParams.set('tag', affiliateTag)
      }
      affiliateLink = u.toString()
    } catch { /* keep permalink as-is */ }
  }

  return c.json({
    itemId,
    title:        item.title                   ?? null,
    price:        item.price                   ?? null,
    currency:     item.currency_id             ?? 'BRL',
    condition:    item.condition               ?? null,
    thumbnail:    item.thumbnail               ?? null,
    permalink,
    affiliateLink,
    affiliateTag: affiliateTag                 ?? null,
    rating:       item.reviews?.rating_average ?? null,
    reviewCount:  item.reviews?.total          ?? null,
    availableQty: item.available_quantity      ?? null,
    soldQty:      item.sold_quantity           ?? null,
  })
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
// ── Products (auto-generate affiliate links) ──────────────────────────────────
// Reads the product's productUrl + marketplace, applies the configured affiliate
// tags, saves the result, and returns { amazonAffiliateLink, mlAffiliateLink, affiliateLink }.
app.post('/api/products/:id/affiliate-links', async (c) => {
  const { resolveKey } = await import('./lib/resolveKey.js')
  const db  = getDb(c.env)
  const id  = c.req.param('id')

  const { data: product, error: fetchErr } = await db.from('products').select('*').eq('id', id).single()
  if (fetchErr || !product) return c.json({ error: 'Produto não encontrado' }, 404)

  const productUrl  = product.productUrl ?? ''
  const marketplace = (product.marketplace ?? '').toLowerCase()

  const amazonTag     = await resolveKey(c.env, 'AMAZON_AFFILIATE_TAG')
  const mlAffiliateId = await resolveKey(c.env, 'ML_AFFILIATE_TAG')

  function applyAmazonTag(url, tag) {
    if (!url) return ''
    try { const u = new URL(url); if (tag) u.searchParams.set('tag', tag); return u.toString() } catch { return url }
  }

  function applyMlTag(url, tag) {
    if (!url) return ''
    try {
      const u = new URL(url)
      if (!tag) return url
      if (tag.startsWith('matt:')) {
        const parts = tag.split(':')
        if (parts.length >= 3) { u.searchParams.set('matt_word', parts[1]); u.searchParams.set('matt_tool', parts[2]) }
      } else {
        u.searchParams.set('tag', tag)
      }
      return u.toString()
    } catch { return url }
  }

  const isAmazon = marketplace === 'amazon' || productUrl.includes('amazon.com')
  const isML     = marketplace === 'mercadolivre' || marketplace === 'mercadolivre_direct' || productUrl.includes('mercadolivre.com')

  const amazonAffiliateLink = isAmazon ? applyAmazonTag(productUrl, amazonTag)  : (product.amazonAffiliateLink ?? null)
  const mlAffiliateLink     = isML     ? applyMlTag(productUrl, mlAffiliateId)   : (product.mlAffiliateLink ?? null)
  const affiliateLink       = amazonAffiliateLink || mlAffiliateLink || productUrl

  const update = { affiliateLink, amazonAffiliateLink, mlAffiliateLink }
  const { data: updated, error: saveErr } = await db.from('products').update(update).eq('id', id).select().single()
  if (saveErr) return c.json({ error: saveErr.message }, 500)

  return c.json({ ...update, id: updated.id })
})

// ── Products (delete) ─────────────────────────────────────────────────────────
app.delete('/api/products/all', async (c) => {
  const db = getDb(c.env)
  await db.from('catalog_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  return c.json({ ok: true })
})
app.delete('/api/products/:id', async (c) => {
  const db = getDb(c.env)
  const id = c.req.param('id')
  await db.from('catalog_entries').delete().eq('productId', id)
  await db.from('products').delete().eq('id', id)
  return c.json({ ok: true })
})

// ── Editor contact (stored as plain string in KV: config:EDITOR_WHATSAPP) ─────
app.get('/api/settings/editor-contact', async (c) => {
  const contact = c.env.KV1
    ? (await c.env.KV1.get('config:EDITOR_WHATSAPP')) ?? ''
    : ''
  return c.json({ contact })
})

app.put('/api/settings/editor-contact', async (c) => {
  if (!c.env.KV1) return c.json({ error: 'KV1 binding not configured' }, 500)
  const { contact = '' } = await c.req.json()
  await c.env.KV1.put('config:EDITOR_WHATSAPP', contact.trim())
  return c.json({ ok: true })
})

app.route('/api/credentials', credentialsRouter)
app.route('/api/apikeys',     apikeysRouter)
app.route('/api/finance',     financeRouter)
app.route('/api/youtube',     youtubeRouter)

// ── Voiceover preview (streams 3-second TTS sample for voice selection UI) ────
app.get('/api/voiceover/preview/:voiceId', async (c) => {
  const voiceId = c.req.param('voiceId')
  const { resolveKey } = await import('./lib/resolveKey.js')

  // Identify provider by voice ID shape:
  //   ElevenLabs — long alphanumeric IDs (e.g. pFZP5JQG7iQjIQuC4Bku)
  //   Google     — PascalCase short names (Aoede, Kore, Sulafat, Zephyr, Puck, Charon, Fenrir, Orus)
  //   OpenAI     — lowercase names (nova, shimmer, alloy, echo, onyx, fable)
  const GOOGLE_VOICE_IDS    = new Set(['Aoede', 'Kore', 'Sulafat', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Orus'])
  const ELEVENLABS_VOICE_IDS = new Set(['pFZP5JQG7iQjIQuC4Bku', 'gD1IexrzCvsXPHUuT0s3', '21m00Tcm4TlvDq8ikWAM', 'ErXwobaYiN019PkySvjV', 'EXAVITQu4vr4xnSDxMaL', 'pNInz6obpgDQGcFmaJgB'])
  const isGoogle     = GOOGLE_VOICE_IDS.has(voiceId)
  const isElevenLabs = ELEVENLABS_VOICE_IDS.has(voiceId)

  const VOICE_LABELS = {
    pFZP5JQG7iQjIQuC4Bku: 'Valentina', gD1IexrzCvsXPHUuT0s3: 'Rafael',
    '21m00Tcm4TlvDq8ikWAM': 'Rachel',  ErXwobaYiN019PkySvjV: 'Antonio',
    EXAVITQu4vr4xnSDxMaL: 'Bella',     pNInz6obpgDQGcFmaJgB: 'Adam',
  }
  const label = VOICE_LABELS[voiceId] ?? voiceId
  const text  = `Olá! Aqui é ${label}. Pronto para narrar seus vídeos com qualidade profissional.`

  // ── ElevenLabs path ──────────────────────────────────────────────────────────
  if (isElevenLabs) {
    const apiKey = await resolveKey(c.env, 'ELEVENLABS_API_KEY')
    if (!apiKey) return c.json({ error: 'ELEVENLABS_API_KEY not configured' }, 500)

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method:  'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body:    JSON.stringify({
        text,
        model_id:          'eleven_multilingual_v2',
        voice_settings:    { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return c.json({ error: `ElevenLabs error ${res.status}: ${err.slice(0, 100)}` }, 500)
    }

    return new Response(res.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
    })
  }

  // ── Google path ──────────────────────────────────────────────────────────────
  if (isGoogle) {
    const apiKey = await resolveKey(c.env, 'GOOGLE_API_KEY')
    if (!apiKey) return c.json({ error: 'GOOGLE_API_KEY not configured' }, 500)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
          },
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      return c.json({ error: `Google TTS error ${res.status}: ${err.slice(0, 100)}` }, 500)
    }

    const json     = await res.json()
    const b64      = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!b64) return c.json({ error: 'No audio data from Google TTS' }, 500)

    // Decode base64 PCM and wrap in a WAV container
    const { pcmToWav, base64ToArrayBuffer } = await import('./services/voiceoverService.js')
    const pcmBuffer = base64ToArrayBuffer(b64)
    const wavBuffer = pcmToWav(pcmBuffer)

    return new Response(wavBuffer, {
      headers: {
        'Content-Type':  'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // ── OpenAI path ──────────────────────────────────────────────────────────────
  const apiKey = await resolveKey(c.env, 'OPENAI_API_KEY')
  if (!apiKey) return c.json({ error: 'OPENAI_API_KEY not configured' }, 500)

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: 'tts-1', input: text, voice: voiceId, speed: 1.0 }),
  })

  if (!res.ok) {
    const err = await res.text()
    return c.json({ error: `TTS error ${res.status}: ${err.slice(0, 100)}` }, 500)
  }

  return new Response(res.body, {
    headers: {
      'Content-Type':  'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',  // cache 24h — same voice = same audio
    },
  })
})

// ── SPA catch-all ─────────────────────────────────────────────────────────────
// For non-API paths with no matching static file, serve index.html so that
// React Router can handle the route client-side. This is needed for any
// full-page navigation to a React route (e.g. OAuth callback redirects).
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404)
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url).toString()))
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
    ctx.waitUntil(runCommentAgent(env, ROOT_TENANT_ID))
  },
}
