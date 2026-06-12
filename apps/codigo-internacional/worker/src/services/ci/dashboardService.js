/**
 * Aggregated KPIs for the leads pipeline dashboard.
 */
import { all, first } from '../../lib/ci-db.js'

const PAID = ['paid', 'onboarding', 'journey', 'completed']

export async function getDashboard(env) {
  const statusRows = await all(env, `SELECT status, COUNT(*) AS n FROM leads GROUP BY status`)
  const counts = {}
  let started = 0 // every form start, including incomplete (step-1-only) captures
  for (const r of statusRows) { counts[r.status] = r.n; started += r.n }
  const incomplete = counts.incomplete || 0
  // Pipeline leads = completed applications only (incomplete excluded from everything below).
  const totalLeads = started - incomplete
  const won = counts.won || 0
  const lost = counts.lost || 0
  const conversion = totalLeads ? won / totalLeads : 0
  const decided = won + lost
  const winRate = decided ? won / decided : 0
  // Funnel: how many landed (pageviews) vs started the form vs became real leads.
  const landed = Number((await env.CI_KV?.get('pv:landing:total')) || 0) || 0
  const startToLead = started ? totalLeads / started : 0

  const saleRows = await all(env, `SELECT status, COUNT(*) AS n, COALESCE(SUM(amount),0) AS total FROM sales GROUP BY status`)
  const sales = {}
  for (const r of saleRows) sales[r.status] = { n: r.n, total: r.total }
  const revenue = saleRows.filter((r) => PAID.includes(r.status)).reduce((a, r) => a + Number(r.total), 0)
  const paidClients = saleRows.filter((r) => PAID.includes(r.status)).reduce((a, r) => a + Number(r.n), 0)

  const commRows = await all(env, `SELECT status, COALESCE(SUM(amount),0) AS total FROM commissions WHERE status != 'void' GROUP BY status`)
  const commissions = { projected: 0, pending: 0, approved: 0, paid: 0 }
  for (const r of commRows) commissions[r.status] = r.total

  const revenueGoal = Number((await first(env, `SELECT value FROM ci_settings WHERE key = 'revenue_goal'`))?.value) || 1000000
  const programPrice = Number((await first(env, `SELECT value FROM ci_settings WHERE key = 'program_price'`))?.value) || 25000
  // Revenue booked in the last 30 days (by payment date) — for pace projection.
  const revenue30 = Number((await first(env, `SELECT COALESCE(SUM(amount),0) AS t FROM sales WHERE status IN ('paid','onboarding','journey','completed') AND paid_at >= datetime('now','-30 days')`))?.t) || 0

  const last7 = (await first(env, `SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now','-7 days')`))?.n || 0
  const last30 = (await first(env, `SELECT COUNT(*) AS n FROM leads WHERE created_at >= datetime('now','-30 days')`))?.n || 0

  const bySource = await all(env, `
    SELECT COALESCE(p.name, l.utm_source, 'Orgânico') AS source, COUNT(*) AS n
      FROM leads l LEFT JOIN partners p ON p.id = l.partner_id
     WHERE l.status != 'incomplete'
     GROUP BY source ORDER BY n DESC LIMIT 8`)

  const byCloser = await all(env, `
    SELECT COALESCE(c.name, 'Não atribuído') AS closer, COUNT(*) AS leads,
           SUM(CASE WHEN l.status = 'won' THEN 1 ELSE 0 END) AS won
      FROM leads l LEFT JOIN closers c ON c.id = l.assigned_closer_id
     WHERE l.status != 'incomplete'
     GROUP BY closer ORDER BY leads DESC LIMIT 6`)

  // Qualification breakdowns — only leads that completed step 2 carry these.
  const byRevenueBand = await all(env, `
    SELECT revenue_band AS band, COUNT(*) AS n
      FROM leads WHERE revenue_band IS NOT NULL AND revenue_band != ''
     GROUP BY revenue_band ORDER BY n DESC`)
  const byHeadcount = await all(env, `
    SELECT headcount AS band, COUNT(*) AS n
      FROM leads WHERE headcount IS NOT NULL AND headcount != ''
     GROUP BY headcount ORDER BY n DESC`)
  const qualified = (await first(env, `SELECT COUNT(*) AS n FROM leads WHERE qualified_at IS NOT NULL`))?.n || 0

  return { totalLeads, counts, won, lost, conversion, winRate, revenue, paidClients, sales, commissions, last7, last30, bySource, byCloser, byRevenueBand, byHeadcount, qualified, landed, started, incomplete, startToLead, revenueGoal, programPrice, revenue30 }
}
