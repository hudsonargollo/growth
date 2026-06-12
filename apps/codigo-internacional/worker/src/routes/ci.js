/**
 * /api/ci — Código Internacional API (standalone worker).
 *   PUBLIC: cohorts, lead capture
 *   AUTH:   /auth/check · /auth/register · /auth/login · /me · /me/portal
 *   ADMIN:  /admin/* (role=admin only)
 */
import { Hono } from 'hono'
import {
  captureLead, qualifyLead, listLeads, leadCounts, getLead, updateLeadStatus, assignLead, addLeadNote,
  setLeadTurma, listClients,
} from '../services/ci/leadService.js'
import { notifyNewLead, notifyOwner, notifyLead } from '../services/ci/notify.js'
import { createPartner, listPartners, getPartner, updatePartner, deletePartner } from '../services/ci/partnerService.js'
import { createSale, getSale, listSales, updateSaleStatus } from '../services/ci/saleService.js'
import { listCommissions, updateCommissionStatus, commissionSummary } from '../services/ci/commissionService.js'
import { listJourney, updateStage } from '../services/ci/journeyService.js'
import { listClosers, createCloser, updateCloser } from '../services/ci/closerService.js'
import { getSettings, updateSettings } from '../services/ci/settingsService.js'
import { getDashboard } from '../services/ci/dashboardService.js'
import { listSources, createSource, updateSource, deleteSource } from '../services/ci/sourcesService.js'
import { checkAccess, registerPassword, login, portalStats, getUser, publicUser } from '../services/ci/userService.js'
import { getTurmaStatus } from '../services/ci/turmasService.js'
import { resetOperationalData } from '../services/ci/resetService.js'
import { addFeedback, listFeedback } from '../services/ci/reviewService.js'
import { signToken, verifyToken } from '../lib/auth.js'

const router = new Hono()

const COHORTS = [
  { id: '2026-07-12', label: 'Turma 1 — 12/07' },
  { id: '2026-07-19', label: 'Turma 2 — 19/07' },
  { id: '2026-07-26', label: 'Turma 3 — 26/07' },
  { id: '2026-08-02', label: 'Turma 4 — 02/08' },
  { id: '2026-08-09', label: 'Turma 5 — 09/08' },
]

// ── Auth middleware ────────────────────────────────────────────────────────────
async function requireAuth(c, next) {
  const token = (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '')
  const payload = await verifyToken(token, c.env.SESSION_SECRET || 'dev-secret')
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', payload)
  return next()
}
async function requireAdmin(c, next) {
  return requireAuth(c, async () => {
    if (c.get('user')?.role !== 'admin') return c.json({ error: 'Acesso restrito a administradores.' }, 403)
    return next()
  })
}

async function rateLimited(c, { max = 5, windowSec = 60 } = {}) {
  if (!c.env.CI_KV) return false
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const key = `rl:${ip}`
  const n = Number((await c.env.CI_KV.get(key)) || 0) + 1
  await c.env.CI_KV.put(key, String(n), { expirationTtl: windowSec })
  return n > max
}

// ════════════════════════════════ PUBLIC ════════════════════════════════
router.get('/cohorts', (c) => c.json({ cohorts: COHORTS }))

// Pageview counter — per page, with a running total AND a per-day count so the
// CRM can answer "how many hit /aplicacao today / this week". Client pings once
// per session per page. KV read-modify-write is rough under heavy concurrency,
// which is fine for funnel-level numbers.
const PV_KEY = (p) => String(p || 'landing').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'landing'

// Reliable reset of all pageview counters — runs IN the worker (read-your-writes).
async function clearPageviews(env) {
  if (!env.CI_KV) return 0
  let n = 0
  let cursor
  do {
    const list = await env.CI_KV.list({ prefix: 'pv:', cursor })
    for (const k of list.keys) { await env.CI_KV.delete(k.name); n++ }
    if (list.list_complete) break
    cursor = list.cursor
  } while (cursor)
  return n
}
router.post('/track/visit', async (c) => {
  try {
    if (c.env.CI_KV) {
      const page = PV_KEY((await c.req.json().catch(() => ({}))).page)
      const today = new Date().toISOString().slice(0, 10)
      const bump = async (k) => { await c.env.CI_KV.put(k, String(Number((await c.env.CI_KV.get(k)) || 0) + 1)) }
      await bump(`pv:${page}:total`)
      await bump(`pv:${page}:${today}`)
    }
  } catch { /* non-fatal */ }
  return c.json({ ok: true })
})

