import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreProduct(p) {
  const ratingScore = (p.rating / 5) * 40
  const reviewScore = Math.min(p.reviews / 10000, 1) * 30
  const priceScore  = Math.max(0, (1 - p.price / 500)) * 30
  return Math.round(ratingScore + reviewScore + priceScore)
}

// ── SerpAPI — Google Shopping ─────────────────────────────────────────────────
async function fetchSerpApi(env, { category, engine = 'google_shopping', limit = 20, amazonTag = '', mlAffiliateId = '' }) {
  if (!env.SERPAPI_KEY) {
    throw new Error(
      'SERPAPI_KEY not configured — run: wrangler secret put SERPAPI_KEY\n' +
      'Get a free key (100 searches/month) at https://serpapi.com'
    )
  }

  const params = new URLSearchParams({
    engine,
    api_key: env.SERPAPI_KEY,
    hl:      'pt',
    gl:      'br',
    num:     String(limit),
  })

  // Amazon engine uses 'k' for keyword, not 'q', and a different domain param
  if (engine === 'amazon') {
    params.set('k', category)
    params.set('amazon_domain', 'amazon.com.br')
    params.delete('gl')
    params.delete('hl')
    params.delete('num')
  } else {
    params.set('q', category)
  }

  const res = await fetch(`https://serpapi.com/search?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SerpAPI error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()

  // Google Shopping results
  if (engine === 'google_shopping') {
    const results = json.shopping_results ?? []
    return results.slice(0, limit).map((item) => {
      const rawLink = item.link ?? item.product_link ?? ''
      const isMl    = rawLink.includes('mercadolivre') || rawLink.includes('mercadolibre')
      const affiliateLink = isMl
        ? buildMercadoLibreAffiliateLink(rawLink, mlAffiliateId)
        : rawLink
      return {
        id:            uid(),
        marketplace:   isMl ? 'mercadolibre' : 'google_shopping',
        title:         item.title ?? '',
        price:         parseFloat(String(item.price ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
        rating:        item.rating ?? 0,
        reviews:       item.reviews ?? 0,
        affiliateLink,
        imageUrl:      item.thumbnail ?? '',
        currency:      'BRL',
        sourceApi:     'serpapi_google',
        lastSeen:      new Date().toISOString(),
      }
    })
  }

  // Amazon results
  if (engine === 'amazon') {
    const results = json.organic_results ?? []
    return results.slice(0, limit).map((item) => ({
      id:            uid(),
      marketplace:   'amazon',
      title:         item.title ?? '',
      price:         parseFloat(String(item.price?.value ?? item.price ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
      rating:        item.rating ?? 0,
      reviews:       item.reviews ?? 0,
      affiliateLink: buildAmazonAffiliateLink(item.link ?? '', item.asin ?? '', amazonTag),
      imageUrl:      item.thumbnail ?? '',
      currency:      'BRL',
      sourceApi:     'serpapi_amazon',
      lastSeen:      new Date().toISOString(),
    }))
  }

  return []
}

// ── Affiliate link builders ───────────────────────────────────────────────────

function buildAmazonAffiliateLink(url, asin, tag) {
  if (!tag) return url || (asin ? `https://www.amazon.com.br/dp/${asin}` : '')
  if (asin) return `https://www.amazon.com.br/dp/${asin}?tag=${tag}`
  try {
    const u = new URL(url)
    u.searchParams.set('tag', tag)
    return u.toString()
  } catch { return url }
}

function buildMercadoLibreAffiliateLink(permalink, mlAffiliateId) {
  if (!mlAffiliateId || !permalink) return permalink ?? ''
  try {
    const u = new URL(permalink)
    u.searchParams.set('matt_tool', mlAffiliateId)
    return u.toString()
  } catch { return permalink }
}

// ── Load affiliate IDs from Supabase credentials table ────────────────────────
async function loadAffiliateIds(env) {
  try {
    const db = getDb(env)
    const { data } = await db
      .from('tool_credentials')
      .select('toolId, login')
      .in('toolId', ['affiliate_amazon', 'affiliate_ml'])
    const map = {}
    for (const row of data ?? []) map[row.toolId] = row.login
    return {
      amazonTag:     map['affiliate_amazon'] ?? env.AMAZON_ASSOCIATE_TAG ?? '',
      mlAffiliateId: map['affiliate_ml']     ?? env.ML_AFFILIATE_ID      ?? '',
    }
  } catch {
    return {
      amazonTag:     env.AMAZON_ASSOCIATE_TAG ?? '',
      mlAffiliateId: env.ML_AFFILIATE_ID      ?? '',
    }
  }
}


// NOTE: MercadoLibre blocked their public search API in 2025 for third-party
// apps. The token flow still works but /sites/MLB/search returns 403.
// Keeping this as a stub — if ML re-opens access, re-enable by removing the throw.
async function fetchMercadoLibre(env, { category }) {
  throw new Error(
    'MercadoLibre bloqueou o acesso à API de busca para apps de terceiros em 2025. ' +
    'Use Google Shopping (SerpAPI) como alternativa: wrangler secret put SERPAPI_KEY'
  )
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
export async function runMiningSession(env, { marketplace, category }) {
  const db        = getDb(env)
  const sessionId = uid()

  // Load affiliate IDs from Supabase (set via Settings page)
  const { amazonTag, mlAffiliateId } = await loadAffiliateIds(env)

  await db.from('mining_sessions').insert({
    id: sessionId, marketplace, category, status: 'in_progress',
  })

  const rawProducts = []
  const errors      = []

  if (marketplace === 'google_shopping' || marketplace === 'both') {
    try {
      const items = await fetchSerpApi(env, { category, engine: 'google_shopping', mlAffiliateId, amazonTag })
      rawProducts.push(...items)
      console.log(`[mining] Google Shopping: ${items.length} products for "${category}"`)
    } catch (e) {
      errors.push(`Google Shopping: ${e.message}`)
      console.error('[mining] Google Shopping error:', e.message)
    }
  }

  if (marketplace === 'amazon' || marketplace === 'both') {
    try {
      const items = await fetchSerpApi(env, { category, engine: 'amazon', amazonTag, mlAffiliateId })
      rawProducts.push(...items)
      console.log(`[mining] Amazon: ${items.length} products for "${category}"`)
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

  return {
    status:   'completed',
    sessionId,
    count:    saved.length,
    warnings: errors.length > 0 ? errors : undefined,
  }
}

export async function getCatalog(env, { sessionId } = {}) {
  const db = getDb(env)

  if (sessionId) {
    const { data: entries, error: eErr } = await db
      .from('catalog_entries')
      .select('productId')
      .eq('provenance', `session-${sessionId}`)
    if (eErr) throw new Error(eErr.message)
    const ids = (entries ?? []).map((e) => e.productId)
    if (ids.length === 0) return []
    const { data, error } = await db
      .from('products')
      .select('*')
      .in('id', ids)
      .order('score', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  }

  const { data, error } = await db
    .from('products')
    .select('*')
    .order('score', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getSessions(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('mining_sessions')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return data
}
