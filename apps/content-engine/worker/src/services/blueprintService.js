import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

export async function listBlueprints(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('blueprints')
    .select('*')
    .order('createdAt', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBlueprint(env, id) {
  const db = getDb(env)
  const { data, error } = await db
    .from('blueprints')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function upsertBlueprint(env, blueprint) {
  const db = getDb(env)
  if (blueprint.id) {
    const { data, error } = await db
      .from('blueprints')
      .update({ ...blueprint, updatedAt: new Date().toISOString() })
      .eq('id', blueprint.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }
  const { data, error } = await db
    .from('blueprints')
    .insert({ id: uid(), ...blueprint })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteBlueprint(env, id) {
  const db = getDb(env)
  const { error } = await db.from('blueprints').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: id }
}
