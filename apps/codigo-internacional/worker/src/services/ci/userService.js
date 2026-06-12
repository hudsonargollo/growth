/**
 * Users + custom auth. Only pre-seeded emails may register. First access sets
 * the password (saved hashed); subsequent logins verify it.
 */
import { first, run, all, now } from '../../lib/ci-db.js'
import { hashPassword, verifyPassword } from '../../lib/auth.js'

const norm = (email) => String(email || '').trim().toLowerCase()

export async function getUser(env, email) {
  return first(env, `SELECT * FROM users WHERE email = ?`, [norm(email)])
}

/** Is this email allowed, and is it first access (no password yet)? */
export async function checkAccess(env, email) {
  const u = await getUser(env, email)
  if (!u) return { allowed: false, firstAccess: false }
  return { allowed: true, firstAccess: !u.password_hash, name: u.name }
}

/** Set the password on first access. Fails if already set or email not allowed. */
export async function registerPassword(env, email, password) {
  const u = await getUser(env, email)
  if (!u) throw new Error('E-mail não autorizado.')
  if (u.password_hash) throw new Error('Senha já cadastrada. Faça login.')
  if (!password || password.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.')
  const { hash, salt } = await hashPassword(password)
  await run(env, `UPDATE users SET password_hash = ?, salt = ?, last_login = ? WHERE email = ?`, [hash, salt, now(), u.email])
  return publicUser(u)
}

/** Verify credentials. Returns the public user or throws. */
export async function login(env, email, password) {
  const u = await getUser(env, email)
  if (!u) throw new Error('E-mail ou senha inválidos.')
  if (!u.password_hash) throw new Error('Primeiro acesso — crie sua senha.')
  const ok = await verifyPassword(password, u.salt, u.password_hash)
  if (!ok) throw new Error('E-mail ou senha inválidos.')
  await run(env, `UPDATE users SET last_login = ? WHERE email = ?`, [now(), u.email])
  return publicUser(u)
}

export function publicUser(u) {
  return { email: u.email, name: u.name, role: u.role, beneficiary_key: u.beneficiary_key }
}

/**
 * Read-only stats for the partner portal — scoped to one beneficiary_key.
 * Returns commission totals (by status), recent commissions, and (for UTM
 * partners) attributed lead/sale counts.
 */
export async function portalStats(env, beneficiaryKey) {
  if (!beneficiaryKey) return { totals: { total: 0, pending: 0, approved: 0, paid: 0 }, commissions: [], partner: null }

  const totals = await first(
    env,
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(amount),0) AS total,
            COALESCE(SUM(CASE WHEN status='pending'  THEN amount ELSE 0 END),0) AS pending,
            COALESCE(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END),0) AS approved,
            COALESCE(SUM(CASE WHEN status='paid'     THEN amount ELSE 0 END),0) AS paid
       FROM commissions WHERE beneficiary_key = ? AND status != 'void'`,
    [beneficiaryKey],
  )

  const commissions = await all(
    env,
    `SELECT cm.amount, cm.rate, cm.status, cm.created_at, l.name AS buyer_name
       FROM commissions cm
       JOIN sales s ON s.id = cm.sale_id
       JOIN leads l ON l.id = s.lead_id
      WHERE cm.beneficiary_key = ?
      ORDER BY cm.created_at DESC LIMIT 100`,
    [beneficiaryKey],
  )

  // If this beneficiary is a UTM partner, include their funnel counts.
  const partner = await first(
    env,
    `SELECT p.name, p.utm_source, p.commission_rate,
            (SELECT COUNT(*) FROM leads l WHERE l.partner_id = p.id) AS lead_count,
            (SELECT COUNT(*) FROM sales s WHERE s.partner_id = p.id AND s.status IN ('onboarding','journey','completed')) AS sale_count
       FROM partners p WHERE p.id = ?`,
    [beneficiaryKey],
  )

  return { totals, commissions, partner }
}
