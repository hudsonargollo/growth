import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'
import { searchAmazonCreators } from './amazonCreatorsService.js'

// ── Markets ───────────────────────────────────────────────────────────────────
// Per-country SerpAPI locale params, Amazon storefront domain, and currency.
const MARKETS = {
  br: { code: 'br', label: 'Brasil',         gl: 'br', hl: 'pt', amazonDomain: 'amazon.com.br', currency: 'BRL', mlSite: 'MLB' },
  mx: { code: 'mx', label: 'México',         gl: 'mx', hl: 'es', amazonDomain: 'amazon.com.mx', currency: 'MXN', mlSite: 'MLM' },
  es: { code: 'es', label: 'Espanha',        gl: 'es', hl: 'es', amazonDomain: 'amazon.es',     currency: 'EUR' },
  us: { code: 'us', label: 'Estados Unidos', gl: 'us', hl: 'en', amazonDomain: 'amazon.com',    currency: 'USD' },
  ca: { code: 'ca', label: 'Canadá',         gl: 'ca', hl: 'en', amazonDomain: 'amazon.ca',     currency: 'CAD' },
}

// ── Region groups (by language) ───────────────────────────────────────────────
// The mining UI offers one option PER LANGUAGE. Each group mines every one of its
// countries' Amazon stores and combines the results (each product keeps its own
// currency). Brasil uses Mercado Livre MLB; México uses Mercado Livre MLM.
//   - Português (pt): Brasil — Mercado Livre MLB + Amazon BR
//   - Español (es):   México + Espanha — Mercado Livre MLM + Amazon MX/ES
//   - English (en):   EUA + Canadá — Amazon only
export const REGIONS = {
  pt: { code: 'pt', label: 'Português', flag: '🇧🇷', sublabel: 'Brasil',          lang: 'pt', hasML: true, markets: ['br'] },
  es: { code: 'es', label: 'Español',   flag: '🌎', sublabel: 'España & México', lang: 'es', hasML: true, markets: ['mx', 'es'] },
  en: { code: 'en', label: 'English',   flag: '🌎', sublabel: 'US & Canada',     lang: 'en', hasML: false, markets: ['us', 'ca'] },
}

