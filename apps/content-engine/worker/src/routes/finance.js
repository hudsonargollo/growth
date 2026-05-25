/**
 * /api/finance — financial management
 * Cards, categories, fixed/one-time expenses, overview stats
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const router = new Hono()

function isTableMissing(error) {
  const code = error?.code ?? ''
  const msg  = error?.message ?? ''
  // Only treat as "table missing" for genuine PostgreSQL undefined_table (42P01)
  // or a PostgREST schema-cache miss. Avoid false positives from constraint /
  // permission errors that happen to mention the table name.
  return code === '42P01' ||
    msg.includes('schema cache') ||
    (msg.includes('does not exist') && msg.includes('relation'))
}

// ── Debug / schema ping (GET only — no CORS preflight) ───────────────────────
router.get('/ping', async (c) => {
  const db = getDb(c.env)
  const results = {}
  for (const tbl of ['financial_cards', 'financial_categories', 'financial_expenses']) {
    const { data, error } = await db.from(tbl).select('id').limit(1)
    results[tbl] = error
      ? { ok: false, code: error.code ?? '', msg: error.message ?? String(error) }
      : { ok: true, rows: data?.length ?? 0 }
  }
  return c.json({ supabaseUrl: c.env.SUPABASE_URL, ...results })
})

// ── Auto-migrate: bootstrap tables via stored-procedure trick ─────────────────
router.get('/migrate', async (c) => {
  const url    = c.env.SUPABASE_URL
  const svcKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  const db     = getDb(c.env)

  // Step 1: create a helper function via /rest/v1/rpc bootstrap (requires
  //         the function to already exist — skip if not available).
  // Step 2: use the Supabase DB SQL endpoint that some plans expose.
  // Step 3: fallback — return the SQL + project URL for manual run.

  // Try the Supabase SQL endpoint (available on Pro/Team plans)
  const sqlBody = `
    CREATE TABLE IF NOT EXISTS financial_cards (
      id text PRIMARY KEY, name text NOT NULL DEFAULT '',
      "lastFour" text DEFAULT '', brand text DEFAULT '',
      color text DEFAULT 'red', "isDefault" boolean DEFAULT false,
      "createdAt" timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS financial_categories (
      id text PRIMARY KEY, name text NOT NULL,
      color text DEFAULT '#A31621', icon text DEFAULT '📦',
      "createdAt" timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS financial_expenses (
      id text PRIMARY KEY, "ownerEmail" text,
      "cardId" text REFERENCES financial_cards(id) ON DELETE SET NULL,
      "categoryId" text REFERENCES financial_categories(id) ON DELETE SET NULL,
      description text NOT NULL DEFAULT '', amount numeric NOT NULL DEFAULT 0,
      type text NOT NULL DEFAULT 'one_time', status text DEFAULT 'active',
      "billingDay" integer, "paidAt" timestamptz, notes text DEFAULT '',
      "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
    );
    ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS "ownerEmail" text;
    NOTIFY pgrst, 'reload schema';
  `

  // Try each known Supabase SQL execution endpoint
  const endpoints = [
    { path: '/rest/v1/rpc/query',   body: { query: sqlBody } },
    { path: '/rest/v1/rpc/exec_sql', body: { sql: sqlBody } },
    { path: '/pg/query',             body: { query: sqlBody } },
  ]

  const attempts = []
  for (const ep of endpoints) {
    try {
      const r = await fetch(`${url}${ep.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}` },
        body: JSON.stringify(ep.body),
      })
      const txt = await r.text()
      attempts.push({ path: ep.path, status: r.status, ok: r.status < 300, body: txt.slice(0, 120) })
      if (r.status < 300) break
    } catch (e) {
      attempts.push({ path: ep.path, error: e.message })
    }
  }

  // Always try schema reload via RPC
  const { error: rpcErr } = await db.rpc('pg_notify', { channel: 'pgrst', payload: 'reload schema' })

  // Check if tables now exist
  const ping = {}
  for (const tbl of ['financial_cards', 'financial_categories', 'financial_expenses']) {
    const { error } = await db.from(tbl).select('id').limit(1)
    ping[tbl] = error ? { ok: false, msg: error.message } : { ok: true }
  }

  return c.json({
    supabaseUrl: url,
    projectRef: url.replace('https://', '').split('.')[0],
    attempts,
    rpcNotifyError: rpcErr?.message ?? null,
    tablesNow: ping,
  })
})

// ── Cards ─────────────────────────────────────────────────────────────────────
router.get('/cards', async (c) => {
  const db = getDb(c.env)
  const { data, error } = await db
    .from('financial_cards')
    .select('*')
    .order('createdAt', { ascending: true })
  if (error) {
    if (isTableMissing(error)) return c.json({ cards: [], setupNeeded: true, _err: error.message })
    return c.json({ error: error.message }, 500)
  }
  return c.json({ cards: data ?? [] })
})

router.post('/cards', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const { data, error } = await db
    .from('financial_cards')
    .insert({ id: uid(), createdAt: new Date().toISOString(), ...body })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.put('/cards/:id', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const { data, error } = await db
    .from('financial_cards')
    .update(body)
    .eq('id', c.req.param('id'))
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.delete('/cards/:id', async (c) => {
  const db = getDb(c.env)
  const { error } = await db.from('financial_cards').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', async (c) => {
  const db = getDb(c.env)
  const { data, error } = await db
    .from('financial_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    if (isTableMissing(error)) return c.json({ categories: [], setupNeeded: true })
    return c.json({ error: error.message }, 500)
  }
  return c.json({ categories: data ?? [] })
})

router.post('/categories', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const { data, error } = await db
    .from('financial_categories')
    .insert({ id: uid(), createdAt: new Date().toISOString(), ...body })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.put('/categories/:id', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const { data, error } = await db
    .from('financial_categories')
    .update(body)
    .eq('id', c.req.param('id'))
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.delete('/categories/:id', async (c) => {
  const db = getDb(c.env)
  const { error } = await db.from('financial_categories').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ── Expenses ─────────────────────────────────────────────────────────────────
router.get('/expenses', async (c) => {
  const db         = getDb(c.env)
  const ownerEmail = c.req.query('ownerEmail') ?? null

  let q = db
    .from('financial_expenses')
    .select(`
      *,
      card:financial_cards(id, name, lastFour, brand, color),
      category:financial_categories(id, name, color, icon)
    `)
    .order('createdAt', { ascending: false })
    .limit(500)

  if (ownerEmail) q = q.eq('ownerEmail', ownerEmail)

  const { data, error } = await q
  if (error) {
    if (isTableMissing(error)) return c.json({ expenses: [], setupNeeded: true })
    // fallback: no joins
    let qp = db.from('financial_expenses').select('*').order('createdAt', { ascending: false }).limit(500)
    if (ownerEmail) qp = qp.eq('ownerEmail', ownerEmail)
    const { data: plain } = await qp
    return c.json({ expenses: plain ?? [] })
  }
  return c.json({ expenses: data ?? [] })
})

router.post('/expenses', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const now  = new Date().toISOString()
  const { data, error } = await db
    .from('financial_expenses')
    .insert({ id: uid(), createdAt: now, updatedAt: now, status: 'active', ...body })
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.put('/expenses/:id', async (c) => {
  const db   = getDb(c.env)
  const body = await c.req.json()
  const { data, error } = await db
    .from('financial_expenses')
    .update({ ...body, updatedAt: new Date().toISOString() })
    .eq('id', c.req.param('id'))
    .select().single()
  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

router.delete('/expenses/:id', async (c) => {
  const db = getDb(c.env)
  const { error } = await db.from('financial_expenses').delete().eq('id', c.req.param('id'))
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ── Overview ─────────────────────────────────────────────────────────────────
router.get('/overview', async (c) => {
  const db         = getDb(c.env)
  const ownerEmail = c.req.query('ownerEmail') ?? null

  let q = db
    .from('financial_expenses')
    .select('*, category:financial_categories(id, name, color, icon), card:financial_cards(id, name, lastFour, brand, color)')
    .eq('status', 'active')
  if (ownerEmail) q = q.eq('ownerEmail', ownerEmail)

  const { data: expenses, error } = await q

  if (error) {
    if (isTableMissing(error)) return c.json({ setupNeeded: true, monthlyFixed: 0, thisMonthOneTime: 0, totalMonth: 0, annualProjection: 0, byCategory: [], byCard: [], expenseCount: 0 })
    return c.json({ error: error.message }, 500)
  }

  const list = expenses ?? []
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  const fixed   = list.filter(e => e.type === 'fixed_monthly')
  const oneTime = list.filter(e => e.type === 'one_time' && (e.paidAt ?? e.createdAt ?? '').startsWith(thisMonth))

  const monthlyFixed      = fixed.reduce((s, e) => s + (Number(e.amount) ?? 0), 0)
  const thisMonthOneTime  = oneTime.reduce((s, e) => s + (Number(e.amount) ?? 0), 0)
  const totalMonth        = monthlyFixed + thisMonthOneTime
  const annualProjection  = monthlyFixed * 12 + thisMonthOneTime

  // Group by category
  const catMap = {}
  for (const e of list) {
    const key   = e.category?.name ?? 'Sem categoria'
    const color = e.category?.color ?? '#6366f1'
    const icon  = e.category?.icon  ?? '📦'
    if (!catMap[key]) catMap[key] = { name: key, color, icon, total: 0, count: 0 }
    catMap[key].total += Number(e.amount) ?? 0
    catMap[key].count++
  }
  const byCategory = Object.values(catMap).sort((a, b) => b.total - a.total)

  // Group by card
  const cardMap = {}
  for (const e of list) {
    const key   = e.card?.name ?? 'Sem cartão'
    const color = e.card?.color ?? '#6366f1'
    if (!cardMap[key]) cardMap[key] = { name: key, color, total: 0, count: 0 }
    cardMap[key].total += Number(e.amount) ?? 0
    cardMap[key].count++
  }
  const byCard = Object.values(cardMap).sort((a, b) => b.total - a.total)

  return c.json({ monthlyFixed, thisMonthOneTime, totalMonth, annualProjection, byCategory, byCard, expenseCount: list.length })
})

export default router
