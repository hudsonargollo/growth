/**
 * Closers — the humans who work the leads. Notified on new assigned leads.
 */
import { all, first, run, now } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

export async function listClosers(env, { activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE active = 1' : ''
  return all(
    env,
    `SELECT c.*,
            (SELECT COUNT(*) FROM leads l WHERE l.assigned_closer_id = c.id) AS lead_count
       FROM closers c ${where} ORDER BY c.created_at ASC`,
  )
}

export async function createCloser(env, input) {
  if (!input.name) throw new Error('name is required')
  const id = uid()
  await run(
    env,
    `INSERT INTO closers (id, name, whatsapp, email, active, commission_rate) VALUES (?, ?, ?, ?, 1, ?)`,
    [id, input.name, input.whatsapp ?? null, input.email ?? null, Number(input.commission_rate) || 0],
  )
  return first(env, `SELECT * FROM closers WHERE id = ?`, [id])
}

export async function updateCloser(env, id, fields) {
  const allowed = {}
  for (const k of ['name', 'whatsapp', 'email', 'active', 'commission_rate']) {
    if (k in fields) allowed[k] = k === 'active' ? (fields[k] ? 1 : 0) : k === 'commission_rate' ? (Number(fields[k]) || 0) : fields[k]
  }
  if (Object.keys(allowed).length === 0) return first(env, `SELECT * FROM closers WHERE id = ?`, [id])
  const keys = Object.keys(allowed)
  await run(env, `UPDATE closers SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => allowed[k]), id])
  return first(env, `SELECT * FROM closers WHERE id = ?`, [id])
}
