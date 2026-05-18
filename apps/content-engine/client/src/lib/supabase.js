import { createClient } from '@supabase/supabase-js'

// Content-engine uses its own Supabase project (xtoxusngfazryxstoomf)
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in apps/content-engine/client/.env
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? 'https://xtoxusngfazryxstoomf.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_ANON) {
  console.warn('[supabase] VITE_SUPABASE_ANON_KEY not set — auth will not work.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON ?? '', {
  auth: { persistSession: true },
})
