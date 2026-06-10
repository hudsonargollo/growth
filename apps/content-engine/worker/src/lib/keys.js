import { getDb }  from './db.js'
import { decrypt } from './crypto.js'

// Load all stored API keys from KV (tool_credentials) and return decrypted.
export async function loadTenantKeys(env) {
  if (!env.CREDENTIALS_SECRET) return {}
  const db = getDb(env)
  const { data } = await db.from('tool_credentials').select('toolId, passwordEncrypted, iv')
  if (!data?.length) return {}
  const keys = {}
  await Promise.all((data ?? []).map(async (row) => {
    try { keys[row.toolId] = await decrypt(row.passwordEncrypted, row.iv, env.CREDENTIALS_SECRET) } catch {}
  }))
  return keys
}
