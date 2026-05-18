import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. Use only for cron, admin ops, and JWT validation.
export function getDb(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// Per-request user client — RLS policies apply automatically.
// Use this for all tenant-scoped data queries in API routes.
export function createUserClient(env, token) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}
