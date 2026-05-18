import { getDb } from './db.js'

const ROOT_ADMIN_EMAIL = 'hudsonargollo@gmail.com'

export async function requireAuth(c, next) {
  const token = (c.req.header('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  // Validate JWT — getDb uses service role only for token validation, not data queries
  const db = getDb(c.env)
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401)

  const isRootAdmin = user.email === ROOT_ADMIN_EMAIL

  if (isRootAdmin) {
    // Root admin may pass X-Tenant-Id to scope their request to a specific tenant
    const impersonateTenantId = c.req.header('X-Tenant-Id') ?? null
    c.set('user', user)
    c.set('isRootAdmin', true)
    c.set('tenantId', impersonateTenantId) // null = global access across all tenants
    c.set('role', 'root_admin')
    c.set('token', token)
    return await next()
  }

  // Resolve tenant membership for regular users
  const { data: membership, error: mErr } = await db
    .from('tenant_members')
    .select('tenant_id, role, tenants(status)')
    .eq('user_id', user.id)
    .single()

  if (mErr || !membership) return c.json({ error: 'No active tenant found.' }, 403)

  const status = membership.tenants?.status
  if (status === 'pending')   return c.json({ error: 'Account awaiting approval.' }, 403)
  if (status === 'suspended') return c.json({ error: 'Account suspended.' }, 403)
  if (status === 'rejected')  return c.json({ error: 'Account rejected.' }, 403)
  if (status !== 'active')    return c.json({ error: 'Tenant not active.' }, 403)

  c.set('user', user)
  c.set('isRootAdmin', false)
  c.set('tenantId', membership.tenant_id)
  c.set('role', membership.role)
  c.set('token', token)
  await next()
}
