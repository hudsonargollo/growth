import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Price parser — handles Brazilian (1.234,56) and US (1,234.56) formats ─────
function parsePrice(raw) {
  if (raw === null || raw === undefined) return 0
  if (typeof raw === 'number') return raw
  const s = String(raw).replace(/[R$\s]/g, '').trim()
  if (!s) return 0
  // Detect BRL format: ends with comma + 2 digits  (e.g. "1.650,00")
  if (/,\d{2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }
  // US format or plain number — strip everything except digits and last dot
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0
}

// ── Scoring ───────────────────────────────────────────────────────────────────
// Generic scorer for SerpAPI products (no sold_quantity)
function scoreProduct(p) {
  const ratingScore  = ((p.rating ?? 0) / 5) * 35
  const reviewScore  = Math.min((p.reviews ?? 0) / 10000, 1) * 35
  const priceScore   = Math.max(0, (1 - (p.price ?? 0) / 500)) * 20
  const freeShip     = p.freeShipping ? 10 : 0
  return Math.round(ratingScore + reviewScore + priceScore + freeShip)
}

// Enhanced scorer for direct MercadoLivre API (has sold_quantity, listing_type, seller_reputation)
function scoreMLProduct(p) {
  // sold_quantity: up to 45 pts (1000 sold = max)
  const soldScore = Math.min((p.soldQuantity ?? 0) / 1000, 1) * 45

  // listing quality: up to 20 pts
  const listingScores = { gold_pro: 20, gold_special: 16, gold: 12, silver: 6, bronze: 3, free: 1 }
  const listingScore  = listingScores[p.listingType] ?? 6

  // seller reputation: up to 15 pts
  const sellerLevels  = { '5_green': 15, '4_light_green': 10, '3_yellow': 6, '2_orange': 2, '1_red': 0 }
  const sellerScore   = sellerLevels[p.sellerLevel] ?? 7

  // shipping: up to 10 pts
  const freeShip      = p.freeShipping  ? 7 : 0
  const fulfillment   = p.fulfillment   ? 3 : 0
  const shippingScore = freeShip + fulfillment

  // discount presence: bonus 5 pts
  const discountScore = (p.originalPrice && p.originalPrice > p.price) ? 5 : 0

  // official store / catalog: bonus 5 pts
  const officialScore = (p.officialStore || p.catalogListing) ? 5 : 0

  return Math.round(soldScore + listingScore + sellerScore + shippingScore + discountScore + officialScore)
}

// Blog review quality scorer (0–15 pts added on top of base score)
const TRUSTED_REVIEW_DOMAINS = [
  'tecmundo.com.br', 'tecnoblog.net', 'techtudo.com.br', 'canaltech.com.br',
  'tudocelular.com', 'hardware.com.br', 'showmetech.com.br', 'zoom.com.br',
  'promobit.com.br', 'kabum.com.br', 'techradar.com', 'rtings.com',
  'pcmag.com', 'tomsguide.com', 'notebookcheck.net', 'versus.com',
]

function scoreBlogReviews(reviews = []) {
  if (!reviews.length) return 0
  // up to 8 pts for having 5+ reviews
  const countScore  = (Math.min(reviews.length, 5) / 5) * 8
  // up to 7 pts for reviews from trusted/authoritative domains
  const trustedCnt  = reviews.filter(r =>
    TRUSTED_REVIEW_DOMAINS.some(d => (r.source ?? r.link ?? '').toLowerCase().includes(d))
  ).length
  const trustScore  = Math.min(trustedCnt * 2.5, 7)
  return Math.round(countScore + trustScore)
}

// ── Blog review fetcher ───────────────────────────────────────────────────────
// Returns up to 5 review snippets from editorial/blog sources (not marketplace pages)
async function fetchBlogReviews(env, productTitle) {
  try {
    const { resolveKey } = await import('../lib/resolveKey.js')
    const serpKey = await resolveKey(env, 'SERPAPI_KEY')
    if (!serpKey) return []

    // Strip brand noise to get a cleaner model query (first 60 chars)
    const cleanTitle = productTitle.slice(0, 60).replace(/[()[\]]/g, '').trim()
    const params = new URLSearchParams({
      engine: 'google', api_key: serpKey,
      q: `"${cleanTitle}" análise review vale a pena`,
      hl: 'pt', gl: 'br', num: '10',
    })
    const res = await fetch(`https://serpapi.com/search?${params}`)
    if (!res.ok) return []
    const json    = await res.json()
    const organic = json.organic_results ?? []

    // Filter out marketplace/e-commerce pages — we only want editorial reviews
    const SKIP_DOMAINS = ['mercadolivre', 'amazon', 'americanas', 'shopee', 'magalu', 'submarino', 'casasbahia', 'extra.com', 'buscape', 'bondfaro']
    return organic
      .filter(r => {
        if (!r.snippet || !r.link) return false
        const link = r.link.toLowerCase()
        return !SKIP_DOMAINS.some(d => link.includes(d))
      })
      .slice(0, 5)
      .map(r => {
        let hostname = r.source ?? ''
        try { hostname = new URL(r.link).hostname.replace('www.', '') } catch {}
        return {
          title:   r.title ?? '',
          snippet: r.snippet ?? '',
          source:  hostname,
          link:    r.link,
          trusted: TRUSTED_REVIEW_DOMAINS.some(d => hostname.includes(d)),
        }
      })
  } catch { return [] }
}

// ── ML fetch helper — routes through proxy when ML_PROXY_URL is set ───────────
// Cloudflare Workers' egress IPs are blocked by MercadoLibre. When ML_PROXY_URL
// points to a Deno Deploy proxy, all ML API calls go through it instead.
function mlFetch(env, path, options = {}) {
  const base = (env.ML_PROXY_URL ?? '').replace(/\/$/, '') || 'https://api.mercadolibre.com'
  const proxySecret = env.ML_PROXY_SECRET ?? ''

  const headers = new Headers(options.headers ?? {})
  headers.set('User-Agent', 'FabricaDeConteudo/1.0')
  if (proxySecret && base !== 'https://api.mercadolibre.com') {
    headers.set('X-Proxy-Secret', proxySecret)
  }

  return fetch(`${base}${path}`, { ...options, headers })
}

// ── MercadoLivre OAuth (client_credentials) ───────────────────────────────────
async function getMLToken(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const [appId, clientSecret] = await Promise.all([
    resolveKey(env, 'ML_APP_ID'),
    resolveKey(env, 'ML_CLIENT_SECRET'),
  ])
  if (!appId || !clientSecret) return { token: null, error: 'ML_APP_ID/ML_CLIENT_SECRET não configurados' }
  const res = await mlFetch(env, '/oauth/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body:    new URLSearchParams({ grant_type: 'client_credentials', client_id: appId, client_secret: clientSecret }),
  })
  if (!res.ok) {
    const body = await res.text()
    return { token: null, error: `OAuth ${res.status}: ${body.slice(0, 200)}` }
  }
  const json = await res.json()
  return { token: json.access_token ?? null, error: null }
}

