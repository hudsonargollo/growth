/**
 * Superadmin "reset for launch" — wipes all OPERATIONAL data while preserving
 * configuration (users/logins, partners, closers, ci_settings, ci_sources).
 * Order respects FK dependencies (commissions/journey → sales → events → leads).
 */
import { run, first } from '../../lib/ci-db.js'

const OPERATIONAL_TABLES = ['commissions', 'journey_stages', 'sales', 'lead_events', 'leads']

export async function resetOperationalData(env) {
  const before = await counts(env)
  for (const t of OPERATIONAL_TABLES) await run(env, `DELETE FROM ${t}`)
  return before // how many rows were removed
}

async function counts(env) {
  const out = {}
  for (const t of OPERATIONAL_TABLES) {
    out[t] = Number((await first(env, `SELECT COUNT(*) AS n FROM ${t}`))?.n) || 0
  }
  return out
}
