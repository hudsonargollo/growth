/**
 * Thin helpers over the CI_DB D1 binding.
 * Keeps service code terse and guards against a missing binding in dev.
 */

export function ciDb(env) {
  if (!env.CI_DB) {
    throw new Error('CI_DB (D1) binding not configured — run `wrangler d1 create codigo-internacional` and set database_id in wrangler.toml')
  }
  return env.CI_DB
}

/** Run a write/DDL statement. Returns D1 meta. */
export async function run(env, sql, params = []) {
  return ciDb(env).prepare(sql).bind(...params).run()
}

/** Fetch all rows for a query. */
export async function all(env, sql, params = []) {
  const { results } = await ciDb(env).prepare(sql).bind(...params).all()
  return results ?? []
}

/** Fetch a single row (or null). */
export async function first(env, sql, params = []) {
  return ciDb(env).prepare(sql).bind(...params).first()
}

/** Current UTC timestamp matching SQLite's datetime('now') format. */
export function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

/** Build an UPDATE ... SET clause from a plain object. Returns { clause, values }. */
export function setClause(fields) {
  const keys = Object.keys(fields)
  const clause = keys.map((k) => `${k} = ?`).join(', ')
  const values = keys.map((k) => fields[k])
  return { clause, values }
}
