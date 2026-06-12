/**
 * Commission engine. Commissions are generated when a sale enters 'onboarding'
 * (the chosen trigger: buyer goes into onboarding after paying).
 *
 * Beneficiaries per sale:
 *   - House: Hudson (default 5%) + Alison (default 5%) of the gross amount
 *   - Partner: the attributed UTM owner gets their commission_rate %
 */
import { all, first, run, now } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

async function getSetting(env, key, fallback) {
  const row = await first(env, `SELECT value FROM ci_settings WHERE key = ?`, [key])
  return row ? row.value : fallback
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

/**
 * Generate commission rows for a sale. Idempotent: skips if rows already exist.
 * `status` defaults to 'projected' — commissions are recorded as PROJECTED the
 * moment a sale is created (before payment), then activated to 'pending' on payment.
 * Returns the commission rows.
 */
export async function generateCommissions(env, sale, { status = 'projected' } = {}) {
  const existing = await all(env, `SELECT id FROM commissions WHERE sale_id = ?`, [sale.id])
  if (existing.length > 0) return all(env, `SELECT * FROM commissions WHERE sale_id = ?`, [sale.id])

  const amount = Number(sale.amount) || 0
  const currency = sale.currency || 'BRL'
  const rows = []

  const hudsonRate = Number(await getSetting(env, 'house_rate_hudson', '5'))
  const alisonRate = Number(await getSetting(env, 'house_rate_alison', '5'))

  rows.push(['house', 'hudson', 'Hudson', hudsonRate])
  rows.push(['house', 'alison', 'Alison', alisonRate])

  // Partner commission (if the lead was attributed to a partner with a rate)
  if (sale.partner_id) {
    const partner = await first(env, `SELECT * FROM partners WHERE id = ?`, [sale.partner_id])
    if (partner && Number(partner.commission_rate) > 0) {
      rows.push(['partner', partner.id, partner.name, Number(partner.commission_rate)])
    }
  }

  // Closer commission (if the closer who worked the sale has a rate set)
  if (sale.closer_id) {
    const closer = await first(env, `SELECT * FROM closers WHERE id = ?`, [sale.closer_id])
    if (closer && Number(closer.commission_rate) > 0) {
      rows.push(['closer', closer.id, closer.name, Number(closer.commission_rate)])
    }
  }

  for (const [type, key, name, rate] of rows) {
    await run(
      env,
      `INSERT INTO commissions
         (id, sale_id, beneficiary_type, beneficiary_key, beneficiary_name, rate, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid(), sale.id, type, key, name, rate, round2(amount * rate / 100), currency, status],
    )
  }

  return all(env, `SELECT * FROM commissions WHERE sale_id = ?`, [sale.id])
}

/**
 * Activate a sale's commissions when payment is confirmed: projected → pending
 * (now actually payable). Generates them fresh as 'pending' if none exist yet.
 */
export async function activateCommissions(env, saleId) {
  const projected = await all(env, `SELECT id FROM commissions WHERE sale_id = ? AND status = 'projected'`, [saleId])
  if (projected.length > 0) {
    await run(env, `UPDATE commissions SET status = 'pending' WHERE sale_id = ? AND status = 'projected'`, [saleId])
    return all(env, `SELECT * FROM commissions WHERE sale_id = ?`, [saleId])
  }
  const sale = await first(env, `SELECT * FROM sales WHERE id = ?`, [saleId])
  return sale ? generateCommissions(env, sale, { status: 'pending' }) : []
}

/** List commissions with sale/beneficiary context, filtered + paginated. Returns { commissions, total }. */
export async function listCommissions(env, { status, beneficiaryKey, limit = 50, offset = 0 } = {}) {
  const where = []
  const params = []
  if (status) { where.push('cm.status = ?'); params.push(status) }
  if (beneficiaryKey) { where.push('cm.beneficiary_key = ?'); params.push(beneficiaryKey) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalRow = await first(env, `SELECT COUNT(*) AS n FROM commissions cm ${whereSql}`, params)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500)
  const off = Math.max(Number(offset) || 0, 0)
  const commissions = await all(
    env,
    `SELECT cm.*, s.amount AS sale_amount, s.status AS sale_status,
            l.name AS buyer_name, l.email AS buyer_email
       FROM commissions cm
       JOIN sales s ON s.id = cm.sale_id
       JOIN leads l ON l.id = s.lead_id
       ${whereSql}
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, lim, off],
  )
  return { commissions, total: totalRow?.n ?? 0 }
}

/** Update a commission's payout status (approved / paid / void). */
export async function updateCommissionStatus(env, id, status) {
  if (!['projected', 'pending', 'approved', 'paid', 'void'].includes(status)) {
    throw new Error(`Invalid commission status: ${status}`)
  }
  const paidAt = status === 'paid' ? now() : null
  await run(env, `UPDATE commissions SET status = ?, paid_at = ? WHERE id = ?`, [status, paidAt, id])
  return first(env, `SELECT * FROM commissions WHERE id = ?`, [id])
}

/** Aggregated payout summary per beneficiary. */
export async function commissionSummary(env) {
  return all(
    env,
    `SELECT beneficiary_key, beneficiary_name, beneficiary_type,
            COUNT(*) AS count,
            SUM(amount) AS total,
            SUM(CASE WHEN status = 'projected' THEN amount ELSE 0 END) AS projected,
            SUM(CASE WHEN status = 'pending'  THEN amount ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) AS approved,
            SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END) AS paid
       FROM commissions
      WHERE status != 'void'
      GROUP BY beneficiary_key, beneficiary_name, beneficiary_type
      ORDER BY total DESC`,
  )
}
