import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt } from '../lib/crypto.js'

const router = new Hono()

// Human-readable labels shown in the Settings UI
const KEY_LABELS = {
  YOUTUBE_API_KEY:    'YouTube Data API Key',
  YOUTUBE_CHANNEL_ID: 'YouTube Channel ID',
  YOUTUBE_OAUTH_TOKEN:'YouTube OAuth Token (for posting replies)',
  OPENAI_API_KEY:     'OpenAI API Key',
  ELEVENLABS_API_KEY: 'ElevenLabs API Key',
  WHATSAPP_TOKEN:     'WhatsApp Business API Token',
  WHATSAPP_PHONE_ID:  'WhatsApp Phone Number ID',
  SERPAPI_KEY:        'SerpAPI Key',
  AMAZON_AFFILIATE_TAG: 'Amazon Associates Tracking ID',
  ML_AFFILIATE_ID:    'MercadoLibre Affiliate ID',
}

// GET /api/apikeys — list all configured keys (values masked, just isSet + metadata)
router.get('/', async (c) => {
  const tenantId = c.get('tenantId')
  if (!tenantId) return c.json({ error: 'Tenant context required' }, 400)

  const db = getDb(c.env)
  const { data, error } = await db
    .from('tenant_api_keys')
    .select('key_name, label, updated_at')
    .eq('tenant_id', tenantId)

  if (error) return c.json({ error: error.message }, 500)

  // Return all known key slots, marking which ones are configured
  const configured = new Set((data ?? []).map((r) => r.key_name))
  const keys = Object.entries(KEY_LABELS).map(([key_name, defaultLabel]) => {
    const row = (data ?? []).find((r) => r.key_name === key_name)
    return {
      key_name,
      label:      row?.label ?? defaultLabel,
      isSet:      configured.has(key_name),
      updated_at: row?.updated_at ?? null,
    }
  })

  return c.json({ keys })
})

// PUT /api/apikeys/:keyName — upsert a single API key (encrypts value before storage)
router.put('/:keyName', async (c) => {
  const tenantId = c.get('tenantId')
  const keyName  = c.req.param('keyName')
  if (!tenantId) return c.json({ error: 'Tenant context required' }, 400)
  if (!KEY_LABELS[keyName]) return c.json({ error: `Unknown key: ${keyName}` }, 400)

  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { value = '', label } = await c.req.json()
  if (!value) return c.json({ error: 'value is required' }, 400)

  const { ciphertext, iv } = await encrypt(value, secret)

  const db = getDb(c.env)
  const { data: existing } = await db
    .from('tenant_api_keys')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('key_name', keyName)
    .single()

  const payload = {
    tenant_id:       tenantId,
    key_name:        keyName,
    value_encrypted: ciphertext,
    iv,
    label:           label ?? KEY_LABELS[keyName],
    updated_at:      new Date().toISOString(),
    updated_by:      c.get('user').id,
  }

  let err
  if (existing) {
    ;({ error: err } = await db
      .from('tenant_api_keys')
      .update(payload)
      .eq('tenant_id', tenantId)
      .eq('key_name', keyName))
  } else {
    ;({ error: err } = await db
      .from('tenant_api_keys')
      .insert({ id: uid(), ...payload }))
  }

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true, key_name: keyName })
})

// DELETE /api/apikeys/:keyName — remove a key
router.delete('/:keyName', async (c) => {
  const tenantId = c.get('tenantId')
  const keyName  = c.req.param('keyName')
  if (!tenantId) return c.json({ error: 'Tenant context required' }, 400)

  const db = getDb(c.env)
  const { error } = await db
    .from('tenant_api_keys')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('key_name', keyName)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default router
