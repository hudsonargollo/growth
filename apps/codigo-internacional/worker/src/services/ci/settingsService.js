/**
 * ci_settings — house commission rates + program config (key/value).
 * Editable from the CRM. Changes affect FUTURE commission generation only
 * (existing commissions snapshot their rate at onboarding time).
 */
import { all, run } from '../../lib/ci-db.js'

const EDITABLE = ['house_rate_hudson', 'house_rate_alison', 'program_price', 'program_currency', 'revenue_goal']

export async function getSettings(env) {
  const rows = await all(env, `SELECT key, value FROM ci_settings`)
  const out = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export async function updateSettings(env, patch = {}) {
  for (const key of Object.keys(patch)) {
    if (!EDITABLE.includes(key)) continue
    await run(
      env,
      `INSERT INTO ci_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, String(patch[key])],
    )
  }
  return getSettings(env)
}