// ── MercadoLivre Direct API ───────────────────────────────────────────────────
async function fetchMercadoLivreDirectAPI(env, { query, sortBy = 'sold_quantity_desc', limit = 20, mlAffiliateId = '' }) {
  const { token, error: tokenError } = await getMLToken(env)
  console.log(`[ML] token=${token ? 'ok' : 'null'} tokenError=${tokenError ?? 'none'}`)

  const makeParams = (sort) => new URLSearchParams({ q: query, sort, limit: String(limit) })

  // Always include a User-Agent so ML doesn't silently block the request
  const baseHeaders = { 'User-Agent': 'FabricaDeConteudo/1.0' }
  const headers = token
    ? { ...baseHeaders, Authorization: `Bearer ${token}` }
    : baseHeaders

  // 1. Preferred sort with token
  let params = makeParams(sortBy)
  let res    = await mlFetch(env, `/sites/MLB/search?${params}`, { headers })
  console.log(`[ML] attempt1 sort=${sortBy} status=${res.status}`)

  // 2. sold_quantity_desc needs higher scope → fall back to relevance, keep token
  if (res.status === 403 && sortBy !== 'relevance') {
    params = makeParams('relevance')
    res    = await mlFetch(env, `/sites/MLB/search?${params}`, { headers })
    console.log(`[ML] attempt2 sort=relevance status=${res.status}`)
  }

  // 3. Token itself rejected → try relevance without auth (public endpoint)
  if (res.status === 403 || res.status === 401) {
    params = makeParams('relevance')
    res    = await mlFetch(env, `/sites/MLB/search?${params}`, { headers: baseHeaders })
    console.log(`[ML] attempt3 sort=relevance noauth status=${res.status}`)
  }

  if (!res.ok) {
    const err = await res.text()
    const tokenMsg = tokenError ? ` | token error: ${tokenError}` : (token ? '' : ' | sem token (credenciais não configuradas)')
    throw new Error(`ML API error ${res.status}: ${err.slice(0, 200)}${tokenMsg}`)
  }

  const json    = await res.json()

  // ML sometimes returns a 200 with an inline error body instead of results
  if (json.error) {
    throw new Error(`ML API inline error: ${json.message ?? json.error}`)
  }

  const results      = json.results ?? []
  const listingTotal = json.paging?.total ?? 0
  console.log(`[ML] query="${query}" results=${results.length} listingTotal=${listingTotal}`)

  const products = results.map((item) => {
    const permalink    = item.permalink ?? ''
    const affiliateLink = buildMercadoLibreAffiliateLink(permalink, mlAffiliateId)
    const soldQty      = item.sold_quantity ?? 0
    const discount     = (item.original_price && item.original_price > item.price)
      ? Math.round((1 - item.price / item.original_price) * 100) : 0

    return {
      id:              uid(),
      marketplace:     'mercadolivre',
      title:           item.title ?? '',
      price:           item.price ?? 0,
      originalPrice:   item.original_price ?? null,
      discountPct:     discount,
      rating:          item.seller?.seller_reputation?.transactions?.ratings?.positive
                         ? Math.round(item.seller.seller_reputation.transactions.ratings.positive * 5 * 10) / 10
                         : 0,
      reviews:         soldQty,           // sold_quantity stored as reviews for sorting
      soldQuantity:    soldQty,
      listingType:     item.listing_type_id ?? '',
      sellerLevel:     item.seller?.seller_reputation?.level_id ?? '',
      condition:       item.condition ?? 'new',
      freeShipping:    item.shipping?.free_shipping ?? false,
      fulfillment:     item.shipping?.logistic_type === 'fulfillment',
      officialStore:   !!item.official_store_id,
      catalogListing:  !!item.catalog_listing,
      affiliateLink,
      productUrl:      permalink,
      imageUrl:        item.thumbnail ?? '',
      currency:        'BRL',
      sourceApi:       'ml_direct',
      lastSeen:        new Date().toISOString(),
      score:           0, // will be computed after
    }
  })
  return { products, listingTotal }
}

