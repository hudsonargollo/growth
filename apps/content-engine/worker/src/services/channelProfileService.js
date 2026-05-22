import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

function isTableMissing(error) {
  return error?.message?.includes('channel_profiles') ||
         error?.message?.includes('schema cache') ||
         error?.code === '42P01'
}

export async function getChannelProfile(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('channel_profiles')
    .select('*')
    .order('createdAt', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    if (isTableMissing(error)) return null   // table not created yet — return empty gracefully
    throw new Error(error.message)
  }
  return data ?? null
}

export async function upsertChannelProfile(env, profile) {
  const db = getDb(env)

  // Try to get existing — may return null if table missing
  let existing = null
  try { existing = await getChannelProfile(env) } catch { /* ignore */ }

  if (existing) {
    const { data, error } = await db
      .from('channel_profiles')
      .update({ ...profile, updatedAt: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await db
    .from('channel_profiles')
    .insert({ id: uid(), ...profile })
    .select()
    .single()
  if (error) {
    if (isTableMissing(error)) {
      throw new Error('TABLE_MISSING')
    }
    throw new Error(error.message)
  }
  return data
}
