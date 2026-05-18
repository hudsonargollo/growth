/**
 * /api/apikeys — store and retrieve API keys (OpenAI, ElevenLabs, etc.)
 * Keys are AES-GCM encrypted at rest using CREDENTIALS_SECRET.
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = new Hono()

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
  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { data, error } = await db
    .from('tool_credentials')
    .select('toolId, updatedAt')
    .in('toolId', [...ALLOWED_KEYS])

  if (error) return c.json({ error: error.message }, 500)

  const keys = (data ?? []).map((row) => ({
    key_name:   row.toolId,
    isSet:      true,
    updated_at: row.updatedAt,
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

  const { data: existing } = await db
    .from('tool_credentials')
    .select('id')
    .eq('toolId', keyId)
    .maybeSingle()

  const payload = {
    toolId:            keyId,
    login:             '',
    passwordEncrypted: ciphertext,
    iv,
    updatedBy:         'system',
    updatedAt:         new Date().toISOString(),
  }

  let err
  if (existing) {
    ;({ error: err } = await db.from('tool_credentials').update(payload).eq('toolId', keyId))
  } else {
    ;({ error: err } = await db.from('tool_credentials').insert({ id: uid(), ...payload }))
  }

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true, key_name: keyId })
})

// DELETE /api/apikeys/:keyId
router.delete('/:keyId', async (c) => {
  const raw   = c.req.param('keyId')
  const keyId = normalise(raw)
  if (!keyId) return c.json({ error: `Chave desconhecida: ${raw}` }, 400)

  const db = getDb(c.env)
  const { error } = await db.from('tool_credentials').delete().eq('toolId', keyId)
  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default router
