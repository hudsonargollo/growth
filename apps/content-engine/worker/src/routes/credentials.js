import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = new Hono()

// requireAuth is applied globally in index.js — no local middleware needed here

// GET /api/credentials — return all tool credentials (passwords decrypted server-side)
router.get('/', async (c) => {
  const db     = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { data, error } = await db
    .from('tool_credentials')
    .select('toolId, login, passwordEncrypted, iv')

  if (error) return c.json({ error: error.message }, 500)

  const result = await Promise.all((data ?? []).map(async (row) => {
    let password = ''
    if (row.passwordEncrypted && row.iv) {
      try { password = await decrypt(row.passwordEncrypted, row.iv, secret) } catch {}
    }
    return { toolId: row.toolId, login: row.login, password }
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

  let passwordEncrypted = ''
  let iv = ''
  if (password) {
    const enc = await encrypt(password, secret)
    passwordEncrypted = enc.ciphertext
    iv = enc.iv
  }

  const { data: existing } = await db
    .from('tool_credentials')
    .select('id')
    .eq('toolId', toolId)
    .single()

  const payload = {
    toolId,
    login,
    passwordEncrypted,
    iv,
    updatedBy:  c.get('user')?.id ?? 'system',
    updatedAt:  new Date().toISOString(),
  }

  let result, err
  if (existing) {
    ;({ data: result, error: err } = await db
      .from('tool_credentials')
      .update(payload)
      .eq('toolId', toolId)
      .select()
      .single())
  } else {
    ;({ data: result, error: err } = await db
      .from('tool_credentials')
      .insert({ id: uid(), ...payload })
      .select()
      .single())
  }

  if (err) return c.json({ error: err.message }, 500)
  return c.json({ ok: true, toolId })
})

export default router