// ── ML Trending topics ────────────────────────────────────────────────────────
// /trends/MLB requires auth. With a valid token we get live data; without auth we return
// a curated list of evergreen BR categories so the UI always has something to show.
const FALLBACK_TRENDS = [
  'fone de ouvido bluetooth', 'air fryer', 'tênis masculino', 'notebook', 'cadeira gamer',
  'câmera de segurança', 'kit churrasco', 'smart tv', 'whey protein', 'suporte para celular',
  'mouse gamer', 'carregador portátil', 'aspirador robô', 'fritadeira elétrica', 'relógio smartwatch',
  'estabilizador de tensão', 'cama box casal', 'kit skincare', 'console ps5', 'impressora multifuncional',
]

export async function fetchMLTrends(env) {
  try {
    const { token } = await getMLToken(env)
    if (!token) return FALLBACK_TRENDS

    const res = await mlFetch(env, '/trends/MLB', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return FALLBACK_TRENDS
    const trends = await res.json()
    const live = (trends ?? []).slice(0, 20).map(t => t.keyword ?? t).filter(Boolean)
    return live.length > 0 ? live : FALLBACK_TRENDS
  } catch { return FALLBACK_TRENDS }
}

// ── SerpAPI — Google Shopping ─────────────────────────────────────────────────
async function fetchSerpApi(env, { category, engine = 'google_shopping', limit = 20, amazonTag = '', mlAffiliateId = '', siteFilter = 'all', siteRestrict = '' }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const serpKey = await resolveKey(env, 'SERPAPI_KEY')
  if (!serpKey) throw new Error('SERPAPI_KEY não configurada — adicione em Configurações')

  // Always fetch 100 results from Google Shopping so post-filtering (ML/Amazon only)
  // has enough raw results. SerpAPI paginates at 100 max; for direct site-restricted
  // queries the results are already scoped, so we cap at limit there.
  const fetchLimit = siteRestrict ? limit : 100
  const params = new URLSearchParams({ engine, api_key: serpKey, hl: 'pt', gl: 'br', num: String(fetchLimit) })

  if (engine === 'amazon') {
    params.set('k', category)
    params.set('amazon_domain', 'amazon.com.br')
    params.delete('gl'); params.delete('hl'); params.delete('num')
  } else {
    // Append site: operator when restricted to a specific domain
    const q = siteRestrict ? `${category} site:${siteRestrict}` : category
    params.set('q', q)
  }

  const res = await fetch(`https://serpapi.com/search?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SerpAPI error ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()

  if (engine === 'google_shopping') {
    const results = json.shopping_results ?? []
    console.log(`[serp] q="${category}" siteFilter=${siteFilter} total_results=${results.length} sources=${JSON.stringify([...new Set(results.map(r => r.source))].slice(0,8))}`)
    function isML(item) {
      const link = (item.link ?? item.product_link ?? '').toLowerCase()
      const src  = (item.source ?? '').toLowerCase()
      return link.includes('mercadolivre') || link.includes('mercadolibre') ||
             src.includes('mercado livre') || src.includes('mercadolivre') || src.includes('mercado l')
    }
    function isAmazon(item) {
      const link = (item.link ?? item.product_link ?? '').toLowerCase()
      const src  = (item.source ?? '').toLowerCase()
      return link.includes('amazon.com') || src.includes('amazon')
    }
    const mlOnly       = siteFilter === 'mercadolivre'
    const amazonOnly   = siteFilter === 'amazon'
    const mlAmazonOnly = siteFilter === 'ml_amazon'  // UI default: both affiliate marketplaces only
    // siteFilter='all' — keep every result so specific product searches don't return 0.
    // ml_amazon — ML + Amazon only (affiliate links available for both).
    // ML/Amazon items get affiliate links; others use the raw product URL directly.
    const filtered   = results.filter(item => {
      if (mlOnly)       return isML(item)
      if (amazonOnly)   return isAmazon(item)
      if (mlAmazonOnly) return isML(item) || isAmazon(item)
      return true  // 'all': include every store, affiliate links built per-marketplace below
    })
    console.log(`[serp] after filter: ${filtered.length} items`)
    return filtered.slice(0, limit).map((item) => {
      const rawLink = item.link ?? item.product_link ?? ''
      const mlItem  = isML(item)
      const amzItem = isAmazon(item)
      const mp      = mlItem ? 'mercadolivre' : amzItem ? 'amazon' : (item.source ?? 'other').toLowerCase().replace(/\s+/g, '_').slice(0, 40)
      const affiliateLink = mlItem
        ? buildMercadoLibreAffiliateLink(rawLink, mlAffiliateId)
        : amzItem
          ? buildAmazonAffiliateLink(rawLink, '', amazonTag)
          : rawLink  // non-affiliate store: just use the direct product URL
      return {
        id: uid(), marketplace: mp,
        title:      item.title ?? '',
        // Prefer extracted_price (already a float in local currency) over parsing the string
        price:      item.extracted_price ?? parsePrice(item.price),
        rating:     item.rating ?? 0,
        reviews:    item.reviews ?? 0,
        affiliateLink,
        productUrl: rawLink,
        imageUrl:   item.thumbnail ?? '',
        currency: 'BRL', sourceApi: 'serpapi_google', lastSeen: new Date().toISOString(),
        freeShipping: false, condition: 'new',
      }
    })
  }

  if (engine === 'amazon') {
    const results = json.organic_results ?? []
    return results.slice(0, limit).map((item) => ({
      id: uid(), marketplace: 'amazon',
      title:      item.title ?? '',
      price:      parsePrice(item.price?.value ?? item.price),
      rating:     item.rating ?? 0,
      reviews:    item.reviews ?? 0,
      affiliateLink: buildAmazonAffiliateLink(item.link ?? '', item.asin ?? '', amazonTag),
      productUrl: item.link ?? (item.asin ? `https://www.amazon.com.br/dp/${item.asin}` : ''),
      imageUrl:   item.thumbnail ?? '',
      currency: 'BRL', sourceApi: 'serpapi_amazon', lastSeen: new Date().toISOString(),
      freeShipping: false, condition: 'new',
    }))
  }
  return []
}

