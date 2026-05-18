import { getDb } from './db.js'
import { decrypt } from './crypto.js'

// Load all API keys for a tenant from tenant_api_keys, decrypt, and return as a plain object.
// Falls back to an empty object if no keys are stored (services handle their own fallback to env).
export async function loadTenantKeys(env, tenantId) {
  if (!tenantId || !env.CREDENTIALS_SECRET) return {}

  const db = getDb(env)
  const { data, error } = await db
    .from('tenant_api_keys')
    .select('key_name, value_encrypted, iv')
    .eq('tenant_id', tenantId)

  if (error || !data?.length) return {}

  const keys = {}
  await Promise.all(data.map(async (row) => {
    try {
      keys[row.key_name] = await decrypt(row.value_encrypted, row.iv, env.CREDENTIALS_SECRET)
    } catch {
      // Skip keys that fail to decrypt — don't let one bad row break all keys
    }
  }))

  return keys
}
