/**
 * Traffic sources — non-partner UTM origins (e.g. paid ads). Tracked for
 * attribution but carry no commission. Managed from the Parceiros & Equipe page.
 */
import { all, first, run } from '../../lib/ci-db.js'

function normaliseKey(raw) {
  return String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '')
}

export async function listSources(env) {
  return all(env, `SELECT key, label, medium, created_at FROM ci_sources ORDER BY created_at ASC`)
}

export async function createSource(env, { key, label, medium }) {
  const k = normaliseKey(key || label)
  if (!k) throw new Error('Informe um identificador (utm_source).')
  const exists = await first(env, `SELECT key FROM ci_sources WHERE key = ?`, [k])
  if (exists) throw new Error(`A fonte "${k}" já existe.`)
  await run(env, `INSERT INTO ci_sources (key, label, medium) VALUES (?, ?, ?)`, [k, label || k, normaliseKey(medium) || 'paid'])
  return first(env, `SELECT key, label, medium FROM ci_sources WHERE key = ?`, [k])
}

// Label + medium are editable; the key (utm_source) is fixed to keep links stable.
export async function updateSource(env, key, { label, medium }) {
  const fields = []
  const vals = []
  if (label !== undefined) { fields.push('label = ?'); vals.push(label) }
  if (medium !== undefined) { fields.push('medium = ?'); vals.push(normaliseKey(medium) || 'paid') }
  if (fields.length) await run(env, `UPDATE ci_sources SET ${fields.join(', ')} WHERE key = ?`, [...vals, key])
  return first(env, `SELECT key, label, medium FROM ci_sources WHERE key = ?`, [key])
}

export async function deleteSource(env, key) {
  await run(env, `DELETE FROM ci_sources WHERE key = ?`, [key])
  return { key, deleted: true }
}
