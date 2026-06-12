/**
 * Lead lifecycle: capture (public), attribution, pipeline transitions, audit trail.
 */
import { all, first, run, now } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost']

/** Record an audit event for a lead. */
async function logEvent(env, leadId, type, payload, actor = 'system') {
  await run(
    env,
    `INSERT INTO lead_events (id, lead_id, type, payload, actor) VALUES (?, ?, ?, ?, ?)`,
    [uid(), leadId, type, payload ? JSON.stringify(payload) : null, actor],
  )
}

/** Resolve a partner from a utm_source code (case-insensitive). */
async function resolvePartner(env, utmSource) {
  if (!utmSource) return null
  return first(
    env,
    `SELECT * FROM partners WHERE lower(utm_source) = lower(?) AND status = 'active'`,
    [utmSource],
  )
}

/** Pick the closer to assign a new lead to: round-robin by lead count among active closers. */
async function pickCloser(env) {
  const rows = await all(
    env,
    `SELECT c.id, c.name, c.whatsapp,
            (SELECT COUNT(*) FROM leads l WHERE l.assigned_closer_id = c.id) AS load
       FROM closers c
      WHERE c.active = 1
      ORDER BY load ASC, c.created_at ASC
      LIMIT 1`,
  )
  return rows[0] ?? null
}

/**
 * Public lead capture. Resolves UTM attribution, assigns a closer,
 * persists, and fires a WhatsApp notification (non-blocking).
 */
export async function captureLead(env, input) {
  const id = uid()
  const partner = await resolvePartner(env, input.utm_source)

  // Qualification fields may arrive at step 1 (single-step submit) or null (step 1 of two-step).
  const qualified = !!(input.segmento || input.headcount || input.revenue_band || input.instagram)
  // Only a COMPLETED application enters the pipeline + gets a closer. Step-1-only
  // captures are stored as 'incomplete' for remarketing — never shown to closers.
  const status = qualified ? 'new' : 'incomplete'
  const closer = qualified ? await pickCloser(env) : null

  const lead = {
    id,
    name: input.name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    utm_term: input.utm_term ?? null,
    partner_id: partner?.id ?? null,
    referrer: input.referrer ?? null,
    landing_path: input.landing_path ?? null,
    turma: input.turma ?? null,
    segmento: input.segmento ?? null,
    headcount: input.headcount ?? null,
    revenue_band: input.revenue_band ?? null,
    instagram: input.instagram ? String(input.instagram).replace(/^@+/, '') : null,
    company: input.company ?? null,
    application: input.application ? JSON.stringify(input.application) : null,
    qualified_at: qualified ? now() : null,
    status,
    assigned_closer_id: closer?.id ?? null,
  }

  await run(
    env,
    `INSERT INTO leads
       (id, name, email, phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        partner_id, referrer, landing_path, turma, segmento, headcount, revenue_band, instagram,
        company, application, qualified_at, status, assigned_closer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lead.id, lead.name, lead.email, lead.phone,
      lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content, lead.utm_term,
      lead.partner_id, lead.referrer, lead.landing_path, lead.turma,
      lead.segmento, lead.headcount, lead.revenue_band, lead.instagram,
      lead.company, lead.application, lead.qualified_at,
      lead.status, lead.assigned_closer_id,
    ],
  )

  await logEvent(env, id, qualified ? 'created' : 'started', {
    utm_source: lead.utm_source,
    partner: partner?.name ?? null,
    closer: closer?.name ?? null,
    qualified,
  })

  // Return notify context — the route schedules the WhatsApp send via
  // waitUntil() so the form response isn't blocked on Evolution latency.
  return { id, partner_id: lead.partner_id, assigned_closer_id: lead.assigned_closer_id, closer, partner, lead, qualified }
}

/**
 * Step 2 of the landing form: attach company qualification to an existing lead.
 * Called publicly with a signed `ref` (verified in the route). Returns notify
 * context so the closer/owner get the rich lead profile once it's known.
 */
export async function qualifyLead(env, id, input = {}) {
  const existing = await first(env, `SELECT * FROM leads WHERE id = ?`, [id])
  if (!existing) throw new Error('Lead não encontrado.')

  const segmento = input.segmento ?? existing.segmento ?? null
  const headcount = input.headcount ?? existing.headcount ?? null
  const revenue_band = input.revenue_band ?? existing.revenue_band ?? null
  const instagram = input.instagram ? String(input.instagram).replace(/^@+/, '') : existing.instagram ?? null
  const email = input.email ?? existing.email ?? null
  const turma = input.turma ?? existing.turma ?? null

  // Completing step 2 promotes the lead into the pipeline: status incomplete → new
  // and a closer is assigned (round-robin) if one isn't already.
  const wasIncomplete = existing.status === 'incomplete'
  let closer = existing.assigned_closer_id
    ? await first(env, `SELECT * FROM closers WHERE id = ?`, [existing.assigned_closer_id])
    : null
  if (!closer) closer = await pickCloser(env)
  const closerId = closer?.id ?? existing.assigned_closer_id ?? null
  const status = wasIncomplete ? 'new' : existing.status

  await run(
    env,
    `UPDATE leads
        SET segmento = ?, headcount = ?, revenue_band = ?, instagram = ?, email = ?, turma = ?,
            status = ?, assigned_closer_id = ?,
            qualified_at = COALESCE(qualified_at, ?), updated_at = ?
      WHERE id = ?`,
    [segmento, headcount, revenue_band, instagram, email, turma, status, closerId, now(), now(), id],
  )
  if (wasIncomplete) {
    await logEvent(env, id, 'created', { promoted_from: 'incomplete', closer: closer?.name ?? null })
  }
  await logEvent(env, id, 'qualified', { segmento, headcount, revenue_band, instagram, turma })

  const lead = await getLead(env, id)
  const partner = lead.partner_id ? await first(env, `SELECT * FROM partners WHERE id = ?`, [lead.partner_id]) : null
  return { id, lead, closer, partner }
}

/**
 * List leads with filters + pagination. Returns { leads, total } so the CRM can
 * page through thousands without loading them all. `search` matches name/email/phone.
 */
export async function listLeads(env, { status, partnerId, closerId, search, limit = 50, offset = 0 } = {}) {
  const where = []
  const params = []
  if (status) { where.push('l.status = ?'); params.push(status) }
  else { where.push("l.status != 'incomplete'") } // incomplete = remarketing-only, never in the pipeline
  if (partnerId) { where.push('l.partner_id = ?'); params.push(partnerId) }
  if (closerId) { where.push('l.assigned_closer_id = ?'); params.push(closerId) }
  if (search) {
    where.push('(l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)')
    const s = `%${search}%`
    params.push(s, s, s)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalRow = await first(env, `SELECT COUNT(*) AS n FROM leads l ${whereSql}`, params)
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500)
  const off = Math.max(Number(offset) || 0, 0)
  const leads = await all(
    env,
    `SELECT l.*, p.name AS partner_name, c.name AS closer_name
       FROM leads l
       LEFT JOIN partners p ON p.id = l.partner_id
       LEFT JOIN closers  c ON c.id = l.assigned_closer_id
       ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, lim, off],
  )
  return { leads, total: totalRow?.n ?? 0 }
}

