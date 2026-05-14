import { createClient } from '@supabase/supabase-js'

// Workers have native fetch — no ws package needed.
// env is passed per-request from the Worker handler.
export function getDb(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
