/**
 * kvdb.js — Supabase-compatible query builder backed by Cloudflare KV.
 *
 * Implements exactly the subset of the Supabase JS client API used across the
 * codebase so every service file only needs `getDb(env)` to change its import
 * target — the query chains themselves remain untouched.
 *
 * KV data layout:
 *   db:{table}:_idx  → JSON array of {id, createdAt} — for fast ordered listing
 *   db:{table}:{id}  → full JSON record
 *
 * All reads/writes go to env.KV1 (Cloudflare KV namespace).
 */

const NS = 'db'

// ── Low-level helpers ─────────────────────────────────────────────────────────

const recKey = (t, id) => `${NS}:${t}:${id}`
const idxKey = (t)     => `${NS}:${t}:_idx`

async function getIdx(kv, t) {
  return (await kv.get(idxKey(t), { type: 'json' })) ?? []
}

async function addToIdx(kv, t, { id, createdAt }) {
  const idx = await getIdx(kv, t)
  const i = idx.findIndex(r => r.id === id)
  if (i >= 0) idx[i] = { id, createdAt }
  else idx.unshift({ id, createdAt })        // newest-first
  await kv.put(idxKey(t), JSON.stringify(idx))
}

async function removeFromIdx(kv, t, id) {
  const idx = await getIdx(kv, t)
  await kv.put(idxKey(t), JSON.stringify(idx.filter(r => r.id !== id)))
}

async function getRec(kv, t, id) {
  return kv.get(recKey(t, id), { type: 'json' })
}

async function putRec(kv, t, id, data) {
  await kv.put(recKey(t, id), JSON.stringify(data))
}

async function delRec(kv, t, id) {
  await kv.delete(recKey(t, id))
}

// ── Filtering / projection helpers ────────────────────────────────────────────

function project(obj, cols) {
  if (!obj || !cols || cols === '*') return obj
  const fields = cols.split(',').map(s => s.trim()).filter(Boolean)
  return Object.fromEntries(fields.filter(f => f in obj).map(f => [f, obj[f]]))
}

function matches(obj, filters) {
  for (const f of filters) {
    const v = obj[f.field]
    if (f.op === 'eq'  && v !== f.value)                   return false
    if (f.op === 'neq' && v === f.value)                   return false
    if (f.op === 'in'  && !f.value.includes(v))            return false
    if (f.op === 'gte' && !(v >= f.value))                  return false
    if (f.op === 'lte' && !(v <= f.value))                  return false
  }
  return true
}

function sortBy(records, order) {
  if (!order) return records
  return [...records].sort((a, b) => {
    const av = a[order.field] ?? ''
    const bv = b[order.field] ?? ''
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return order.ascending ? cmp : -cmp
  })
}

// ── Query builder ─────────────────────────────────────────────────────────────

class KvQuery {
  constructor(kv, table) {
    this._kv      = kv
    this._t       = table
    this._op      = 'select'
    this._data    = null
    this._cols    = '*'
    this._filters = []
    this._order   = null
    this._limit   = null
    this._wantSel = false       // .select() called after insert/update
    this._upsertConflict = null
  }

  // ── Chainable query API ───────────────────────────────────────────────────

  select(cols = '*') {
    if (this._op === 'select') this._cols = cols
    else this._wantSel = true
    return this
  }
  eq(field, value)  { this._filters.push({ field, op: 'eq',  value }); return this }
  neq(field, value) { this._filters.push({ field, op: 'neq', value }); return this }
  in(field, values) { this._filters.push({ field, op: 'in',  value: values }); return this }
  gte(field, value) { this._filters.push({ field, op: 'gte', value }); return this }
  lte(field, value) { this._filters.push({ field, op: 'lte', value }); return this }
  order(field, opts = {}) {
    this._order = { field, ascending: opts.ascending ?? true }
    return this
  }
  limit(n)          { this._limit = n; return this }

  insert(data) { this._op = 'insert'; this._data = data; return this }
  update(data) { this._op = 'update'; this._data = data; return this }
  delete()     { this._op = 'delete'; return this }
  upsert(data, opts) {
    this._op = 'upsert'
    this._data = data
    this._upsertConflict = opts?.onConflict ?? null
    return this
  }

  // ── Execution terminals ───────────────────────────────────────────────────

  async single()      { return this._wrap(true) }
  async maybeSingle() { return this._wrap('maybe') }

  // Make query awaitable without calling .single()
  then(resolve, reject) { return this._wrap(false).then(resolve, reject) }

