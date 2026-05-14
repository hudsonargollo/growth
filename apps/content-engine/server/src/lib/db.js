import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Uses the Supabase REST API over HTTPS — no direct Postgres connection needed.
// The service role key bypasses Row Level Security for server-side operations.
// Node 20 requires passing the ws package explicitly as the WebSocket transport.
export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws },
  }
)
