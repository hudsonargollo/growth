/**
 * Partners: ambassadors / influencers / partners / mentors.
 * Each owns a unique utm_source used for lead attribution and commission payout.
 */
import { all, first, run, now, setClause } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

const PARTNER_TYPES = ['ambassador', 'influencer', 'partner', 'mentor']

/** Normalise a utm_source: lowercase, strip spaces → underscores, alnum + _ - only. */
export function normaliseUtm(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}

export async function createPartner(env, input) {
  const utm = normaliseUtm(input.utm_source || input.name)
  if (!utm) throw new Error('utm_source (or name) is required')
  const existing = await first(env, `SELECT id FROM partners WHERE lower(utm_source) = ?`, [utm])
  if (existing) throw new Error(`utm_source "${utm}" already exists`)

  const id = uid()
  const type = PARTNER_TYPES.includes(input.type) ? input.type : 'ambassador'
  await run(
    env,
    `INSERT INTO partners (id, name, type, utm_source, commission_rate, mentor_id, whatsapp, email, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.name ?? utm, type, utm,
      Number(input.commission_rate) || 0,
      input.mentor_id ?? null, input.whatsapp ?? null, input.email ?? null, input.notes ?? null,
    ],
  )
  return getPartner(env, id)
}

export async function listPartners(env, { type } = {}) {
  const where = type ? 'WHERE p.type = ?' : ''
  const params = type ? [type] : []
  return all(
    env,
    `SELECT p.*,
            m.name AS mentor_name,
            (SELECT COUNT(*) FROM leads l WHERE l.partner_id = p.id) AS lead_count,
            (SELECT COUNT(*) FROM sales s
               JOIN leads l2 ON l2.id = s.lead_id
              WHERE s.partner_id = p.id
                AND s.status IN ('paid','onboarding','journey','completed')) AS sale_count
       FROM partners p
       LEFT JOIN partners m ON m.id = p.mentor_id
       ${where}
      ORDER BY p.created_at DESC`,
    params,
  )
}

export async function getPartner(env, id) {
  return first(
    env,
    `SELECT p.*, m.name AS mentor_name FROM partners p LEFT JOIN partners m ON m.id = p.mentor_id WHERE p.id = ?`,
    [id],
  )
}

export async function updatePartner(env, id, fields) {
  const allowed = {}
  for (const k of ['name', 'type', 'commission_rate', 'mentor_id', 'whatsapp', 'email', 'status', 'notes']) {
    if (k in fields) allowed[k] = fields[k]
  }
  if (Object.keys(allowed).length === 0) return getPartner(env, id)
  allowed.updated_at = now()
  const { clause, values } = setClause(allowed)
  await run(env, `UPDATE partners SET ${clause} WHERE id = ?`, [...values, id])
  return getPartner(env, id)
}

export async function deletePartner(env, id) {
  // Hard delete + clear references. Existing commissions keep their snapshot
  // (beneficiary_name/key), so payout history stays intact.
  await run(env, `UPDATE leads SET partner_id = NULL WHERE partner_id = ?`, [id])
  await run(env, `UPDATE sales SET partner_id = NULL WHERE partner_id = ?`, [id])
  await run(env, `DELETE FROM partners WHERE id = ?`, [id])
  return { id, deleted: true }
}

export { PARTNER_TYPES }