// Step 1 — capture nome + WhatsApp immediately (so even abandoned/"curious"
// leads are saved). Returns a signed `ref` the client uses to attach the
// company profile in step 2 without exposing an admin endpoint.
router.post('/leads', async (c) => {
  if (await rateLimited(c)) return c.json({ error: 'Muitas solicitações. Aguarde um instante.' }, 429)
  const body = await c.req.json().catch(() => ({}))
  if (!body.name && !body.email && !body.phone) return c.json({ error: 'Informe ao menos nome, e-mail ou WhatsApp.' }, 400)
  try {
    const result = await captureLead(c.env, {
      name: body.name, email: body.email, phone: body.phone, turma: body.turma,
      segmento: body.segmento, headcount: body.headcount, revenue_band: body.revenue_band, instagram: body.instagram,
      company: body.company, application: body.application,
      utm_source: body.utm_source, utm_medium: body.utm_medium, utm_campaign: body.utm_campaign,
      utm_content: body.utm_content, utm_term: body.utm_term, referrer: body.referrer, landing_path: body.landing_path,
    })
    // Step 1 is silent — no lead/closer/owner WhatsApp. Incomplete captures stay
    // out of the pipeline (remarketing only). Notifications fire on qualify (step 2),
    // unless this was a single-step submit that already carries the full profile.
    if (result.qualified) {
      if (result.lead.phone) c.executionCtx.waitUntil(notifyLead(c.env, { lead: result.lead }))
      if (result.closer) c.executionCtx.waitUntil(notifyNewLead(c.env, { closer: result.closer, lead: result.lead, partner: result.partner }))
      if (c.env.CI_OWNER_WHATSAPP && result.lead.phone) {
        c.executionCtx.waitUntil(notifyOwner(c.env, { number: c.env.CI_OWNER_WHATSAPP, lead: result.lead, partner: result.partner, closer: result.closer }))
      }
    }
    const ref = await signToken({ lid: result.id }, c.env.SESSION_SECRET || 'dev-secret', 60 * 60 * 6)
    return c.json({ ok: true, id: result.id, ref }, 201)
  } catch (err) {
    console.error('[ci/leads]', err)
    return c.json({ error: 'Não foi possível registrar sua solicitação.' }, 500)
  }
})

// Step 2 — attach the company profile to the lead from step 1 (verified by `ref`).
router.post('/leads/:id/qualify', async (c) => {
  if (await rateLimited(c, { max: 10 })) return c.json({ error: 'Muitas solicitações. Aguarde um instante.' }, 429)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const payload = await verifyToken(body.ref, c.env.SESSION_SECRET || 'dev-secret')
  if (!payload || payload.lid !== id) return c.json({ error: 'Sessão expirada. Recarregue a página.' }, 401)
  try {
    const result = await qualifyLead(c.env, id, {
      segmento: body.segmento, headcount: body.headcount, revenue_band: body.revenue_band,
      instagram: body.instagram, email: body.email, turma: body.turma,
    })
    if (result.lead.phone) c.executionCtx.waitUntil(notifyLead(c.env, { lead: result.lead }))
    if (result.closer) c.executionCtx.waitUntil(notifyNewLead(c.env, { closer: result.closer, lead: result.lead, partner: result.partner }))
    if (c.env.CI_OWNER_WHATSAPP && result.lead.phone) {
      c.executionCtx.waitUntil(notifyOwner(c.env, { number: c.env.CI_OWNER_WHATSAPP, lead: result.lead, partner: result.partner, closer: result.closer }))
    }
    return c.json({ ok: true, id }, 200)
  } catch (err) {
    console.error('[ci/leads/qualify]', err)
    return c.json({ error: 'Não foi possível concluir o cadastro.' }, 500)
  }
})

// Live turma fill-rates — powers the landing urgency bar (real data, public).
router.get('/turmas/status', async (c) => c.json(await getTurmaStatus(c.env)))

// ── Board review feedback (/pagereview) — public read + write ──
router.post('/review/feedback', async (c) => {
  if (await rateLimited(c, { max: 12 })) return c.json({ error: 'Muitas solicitações. Aguarde um instante.' }, 429)
  const body = await c.req.json().catch(() => ({}))
  if (!body.name || !String(body.name).trim()) return c.json({ error: 'Informe seu nome.' }, 400)
  await addFeedback(c.env, {
    name: String(body.name).trim().slice(0, 80),
    role: body.role ? String(body.role).slice(0, 80) : null,
    prefer_urgency: body.prefer_urgency ? String(body.prefer_urgency).slice(0, 40) : null,
    ready: body.ready ? String(body.ready).slice(0, 20) : null,
    weakest: body.weakest ? String(body.weakest).slice(0, 2000) : null,
    copy_changes: body.copy_changes ? String(body.copy_changes).slice(0, 2000) : null,
    notes: body.notes ? String(body.notes).slice(0, 2000) : null,
  })
  return c.json({ ok: true }, 201)
})
router.get('/review/feedback', async (c) => c.json({ feedback: await listFeedback(c.env) }))

