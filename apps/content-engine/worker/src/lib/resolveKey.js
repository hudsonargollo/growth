import { getDb } from './db.js'
import { decrypt } from './crypto.js'

// Root tenant UUID — pinned in migration 002
const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Resolve an API key: env secret takes priority, falls back to DB-stored key.
 * Keys are stored in tenant_api_keys (replaced tool_credentials in migration 002).
 */
export async function resolveKey(env, envVar) {
  if (env[envVar]) return env[envVar]

  const secret = env.CREDENTIALS_SECRET
  if (!secret) return null

  try {
    const db = getDb(env)
    const { data } = await db
      .from('tenant_api_keys')
      .select('value_encrypted, iv')
      .eq('tenant_id', ROOT_TENANT_ID)
      .eq('key_name', envVar)
      .maybeSingle()

    if (data?.value_encrypted && data?.iv) {
      return await decrypt(data.value_encrypted, data.iv, secret)
    }
  } catch {}

  return null
}
