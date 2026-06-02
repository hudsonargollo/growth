// ─────────────────────────────────────────────────────────────────────────────
// creditLedgerService — pre-flight money guard for paid generation.
//
// Flow: reserve(estimate) → dispatch jobs → commit(actual) on success, or
// refund() on failure. `credit_accounts.balance` already excludes active holds,
// so a runaway agent simply runs out of reservable balance and stops.
//
// NOTE: Supabase-from-Workers has no multi-statement transaction, so reserve()
// uses a compare-and-swap on balance (update ... where balance >= amount). Under
// extreme concurrency a DB-side RPC/function would be stronger; the CAS is the
// pragmatic edge-compatible guard and is documented as such.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from '../lib/db.js'

export async function getAccount(env, userId) {
  const db = getDb(env)
  const { data, error } = await db.from('credit_accounts').select('*').eq('userId', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? { userId, balance: 0, lifetimeSpent: 0 }
}

/** Top up a balance (admin / purchase webhook). */
export async function grant(env, { userId, amount, note = '' }) {
  if (amount <= 0) throw new Error('grant amount must be positive')
  const db = getDb(env)
  const acct = await getAccount(env, userId)
  const next = acct.balance + amount
  const { error } = await db
    .from('credit_accounts')
    .upsert({ userId, balance: next, lifetimeSpent: acct.lifetimeSpent ?? 0, updatedAt: new Date().toISOString() })
  if (error) throw new Error(error.message)
  await db.from('credit_ledger').insert({ userId, kind: 'grant', amount, status: 'committed', note })
  return next
}

/**
 * Reserve `amount` credits. Returns { reservationId, remaining }.
 * Throws { code:'INSUFFICIENT_CREDITS' } if the balance can't cover it — the
 * orchestrator surfaces this to the agent/user as an approval/top-up prompt.
 */
export async function reserve(env, { userId, projectId, amount, note = '' }) {
  if (!userId) throw new Error('reserve: userId required')
  if (amount <= 0) return { reservationId: null, remaining: (await getAccount(env, userId)).balance }
  const db = getDb(env)

  const acct = await getAccount(env, userId)
  if (acct.balance < amount) {
    const err = new Error(`insufficient credits: need ${amount}, have ${acct.balance}`)
    err.code = 'INSUFFICIENT_CREDITS'
    err.needed = amount
    err.available = acct.balance
    throw err
  }

  // Compare-and-swap: only decrement if balance still covers the reserve.
  const { data: updated, error: uErr } = await db
    .from('credit_accounts')
    .update({ balance: acct.balance - amount, updatedAt: new Date().toISOString() })
    .eq('userId', userId)
    .gte('balance', amount)
    .select()
    .maybeSingle()
  if (uErr) throw new Error(uErr.message)
  if (!updated) {
    const err = new Error('credit balance changed during reservation — retry')
    err.code = 'RESERVE_CONFLICT'
    throw err
  }

  const { data: row, error: lErr } = await db
    .from('credit_ledger')
    .insert({ userId, projectId, kind: 'reserve', amount, status: 'active', note })
    .select()
    .single()
  if (lErr) throw new Error(lErr.message)

  return { reservationId: row.id, remaining: updated.balance }
}

/**
 * Finalize a reservation. If actualAmount < reserved, refund the difference.
 * Marks the reserve row committed and books lifetimeSpent.
 */
export async function commit(env, { reservationId, actualAmount }) {
  if (!reservationId) return
  const db = getDb(env)
  const { data: res, error } = await db.from('credit_ledger').select('*').eq('id', reservationId).single()
  if (error || !res) throw new Error('reservation not found')
  if (res.status !== 'active') return // idempotent

  const spent = Number.isFinite(actualAmount) ? Math.min(actualAmount, res.amount) : res.amount
  const refundAmount = res.amount - spent

  await db.from('credit_ledger').update({ status: 'committed' }).eq('id', reservationId)
  await db.from('credit_ledger').insert({
    userId: res.userId, projectId: res.projectId, kind: 'commit', amount: spent, status: 'committed',
  })

  const acct = await getAccount(env, res.userId)
  const patch = { lifetimeSpent: (acct.lifetimeSpent ?? 0) + spent, updatedAt: new Date().toISOString() }
  if (refundAmount > 0) patch.balance = acct.balance + refundAmount
  await db.from('credit_accounts').update(patch).eq('userId', res.userId)
  if (refundAmount > 0) {
    await db.from('credit_ledger').insert({
      userId: res.userId, projectId: res.projectId, kind: 'refund', amount: refundAmount,
      status: 'refunded', note: 'partial — unspent reservation',
    })
  }
}

/** Release a reservation entirely (job failed before spend). */
export async function refund(env, { reservationId, note = 'reservation released' }) {
  if (!reservationId) return
  const db = getDb(env)
  const { data: res, error } = await db.from('credit_ledger').select('*').eq('id', reservationId).single()
  if (error || !res || res.status !== 'active') return // idempotent / nothing to do

  await db.from('credit_ledger').update({ status: 'refunded' }).eq('id', reservationId)
  const acct = await getAccount(env, res.userId)
  await db.from('credit_accounts')
    .update({ balance: acct.balance + res.amount, updatedAt: new Date().toISOString() })
    .eq('userId', res.userId)
  await db.from('credit_ledger').insert({
    userId: res.userId, projectId: res.projectId, kind: 'refund', amount: res.amount, status: 'refunded', note,
  })
}
