/**
 * /api/apikeys — store and retrieve API keys (OpenAI, ElevenLabs, etc.)
 * Keys are AES-GCM encrypted at rest using CREDENTIALS_SECRET.
 * Storage: tenant_api_keys (migration 001/002 — replaced tool_credentials).
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt } from '../lib/crypto.js'

const router = new Hono()

// Root tenant UUID — pinned in migration 002
const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const ALLOWED_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'YOUTUBE_API_KEY',
  'YOUTUBE_CHANNEL_ID',
  'YOUTUBE_OAUTH_TOKEN',
  'SERPAPI_KEY',
  'AMAZON_AFFILIATE_TAG',
  'ML_AFFILIATE_TAG',
  'ML_APP_ID',
  'ML_CLIENT_SECRET',
])

// Normalise: accept both UPPER_CASE and lower_case variants
function normalise(keyId) {
  const upper = keyId.toUpperCase()
  if (ALLOWED_KEYS.has(upper)) return upper
  if (ALLOWED_KEYS.has(keyId))  return keyId
  return null
}

// GET /api/apikeys — returns saved keys (metadata only, no raw values)
router.get('/', async (c) => {
  const db = getDb(c.env)

  const { data, error } = await db
    .from('tenant_api_keys')
    .select('key_name, updated_at')
    .eq('tenant_id', ROOT_TENANT_ID)
    .in('key_name', [...ALLOWED_KEYS])

  if (error) return c.json({ error: error.message }, 500)

  const keys = (data ?? []).map((row) => ({
    key_name:   row.key_name,
    isSet:      true,
    updated_at: row.updated_at,
  }))

  return c.json({ keys })
})

// PUT /api/apikeys/:keyId — store an API key (encrypted)
router.put('/:keyId', async (c) => {
  const raw   = c.req.param('keyId')
  const keyId = normalise(raw)
  if (!keyId) return c.json({ error: `Chave desconhecida: ${raw}` }, 400)

  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const body = await c.req.json().catch(() => ({}))
  const value = body.value ?? ''
  if (!value.trim()) return c.json({ error: 'value é obrigatório' }, 400)

  const { ciphertext, iv } = await encrypt(value.trim(), secret)

  const { error: err } = await db
    .from('tenant_api_keys')
    .upsert(
      {
        id:              uid(),
        tenant_id:       ROOT_TENANT_ID,
        key_name:        keyId,
        value_encrypted: ciphertext,
        iv,
        updated_at:      new Date().toISOString(),
        updated_by:      null,
      },
      { onConflict: 'tenant_id,key_name' },
    )

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true, key_name: keyId })
})

// DELETE /api/apikeys/:keyId
router.delete('/:keyId', async (c) => {
  const raw   = c.req.param('keyId')
  const keyId = normalise(raw)
  if (!keyId) return c.json({ error: `Chave desconhecida: ${raw}` }, 400)

  const db = getDb(c.env)
  const { error } = await db
    .from('tenant_api_keys')
    .delete()
    .eq('tenant_id', ROOT_TENANT_ID)
    .eq('key_name', keyId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default router
