/**
 * /api/apikeys — store and retrieve internal API keys (OpenAI, ElevenLabs, etc.)
 * Keys are AES-GCM encrypted at rest using CREDENTIALS_SECRET.
 * No user auth required — the worker itself is the trust boundary.
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = new Hono()

const ALLOWED_KEYS = [
  'openai_api_key',
  'elevenlabs_api_key',
  'youtube_api_key',
  'whatsapp_token',
]

// GET /api/apikeys — returns all stored API keys (decrypted, masked for display)
router.get('/', async (c) => {
  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { data, error } = await db
    .from('tool_credentials')
    .select('toolId, passwordEncrypted, iv')
    .in('toolId', ALLOWED_KEYS)

  if (error) return c.json({ error: error.message }, 500)

  const result = await Promise.all((data ?? []).map(async (row) => {
    let value = ''
    if (row.passwordEncrypted && row.iv) {
      try { value = await decrypt(row.passwordEncrypted, row.iv, secret) } catch {}
    }
    // Return masked value for display (show first 8 chars + ***)
    const masked = value ? value.slice(0, 8) + '••••••••••••••••' : ''
    return { toolId: row.toolId, masked, hasValue: !!value }
  }))

  return c.json({ keys: result })
})

// PUT /api/apikeys/:keyId — store an API key (encrypted)
router.put('/:keyId', async (c) => {
  const keyId = c.req.param('keyId')
  if (!ALLOWED_KEYS.includes(keyId)) {
    return c.json({ error: 'Unknown key ID' }, 400)
  }

  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { value = '' } = await c.req.json()
  if (!value) return c.json({ error: 'value is required' }, 400)

  const { ciphertext, iv } = await encrypt(value, secret)

  const { data: existing } = await db
    .from('tool_credentials')
    .select('id')
    .eq('toolId', keyId)
    .single()

  const payload = { toolId: keyId, login: '', passwordEncrypted: ciphertext, iv, updatedBy: 'system', updatedAt: new Date().toISOString() }

  let err
  if (existing) {
    ;({ error: err } = await db.from('tool_credentials').update({ ...payload, updatedAt: new Date().toISOString() }).eq('toolId', keyId))
  } else {
    ;({ error: err } = await db.from('tool_credentials').insert({ id: uid(), ...payload }))
  }

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true })
})

export default router
