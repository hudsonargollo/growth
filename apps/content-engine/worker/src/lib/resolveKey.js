import { getDb } from './db.js'
import { decrypt } from './crypto.js'

/**
 * Resolve an API key: env secret takes priority, falls back to DB-stored key.
 * toolId is stored uppercase in tool_credentials (e.g. 'OPENAI_API_KEY').
 */
export async function resolveKey(env, envVar) {
  if (env[envVar]) return env[envVar]

  const secret = env.CREDENTIALS_SECRET
  if (!secret) return null

  try {
    const db = getDb(env)
    const { data } = await db
      .from('tool_credentials')
      .select('passwordEncrypted, iv')
      .eq('toolId', envVar)        // stored uppercase: 'OPENAI_API_KEY'
      .maybeSingle()

    if (data?.passwordEncrypted && data?.iv) {
      return await decrypt(data.passwordEncrypted, data.iv, secret)
    }
  } catch {}

  return null
}
