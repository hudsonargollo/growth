import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreProduct(p) {
  const ratingScore = (p.rating / 5) * 40
  const reviewScore = Math.min(p.reviews / 10000, 1) * 30
  const priceScore  = Math.max(0, (1 - p.price / 500)) * 30
  return Math.round(ratingScore + reviewScore + priceScore)
}

// ── MercadoLibre OAuth app token ──────────────────────────────────────────────
async function getMercadoLibreToken(env) {
  if (!env.ML_APP_ID || !env.ML_CLIENT_SECRET) {
    throw new Error(
      'MercadoLibre credentials not configured.\n' +
      '1. Create a free app at https://developers.mercadolibre.com\n' +
      '2. Run: wrangler secret put ML_APP_ID\n' +
      '3. Run: wrangler secret put ML_CLIENT_SECRET'
    )
  }

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.ML_APP_ID,
      client_secret: env.ML_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`MercadoLibre auth failed: ${err.message ?? res.status}`)
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

async function fetchMercadoLibre(env, { category, limit = 20 }) {
  const token  = await getMercadoLibreToken(env)
  const siteId = ML_SITE_MAP[env.ML_SITE ?? 'brazil'] ?? 'MLB'
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
async function fetchAmazon(env, { category }) {
  if (!env.AMAZON_ACCESS_KEY || !env.AMAZON_SECRET_KEY || !env.AMAZON_PARTNER_TAG) {
    throw new Error(
      'Amazon PA-API credentials not configured.\n' +
      'Required secrets: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG\n' +
      'Note: PA-API requires an approved Amazon Associates account.'
    )
  }
  throw new Error('Amazon PA-API: AWS Signature V4 signing not yet implemented.')
}

// ── Main session runner ───────────────────────────────────────────────────────
export async function runMiningSession(env, tenantId, db, { marketplace, category }) {
  const sessionId = uid()

  await db.from('mining_sessions').insert({
    id: sessionId, marketplace, category, status: 'in_progress', tenant_id: tenantId,
  })

  const rawProducts = []
  const errors      = []

  if (marketplace === 'mercadolibre' || marketplace === 'both') {
    try {
      const items = await fetchMercadoLibre(env, { category })
      rawProducts.push(...items)
      console.log(`[mining] MercadoLibre: ${items.length} products for "${category}"`)
    } catch (e) {
      errors.push(`MercadoLibre: ${e.message}`)
      console.error('[mining] MercadoLibre error:', e.message)
    }
  }

  if (marketplace === 'amazon' || marketplace === 'both') {
    try {
      const items = await fetchAmazon(env, { category })
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

  const scored = rawProducts.map((p) => ({ ...p, score: scoreProduct(p), tenant_id: tenantId }))

  const { data: saved, error: pErr } = await db.from('products').insert(scored).select()
  if (pErr) throw new Error(pErr.message)

  const entries = saved.map((p) => ({
    id:             uid(),
    productId:      p.id,
    market:         marketplace,
    freshnessScore: 1.0,
    provenance:     `session-${sessionId}`,
    tenant_id:      tenantId,
  }))
  const { error: eErr } = await db.from('catalog_entries').insert(entries)
  if (eErr) throw new Error(eErr.message)

  await db.from('mining_sessions').update({
    status:       'completed',
    productCount: saved.length,
    completedAt:  new Date().toISOString(),
  }).eq('id', sessionId)

  return {
    status:   'completed',
    sessionId,
    count:    saved.length,
    warnings: errors.length > 0 ? errors : undefined,
  }
}

export async function getCatalog(env, tenantId, db) {
  let query = db.from('products').select('*').order('score', { ascending: false }).limit(100)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getSessions(env, tenantId, db) {
  let query = db.from('mining_sessions').select('*').order('createdAt', { ascending: false }).limit(20)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
