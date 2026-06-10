/**
 * auth.js — middleware stub.
 *
 * requireAuth is defined but never applied to any routes in index.js.
 * Supabase auth is only used on the frontend as a login gate.
 * The worker is single-tenant and all routes are trusted.
 */
export async function requireAuth(c, next) {
  await next()
}