// ── Affiliate link builders ───────────────────────────────────────────────────
function buildAmazonAffiliateLink(url, asin, tag) {
  if (!tag) return url || (asin ? `https://www.amazon.com.br/dp/${asin}` : '')
  if (asin) return `https://www.amazon.com.br/dp/${asin}?tag=${tag}`
  try { const u = new URL(url); u.searchParams.set('tag', tag); return u.toString() } catch { return url }
}

function buildMercadoLibreAffiliateLink(permalink, affiliateTag) {
  if (!affiliateTag || !permalink) return permalink ?? ''
  try {
    const u = new URL(permalink)
    if (affiliateTag.startsWith('matt:')) {
      const parts = affiliateTag.split(':')
      if (parts.length >= 3) { u.searchParams.set('matt_word', parts[1]); u.searchParams.set('matt_tool', parts[2]) }
    } else {
      u.searchParams.set('tag', affiliateTag)
    }
    return u.toString()
  } catch { return permalink }
}

async function loadAffiliateIds(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const [amazonTag, mlAffiliateTag] = await Promise.all([
    resolveKey(env, 'AMAZON_AFFILIATE_TAG'),
    resolveKey(env, 'ML_AFFILIATE_TAG'),
  ])
  return { amazonTag: amazonTag ?? '', mlAffiliateId: mlAffiliateTag ?? '' }
}

