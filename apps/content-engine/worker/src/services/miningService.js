import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreProduct(p) {
  const ratingScore = (p.rating / 5) * 40
  const reviewScore = Math.min(p.reviews / 10000, 1) * 30
  const priceScore  = Math.max(0, (1 - p.price / 500)) * 30
  return Math.round(ratingScore + reviewScore + priceScore)
}

// ── Blog review fetcher ───────────────────────────────────────────────────────
// Fetches top 5 organic blog review snippets for a product via SerpAPI Google search.
// Returns [] on any error (non-critical — products are saved regardless).
async function fetchBlogReviews(env, productTitle) {
  try {
    const { resolveKey } = await import('../lib/resolveKey.js')
    const serpKey = await resolveKey(env, 'SERPAPI_KEY')
    if (!serpKey) return []
    const params = new URLSearchParams({
      engine:  'google',
      api_key: serpKey,
      q:       `${productTitle} review melhor`,
      hl:      'pt',
      gl:      'br',
      num:     '10',
    })
    const res = await fetch(`https://serpapi.com/search?${params}`)
    if (!res.ok) return []
    const json = await res.json()
    const organic = json.organic_results ?? []
    return organic
      .filter(r => r.snippet && r.link && !r.link.includes('mercadolivre') && !r.link.includes('amazon'))
      .slice(0, 5)
      .map(r => ({
        title:   r.title   ?? '',
        snippet: r.snippet ?? '',
        source:  r.source  ?? new URL(r.link).hostname,
        link:    r.link,
      }))
  } catch {
    return []
  }
}

// ── Domain helpers ────────────────────────────────────────────────────────────
function detectMarketplace(link = '') {
  if (link.includes('mercadolivre') || link.includes('mercadolibre')) return 'mercadolivre'
  if (link.includes('amazon.com'))                                     return 'amazon'
  return 'google_shopping'
}

// ── SerpAPI — Google Shopping ─────────────────────────────────────────────────
// siteFilter: 'all' | 'mercadolivre' | 'amazon' | 'ml_amazon'
async function fetchSerpApi(env, { category, engine = 'google_shopping', limit = 20, amazonTag = '', mlAffiliateId = '', siteFilter = 'all' }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const serpKey = await resolveKey(env, 'SERPAPI_KEY')
  if (!serpKey) {
    throw new Error(
      'SERPAPI_KEY not configured — adicione em Configurações ou run: wrangler secret put SERPAPI_KEY\n' +
      'Get a free key (100 searches/month) at https://serpapi.com'
    )
  }

  // When filtering by specific sites, fetch more results so we have enough after filtering
  const fetchLimit = siteFilter !== 'all' ? 100 : limit

  const params = new URLSearchParams({
    engine,
    api_key: serpKey,
    hl:      'pt',
    gl:      'br',
    num:     String(fetchLimit),
  })

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
    let results = json.shopping_results ?? []

    // Apply site filter before mapping
    if (siteFilter === 'mercadolivre') {
      results = results.filter(item => {
        const link = item.link ?? item.product_link ?? ''
        return link.includes('mercadolivre') || link.includes('mercadolibre')
      })
    } else if (siteFilter === 'amazon') {
      results = results.filter(item => {
        const link = item.link ?? item.product_link ?? ''
        return link.includes('amazon.com')
      })
    } else if (siteFilter === 'ml_amazon') {
      results = results.filter(item => {
        const link = item.link ?? item.product_link ?? ''
        return link.includes('mercadolivre') || link.includes('mercadolibre') || link.includes('amazon.com')
      })
    }

    return results.slice(0, limit).map((item) => {
      const rawLink    = item.link ?? item.product_link ?? ''
      const mp         = detectMarketplace(rawLink)
      const affiliateLink = mp === 'mercadolivre'
        ? buildMercadoLibreAffiliateLink(rawLink, mlAffiliateId)
        : mp === 'amazon'
          ? buildAmazonAffiliateLink(rawLink, '', amazonTag)
          : rawLink
      return {
        id:            uid(),
        marketplace:   mp,
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

// Supports two formats:
//   "matt:username:toolId"  → ?matt_word=username&matt_tool=toolId
//   plain tag               → ?tag=value
function buildMercadoLibreAffiliateLink(permalink, affiliateTag) {
  if (!affiliateTag || !permalink) return permalink ?? ''
  try {
    const u = new URL(permalink)
    if (affiliateTag.startsWith('matt:')) {
      const parts = affiliateTag.split(':')
      if (parts.length >= 3) {
        u.searchParams.set('matt_word', parts[1])
        u.searchParams.set('matt_tool', parts[2])
      }
    } else {
      u.searchParams.set('tag', affiliateTag)
    }
    return u.toString()
  } catch { return permalink }
}

// ── Load affiliate tags from secrets / Settings-saved credentials ─────────────
async function loadAffiliateIds(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const [amazonTag, mlAffiliateTag] = await Promise.all([
    resolveKey(env, 'AMAZON_AFFILIATE_TAG'),
    resolveKey(env, 'ML_AFFILIATE_TAG'),
  ])
  return {
    amazonTag:     amazonTag     ?? '',
    mlAffiliateId: mlAffiliateTag ?? '',
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
export async function runMiningSession(env, { marketplace, category, siteFilter = 'all' }) {
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
      const items = await fetchSerpApi(env, { category, engine: 'google_shopping', mlAffiliateId, amazonTag, siteFilter })
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

  // Fetch blog reviews for top 5 products (best scored) — fire-and-forget updates
  const topProducts = [...saved].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5)
  await Promise.allSettled(topProducts.map(async (p) => {
    const blogReviews = await fetchBlogReviews(env, p.title)
    if (blogReviews.length > 0) {
      await db.from('products').update({ blogReviews }).eq('id', p.id)
    }
  }))

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
