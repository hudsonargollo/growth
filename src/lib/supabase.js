import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[supabase] Missing env vars — auth will not work in production.')
}

export const supabase = createClient(
  SUPABASE_URL  ?? 'https://qsjbyvdidxoytszptnrq.supabase.co',
  SUPABASE_ANON ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzamJ5dmRpZHhveXRzenB0bnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjM5NTUsImV4cCI6MjA4NzYzOTk1NX0.8GKpTaoijuQCBt6pVccf10GxIaQ-JqGp_TTIn257IWI',
)