/** Lead counts per status — accurate column totals for the board without loading all rows. */
export async function leadCounts(env) {
  const rows = await all(env, `SELECT status, COUNT(*) AS n FROM leads GROUP BY status`)
  const counts = {}
  for (const r of rows) counts[r.status] = r.n
  return counts
}

/** Single lead + its event timeline. */
export async function getLead(env, id) {
  const lead = await first(
    env,
    `SELECT l.*, p.name AS partner_name, p.utm_source AS partner_utm, c.name AS closer_name
       FROM leads l
       LEFT JOIN partners p ON p.id = l.partner_id
       LEFT JOIN closers  c ON c.id = l.assigned_closer_id
      WHERE l.id = ?`,
    [id],
  )
  if (!lead) return null
  const events = await all(env, `SELECT * FROM lead_events WHERE lead_id = ? ORDER BY created_at ASC`, [id])
  const sale = await first(env, `SELECT * FROM sales WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1`, [id])
  return { ...lead, events, sale }
}

/** Move a lead through the pipeline. Won/lost handled by the dashboard sale flow. */
export async function updateLeadStatus(env, id, status, { actor = 'system', lostReason = null } = {}) {
  if (!LEAD_STATUSES.includes(status)) throw new Error(`Invalid lead status: ${status}`)
  await run(
    env,
    `UPDATE leads SET status = ?, lost_reason = ?, updated_at = ? WHERE id = ?`,
    [status, lostReason, now(), id],
  )
  await logEvent(env, id, 'status_change', { status, lostReason }, actor)
  return getLead(env, id)
}

/** Reassign a lead to a different closer. */
export async function assignLead(env, id, closerId, { actor = 'system' } = {}) {
  await run(env, `UPDATE leads SET assigned_closer_id = ?, updated_at = ? WHERE id = ?`, [closerId, now(), id])
  await logEvent(env, id, 'assign', { closerId }, actor)
  return getLead(env, id)
}

/** Append a free-text note to a lead. */
export async function addLeadNote(env, id, text, actor = 'closer') {
  await logEvent(env, id, 'note', { text }, actor)
  return getLead(env, id)
}

/** Move a client to another turma (class). */
export async function setLeadTurma(env, id, turma, { actor = 'crm' } = {}) {
  await run(env, `UPDATE leads SET turma = ?, updated_at = ? WHERE id = ?`, [turma || null, now(), id])
  await logEvent(env, id, 'turma_change', { turma }, actor)
  return getLead(env, id)
}

/**
 * Clients = leads that closed (status 'won'), with their chosen turma + sale +
 * closer. Used by the Turmas (classes) manager to group enrolled clients.
 */
export async function listClients(env) {
  return all(
    env,
    `SELECT l.id, l.name, l.email, l.phone, l.turma, l.created_at,
            l.assigned_closer_id, c.name AS closer_name,
            p.name AS partner_name,
            (SELECT status FROM sales WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) AS sale_status,
            (SELECT amount FROM sales WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) AS sale_amount
       FROM leads l
       LEFT JOIN closers  c ON c.id = l.assigned_closer_id
       LEFT JOIN partners p ON p.id = l.partner_id
      WHERE l.status = 'won'
      ORDER BY l.created_at DESC`,
  )
}

export { LEAD_STATUSES }