// ════════════════════════════════ AUTH ════════════════════════════════
router.post('/auth/check', async (c) => {
  const { email } = await c.req.json().catch(() => ({}))
  return c.json(await checkAccess(c.env, email))
})
router.post('/auth/register', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  try {
    const user = await registerPassword(c.env, email, password)
    const token = await signToken({ email: user.email, role: user.role, beneficiary_key: user.beneficiary_key, name: user.name }, c.env.SESSION_SECRET || 'dev-secret')
    return c.json({ token, user })
  } catch (err) { return c.json({ error: err.message }, 400) }
})
router.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  try {
    const user = await login(c.env, email, password)
    const token = await signToken({ email: user.email, role: user.role, beneficiary_key: user.beneficiary_key, name: user.name }, c.env.SESSION_SECRET || 'dev-secret')
    return c.json({ token, user })
  } catch (err) { return c.json({ error: err.message }, 401) }
})

// ════════════════════════════════ AUTHENTICATED (any role) ════════════════════════════════
router.get('/me', requireAuth, (c) => c.json({ user: c.get('user') }))
router.get('/me/portal', requireAuth, async (c) => {
  const u = c.get('user')
  const stats = await portalStats(c.env, u.beneficiary_key)
  return c.json({ user: u, ...stats })
})

// ════════════════════════════════ ADMIN ════════════════════════════════
router.use('/admin/*', requireAdmin)

router.get('/admin/leads', async (c) => {
  const { leads, total } = await listLeads(c.env, {
    status: c.req.query('status'), partnerId: c.req.query('partnerId'), closerId: c.req.query('closerId'),
    search: c.req.query('search'), limit: c.req.query('limit'), offset: c.req.query('offset'),
  })
  return c.json({ leads, total })
})
router.get('/admin/leads/stats', async (c) => c.json({ counts: await leadCounts(c.env) }))
router.get('/admin/leads/:id', async (c) => {
  const lead = await getLead(c.env, c.req.param('id'))
  return lead ? c.json({ lead }) : c.json({ error: 'Not found' }, 404)
})
router.patch('/admin/leads/:id/status', async (c) => {
  const { status, lostReason, actor } = await c.req.json().catch(() => ({}))
  return c.json({ lead: await updateLeadStatus(c.env, c.req.param('id'), status, { lostReason, actor }) })
})
router.patch('/admin/leads/:id/assign', async (c) => {
  const { closerId, actor } = await c.req.json().catch(() => ({}))
  return c.json({ lead: await assignLead(c.env, c.req.param('id'), closerId, { actor }) })
})
router.post('/admin/leads/:id/notes', async (c) => {
  const { text, actor } = await c.req.json().catch(() => ({}))
  return c.json({ lead: await addLeadNote(c.env, c.req.param('id'), text, actor) })
})
router.patch('/admin/leads/:id/turma', async (c) => {
  const { turma, actor } = await c.req.json().catch(() => ({}))
  return c.json({ lead: await setLeadTurma(c.env, c.req.param('id'), turma, { actor }) })
})

// ── Turmas (classes) — clients grouped by their chosen cohort ──
router.get('/admin/clients', async (c) => c.json({ clients: await listClients(c.env), cohorts: COHORTS }))

// ── Dashboard KPIs ──
router.get('/admin/dashboard', async (c) => c.json(await getDashboard(c.env)))

// ── Pageviews per day for a given page (default pré-venda) ──
router.get('/admin/visits', async (c) => {
  const page = PV_KEY(c.req.query('page') || 'pre-venda')
  const days = Math.min(Math.max(Number(c.req.query('days')) || 14, 1), 60)
  const series = []
  let windowTotal = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const n = Number((await c.env.CI_KV?.get(`pv:${page}:${d}`)) || 0)
    windowTotal += n
    series.push({ date: d, n })
  }
  const total = Number((await c.env.CI_KV?.get(`pv:${page}:total`)) || 0)
  return c.json({ page, total, windowTotal, today: series[0]?.n || 0, series })
})

const isSuperadmin = (c) => (c.get('user')?.email || '').toLowerCase() === 'hudson@tektone.com.br'

// Superadmin only (Hudson): zero all pageview counters (e.g. right before launch).
router.post('/admin/visits/reset', async (c) => {
  if (!isSuperadmin(c)) return c.json({ error: 'Apenas o superadmin pode zerar os contadores.' }, 403)
  return c.json({ ok: true, deleted: await clearPageviews(c.env) })
})

