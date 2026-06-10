/**
 * db.js — data layer entry point.
 *
 * All persistent data now lives in Cloudflare KV (env.KV1).
 * getDb() returns a KvClient that implements the Supabase JS query API subset
 * used across the codebase — all service files continue calling getDb(env)
 * with zero changes to their query chains.
 *
 * Supabase is kept ONLY for frontend auth (login gate).
 * No Supabase DB calls are made by the worker anymore.
 */
export { getKvDb as getDb, getKvDb as createUserClient } from './kvdb.js'
