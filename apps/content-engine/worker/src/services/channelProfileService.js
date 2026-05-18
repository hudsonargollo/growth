import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

export async function getChannelProfile(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('channel_profiles')
    .select('*')
    .order('createdAt', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ?? null
}

export async function upsertChannelProfile(env, profile) {
  const db = getDb(env)
  const existing = await getChannelProfile(env)
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
  if (error) throw new Error(error.message)
  return data
}
