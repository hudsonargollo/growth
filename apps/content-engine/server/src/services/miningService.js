import { db } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreProduct(p) {
  const ratingScore = (p.rating / 5) * 40
  const reviewScore = Math.min(p.reviews / 10000, 1) * 30
  const priceScore  = Math.max(0, (1 - p.price / 500)) * 30
  return Math.round(ratingScore + reviewScore + priceScore)
}

// ── MercadoLibre OAuth app token ──────────────────────────────────────────────
// Uses ML_PROXY_URL when set to bypass cloud-provider IP blocks (AWS/Render IPs
// are sometimes blocked by MercadoLibre). Set ML_PROXY_URL to your Deno Deploy
// or ml-proxy-node URL in the Render environment variables.
async function getMercadoLibreToken() {
  if (!process.env.ML_APP_ID || !process.env.ML_CLIENT_SECRET) {
    throw new Error(
      'MercadoLibre credentials not configured — set ML_APP_ID and ML_CLIENT_SECRET'
    )
  }

  const base    = process.env.ML_PROXY_URL
    ? process.env.ML_PROXY_URL.replace(/\/$/, '')
    : 'https://api.mercadolibre.com'

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (process.env.ML_PROXY_URL && process.env.ML_PROXY_SECRET) {
    headers['X-Proxy-Secret'] = process.env.ML_PROXY_SECRET
  }

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.ML_APP_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`MercadoLibre auth failed (${res.status}): ${err.message ?? 'unknown'}`)
  }

  const json = await res.json()
  return json.access_token
}

// ── MercadoLibre search ───────────────────────────────────────────────────────
const ML_SITE_MAP = {
  brazil:    'MLB',
  argentina: 'MLA',
  mexico:    'MLM',
  chile:     'MLC',
  colombia:  'MCO',
}

async function fetchMercadoLibre({ category, limit = 20 }) {
  const token  = await getMercadoLibreToken()
  const siteId = ML_SITE_MAP[process.env.ML_SITE ?? 'brazil'] ?? 'MLB'
  const query  = encodeURIComponent(category)
  const url    = `https://api.mercadolibre.com/sites/${siteId}/search?q=${query}&limit=${limit}&sort=relevance`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MercadoLibre search error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json    = await res.json()
  const results = json.results ?? []

  if (results.length === 0) {
    console.warn(`[mining] MercadoLibre returned 0 results for "${category}" on site ${siteId}`)
  }

  return results.map((item) => ({
    id:            uid(),
    marketplace:   'mercadolibre',
    title:         item.title,
    price:         item.price ?? 0,
    rating:        item.reviews?.rating_average ?? 0,
    reviews:       item.reviews?.total ?? 0,
    affiliateLink: item.permalink ?? '',
    imageUrl:      item.thumbnail ?? '',
    currency:      item.currency_id ?? 'BRL',
    sourceApi:     'mercadolibre',
    lastSeen:      new Date().toISOString(),
  }))
}

// ── Amazon PA-API ─────────────────────────────────────────────────────────────
async function fetchAmazon({ category }) {
  if (!process.env.AMAZON_ACCESS_KEY || !process.env.AMAZON_SECRET_KEY || !process.env.AMAZON_PARTNER_TAG) {
    throw new Error(
      'Amazon PA-API credentials not configured.\n' +
      'Required: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG\n' +
      'Note: PA-API requires an approved Amazon Associates account.'
    )
  }
  throw new Error('Amazon PA-API: AWS Signature V4 signing not yet implemented.')
}

