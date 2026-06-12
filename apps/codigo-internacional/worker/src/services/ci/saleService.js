/**
 * Sale lifecycle. Created when a lead is marked "won".
 *
 *   pending_payment → paid → onboarding → journey → completed
 *        │              └── commissions activate (projected → pending)
 *        └── PROJECTED commissions recorded at sale creation
 *                              onboarding seeds the concierge journey
 */
import { all, first, run, now } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'
import { generateCommissions, activateCommissions } from './commissionService.js'
import { seedJourney } from './journeyService.js'

const SALE_STATUSES = ['pending_payment', 'paid', 'onboarding', 'journey', 'completed', 'refunded']

/**
 * Create a sale from a won lead. Snapshots the lead's partner attribution and
 * flips the lead to 'won'. Amount defaults to the configured program price.
 */
export async function createSale(env, { leadId, amount, closerId, currency = 'BRL' }) {
  const lead = await first(env, `SELECT * FROM leads WHERE id = ?`, [leadId])
  if (!lead) throw new Error('Lead not found')

  const existing = await first(
    env,
    `SELECT * FROM sales WHERE lead_id = ? AND status != 'refunded' LIMIT 1`,
    [leadId],
  )
  if (existing) return existing

  let price = Number(amount)
  if (!price) {
    const row = await first(env, `SELECT value FROM ci_settings WHERE key = 'program_price'`)
    price = Number(row?.value) || 0
  }

  const id = uid()
  await run(
    env,
    `INSERT INTO sales (id, lead_id, partner_id, closer_id, amount, currency)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, leadId, lead.partner_id, closerId ?? lead.assigned_closer_id, price, currency],
  )

  // Move the lead to won + audit
  await run(env, `UPDATE leads SET status = 'won', updated_at = ? WHERE id = ?`, [now(), leadId])
  await run(
    env,
    `INSERT INTO lead_events (id, lead_id, type, payload, actor) VALUES (?, ?, 'status_change', ?, 'system')`,
    [uid(), leadId, JSON.stringify({ status: 'won', saleId: id }), ],
  )

  // Record PROJECTED commissions immediately — before payment — for everyone
  // involved (house + attributed partner). They activate to 'pending' on payment.
  const fresh = await first(env, `SELECT * FROM sales WHERE id = ?`, [id])
  await generateCommissions(env, fresh, { status: 'projected' })

  return getSale(env, id)
}

export async function getSale(env, id) {
  const sale = await first(
    env,
    `SELECT s.*, l.name AS buyer_name, l.email AS buyer_email, l.phone AS buyer_phone,
            p.name AS partner_name
       FROM sales s
       JOIN leads l ON l.id = s.lead_id
       LEFT JOIN partners p ON p.id = s.partner_id
      WHERE s.id = ?`,
    [id],
  )
  if (!sale) return null
  const commissions = await all(env, `SELECT * FROM commissions WHERE sale_id = ? ORDER BY created_at`, [id])
  const journey = await all(env, `SELECT * FROM journey_stages WHERE sale_id = ? ORDER BY sort`, [id])
  return { ...sale, commissions, journey }
}

export async function listSales(env, { status } = {}) {
  const where = status ? 'WHERE s.status = ?' : ''
  const params = status ? [status] : []
  return all(
    env,
    `SELECT s.*, l.name AS buyer_name, l.email AS buyer_email, p.name AS partner_name
       FROM sales s
       JOIN leads l ON l.id = s.lead_id
       LEFT JOIN partners p ON p.id = s.partner_id
       ${where}
      ORDER BY s.created_at DESC`,
    params,
  )
}

/**
 * Transition a sale's status. Entering 'onboarding' generates commissions and
 * seeds the concierge journey (both idempotent).
 */
export async function updateSaleStatus(env, id, status, { paymentRef } = {}) {
  if (!SALE_STATUSES.includes(status)) throw new Error(`Invalid sale status: ${status}`)
  const sale = await first(env, `SELECT * FROM sales WHERE id = ?`, [id])
  if (!sale) throw new Error('Sale not found')

  const fields = { status, updated_at: now() }
  if (status === 'paid') fields.paid_at = now()
  if (paymentRef) fields.payment_ref = paymentRef
  if (status === 'onboarding') fields.onboarding_started_at = now()
  if (status === 'completed') fields.completed_at = now()

  const keys = Object.keys(fields)
  await run(
    env,
    `UPDATE sales SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...keys.map((k) => fields[k]), id],
  )

  // Payment confirmed — projected commissions become actually payable (→ pending).
  if (status === 'paid') {
    await activateCommissions(env, id)
  }
  // Concierge journey is seeded when onboarding begins.
  if (status === 'onboarding') {
    await seedJourney(env, id)
  }

  return getSale(env, id)
}

export { SALE_STATUSES }
