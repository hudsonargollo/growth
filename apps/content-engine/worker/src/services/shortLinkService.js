import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const BASE_URL = 'https://fabricadeconteudo.clubemkt.digital'

function makeCode() {
  return uid().slice(0, 8)
}

export async function shortenUrl(env, { url, productId = null, marketplace = null }) {
  if (!url) return url
  const db = getDb(env)

  // Reuse existing short link for same URL
  const { data: existing } = await db
    .from('short_links')
    .select('code')
    .eq('originalUrl', url)
    .maybeSingle()

  if (existing) return `${BASE_URL}/r/${existing.code}`

  const code = makeCode()
  await db.from('short_links').insert({ id: uid(), code, originalUrl: url, productId, marketplace })
  return `${BASE_URL}/r/${code}`
}

export async function resolveAndTrack(env, code) {
  const db = getDb(env)
  const { data } = await db.from('short_links').select('originalUrl').eq('code', code).maybeSingle()
  if (!data) return null
  // fire-and-forget click increment
  db.rpc('increment_short_link_clicks', { link_code: code }).then(() => {}).catch(() => {})
  return data.originalUrl
}

export async function listShortLinks(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('short_links')
    .select('*')
    .order('clicks', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return data
}