// ── Main session runner ───────────────────────────────────────────────────────
export async function runMiningSession({ marketplace, category }) {
  console.log(`[mining] Starting — marketplace: ${marketplace}, category: ${category}`)
  const sessionId = uid()

  const { error: sErr } = await db.from('mining_sessions').insert({
    id: sessionId, marketplace, category, status: 'in_progress',
  })
  if (sErr) throw new Error(sErr.message)

  const rawProducts = []
  const errors      = []

  if (marketplace === 'mercadolibre' || marketplace === 'both') {
    try {
      const items = await fetchMercadoLibre({ category })
      rawProducts.push(...items)
      console.log(`[mining] MercadoLibre: ${items.length} products for "${category}"`)
    } catch (e) {
      errors.push(`MercadoLibre: ${e.message}`)
      console.error('[mining] MercadoLibre error:', e.message)
    }
  }

  if (marketplace === 'amazon' || marketplace === 'both') {
    try {
      const items = await fetchAmazon({ category })
      rawProducts.push(...items)
    } catch (e) {
      errors.push(`Amazon: ${e.message}`)
      console.error('[mining] Amazon error:', e.message)
    }
  }

  if (rawProducts.length === 0) {
    await db.from('mining_sessions').update({
      status: 'failed', completedAt: new Date().toISOString(),
    }).eq('id', sessionId)
    throw new Error(errors.join(' | '))
  }

  const scored = rawProducts.map((p) => ({ ...p, score: scoreProduct(p) }))

  const { data: saved, error: pErr } = await db.from('products').insert(scored).select()
  if (pErr) throw new Error(pErr.message)

  const entries = saved.map((p) => ({
    id:             uid(),
    productId:      p.id,
    market:         marketplace,
    freshnessScore: 1.0,
    provenance:     `session-${sessionId}`,
  }))
  const { error: eErr } = await db.from('catalog_entries').insert(entries)
  if (eErr) throw new Error(eErr.message)

  await db.from('mining_sessions').update({
    status:       'completed',
    productCount: saved.length,
    completedAt:  new Date().toISOString(),
  }).eq('id', sessionId)

  console.log(`[mining] Complete — ${saved.length} products saved`)
  return {
    status:   'completed',
    sessionId,
    count:    saved.length,
    warnings: errors.length > 0 ? errors : undefined,
  }
}

export async function getCatalog() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('score', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function getSessions() {
  const { data, error } = await db
    .from('mining_sessions')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return data
}

export async function getStats() {
  const { data: products, error } = await db.from('products').select('price, score, marketplace')
  if (error) throw new Error(error.message)
  const total       = products.length
  const bestScore   = total > 0 ? Math.max(...products.map(p => p.score ?? 0)) : 0
  const avgPrice    = total > 0 ? products.reduce((s, p) => s + (p.price ?? 0), 0) / total : 0
  const mlConfirmed = products.filter(p => p.marketplace === 'mercadolibre').length
  return { total, bestScore, avgPrice, mlConfirmed }
}

export async function ingestProducts({ category, sortBy, results }) {
  const sessionId = uid()
  const { error: sErr } = await db.from('mining_sessions').insert({
    id: sessionId, marketplace: 'mercadolibre_direct', category, status: 'in_progress',
  })
  if (sErr) throw new Error(sErr.message)

  const scored = results.map(item => ({
    id:            uid(),
    marketplace:   'mercadolibre',
    title:         item.title,
    price:         item.price ?? 0,
    rating:        item.reviews?.rating_average ?? 0,
    reviews:       item.reviews?.total ?? 0,
    affiliateLink: item.permalink ?? '',
    imageUrl:      item.thumbnail ?? '',
    currency:      item.currency_id ?? 'BRL',
    sourceApi:     'mercadolibre_direct',
    lastSeen:      new Date().toISOString(),
    sessionId,
    score:         scoreProduct({
      rating:  item.reviews?.rating_average ?? 0,
      reviews: item.reviews?.total ?? 0,
      price:   item.price ?? 0,
    }),
  }))

  const { data: saved, error: pErr } = await db.from('products').insert(scored).select()
  if (pErr) throw new Error(pErr.message)

  await db.from('mining_sessions').update({
    status: 'completed', productCount: saved.length, completedAt: new Date().toISOString(),
  }).eq('id', sessionId)

  return { status: 'completed', sessionId, count: saved.length }
}

export async function deleteSession(id) {
  // delete products in this session first
  await db.from('products').delete().eq('sessionId', id)
  const { error } = await db.from('mining_sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function clearAll() {
  await db.from('products').delete().neq('id', '')
  await db.from('mining_sessions').delete().neq('id', '')
}

export async function renameSession(id, { name, projectId }) {
  const update = {}
  if (name      !== undefined) update.name      = name
  if (projectId !== undefined) update.projectId = projectId
  const { error } = await db.from('mining_sessions').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}