// Root tenant UUID — pinned in migration 002
const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// ── Main session runner ───────────────────────────────────────────────────────
export async function runMiningSession(env, { marketplace, category, siteFilter = 'all', sortBy = 'relevance' }) {
  const db        = getDb(env)
  const sessionId = uid()

  const { amazonTag, mlAffiliateId } = await loadAffiliateIds(env)

  await db.from('mining_sessions').insert({
    id: sessionId, marketplace, category, status: 'in_progress',
    tenant_id: ROOT_TENANT_ID,
  })

  const rawProducts  = []
  const errors       = []
  let   listingTotal = 0

  // MercadoLivre direct API (best data — sold_quantity, listing_type, seller reputation)
  if (marketplace === 'mercadolivre_direct') {
    let mlDirectOk = false
    try {
      const mlSort = sortBy === 'best_sellers' ? 'sold_quantity_desc'
                   : sortBy === 'price_asc'    ? 'price_asc'
                   : sortBy === 'price_desc'   ? 'price_desc'
                   : 'relevance'  // default: relevance surfaces consumer products; sold_quantity pulls commercial
      const { products, listingTotal: total } = await fetchMercadoLivreDirectAPI(env, { query: category, sortBy: mlSort, limit: 20, mlAffiliateId })
      rawProducts.push(...products)
      listingTotal = total
      // Only mark as ok when we actually got products — a 200 with 0 results
      // should still trigger the SerpAPI fallback below
      mlDirectOk = products.length > 0
      if (!mlDirectOk) console.warn(`[mining] ML Direct returned 0 results for "${category}", falling back to SerpAPI`)
    } catch (e) {
      console.error(`[mining] ML Direct failed (${e.message}), falling back to SerpAPI`)
    }

    // ML Direct failed OR returned 0 results → fall back to SerpAPI.
    // Pass 1: ML-only filter (preferred — affiliate links available).
    // Pass 2: if ML filter yields 0, retry with siteFilter='all' so niche products
    //         that aren't indexed under a ML URL on Google Shopping still surface.
    if (!mlDirectOk) {
      try {
        let items = await fetchSerpApi(env, {
          category, engine: 'google_shopping',
          mlAffiliateId, amazonTag,
          siteRestrict: '', siteFilter: 'mercadolivre', limit: 20,
        })
        console.log(`[ML-serp] SerpAPI ML-only returned ${items.length} items`)

        if (items.length === 0) {
          // Niche product not indexed under ML on Google Shopping — widen to all stores
          items = await fetchSerpApi(env, {
            category, engine: 'google_shopping',
            mlAffiliateId, amazonTag,
            siteRestrict: '', siteFilter: 'all', limit: 20,
          })
          console.log(`[ML-serp] SerpAPI all-stores fallback returned ${items.length} items`)
        }

        rawProducts.push(...items)
      } catch (e2) {
        errors.push(`MercadoLivre: ${e2.message}`)
      }
    }
  }

  if (marketplace === 'google_shopping' || marketplace === 'both') {
    try {
      const items = await fetchSerpApi(env, { category, engine: 'google_shopping', mlAffiliateId, amazonTag, siteFilter })
      rawProducts.push(...items)
    } catch (e) { errors.push(`Google Shopping: ${e.message || e.toString()}`) }
  }

  if (marketplace === 'amazon' || marketplace === 'both') {
    try {
      const items = await fetchSerpApi(env, { category, engine: 'amazon', amazonTag, mlAffiliateId })
      rawProducts.push(...items)
    } catch (e) { errors.push(`Amazon: ${e.message}`) }
  }

  if (rawProducts.length === 0) {
    await db.from('mining_sessions').update({ status: 'failed', completedAt: new Date().toISOString() }).eq('id', sessionId)
    const msg = errors.length
      ? errors.join(' | ')
      : `Nenhum produto encontrado para "${category}". Tente filtro "all" ou outra categoria.`
    throw new Error(msg)
  }

  // ── Phase 1: initial platform score ─────────────────────────────────────────
  const phase1 = rawProducts.map(p => ({
    ...p,
    score: p.sourceApi === 'ml_direct' ? scoreMLProduct(p) : scoreProduct(p),
  }))

  // ── Phase 2: fetch blog reviews for top 10 (parallel, concurrency ≤ 5) ─────
  const top10 = [...phase1].sort((a, b) => b.score - a.score).slice(0, 10)
  const blogById = {}

  // Batch into groups of 5 to avoid hammering SerpAPI
  for (let i = 0; i < top10.length; i += 5) {
    const batch = top10.slice(i, i + 5)
    await Promise.allSettled(batch.map(async (p) => {
      const reviews = await fetchBlogReviews(env, p.title)
      blogById[p.id] = reviews
    }))
  }

  // ── Phase 3: rescore with blog bonus + assemble final products ───────────────
  const finalScored = phase1.map(p => {
    const blogReviews    = blogById[p.id] ?? []
    const baseScore      = p.score
    const blogReviewScore = scoreBlogReviews(blogReviews)
    return { ...p, blogReviews, blogReviewScore, score: baseScore + blogReviewScore }
  })

  // Shorten affiliate links
  const { shortenUrl } = await import('./shortLinkService.js')
  const withShortLinks = await Promise.all(finalScored.map(async (p) => {
    const shortLink = p.affiliateLink
      ? await shortenUrl(env, { url: p.affiliateLink, productId: p.id, marketplace: p.marketplace }).catch(() => p.affiliateLink)
      : p.affiliateLink
    return { ...p, affiliateLink: shortLink }
  }))

  // Strip fields that may not be in the DB schema yet ─────────────────────────
  // Tier 1: remove blog-only computed fields (blogReviews + blogReviewScore).
  // Keep everything else — those columns should exist after migration 005.
  const forDbT1 = withShortLinks.map(({ blogReviews: _br, blogReviewScore: _brs, ...rest }) => rest)

  // Tier 2: nuclear fallback — strip ALL columns added after the initial schema
  // (migration 005 and newer). Used only when the DB hasn't been migrated yet.
  const forDbT2 = withShortLinks.map((p) => {
    const {
      blogReviews: _br, blogReviewScore: _brs,
      productUrl: _pu, soldQuantity: _sq,
      listingType: _lt, sellerLevel: _sl,
      fulfillment: _f, officialStore: _os,
      catalogListing: _cl, discountPct: _dp,
      originalPrice: _op,
      condition: _cond,             // added in migration 005
      freeShipping: _fs,            // added in migration 006
      mlAffiliateLink: _mlAff,      // added in migration 005
      amazonAffiliateLink: _amzAff, // added in migration 005
      ...rest
    } = p
    return rest
  })

  // Helper: is this a schema/column error from Supabase/Postgres?
  const isSchemaErr = (e) =>
    e?.message && (
      e.message.includes('column') ||
      e.message.includes('Could not find') ||
      e.message.includes('blogReview') ||
      e.message.includes('does not exist')
    )

  // Inject tenant_id into every product row (required NOT NULL after migration 002)
  const addTenant = (rows) => rows.map(r => ({ ...r, tenant_id: ROOT_TENANT_ID }))

  // Attempt 1: full insert with all fields
  let saved, pErr
  ;({ data: saved, error: pErr } = await db.from('products').insert(addTenant(withShortLinks)).select())

  // Attempt 2: strip blog fields
  if (isSchemaErr(pErr)) {
    ;({ data: saved, error: pErr } = await db.from('products').insert(addTenant(forDbT1)).select())
  }

  // Attempt 3: strip all potentially new columns
  if (isSchemaErr(pErr)) {
    ;({ data: saved, error: pErr } = await db.from('products').insert(addTenant(forDbT2)).select())
  }

  // Re-attach any stripped fields from memory so the session response stays complete
  if (saved) {
    saved = saved.map((row) => {
      const orig = withShortLinks.find((p) => p.id === row.id)
      // Spread orig first (all computed fields), then row on top (DB-authoritative values win)
      return orig ? { ...orig, ...row } : row
    })
  }

  if (pErr) throw new Error(pErr.message)

  const entries = saved.map((p) => ({
    id: uid(), productId: p.id, market: marketplace,
    freshnessScore: 1.0, provenance: `session-${sessionId}`,
    tenant_id: ROOT_TENANT_ID,
  }))
  const { error: eErr } = await db.from('catalog_entries').insert(entries)
  if (eErr) throw new Error(eErr.message)

  // Compute competition level label for the session
  const competitionLevel = listingTotal === 0 ? null
    : listingTotal < 300  ? 'low'
    : listingTotal < 2000 ? 'medium'
    : 'high'

  await db.from('mining_sessions').update({
    status: 'completed', productCount: saved.length, completedAt: new Date().toISOString(),
    ...(listingTotal > 0 ? { listingTotal, competitionLevel } : {}),
  }).eq('id', sessionId)

  return {
    status: 'completed', sessionId, count: saved.length,
    listingTotal, competitionLevel,
    warnings: errors.length > 0 ? errors : undefined,
  }
}

