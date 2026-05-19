/**
 * growth-clube Worker
 * Serves the static React app + provides a KV-backed REST API for Kanban data.
 *
 * KV keys:
 *   kanban:clients          → JSON array of client objects { id, name, color }
 *   kanban:cards            → JSON array of all card objects
 *   kanban:members          → JSON array of member objects { id, name, email, role, tools[] }
 *
 * API routes (all JSON):
 *   GET  /api/kanban/clients
 *   POST /api/kanban/clients          body: { name, color? }
 *   PUT  /api/kanban/clients/:id      body: { name?, color? }
 *   DELETE /api/kanban/clients/:id
 *
 *   GET  /api/kanban/cards
 *   POST /api/kanban/cards            body: card object
 *   PUT  /api/kanban/cards/:id        body: partial card
 *   DELETE /api/kanban/cards/:id
 *
 *   GET  /api/kanban/members
 *   POST /api/kanban/members          body: { name, email, role, tools? }
 *   PUT  /api/kanban/members/:id      body: partial member
 *   DELETE /api/kanban/members/:id
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

// ── KV helpers ────────────────────────────────────────────────────────────────

async function kvGet(kv, key, fallback = []) {
  const raw = await kv.get(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

async function kvSet(kv, key, value) {
  await kv.put(key, JSON.stringify(value))
}

// ── Default seed data ─────────────────────────────────────────────────────────

const DEFAULT_CLIENTS = [
  { id: 'growth-clube', name: 'Growth Clube', color: '#A31621' },
  { id: 'cliente-a',    name: 'Cliente A',    color: '#1877F2' },
  { id: 'cliente-b',    name: 'Cliente B',    color: '#10A37F' },
]

const DEFAULT_MEMBERS = [
  { id: 'hudson', name: 'Hudson', email: 'hudson@growthclube.com', role: 'Admin',  tools: [] },
  { id: 'ana',    name: 'Ana',    email: 'ana@growthclube.com',    role: 'Editor', tools: [] },
  { id: 'pedro',  name: 'Pedro',  email: 'pedro@growthclube.com',  role: 'Viewer', tools: [] },
]

// ── Router ────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const path   = url.pathname
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // ── API routes ────────────────────────────────────────────────────────────
    if (path.startsWith('/api/kanban/')) {
      const kv = env.KANBAN

      // ── CLIENTS ──────────────────────────────────────────────────────────
      if (path === '/api/kanban/clients') {
        if (method === 'GET') {
          let clients = await kvGet(kv, 'kanban:clients', null)
          if (clients === null) {
            clients = DEFAULT_CLIENTS
            await kvSet(kv, 'kanban:clients', clients)
          }
          return json({ clients })
        }
        if (method === 'POST') {
          const body    = await request.json()
          const clients = await kvGet(kv, 'kanban:clients', DEFAULT_CLIENTS)
          const client  = { id: uid(), name: body.name, color: body.color ?? '#6366f1' }
          clients.push(client)
          await kvSet(kv, 'kanban:clients', clients)
          return json({ client }, 201)
        }
      }

      const clientMatch = path.match(/^\/api\/kanban\/clients\/([^/]+)$/)
      if (clientMatch) {
        const id      = clientMatch[1]
        const clients = await kvGet(kv, 'kanban:clients', DEFAULT_CLIENTS)
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = clients.map((c) => c.id === id ? { ...c, ...body, id } : c)
          await kvSet(kv, 'kanban:clients', updated)
          return json({ client: updated.find((c) => c.id === id) })
        }
        if (method === 'DELETE') {
          const updated = clients.filter((c) => c.id !== id)
          await kvSet(kv, 'kanban:clients', updated)
          // Also delete all cards for this client
          const cards   = await kvGet(kv, 'kanban:cards', [])
          await kvSet(kv, 'kanban:cards', cards.filter((c) => c.clientId !== id))
          return json({ ok: true })
        }
      }

      // ── CARDS ─────────────────────────────────────────────────────────────
      if (path === '/api/kanban/cards') {
        if (method === 'GET') {
          const cards = await kvGet(kv, 'kanban:cards', [])
          return json({ cards })
        }
        if (method === 'POST') {
          const body  = await request.json()
          const cards = await kvGet(kv, 'kanban:cards', [])
          const card  = { id: uid(), createdAt: new Date().toISOString(), ...body }
          cards.push(card)
          await kvSet(kv, 'kanban:cards', cards)
          return json({ card }, 201)
        }
      }

      const cardMatch = path.match(/^\/api\/kanban\/cards\/([^/]+)$/)
      if (cardMatch) {
        const id    = cardMatch[1]
        const cards = await kvGet(kv, 'kanban:cards', [])
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = cards.map((c) => c.id === id ? { ...c, ...body, id } : c)
          await kvSet(kv, 'kanban:cards', updated)
          return json({ card: updated.find((c) => c.id === id) })
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'kanban:cards', cards.filter((c) => c.id !== id))
          return json({ ok: true })
        }
      }

      // ── MEMBERS ───────────────────────────────────────────────────────────
      if (path === '/api/kanban/members') {
        if (method === 'GET') {
          let members = await kvGet(kv, 'kanban:members', null)
          if (members === null) {
            members = DEFAULT_MEMBERS
            await kvSet(kv, 'kanban:members', members)
          }
          return json({ members })
        }
        if (method === 'POST') {
          const body    = await request.json()
          const members = await kvGet(kv, 'kanban:members', DEFAULT_MEMBERS)
          const member  = { id: uid(), tools: [], ...body }
          members.push(member)
          await kvSet(kv, 'kanban:members', members)
          return json({ member }, 201)
        }
      }

      const memberMatch = path.match(/^\/api\/kanban\/members\/([^/]+)$/)
      if (memberMatch) {
        const id      = memberMatch[1]
        const members = await kvGet(kv, 'kanban:members', DEFAULT_MEMBERS)
        if (method === 'PUT') {
          const body = await request.json()
          // Try match by id first; fall back to email match (for Supabase-only users)
          const email   = (body.email ?? '').toLowerCase()
          const byId    = members.findIndex((m) => m.id === id)
          const byEmail = members.findIndex((m) => m.email?.toLowerCase() === email)
          const idx     = byId >= 0 ? byId : byEmail

          let updated
          let member
          if (idx >= 0) {
            // Update existing entry
            updated = members.map((m, i) => i === idx ? { ...m, ...body, id: m.id } : m)
            member  = updated[idx]
          } else {
            // Upsert: this user exists in Supabase but not yet in KV — add them
            member  = { id: uid(), ...body }
            updated = [...members, member]
          }
          await kvSet(kv, 'kanban:members', updated)
          return json({ member })
        }
        if (method === 'DELETE') {
          // Allow delete by id or by email
          await kvSet(kv, 'kanban:members', members.filter((m) => m.id !== id && m.email?.toLowerCase() !== id.toLowerCase()))
          return json({ ok: true })
        }
      }

      // ── CUSTOM TOOLS ──────────────────────────────────────────────────────
      if (path === '/api/kanban/custom-tools') {
        if (method === 'GET') {
          const tools = await kvGet(kv, 'kanban:custom-tools', [])
          return json({ tools })
        }
        if (method === 'POST') {
          const body  = await request.json()
          const tools = await kvGet(kv, 'kanban:custom-tools', [])
          const tool  = { id: uid(), createdAt: new Date().toISOString(), credentials: { login: '', password: '' }, ...body }
          tools.push(tool)
          await kvSet(kv, 'kanban:custom-tools', tools)
          return json({ tool }, 201)
        }
      }
      const customToolMatch = path.match(/^\/api\/kanban\/custom-tools\/([^/]+)$/)
      if (customToolMatch) {
        const id    = customToolMatch[1]
        const tools = await kvGet(kv, 'kanban:custom-tools', [])
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = tools.map((t) => t.id === id ? { ...t, ...body, id } : t)
          await kvSet(kv, 'kanban:custom-tools', updated)
          return json({ tool: updated.find((t) => t.id === id) })
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'kanban:custom-tools', tools.filter((t) => t.id !== id))
          return json({ ok: true })
        }
      }

      return json({ error: 'Not found' }, 404)
    }

    // ── Team users: Supabase auth list merged with KV roles/tools ─────────────
    if (path === '/api/team/users' && method === 'GET') {
      const kv     = env.KANBAN
      const svcKey = env.SUPABASE_SERVICE_KEY
      let supaUsers = []

      if (svcKey) {
        try {
          const r = await fetch('https://xtoxusngfazryxstoomf.supabase.co/auth/v1/admin/users?per_page=200', {
            headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}` },
          })
          if (r.ok) {
            const body = await r.json()
            supaUsers  = body.users ?? body ?? []
          }
        } catch {}
      }

      // KV member data keyed by email (role, tools, name)
      const kvMembers  = await kvGet(kv, 'kanban:members', [])
      const kvByEmail  = {}
      for (const m of kvMembers) kvByEmail[m.email?.toLowerCase()] = m

      const merged = supaUsers.map(u => {
        const email = (u.email ?? '').toLowerCase()
        const kv    = kvByEmail[email] ?? {}
        return {
          id:          kv.id    ?? u.id,
          supabaseId:  u.id,
          email:       u.email,
          name:        kv.name  ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? '',
          role:        kv.role  ?? 'Viewer',
          tools:       kv.tools ?? [],
          lastSignIn:  u.last_sign_in_at ?? null,
          createdAt:   u.created_at      ?? null,
        }
      })

      // include KV-only members (invited but not yet signed up)
      for (const m of kvMembers) {
        const inSupabase = supaUsers.some(u => u.email?.toLowerCase() === m.email?.toLowerCase())
        if (!inSupabase) merged.push({ ...m, supabaseId: null, lastSignIn: null })
      }

      return json({ members: merged })
    }

    // ── FINANCE API (KV-backed) ───────────────────────────────────────────────
    if (path.startsWith('/api/finance')) {
      const kv = env.KANBAN // reuse same KV namespace under finance: prefix

      // ── Dedup: remove duplicate categories/cards by name ─────────────────
      if (path === '/api/finance/dedup' && method === 'GET') {
        const cats    = await kvGet(kv, 'finance:categories', [])
        const cards   = await kvGet(kv, 'finance:cards', [])
        const dedupBy = (arr, key) => Object.values(
          arr.reduce((acc, item) => { if (!acc[item[key]]) acc[item[key]] = item; return acc }, {})
        )
        const cleanCats  = dedupBy(cats, 'name')
        const cleanCards = dedupBy(cards, 'name')
        await kvSet(kv, 'finance:categories', cleanCats)
        await kvSet(kv, 'finance:cards', cleanCards)
        return json({ removed: { categories: cats.length - cleanCats.length, cards: cards.length - cleanCards.length }, kept: { categories: cleanCats.length, cards: cleanCards.length } })
      }

      // ── Ping ──────────────────────────────────────────────────────────────
      if (path === '/api/finance/ping' && method === 'GET') {
        const cards      = await kvGet(kv, 'finance:cards', null)
        const categories = await kvGet(kv, 'finance:categories', null)
        const expenses   = await kvGet(kv, 'finance:expenses', null)
        return json({
          financial_cards:      { ok: true, rows: (cards      ?? []).length },
          financial_categories: { ok: true, rows: (categories ?? []).length },
          financial_expenses:   { ok: true, rows: (expenses   ?? []).length },
        })
      }

      // ── Cards ─────────────────────────────────────────────────────────────
      if (path === '/api/finance/cards') {
        if (method === 'GET') {
          const cards = await kvGet(kv, 'finance:cards', [])
          return json({ cards })
        }
        if (method === 'POST') {
          const body  = await request.json()
          const cards = await kvGet(kv, 'finance:cards', [])
          const card  = { id: uid(), createdAt: new Date().toISOString(), ...body }
          cards.push(card)
          await kvSet(kv, 'finance:cards', cards)
          return json(card, 201)
        }
      }
      const cardMatch = path.match(/^\/api\/finance\/cards\/([^/]+)$/)
      if (cardMatch) {
        const id    = cardMatch[1]
        const cards = await kvGet(kv, 'finance:cards', [])
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = cards.map((c) => c.id === id ? { ...c, ...body, id } : c)
          await kvSet(kv, 'finance:cards', updated)
          return json(updated.find((c) => c.id === id))
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'finance:cards', cards.filter((c) => c.id !== id))
          return json({ ok: true })
        }
      }

      // ── Categories ────────────────────────────────────────────────────────
      if (path === '/api/finance/categories') {
        if (method === 'GET') {
          const cats = await kvGet(kv, 'finance:categories', [])
          return json({ categories: cats })
        }
        if (method === 'POST') {
          const body = await request.json()
          const cats = await kvGet(kv, 'finance:categories', [])
          // Skip if name already exists (case-insensitive)
          const exists = cats.find(c => c.name.toLowerCase() === (body.name ?? '').toLowerCase())
          if (exists) return json(exists, 200)
          const cat  = { id: uid(), createdAt: new Date().toISOString(), ...body }
          cats.push(cat)
          await kvSet(kv, 'finance:categories', cats)
          return json(cat, 201)
        }
      }
      const catMatch = path.match(/^\/api\/finance\/categories\/([^/]+)$/)
      if (catMatch) {
        const id   = catMatch[1]
        const cats = await kvGet(kv, 'finance:categories', [])
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = cats.map((c) => c.id === id ? { ...c, ...body, id } : c)
          await kvSet(kv, 'finance:categories', updated)
          return json(updated.find((c) => c.id === id))
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'finance:categories', cats.filter((c) => c.id !== id))
          return json({ ok: true })
        }
      }

      // ── Expenses ──────────────────────────────────────────────────────────
      if (path === '/api/finance/expenses') {
        const ownerEmail = new URL(request.url).searchParams.get('ownerEmail')
        if (method === 'GET') {
          const cards      = await kvGet(kv, 'finance:cards', [])
          const cats       = await kvGet(kv, 'finance:categories', [])
          let   expenses   = await kvGet(kv, 'finance:expenses', [])
          if (ownerEmail) expenses = expenses.filter((e) => e.ownerEmail === ownerEmail)
          // Join card + category
          const joined = expenses.map((e) => ({
            ...e,
            card:     cards.find((c) => c.id === e.cardId) ?? null,
            category: cats.find((c)  => c.id === e.categoryId) ?? null,
          }))
          return json({ expenses: joined })
        }
        if (method === 'POST') {
          const body     = await request.json()
          const expenses = await kvGet(kv, 'finance:expenses', [])
          const now      = new Date().toISOString()
          const expense  = { id: uid(), createdAt: now, updatedAt: now, status: 'active', ...body }
          expenses.push(expense)
          await kvSet(kv, 'finance:expenses', expenses)
          return json(expense, 201)
        }
      }
      const expMatch = path.match(/^\/api\/finance\/expenses\/([^/]+)$/)
      if (expMatch) {
        const id       = expMatch[1]
        const expenses = await kvGet(kv, 'finance:expenses', [])
        if (method === 'PUT') {
          const body    = await request.json()
          const updated = expenses.map((e) => e.id === id ? { ...e, ...body, id, updatedAt: new Date().toISOString() } : e)
          await kvSet(kv, 'finance:expenses', updated)
          return json(updated.find((e) => e.id === id))
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'finance:expenses', expenses.filter((e) => e.id !== id))
          return json({ ok: true })
        }
      }

      // ── Overview ──────────────────────────────────────────────────────────
      if (path === '/api/finance/overview' && method === 'GET') {
        const ownerEmail = new URL(request.url).searchParams.get('ownerEmail')
        const cards      = await kvGet(kv, 'finance:cards', [])
        const cats       = await kvGet(kv, 'finance:categories', [])
        let   expenses   = await kvGet(kv, 'finance:expenses', [])
        if (ownerEmail) expenses = expenses.filter((e) => e.ownerEmail === ownerEmail)
        const active    = expenses.filter((e) => e.status === 'active')
        const thisMonth = new Date().toISOString().slice(0, 7)
        const fixed     = active.filter((e) => e.type === 'fixed_monthly')
        const oneTime   = active.filter((e) => e.type === 'one_time' && (e.paidAt ?? e.createdAt ?? '').startsWith(thisMonth))
        const monthlyFixed     = fixed.reduce((s, e) => s + Number(e.amount ?? 0), 0)
        const thisMonthOneTime = oneTime.reduce((s, e) => s + Number(e.amount ?? 0), 0)
        const catMap = {}
        for (const e of active) {
          const cat   = cats.find((c) => c.id === e.categoryId)
          const key   = cat?.name  ?? 'Sem categoria'
          const color = cat?.color ?? '#6366f1'
          const icon  = cat?.icon  ?? '📦'
          if (!catMap[key]) catMap[key] = { name: key, color, icon, total: 0, count: 0 }
          catMap[key].total += Number(e.amount ?? 0)
          catMap[key].count++
        }
        const cardMap = {}
        for (const e of active) {
          const card  = cards.find((c) => c.id === e.cardId)
          const key   = card?.name  ?? 'Sem cartão'
          const color = card?.color ?? '#6366f1'
          if (!cardMap[key]) cardMap[key] = { name: key, color, total: 0, count: 0 }
          cardMap[key].total += Number(e.amount ?? 0)
          cardMap[key].count++
        }
        return json({
          monthlyFixed,
          thisMonthOneTime,
          totalMonth:       monthlyFixed + thisMonthOneTime,
          annualProjection: monthlyFixed * 12 + thisMonthOneTime,
          byCategory: Object.values(catMap).sort((a, b) => b.total - a.total),
          byCard:     Object.values(cardMap).sort((a, b) => b.total - a.total),
          expenseCount: active.length,
        })
      }

      return json({ error: 'Not found' }, 404)
    }

    // ── Invite member via Supabase email ──────────────────────────────────────
    if (path === '/api/invite' && method === 'POST') {
      const body    = await request.json()
      const email   = (body.email ?? '').trim().toLowerCase()
      const name    = (body.name  ?? email.split('@')[0]).trim()
      if (!email) return json({ error: 'email required' }, 400)

      const svcKey = env.SUPABASE_SERVICE_KEY
      if (!svcKey) return json({ error: 'SUPABASE_SERVICE_KEY not configured' }, 500)

      const res  = await fetch('https://xtoxusngfazryxstoomf.supabase.co/auth/v1/invite', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        svcKey,
          'Authorization': `Bearer ${svcKey}`,
        },
        body: JSON.stringify({ email, data: { name } }),
      })
      const result = await res.json()
      if (!res.ok) return json({ error: result.msg ?? result.message ?? 'Invite failed' }, res.status)
      return json({ ok: true, email })
    }

    // ── Static assets (React app) ─────────────────────────────────────────────
    return env.ASSETS.fetch(request)
  },
}