  async _wrap(mode) {
    try {
      const result = await this._exec(mode)
      return { data: result, error: null }
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } }
    }
  }

  async _exec(mode) {
    const { _kv: kv, _t: t } = this

    // ── SELECT ──────────────────────────────────────────────────────────────
    if (this._op === 'select') {

      // Fast path: direct ID lookup
      const idEq = this._filters.find(f => f.field === 'id' && f.op === 'eq')
      if (idEq) {
        const rec = await getRec(kv, t, idEq.value)
        if (!rec) {
          const err = Object.assign(new Error('Row not found'), { code: 'PGRST116' })
          if (mode === 'maybe') return null
          if (mode === true)    throw err
          return []
        }
        const out = project(rec, this._cols)
        return mode === false ? [out] : out
      }

      // Multi-ID lookup (.in('id', [...]))
      const idIn = this._filters.find(f => f.field === 'id' && f.op === 'in')
      if (idIn) {
        let recs = (await Promise.all(idIn.value.map(id => getRec(kv, t, id)))).filter(Boolean)
        const rest = this._filters.filter(f => f !== idIn)
        recs = recs.filter(r => matches(r, rest))
        recs = sortBy(recs, this._order)
        if (this._limit) recs = recs.slice(0, this._limit)
        return recs.map(r => project(r, this._cols))
      }

      // Full scan (order field may differ → load all)
      const idx   = await getIdx(kv, t)
      let ids  = idx.map(r => r.id)
      // Limit id-list before loading if we have no non-ID filters and descending idx is already sorted
      const noFilters = this._filters.length === 0
      if (noFilters && !this._order && this._limit) ids = ids.slice(0, this._limit)

      const recs = (await Promise.all(ids.map(id => getRec(kv, t, id)))).filter(Boolean)
      let result = recs.filter(r => matches(r, this._filters))
      result = sortBy(result, this._order)
      if (this._limit) result = result.slice(0, this._limit)
      const out = result.map(r => project(r, this._cols))

      if (mode === true)    return out[0] ?? (() => { throw Object.assign(new Error('Row not found'), { code: 'PGRST116' }) })()
      if (mode === 'maybe') return out[0] ?? null
      return out
    }

    // ── INSERT ──────────────────────────────────────────────────────────────
    if (this._op === 'insert') {
      const rows  = Array.isArray(this._data) ? this._data : [this._data]
      const saved = []
      const now   = new Date().toISOString()
      for (const row of rows) {
        const rec = { createdAt: now, updatedAt: now, ...row }
        await putRec(kv, t, rec.id, rec)
        await addToIdx(kv, t, { id: rec.id, createdAt: rec.createdAt })
        saved.push(rec)
      }
      if (!this._wantSel) return null
      return mode === false ? saved : (saved[0] ?? null)
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if (this._op === 'update') {
      const now   = new Date().toISOString()
      const idEq  = this._filters.find(f => f.field === 'id' && f.op === 'eq')

      if (idEq) {
        const existing = await getRec(kv, t, idEq.value)
        if (!existing) throw new Error(`Row not found in ${t}`)
        const updated = { ...existing, ...this._data, updatedAt: now }
        await putRec(kv, t, idEq.value, updated)
        // preserve original createdAt in idx
        await addToIdx(kv, t, { id: idEq.value, createdAt: existing.createdAt ?? now })
        if (!this._wantSel) return null
        return mode === false ? [updated] : updated
      }

      // Non-ID filter update — full scan
      const idx  = await getIdx(kv, t)
      const recs = (await Promise.all(idx.map(r => getRec(kv, t, r.id)))).filter(Boolean)
      const hits  = recs.filter(r => matches(r, this._filters))
      const saved = []
      for (const rec of hits) {
        const u = { ...rec, ...this._data, updatedAt: now }
        await putRec(kv, t, rec.id, u)
        saved.push(u)
      }
      if (!this._wantSel) return null
      return mode === false ? saved : (saved[0] ?? null)
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (this._op === 'delete') {
      // .delete().neq('id', anything) → clear entire collection
      const isDeleteAll = this._filters.some(f => f.op === 'neq' && f.field === 'id')
      if (isDeleteAll || this._filters.length === 0) {
        const idx = await getIdx(kv, t)
        await Promise.all(idx.map(r => delRec(kv, t, r.id)))
        await kv.put(idxKey(t), JSON.stringify([]))
        return []
      }

      const idEq = this._filters.find(f => f.field === 'id' && f.op === 'eq')
      if (idEq) {
        await delRec(kv, t, idEq.value)
        await removeFromIdx(kv, t, idEq.value)
        return []
      }

      // Non-ID filter delete — scan
      const idx  = await getIdx(kv, t)
      const recs = (await Promise.all(idx.map(r => getRec(kv, t, r.id)))).filter(Boolean)
      const hits  = recs.filter(r => matches(r, this._filters))
      await Promise.all(hits.map(r => delRec(kv, t, r.id)))
      await Promise.all(hits.map(r => removeFromIdx(kv, t, r.id)))
      return []
    }

    // ── UPSERT ──────────────────────────────────────────────────────────────
    if (this._op === 'upsert') {
      const now = new Date().toISOString()
      const row = Array.isArray(this._data) ? this._data[0] : this._data

      if (this._upsertConflict) {
        // Find by conflict field
        const idx  = await getIdx(kv, t)
        const recs = (await Promise.all(idx.map(r => getRec(kv, t, r.id)))).filter(Boolean)
        const existing = recs.find(r => r[this._upsertConflict] === row[this._upsertConflict])
        if (existing) {
          const updated = { ...existing, ...row, updatedAt: now }
          await putRec(kv, t, existing.id, updated)
          return mode === false ? [updated] : updated
        }
      }

      // Insert
      const rec = { createdAt: now, updatedAt: now, ...row }
      await putRec(kv, t, rec.id, rec)
      await addToIdx(kv, t, { id: rec.id, createdAt: rec.createdAt })
      return mode === false ? [rec] : rec
    }

    throw new Error(`kvdb: unknown op "${this._op}"`)
  }
}

// ── Client ────────────────────────────────────────────────────────────────────

class KvClient {
  constructor(kv) { this._kv = kv }
  from(table) { return new KvQuery(this._kv, table) }
}

export function getKvDb(env) {
  if (!env.KV1) throw new Error('KV1 binding not configured — check wrangler.toml')
  return new KvClient(env.KV1)
}