// Superadmin only: full launch reset — wipe ALL operational data + pageviews,
// keep config (logins, parceiros, closers, taxas, fontes, turmas).
router.post('/admin/reset-all', async (c) => {
  if (!isSuperadmin(c)) return c.json({ error: 'Apenas o superadmin pode zerar tudo.' }, 403)
  const removed = await resetOperationalData(c.env)
  const pageviews = await clearPageviews(c.env)
  return c.json({ ok: true, removed, pageviews })
})

// ── Traffic sources (non-partner UTM origins) ──
router.get('/admin/sources', async (c) => c.json({ sources: await listSources(c.env) }))
router.post('/admin/sources', async (c) => {
  try { return c.json({ source: await createSource(c.env, await c.req.json().catch(() => ({}))) }, 201) }
  catch (e) { return c.json({ error: e.message }, 400) }
})
router.patch('/admin/sources/:key', async (c) => c.json({ source: await updateSource(c.env, c.req.param('key'), await c.req.json().catch(() => ({}))) }))
router.delete('/admin/sources/:key', async (c) => c.json(await deleteSource(c.env, c.req.param('key'))))

router.get('/admin/settings', async (c) => c.json({ settings: await getSettings(c.env) }))
router.patch('/admin/settings', async (c) => c.json({ settings: await updateSettings(c.env, await c.req.json().catch(() => ({}))) }))

router.get('/admin/closers', async (c) => c.json({ closers: await listClosers(c.env, { activeOnly: c.req.query('active') === '1' }) }))
router.post('/admin/closers', async (c) => {
  try { return c.json({ closer: await createCloser(c.env, await c.req.json().catch(() => ({}))) }, 201) }
  catch (err) { return c.json({ error: err.message }, 400) }
})
router.patch('/admin/closers/:id', async (c) => c.json({ closer: await updateCloser(c.env, c.req.param('id'), await c.req.json().catch(() => ({}))) }))

router.get('/admin/partners', async (c) => c.json({ partners: await listPartners(c.env, { type: c.req.query('type') }) }))
router.post('/admin/partners', async (c) => {
  try { return c.json({ partner: await createPartner(c.env, await c.req.json().catch(() => ({}))) }, 201) }
  catch (err) { return c.json({ error: err.message }, 400) }
})
router.get('/admin/partners/:id', async (c) => {
  const p = await getPartner(c.env, c.req.param('id'))
  return p ? c.json({ partner: p }) : c.json({ error: 'Not found' }, 404)
})
router.patch('/admin/partners/:id', async (c) => c.json({ partner: await updatePartner(c.env, c.req.param('id'), await c.req.json().catch(() => ({}))) }))
router.delete('/admin/partners/:id', async (c) => c.json(await deletePartner(c.env, c.req.param('id'))))

router.get('/admin/sales', async (c) => c.json({ sales: await listSales(c.env, { status: c.req.query('status') }) }))
router.post('/admin/sales', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!body.leadId) return c.json({ error: 'leadId is required' }, 400)
  try { return c.json({ sale: await createSale(c.env, body) }, 201) }
  catch (err) { return c.json({ error: err.message }, 400) }
})
router.get('/admin/sales/:id', async (c) => {
  const s = await getSale(c.env, c.req.param('id'))
  return s ? c.json({ sale: s }) : c.json({ error: 'Not found' }, 404)
})
router.patch('/admin/sales/:id/status', async (c) => {
  const { status, paymentRef } = await c.req.json().catch(() => ({}))
  try { return c.json({ sale: await updateSaleStatus(c.env, c.req.param('id'), status, { paymentRef }) }) }
  catch (err) { return c.json({ error: err.message }, 400) }
})

router.get('/admin/sales/:id/journey', async (c) => c.json({ journey: await listJourney(c.env, c.req.param('id')) }))
router.patch('/admin/journey/:stageId', async (c) => c.json({ stage: await updateStage(c.env, c.req.param('stageId'), (await c.req.json().catch(() => ({}))).status) }))

router.get('/admin/commissions', async (c) => {
  const { commissions, total } = await listCommissions(c.env, {
    status: c.req.query('status'), beneficiaryKey: c.req.query('beneficiary'),
    limit: c.req.query('limit'), offset: c.req.query('offset'),
  })
  return c.json({ commissions, total })
})
router.get('/admin/commissions/summary', async (c) => c.json({ summary: await commissionSummary(c.env) }))
router.patch('/admin/commissions/:id/status', async (c) => {
  try { return c.json({ commission: await updateCommissionStatus(c.env, c.req.param('id'), (await c.req.json().catch(() => ({}))).status) }) }
  catch (err) { return c.json({ error: err.message }, 400) }
})

export default router
