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
          const body    = await request.json()
          const updated = members.map((m) => m.id === id ? { ...m, ...body, id } : m)
          await kvSet(kv, 'kanban:members', updated)
          return json({ member: updated.find((m) => m.id === id) })
        }
        if (method === 'DELETE') {
          await kvSet(kv, 'kanban:members', members.filter((m) => m.id !== id))
          return json({ ok: true })
        }
      }

      return json({ error: 'Not found' }, 404)
    }

    // ── Static assets (React app) ─────────────────────────────────────────────
    return env.ASSETS.fetch(request)
  },
}
