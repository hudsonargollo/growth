import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { encrypt, decrypt } from '../lib/crypto.js'

const router = new Hono()

// Verify the request carries a valid Supabase JWT before touching credentials
async function requireAuth(c, next) {
  const auth = c.req.header('Authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  // Validate token against Supabase
  const db = getDb(c.env)
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401)

  c.set('user', user)
  await next()
}

// GET /api/credentials — return all tool credentials (passwords decrypted server-side)
router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const secret = c.env.CREDENTIALS_SECRET
  if (!secret) return c.json({ error: 'CREDENTIALS_SECRET not configured' }, 500)

  const { data, error } = await db
    .from('tool_credentials')
    .select('toolId, login, passwordEncrypted, iv')

  if (error) return c.json({ error: error.message }, 500)

  // Decrypt passwords before sending — still over HTTPS, never stored in plain text
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
router.put('/:toolId', requireAuth, async (c) => {
  const db = getDb(c.env)
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

  // Check if row exists
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
    updatedBy: c.get('user').id,
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