export async function getCatalog(env, { sessionId } = {}) {
  const db = getDb(env)
  if (sessionId) {
    const { data: entries } = await db.from('catalog_entries').select('productId').eq('provenance', `session-${sessionId}`)
    const ids = (entries ?? []).map(e => e.productId)
    if (ids.length === 0) return []
    const { data } = await db.from('products').select('*').in('id', ids).order('score', { ascending: false })
    return data ?? []
  }
  const { data } = await db.from('products').select('*').order('score', { ascending: false }).limit(200)
  return data ?? []
}

export async function getCatalogStats(env) {
  const db = getDb(env)
  const { data: products } = await db.from('products').select('score, price, reviews, marketplace, sourceApi')
  if (!products?.length) return { total: 0, avgPrice: 0, bestScore: 0, totalSold: 0, byMarketplace: {} }

  const total    = products.length
  const avgPrice = Math.round(products.filter(p => p.price > 0).reduce((s, p) => s + p.price, 0) / total)
  const bestScore = Math.max(...products.map(p => p.score ?? 0))
  // Use soldQuantity (set for ml_direct products) or fall back to reviews for older rows
  const totalSold = products.reduce((s, p) => s + (p.soldQuantity ?? (p.sourceApi === 'ml_direct' ? (p.reviews ?? 0) : 0)), 0)
  const byMarketplace = products.reduce((acc, p) => {
    acc[p.marketplace] = (acc[p.marketplace] ?? 0) + 1
    return acc
  }, {})
  return { total, avgPrice, bestScore, totalSold, byMarketplace }
}

export async function getSessions(env) {
  const db = getDb(env)
  const { data, error } = await db.from('mining_sessions').select('*').order('createdAt', { ascending: false }).limit(20)
  if (error) throw new Error(error.message)
  return data
}
