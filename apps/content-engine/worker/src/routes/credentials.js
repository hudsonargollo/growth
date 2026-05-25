/**
 * /api/credentials — legacy tool credential route (login + password pairs).
 * Now backed by tenant_api_keys (migration 002 replaced tool_credentials).
 * The "login" concept is dropped; only encrypted values are stored.
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = new Hono()

const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/credentials — return all tool credentials
router.get('/', async (c) => {
  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { data, error } = await db
    .from('tenant_api_keys')
    .select('key_name, value_encrypted, iv, label, updated_at')
    .eq('tenant_id', ROOT_TENANT_ID)

  if (error) return c.json({ error: error.message }, 500)

  const result = await Promise.all((data ?? []).map(async (row) => {
    let password = ''
    if (row.value_encrypted && row.iv) {
      try { password = await decrypt(row.value_encrypted, row.iv, secret) } catch {}
    }
    return { toolId: row.key_name, login: row.label ?? '', password }
  }))

  return c.json({ credentials: result })
})

// PUT /api/credentials/:toolId — upsert credentials (encrypts password server-side)
router.put('/:toolId', async (c) => {
  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const toolId = c.req.param('toolId')
  const { login = '', password = '' } = await c.req.json()

  let value_encrypted = ''
  let iv = ''
  if (password) {
    const enc = await encrypt(password, secret)
    value_encrypted = enc.ciphertext
    iv = enc.iv
  }

  const { error: err } = await db
    .from('tenant_api_keys')
    .upsert(
      {
        id:              uid(),
        tenant_id:       ROOT_TENANT_ID,
        key_name:        toolId,
        value_encrypted,
        iv,
        label:           login || null,
        updated_at:      new Date().toISOString(),
        updated_by:      null,
      },
      { onConflict: 'tenant_id,key_name' },
    )

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true, toolId })
})

export default router