// Resolve a group from a group code (pt/es/en) OR a legacy country code (br/mx/…).
export function getRegion(code) {
  if (REGIONS[code]) return REGIONS[code]
  for (const g of Object.values(REGIONS)) if (g.markets.includes(code)) return g
  return REGIONS.pt
}

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
  // sold_quantity: up to 40 pts (1000 sold = max)
  const soldScore = Math.min((p.soldQuantity ?? 0) / 1000, 1) * 40

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

  // real product reviews: up to 12 pts — a high buyer rating backed by review volume
  const reviewScore = (p.reviewCount ?? 0) > 0
    ? Math.min((p.rating ?? 0) / 5, 1) * 8 + Math.min((p.reviewCount ?? 0) / 500, 1) * 4
    : 0

  return Math.round(soldScore + listingScore + sellerScore + shippingScore + discountScore + officialScore + reviewScore)
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
// Returns up to 5 review snippets from editorial/blog sources (not marketplace pages).
// Accepts a pre-resolved serpKey so the caller can resolve it once for all products.
async function fetchBlogReviews(env, productTitle, serpKey) {
  try {
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

// ── Google review-image fetcher ───────────────────────────────────────────────
// Pulls product-evaluation images/graphics (review photos, rating graphics) from
// Google Images so the video generator can use them as reference / B-roll assets.
// Returns up to 6 image objects: { url, thumb, title, source, width, height }.
async function fetchReviewImages(env, productTitle, serpKey) {
  try {
    if (!serpKey) return []
    const cleanTitle = productTitle.slice(0, 60).replace(/[()[\]]/g, '').trim()
    const params = new URLSearchParams({
      engine: 'google_images', api_key: serpKey,
      // Market-neutral query — visuals are language-agnostic; "review" surfaces
      // evaluation shots and rating graphics over plain catalog renders.
      q: `${cleanTitle} review`,
      num: '10',
    })
    const res = await fetch(`https://serpapi.com/search?${params}`)
    if (!res.ok) return []
    const json    = await res.json()
    const results = json.images_results ?? []
    return results
      .filter(r => r.original && /^https?:\/\//.test(r.original))
      .slice(0, 6)
      .map(r => {
        let source = r.source ?? ''
        try { if (r.link) source = new URL(r.link).hostname.replace('www.', '') } catch {}
        return {
          url:    r.original,
          thumb:  r.thumbnail ?? r.original,
          title:  r.title ?? '',
          source,
          width:  r.original_width  ?? null,
          height: r.original_height ?? null,
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

// ── ML product reviews — real buyer rating + review count ─────────────────────
// GET /reviews/item/{itemId} → { rating_average, paging.total, ... }. Replaces the
// seller-reputation proxy with the product's actual buyer rating. Tolerant by
// design: any non-OK / empty / error response returns null so callers fall back.
async function fetchMLReviews(env, itemId, catalogProductId = '', token = null) {
  if (!itemId) return null
  try {
    const qs = new URLSearchParams({ limit: '1' })
    if (catalogProductId) qs.set('catalog_product_id', catalogProductId)
    const headers = { 'User-Agent': 'FabricaDeConteudo/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const res = await mlFetch(env, `/reviews/item/${encodeURIComponent(itemId)}?${qs}`, { headers })
    if (!res.ok) return null
    const json  = await res.json()
    const avg   = Number(json.rating_average ?? 0)
    const count = Number(json.paging?.total ?? json.reviews?.length ?? 0)
    if (!avg && !count) return null
    return { ratingAverage: Math.round(avg * 10) / 10, reviewCount: count }
  } catch {
    return null
  }
}

// Decrypt the connected ML user OAuth access token from KV (null if not connected).
// /reviews/item generally needs a user-level token, not the app client_credentials one.
async function getMLUserToken(env) {
  if (!env.KV1 || !env.CREDENTIALS_SECRET) return null
  try {
    const { decrypt } = await import('../lib/crypto.js')
    const stored = await env.KV1.get('apikey:ML_USER_ACCESS_TOKEN', { type: 'json' }).catch(() => null)
    if (!stored?.ciphertext) return null
    return await decrypt(stored.ciphertext, stored.iv, env.CREDENTIALS_SECRET).catch(() => null)
  } catch {
    return null
  }
}

// Refresh the ML user access token using the stored refresh_token (ML rotates the
// refresh token on each use, so we persist BOTH new tokens). Returns the fresh
// access token, or null if no refresh token is stored / the refresh is rejected
// (in which case the user must reconnect ML in Settings).
export async function refreshMLUserToken(env) {
  if (!env.KV1 || !env.CREDENTIALS_SECRET) return null
  try {
    const { decrypt, encrypt } = await import('../lib/crypto.js')
    const { resolveKey }        = await import('../lib/resolveKey.js')
    const stored = await env.KV1.get('apikey:ML_USER_REFRESH_TOKEN', { type: 'json' }).catch(() => null)
    if (!stored?.ciphertext) { console.warn('[ML] no refresh token stored — reconnect ML in Settings'); return null }
    const refreshToken = await decrypt(stored.ciphertext, stored.iv, env.CREDENTIALS_SECRET).catch(() => null)
    if (!refreshToken) return null

    const [appId, clientSecret] = await Promise.all([
      resolveKey(env, 'ML_APP_ID'),
      resolveKey(env, 'ML_CLIENT_SECRET'),
    ])
    if (!appId || !clientSecret) return null

    const res = await mlFetch(env, '/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body:    new URLSearchParams({ grant_type: 'refresh_token', client_id: appId, client_secret: clientSecret, refresh_token: refreshToken }),
    })
    if (!res.ok) {
      console.warn(`[ML] refresh failed ${res.status}: ${(await res.text()).slice(0, 150)}`)
      return null
    }
    const json = await res.json()
    if (!json.access_token) return null

    const now = new Date().toISOString()
    const a = await encrypt(json.access_token, env.CREDENTIALS_SECRET)
    await env.KV1.put('apikey:ML_USER_ACCESS_TOKEN', JSON.stringify({ ciphertext: a.ciphertext, iv: a.iv, updated_at: now }))
    if (json.refresh_token) {
      const r = await encrypt(json.refresh_token, env.CREDENTIALS_SECRET)
      await env.KV1.put('apikey:ML_USER_REFRESH_TOKEN', JSON.stringify({ ciphertext: r.ciphertext, iv: r.iv, updated_at: now }))
    }
    console.log('[ML] user token refreshed OK')
    return json.access_token
  } catch (e) {
    console.warn(`[ML] refresh error: ${e.message}`)
    return null
  }
}

// ── MercadoLivre Direct API ───────────────────────────────────────────────────
// `site` is the ML site code: 'MLB' = Brasil, 'MLM' = México. Defaults to 'MLB'.
async function fetchMercadoLivreDirectAPI(env, { query, sortBy = 'sold_quantity_desc', limit = 20, mlAffiliateId = '', site = 'MLB' }) {
  const { token, error: tokenError } = await getMLToken(env)
  console.log(`[ML] token=${token ? 'ok' : 'null'} tokenError=${tokenError ?? 'none'}`)

  // Reviews generally require a user-level OAuth token — prefer the connected one,
  // fall back to the app token (which usually 403s for /reviews → graceful null).
  const userToken   = await getMLUserToken(env)
  const reviewToken = userToken ?? token
  console.log(`[ML] reviewToken=${userToken ? 'user' : (token ? 'app' : 'none')}`)

  const makeParams = (sort) => new URLSearchParams({ q: query, sort, limit: String(limit) })

  // Always include a User-Agent so ML doesn't silently block the request
  const baseHeaders = { 'User-Agent': 'FabricaDeConteudo/1.0' }
  // ML's app (client_credentials) token gets 403 on /sites/{site}/search — that
  // endpoint is restricted. A connected USER token with read scope may still be
  // permitted, so prefer it for the search request and fall back to the app token.
  let usingUser    = !!userToken
  let activeToken  = userToken ?? token
  console.log(`[ML] searchToken=${usingUser ? 'user' : (token ? 'app' : 'none')}`)
  const authHeaders = (tok) => (tok ? { ...baseHeaders, Authorization: `Bearer ${tok}` } : baseHeaders)
  const doSearch    = (sort, tok) => mlFetch(env, `/sites/${site}/search?${makeParams(sort)}`, { headers: authHeaders(tok) })

  // 1. Preferred sort with the best available token (user > app)
  let res = await doSearch(sortBy, activeToken)
  console.log(`[ML] attempt1 token=${usingUser ? 'user' : 'app'} sort=${sortBy} status=${res.status}`)

  // 1b. User token expired (401) → refresh once and retry with the fresh token.
  if (res.status === 401 && usingUser) {
    const fresh = await refreshMLUserToken(env)
    if (fresh) {
      activeToken = fresh
      res = await doSearch(sortBy, fresh)
      console.log(`[ML] attempt1b refreshed-user sort=${sortBy} status=${res.status}`)
    } else {
      // Refresh unavailable → fall back to the app token
      usingUser = false; activeToken = token
      res = await doSearch(sortBy, token)
      console.log(`[ML] attempt1c app sort=${sortBy} status=${res.status}`)
    }
  }

  // 2. sold_quantity_desc needs higher scope → fall back to relevance, keep token
  if (res.status === 403 && sortBy !== 'relevance') {
    res = await doSearch('relevance', activeToken)
    console.log(`[ML] attempt2 sort=relevance status=${res.status}`)
  }

  // 3. Token itself rejected → try relevance without auth (public endpoint)
  if (res.status === 403 || res.status === 401) {
    res = await doSearch('relevance', null)
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

  const products = await Promise.all(results.map(async (item, idx) => {
    const permalink    = item.permalink ?? ''
    const affiliateLink = buildMercadoLibreAffiliateLink(permalink, mlAffiliateId)
    const soldQty      = item.sold_quantity ?? 0
    const discount     = (item.original_price && item.original_price > item.price)
      ? Math.round((1 - item.price / item.original_price) * 100) : 0

    // Seller-reputation positive % → 0–5 proxy, used only when a product has no real reviews.
    const sellerRepRating = item.seller?.seller_reputation?.transactions?.ratings?.positive
      ? Math.round(item.seller.seller_reputation.transactions.ratings.positive * 5 * 10) / 10
      : 0
    // Real buyer rating + review count. Capped to the first 20 items to respect
    // Cloudflare's per-request subrequest budget; null on 403/empty/error → fall back.
    const rev = idx < 20 ? await fetchMLReviews(env, item.id, item.catalog_product_id ?? '', reviewToken) : null

    return {
      id:              uid(),
      marketplace:     'mercadolivre',
      title:           item.title ?? '',
      price:           item.price ?? 0,
      originalPrice:   item.original_price ?? null,
      discountPct:     discount,
      rating:          rev?.ratingAverage || sellerRepRating,   // prefer the real buyer rating
      reviewCount:     rev?.reviewCount ?? 0,                   // real number of product reviews
      reviews:         soldQty,           // sold_quantity stored as reviews for sorting (legacy)
      soldQuantity:    soldQty,
      listingType:     item.listing_type_id ?? '',
      sellerLevel:     item.seller?.seller_reputation?.level_id ?? '',
      condition:       item.condition ?? 'new',
      freeShipping:    item.shipping?.free_shipping ?? false,
      fulfillment:     item.shipping?.logistic_type === 'fulfillment',
      officialStore:   !!item.official_store_id,
      catalogListing:  !!item.catalog_listing,
      affiliateLink,
      mlAffiliateLink: affiliateLink,   // permalink IS the direct ML URL (affiliate tag appended if configured)
      amazonAffiliateLink: null,
      productUrl:      permalink,
      imageUrl:        item.thumbnail ?? '',
      currency:        site === 'MLM' ? 'MXN' : 'BRL',
      sourceApi:       'ml_direct',
      lastSeen:        new Date().toISOString(),
      score:           0, // will be computed after
    }
  }))
  return { products, listingTotal }
}

// ── ML Trending topics ────────────────────────────────────────────────────────
// /trends/MLB requires auth. With a valid token we get live data; without auth we return
// a curated list of evergreen BR categories so the UI always has something to show.
const STATIC_FALLBACK_TRENDS = [
  'fone de ouvido bluetooth', 'air fryer', 'tênis masculino', 'notebook', 'cadeira gamer',
  'câmera de segurança', 'kit churrasco', 'smart tv', 'whey protein', 'suporte para celular',
  'mouse gamer', 'carregador portátil', 'aspirador robô', 'fritadeira elétrica', 'relógio smartwatch',
  'estabilizador de tensão', 'cama box casal', 'kit skincare', 'console ps5', 'impressora multifuncional',
]

// Broad queries that reliably surface what's trending on Google Shopping Brazil
const SERP_TREND_SEEDS = [
  'mais vendidos eletrônicos', 'mais vendidos casa', 'mais vendidos esportes', 'mais vendidos beleza',
]

// ── Fetch trending topics via Google Shopping (SerpAPI fallback) ──────────────
async function fetchSerpTrends(env) {
  try {
    const { resolveKey } = await import('../lib/resolveKey.js')
    const serpKey = await resolveKey(env, 'SERPAPI_KEY')
    if (!serpKey) return null

    // Rotate through seed queries to get diverse results
    const seed = SERP_TREND_SEEDS[Math.floor(Math.random() * SERP_TREND_SEEDS.length)]
    const params = new URLSearchParams({
      engine:  'google_shopping',
      api_key: serpKey,
      q:       seed,
      hl:      'pt',
      gl:      'br',
      num:     '40',
    })

    const res = await fetch(`https://serpapi.com/search?${params}`)
    if (!res.ok) return null
    const data = await res.json()

    const items = (data.shopping_results ?? []).slice(0, 30)
    if (!items.length) return null

    // Extract 2-3 word product-type keywords from titles.
    // Strategy: strip numbers/symbols, take first meaningful noun phrase.
    const seen = new Set()
    const topics = []
    for (const item of items) {
      const raw = (item.title ?? '').trim()
      // Remove parenthetical specs, sizes, colours, numbers
      const cleaned = raw
        .replace(/\(.*?\)/g, '')
        .replace(/\b\d+(\.\d+)?\s*(gb|tb|mb|hz|w|v|cm|mm|polegadas?|ml|l|kg|g|k|fps)\b/gi, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()

      // Take first 2-3 words as the topic label
      const words = cleaned.split(/\s+/).filter(w => w.length > 2)
      if (words.length < 2) continue
      const topic = words.slice(0, 3).join(' ').toLowerCase()
      const key   = topic.slice(0, 20)
      if (seen.has(key)) continue
      seen.add(key)
      topics.push(topic)
      if (topics.length >= 12) break
    }

    return topics.length >= 4 ? topics : null
  } catch {
    return null
  }
}

export async function fetchMLTrends(env) {
  // 1️⃣ Try Mercado Livre live trends (requires ML token)
  try {
    const { token } = await getMLToken(env)
    if (token) {
      const res = await mlFetch(env, '/trends/MLB', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const trends = await res.json()
        const live = (trends ?? []).slice(0, 20).map(t => t.keyword ?? t).filter(Boolean)
        if (live.length > 0) return live.map(k => ({ keyword: k }))
      }
    }
  } catch { /* fall through */ }

  // 2️⃣ Fallback: Google Shopping via SerpAPI
  const serpTrends = await fetchSerpTrends(env)
  if (serpTrends) return serpTrends.map(k => ({ keyword: k }))

  // 3️⃣ Last resort: static curated list
  return STATIC_FALLBACK_TRENDS.map(k => ({ keyword: k }))
}

// ── SerpAPI — Google Shopping ─────────────────────────────────────────────────
// serpKey can be pre-resolved by the caller to avoid redundant Supabase fetches.
async function fetchSerpApi(env, { category, engine = 'google_shopping', limit = 20, amazonTag = '', mlAffiliateId = '', siteFilter = 'all', siteRestrict = '', serpKey: preResolvedKey, region = MARKETS.br } = {}) {
  let serpKey = preResolvedKey
  if (!serpKey) {
    const { resolveKey } = await import('../lib/resolveKey.js')
    serpKey = await resolveKey(env, 'SERPAPI_KEY')
  }
  if (!serpKey) throw new Error('SERPAPI_KEY não configurada — adicione em Configurações')

  // Always fetch 100 results from Google Shopping so post-filtering (ML/Amazon only)
  // has enough raw results. SerpAPI paginates at 100 max; for direct site-restricted
  // queries the results are already scoped, so we cap at limit there.
  const fetchLimit = siteRestrict ? limit : 100
  const params = new URLSearchParams({ engine, api_key: serpKey, hl: region.hl, gl: region.gl, num: String(fetchLimit) })

  if (engine === 'amazon') {
    params.set('k', category)
    params.set('amazon_domain', region.amazonDomain)
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
      // product_link is the actual merchant URL; link is typically a Google Shopping redirect
      const productLink = item.product_link ?? ''
      const googleLink  = item.link ?? ''
      // Use the actual merchant URL when available; fall back to Google Shopping redirect
      const rawLink = productLink || googleLink

      const mlItem  = isML(item)
      const amzItem = isAmazon(item)
      const mp      = mlItem ? 'mercadolivre' : amzItem ? 'amazon' : (item.source ?? 'other').toLowerCase().replace(/\s+/g, '_').slice(0, 40)

      // Only set affiliate links when we have a REAL ML/Amazon URL (not a Google Shopping redirect)
      const isRealMLUrl  = rawLink.includes('mercadolivre') || rawLink.includes('mercadolibre')
      const isRealAmzUrl = rawLink.includes('amazon.com')

      const mlAffiliateLink     = (mlItem  && isRealMLUrl)  ? buildMercadoLibreAffiliateLink(rawLink, mlAffiliateId)            : null
      const amazonAffiliateLink = (amzItem && isRealAmzUrl) ? buildAmazonAffiliateLink(rawLink, '', amazonTag, region.amazonDomain) : null
      // Best available link: proper affiliate link → raw merchant URL → Google Shopping fallback
      const affiliateLink = mlAffiliateLink ?? amazonAffiliateLink ?? rawLink

      return {
        id: uid(), marketplace: mp,
        title:      item.title ?? '',
        // Prefer extracted_price (already a float in local currency) over parsing the string
        price:      item.extracted_price ?? parsePrice(item.price),
        rating:     item.rating ?? 0,
        reviews:    item.reviews ?? 0,
        affiliateLink,
        mlAffiliateLink,
        amazonAffiliateLink,
        productUrl: isRealMLUrl || isRealAmzUrl ? rawLink : googleLink || rawLink,
        imageUrl:   item.thumbnail ?? '',
        currency: region.currency, region: region.code, sourceApi: 'serpapi_google', lastSeen: new Date().toISOString(),
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
      affiliateLink:       buildAmazonAffiliateLink(item.link ?? '', item.asin ?? '', amazonTag, region.amazonDomain),
      amazonAffiliateLink: buildAmazonAffiliateLink(item.link ?? '', item.asin ?? '', amazonTag, region.amazonDomain),
      mlAffiliateLink:     null,
      productUrl: item.link ?? (item.asin ? `https://www.${region.amazonDomain}/dp/${item.asin}` : ''),
      imageUrl:   item.thumbnail ?? '',
      currency: region.currency, region: region.code, sourceApi: 'serpapi_amazon', lastSeen: new Date().toISOString(),
      freeShipping: false, condition: 'new',
    }))
  }
  return []
}

// ── Affiliate link builders ───────────────────────────────────────────────────
function buildAmazonAffiliateLink(url, asin, tag, domain = 'amazon.com.br') {
  if (!tag) return url || (asin ? `https://www.${domain}/dp/${asin}` : '')
  if (asin) return `https://www.${domain}/dp/${asin}?tag=${tag}`
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

// ── Cross-platform title matching ─────────────────────────────────────────────
// Returns a [0, 1] word-overlap score between two product titles (language-aware).
function titleWordOverlap(a, b) {
  const tokenize = s => (s ?? '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
  const ta = new Set(tokenize(a))
  const tb = new Set(tokenize(b))
  if (!ta.size || !tb.size) return 0
  const common = [...ta].filter(w => tb.has(w)).length
  return common / Math.max(ta.size, tb.size)
}

// Enrich `primary` products in-place with the affiliate link of the best-matching
// `secondary` product (min 25% word overlap). ML products get Amazon links,
// Amazon products get ML links.
function crossMatchLinks(primary, secondary) {
  for (const p of primary) {
    let bestScore = 0.25
    let best = null
    for (const s of secondary) {
      const score = titleWordOverlap(p.title, s.title)
      if (score > bestScore) { bestScore = score; best = s }
    }
    if (!best) continue
    if (p.marketplace === 'mercadolivre') {
      if (!p.amazonAffiliateLink)
        p.amazonAffiliateLink = best.amazonAffiliateLink || best.affiliateLink || null
    } else if (p.marketplace === 'amazon') {
      if (!p.mlAffiliateLink)
        p.mlAffiliateLink = best.mlAffiliateLink || best.affiliateLink || null
    }
  }
}

// Normalize an Amazon Creators API product into the standard mining product shape.
// Creators API returns real ASIN, price, image, and (when account-eligible) ratings.
function normalizeAmazonCreatorsProduct(p, { market, amazonTag }) {
  const affiliateLink = buildAmazonAffiliateLink(p.productUrl, p.asin, amazonTag, market.amazonDomain)
  return {
    id:                  uid(),
    marketplace:         'amazon',
    asin:                p.asin,
    title:               p.title,
    price:               p.price,
    originalPrice:       null,
    discountPct:         0,
    rating:              p.rating,
    reviews:             p.reviewCount,  // mirrors legacy field for sorting compat
    reviewCount:         p.reviewCount,
    soldQuantity:        0,
    listingType:         '',
    sellerLevel:         '',
    condition:           'new',
    freeShipping:        false,
    fulfillment:         false,
    officialStore:       false,
    catalogListing:      false,
    affiliateLink,
    mlAffiliateLink:     null,
    amazonAffiliateLink: affiliateLink,
    productUrl:          p.productUrl,
    imageUrl:            p.imageUrl,
    currency:            market.currency,
    region:              market.code,
    sourceApi:           'amazon_creators',
    lastSeen:            new Date().toISOString(),
    score:               0,
  }
}

async function loadAffiliateIds(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const [amazonTag, mlAffiliateTag] = await Promise.all([
    resolveKey(env, 'AMAZON_AFFILIATE_TAG'),
    resolveKey(env, 'ML_AFFILIATE_TAG'),
  ])
  return { amazonTag: amazonTag ?? '', mlAffiliateId: mlAffiliateTag ?? '' }
}

// ── Per-country query localization ────────────────────────────────────────────
// Each Amazon storefront must be queried in ITS OWN language, otherwise a PT
// keyword (e.g. "cadeira gamer") returns garbage on amazon.es / amazon.com.
// We translate the keyword once per (lang, term) and cache it for the isolate.
const _queryL10nCache = new Map()  // `${lang}:${term}` → translated term

async function localizeQuery(env, term, lang) {
  const target = (lang || 'pt').slice(0, 2)
  // pt is the source UI language — no translation needed.
  if (target === 'pt' || !term || !term.trim()) return term
  const cacheKey = `${target}:${term.toLowerCase().trim()}`
  if (_queryL10nCache.has(cacheKey)) return _queryL10nCache.get(cacheKey)
  try {
    const { callLLM } = await import('../lib/llm.js')
    const langName = target === 'es' ? 'Spanish' : target === 'en' ? 'English' : target
    const out = await callLLM(env, {
      system: `You translate e-commerce product search keywords. Reply with ONLY the translated search term in ${langName} — no quotes, no explanation, just the concise product noun phrase a shopper would type into Amazon.`,
      prompt: term,
      maxTokens: 30,
    })
    const cleaned = (out || '').trim().split('\n')[0].replace(/^["']|["']$/g, '').slice(0, 80) || term
    _queryL10nCache.set(cacheKey, cleaned)
    return cleaned
  } catch {
    return term  // never break mining on a translation hiccup
  }
}

// ── High-hype quality gate ────────────────────────────────────────────────────
// Keep products with real traction (review volume or a strong rating) so the
// catalog focuses on popular items. Guarded so it never starves a market: if too
// few products clear the bar, return the original set unchanged.
function filterHighHype(products, { minReviews = 50, minRating = 4.3 } = {}) {
  if (!Array.isArray(products) || products.length <= 3) return products || []
  const strong = products.filter(
    p => (p.reviews ?? p.reviewCount ?? 0) >= minReviews || (p.rating ?? 0) >= minRating
  )
  return strong.length >= 3 ? strong : products
}

// Root tenant UUID — pinned in migration 002
const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// ── Main session runner ───────────────────────────────────────────────────────
export async function runMiningSession(env, { marketplace, category, siteFilter = 'all', sortBy = 'relevance', region = 'pt' }) {
  const db        = getDb(env)
  const sessionId = uid()
  const group     = getRegion(region)                 // language group (pt/es/en)
  const reg       = MARKETS[group.markets[0]]          // primary market (metadata)

  // ── Region gating ───────────────────────────────────────────────────────────
  // Groups without Mercado Livre (Español, English) are Amazon-only.
  // Force any ML/Google/both selection down to the Amazon engine so we get clean
  // ASIN-based affiliate links for the correct storefront(s).
  if (!group.hasML) {
    marketplace = 'amazon'
    siteFilter  = 'amazon'
  }

  // ── Resolve all keys upfront so every branch can reuse them ─────────────────
  const { resolveKey } = await import('../lib/resolveKey.js')
  const serpApiKey = await resolveKey(env, 'SERPAPI_KEY')

  const { amazonTag, mlAffiliateId } = await loadAffiliateIds(env)

  // ── Auto-downgrade marketplace when credentials are missing ──────────────────
  // Mirrors the same tiered fallback pattern used in fetchMLTrends:
  //   1. ML direct (best data)  →  requires ML token
  //   2. google_shopping (SERP) →  requires SERPAPI_KEY
  //   3. If NEITHER is available, surface a clear error with guidance
  const needsML   = marketplace === 'mercadolivre_direct'
  const needsSerp = marketplace === 'google_shopping' || marketplace === 'amazon' || marketplace === 'both'

  if (needsML) {
    // Check if an ML token is actually obtainable
    let mlAvailable = false
    try {
      const { token } = await getMLToken(env)
      mlAvailable = !!token
    } catch { /* treat as unavailable */ }

    if (!mlAvailable) {
      // No ML credentials → silently fall back to Google Shopping via SerpAPI
      console.warn(`[mining] ML credentials unavailable for "${category}" — falling back to google_shopping`)
      marketplace = 'google_shopping'
    }
  }

  if ((marketplace === 'google_shopping' || marketplace === 'amazon' || marketplace === 'both') && !serpApiKey) {
    // Neither ML nor SerpAPI — surface a clear actionable error
    throw new Error(
      'Nenhuma chave de API configurada. Adicione SERPAPI_KEY em Configurações → API Keys para ativar a mineração.'
    )
  }

  // Auto-name: "Keyword · DD/MM/YYYY" — user can rename later
  const now        = new Date()
  const dateLabel  = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const capCategory = category.charAt(0).toUpperCase() + category.slice(1)
  const autoName    = `${capCategory} · ${dateLabel}`

  // Insert session — try with all new columns first, fallback for older schemas
  const sessionRow = { id: sessionId, marketplace, category, name: autoName, keyword: category, status: 'in_progress', tenant_id: ROOT_TENANT_ID, createdAt: now.toISOString(), region: group.code, language: group.lang, currency: reg.currency }
  let { error: sErr } = await db.from('mining_sessions').insert(sessionRow)
  if (sErr) {
    // Strip columns that may not exist yet
    const { tenant_id: _t, name: _n, keyword: _k, createdAt: _c, region: _r, language: _l, currency: _cur, ...coreSession } = sessionRow
    ;({ error: sErr } = await db.from('mining_sessions').insert(coreSession))
  }
  if (sErr) throw new Error(`Erro ao criar sessão: ${sErr.message}`)

  // ── Cross-platform enrichment (ML ↔ Amazon dual-link) ───────────────────────
  // Pre-start the cross-marketplace search concurrently with the main fetch below.
  // Awaited after rawProducts is collected, then used to stamp each product with a
  // link to the same product on the OTHER marketplace.
  // Only fires when mining a single marketplace in a region that has both ML + Amazon.
  //
  // Determine which market in this region has an ML site (br→MLB, mx→MLM).
  const mlMarket          = group.markets.find(m => MARKETS[m]?.mlSite)  // 'br' or 'mx'
  const mlSiteForCross    = mlMarket ? MARKETS[mlMarket].mlSite : 'MLB'   // 'MLB' or 'MLM'
  const amazonRegionForCross = mlMarket ?? group.markets[0]               // 'br' or 'mx'

  const brCrossP =
    group.hasML && marketplace === 'mercadolivre_direct'
      ? searchAmazonCreators(env, { query: category, region: amazonRegionForCross, limit: 10 })
          .catch(() => ({ products: [], error: 'cross_failed' }))
      : group.hasML && marketplace === 'amazon'
        ? fetchMercadoLivreDirectAPI(env, { query: category, site: mlSiteForCross, sortBy: 'relevance', limit: 8, mlAffiliateId })
            .then(r => ({ products: r.products })).catch(() => ({ products: [] }))
        : null

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
      const { products, listingTotal: total } = await fetchMercadoLivreDirectAPI(env, { query: category, sortBy: mlSort, limit: 20, mlAffiliateId, site: mlSiteForCross })
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
        // Resolve SERPAPI_KEY once for all SerpAPI fallback calls
        const fallbackSerpKey = serpApiKey  // already resolved at function start

        let items = await fetchSerpApi(env, {
          category, engine: 'google_shopping',
          mlAffiliateId, amazonTag,
          siteRestrict: '', siteFilter: 'mercadolivre', limit: 20,
          serpKey: fallbackSerpKey, region: reg,
        })
        console.log(`[ML-serp] SerpAPI ML-only returned ${items.length} items`)

        if (items.length === 0) {
          items = await fetchSerpApi(env, {
            category, engine: 'google_shopping',
            mlAffiliateId, amazonTag,
            siteRestrict: '', siteFilter: 'all', limit: 20,
            serpKey: fallbackSerpKey, region: reg,
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
      const items = await fetchSerpApi(env, { category, engine: 'google_shopping', mlAffiliateId, amazonTag, siteFilter, serpKey: serpApiKey, region: reg })
      rawProducts.push(...items)
    } catch (e) { errors.push(`Google Shopping: ${e.message || e.toString()}`) }
  }

  if (marketplace === 'amazon' || marketplace === 'both') {
    // Mine every country in the language group (e.g. México + Espanha) and combine.
    // Each product keeps its own currency. Split the limit across markets.
    // Primary: Amazon Creators API (real ASINs, prices, images, no SerpAPI quota used).
    // Fallback: SerpAPI Amazon engine (when Creators API not configured or returns nothing).
    const markets   = group.markets.map(m => MARKETS[m])
    const perMarket = 10

    // Query each storefront in its own language (e.g. "cadeira gamer" → "silla gamer"
    // for amazon.es/.com.mx, "gaming chair" for amazon.com/.ca).
    const amazonQuery = await localizeQuery(env, category, group.lang)
    if (amazonQuery !== category) {
      console.log(`[amazon] localized query "${category}" → "${amazonQuery}" (${group.lang})`)
    }

    for (const mkt of markets) {
      try {
        // Pull up to 2 pages per market for a deeper candidate pool, deduped by ASIN.
        const seenAsins = new Set()
        let creatorItems = []
        let creatorsErr  = null
        for (let page = 1; page <= 2; page++) {
          const { products, error } = await searchAmazonCreators(env, {
            query: amazonQuery, region: mkt.code, limit: perMarket, itemPage: page,
          })
          if (error) { if (page === 1) creatorsErr = error; break }
          const fresh = products.filter(p => p.asin && !seenAsins.has(p.asin))
          fresh.forEach(p => seenAsins.add(p.asin))
          creatorItems.push(...fresh)
          if (products.length < perMarket) break  // last page reached
        }

        if (!creatorsErr && creatorItems.length > 0) {
          const normalized = creatorItems.map(p => normalizeAmazonCreatorsProduct(p, { market: mkt, amazonTag }))
          const highHype   = filterHighHype(normalized)
          rawProducts.push(...highHype)
          console.log(`[amazon-creators] ${mkt.code}: ${normalized.length} fetched → ${highHype.length} high-hype`)
        } else {
          // Creators API unavailable or returned nothing → fall back to SerpAPI
          console.log(`[amazon-creators] ${mkt.code}: ${creatorsErr || 'no results'} — falling back to SerpAPI`)
          const items     = await fetchSerpApi(env, { category: amazonQuery, engine: 'amazon', amazonTag, mlAffiliateId, serpKey: serpApiKey, region: mkt, limit: perMarket })
          rawProducts.push(...filterHighHype(items))
        }
      } catch (e) { errors.push(`Amazon ${mkt.label}: ${e.message}`) }
    }
  }

  // ── Apply cross-platform link enrichment ─────────────────────────────────────
  if (brCrossP) {
    try {
      const { products: crossProds } = await brCrossP
      if (crossProds?.length > 0) {
        if (marketplace === 'mercadolivre_direct') {
          const crossMarket = MARKETS[amazonRegionForCross] ?? MARKETS.br
          const norm = crossProds.map(p =>
            p.sourceApi === 'amazon_creators'
              ? normalizeAmazonCreatorsProduct(p, { market: crossMarket, amazonTag })
              : p
          )
          crossMatchLinks(rawProducts.filter(p => p.marketplace === 'mercadolivre'), norm)
          console.log(`[cross-match] ML→Amazon (${crossMarket.code}): ${rawProducts.filter(p => p.amazonAffiliateLink).length} enriched`)
        } else if (marketplace === 'amazon') {
          crossMatchLinks(rawProducts.filter(p => p.marketplace === 'amazon'), crossProds)
          console.log(`[cross-match] Amazon→ML: ${rawProducts.filter(p => p.mlAffiliateLink).length} enriched`)
        }
      }
    } catch { /* non-critical — products still saved without cross-links */ }
  } else if (group.hasML && marketplace === 'both') {
    // Both already in rawProducts — just cross-match what we have
    const mlItems  = rawProducts.filter(p => p.marketplace === 'mercadolivre')
    const amzItems = rawProducts.filter(p => p.marketplace === 'amazon')
    if (mlItems.length > 0 && amzItems.length > 0) {
      crossMatchLinks(mlItems, amzItems)
      crossMatchLinks(amzItems, mlItems)
    }
  }

  // ── Resilience fallback ──────────────────────────────────────────────────────
  // If every primary source came up empty (e.g. SerpAPI out of credits AND the ML
  // token expired), try Amazon Creators for this region's markets. Creators needs
  // neither SerpAPI nor ML, so it keeps mining alive instead of dead-ending.
  if (rawProducts.length === 0 && marketplace !== 'amazon' && marketplace !== 'both') {
    console.warn('[mining] primary source empty — falling back to Amazon Creators')
    const fbQuery = await localizeQuery(env, category, group.lang)
    for (const mkt of group.markets.map(m => MARKETS[m])) {
      try {
        const { products: items, error: aErr } = await searchAmazonCreators(env, { query: fbQuery, region: mkt.code, limit: 10 })
        if (!aErr && items.length > 0) {
          rawProducts.push(...items.map(p => normalizeAmazonCreatorsProduct(p, { market: mkt, amazonTag })))
          console.log(`[mining-fallback] amazon ${mkt.code}: ${items.length} products`)
        }
      } catch (e) { errors.push(`Amazon fallback ${mkt.label}: ${e.message}`) }
    }
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

  // ── Phase 2: fetch blog reviews for top 5 (parallel) ────────────────────────
  // serpApiKey already resolved at function start — reused here.
  // Cap at 5 products to stay well under the 50 subrequest-per-invocation limit.

  const top5 = [...phase1].sort((a, b) => b.score - a.score).slice(0, 5)
  const blogById  = {}
  const imagesById = {}

  // Google review-image enrichment is OPT-IN: it costs one extra SerpAPI search
  // per product (5/run), which burns the SerpAPI quota faster. Enable explicitly
  // with MINING_REVIEW_IMAGES=true once the SerpAPI plan has headroom.
  const wantReviewImages = ['true', '1', 'on'].includes(String(env.MINING_REVIEW_IMAGES ?? '').toLowerCase())

  await Promise.allSettled(top5.map(async (p) => {
    // Blog review snippets (pre-existing) + optional Google review images.
    const [reviews, images] = await Promise.all([
      fetchBlogReviews(env, p.title, serpApiKey),
      wantReviewImages ? fetchReviewImages(env, p.title, serpApiKey) : Promise.resolve([]),
    ])
    blogById[p.id]   = reviews
    imagesById[p.id] = images
  }))

  // ── Phase 3: rescore with blog bonus + assemble final products ───────────────
  const finalScored = phase1.map(p => {
    const blogReviews    = blogById[p.id] ?? []
    const reviewImages   = imagesById[p.id] ?? []
    const baseScore      = p.score
    const blogReviewScore = scoreBlogReviews(blogReviews)
    return { ...p, blogReviews, reviewImages, blogReviewScore, score: baseScore + blogReviewScore }
  })

  // Use raw affiliate links directly — shortening each link costs one Supabase write
  // per product and would push the total subrequest count over Cloudflare's 50 limit.
  const withShortLinks = finalScored

  // Strip fields that may not be in the DB schema yet ─────────────────────────
  // Tier 1: remove blog-only computed fields (blogReviews + blogReviewScore).
  // Keep everything else — those columns should exist after migration 005.
  const forDbT1 = withShortLinks.map(({ blogReviews: _br, blogReviewScore: _brs, reviewImages: _ri, ...rest }) => rest)

  // Tier 2: nuclear fallback — strip ALL columns added after the initial schema
  // (migration 005 and newer). Used only when the DB hasn't been migrated yet.
  const forDbT2 = withShortLinks.map((p) => {
    const {
      blogReviews: _br, blogReviewScore: _brs,
      reviewImages: _ri,            // added in migration 009
      productUrl: _pu, soldQuantity: _sq,
      listingType: _lt, sellerLevel: _sl,
      fulfillment: _f, officialStore: _os,
      catalogListing: _cl, discountPct: _dp,
      originalPrice: _op,
      condition: _cond,             // added in migration 005
      reviewCount: _rc,             // real ML review count — strip if column absent
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

  // Try to inject tenant_id only if the products table supports it
  // (some deployments have it, others don't — detect and strip on error)
  const addTenant    = (rows) => rows.map(r => ({ ...r, tenant_id: ROOT_TENANT_ID }))
  const stripTenant  = (rows) => rows.map(({ tenant_id: _t, ...r }) => r)

  // Attempt 1: full insert with all fields + tenant_id
  let saved, pErr
  ;({ data: saved, error: pErr } = await db.from('products').insert(addTenant(withShortLinks)).select())

  // Attempt 2: strip blog fields (keep tenant_id)
  if (isSchemaErr(pErr)) {
    ;({ data: saved, error: pErr } = await db.from('products').insert(addTenant(forDbT1)).select())
  }

  // Attempt 3: strip all new columns including tenant_id
  if (isSchemaErr(pErr)) {
    ;({ data: saved, error: pErr } = await db.from('products').insert(stripTenant(forDbT2)).select())
  }

  // Attempt 4: absolute minimal — only core fields, no tenant_id
  if (isSchemaErr(pErr)) {
    ;({ data: saved, error: pErr } = await db.from('products').insert(stripTenant(withShortLinks).map(({ blogReviews: _br, reviewImages: _ri, freeShipping: _fs, mlAffiliateLink: _ml, amazonAffiliateLink: _amz, ...r }) => r)).select())
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
  let { error: eErr } = await db.from('catalog_entries').insert(entries)
  // If tenant_id doesn't exist on catalog_entries, retry without it
  if (eErr && isSchemaErr(eErr)) {
    const entriesNoTenant = entries.map(({ tenant_id: _t, ...e }) => e)
    ;({ error: eErr } = await db.from('catalog_entries').insert(entriesNoTenant))
  }
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
    region: group.code, language: group.lang, currency: reg.currency,
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
    return (data ?? []).map(p => ({ ...p, sessionId }))
  }

  // Full catalog — enrich each product with its sessionId via catalog_entries.provenance
  const { data: products } = await db.from('products').select('*').order('score', { ascending: false }).limit(200)
  if (!products?.length) return []

  // Fetch catalog_entries to map productId → sessionId
  const productIds = products.map(p => p.id)
  const { data: entries } = await db
    .from('catalog_entries')
    .select('productId, provenance')
    .in('productId', productIds)

  // provenance format: "session-{sessionId}"
  const productToSession = {}
  for (const e of entries ?? []) {
    if (e.provenance?.startsWith('session-')) {
      productToSession[e.productId] = e.provenance.replace('session-', '')
    }
  }

  return products.map(p => ({
    ...p,
    sessionId: productToSession[p.id] ?? null,
  }))
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
