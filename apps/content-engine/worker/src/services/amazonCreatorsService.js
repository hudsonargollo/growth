// ── Amazon Creators API ───────────────────────────────────────────────────────
// Amazon's modern replacement for PA-API 5.0 (PA-API was deprecated 2026-05-15).
// Unlike old PA-API, the Creators API DOES expose product ratings + review counts.
//
//   Auth:   POST https://api.amazon.com/auth/o2/token
//           grant_type=client_credentials, scope=creatorsapi::default  (token ~1h)
//   Search: POST {host}/catalog/v1/searchItems   (lowerCamelCase JSON)
//   Headers: Authorization: Bearer <token>, x-marketplace: <domain>
//   Ratings: item.customerReviews.starRating / item.customerReviews.count
//
// The public docs are sparse (the reference is behind the affiliate login), so the
// host + marketplace are env-overridable and the response parsing is defensive.
// Credentials come from resolveKey (Wrangler secrets / encrypted KV):
//   AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_ASSOCIATE_TAG
// Optional override: AMAZON_CREATORS_HOST

import { resolveKey } from '../lib/resolveKey.js'

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const DEFAULT_HOST  = 'https://creatorsapi.amazon'

// Region code → Amazon marketplace domain (mirrors the mining REGIONS amazonDomain).
const MARKETPLACE_BY_REGION = {
  br: 'www.amazon.com.br',
  mx: 'www.amazon.com.mx',
  es: 'www.amazon.es',
  us: 'www.amazon.com',
  ca: 'www.amazon.ca',
}

// In-isolate token cache — tokens last ~1h; never mint one per request.
let _tokenCache = { token: null, exp: 0 }

export async function getCreatorsToken(env) {
  const now = Date.now()
  if (_tokenCache.token && now < _tokenCache.exp) return _tokenCache.token

  const [clientId, clientSecret] = await Promise.all([
    resolveKey(env, 'AMAZON_LWA_CLIENT_ID'),
    resolveKey(env, 'AMAZON_LWA_CLIENT_SECRET'),
  ])
  if (!clientId || !clientSecret) return null // not configured

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'creatorsapi::default',
  })
  const res = await fetch(LWA_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error(`[amazon] LWA token failed ${res.status}: ${err.slice(0, 200)}`)
    return null
  }
  const json  = await res.json().catch(() => ({}))
  const token = json.access_token
  if (!token) return null
  // Cache until ~2 min before expiry.
  _tokenCache = { token, exp: now + Math.max(0, Number(json.expires_in ?? 3600) - 120) * 1000 }
  return token
}

function pickPrice(it) {
  const listings = it?.offersV2?.listings ?? it?.offers?.listings ?? []
  const p = listings?.[0]?.price
  return Number(p?.money?.amount ?? p?.amount ?? p?.value ?? 0) || 0
}

// Map one Creators API item → the mining product shape. Field paths are best-effort
// (response schema not fully documented) with safe fallbacks; refine from raw dumps.
function mapAmazonItem(it, { marketplace }) {
  const asin   = it?.asin ?? it?.itemId ?? ''
  const title  = it?.itemInfo?.title?.displayValue ?? it?.itemInfo?.title ?? it?.title ?? ''
  const image  = it?.images?.primary?.large?.url ?? it?.images?.primary?.large ?? ''
  const rating = Number(it?.customerReviews?.starRating?.value ?? it?.customerReviews?.starRating ?? 0) || 0
  const count  = Number(it?.customerReviews?.count ?? 0) || 0
  const url    = it?.detailPageUrl ?? it?.detailPageURL ?? (asin ? `https://${marketplace}/dp/${asin}` : '')
  return {
    marketplace: 'amazon',
    asin,
    title,
    price:       pickPrice(it),
    rating:      Math.round(rating * 10) / 10,
    reviewCount: count,
    imageUrl:    image,
    productUrl:  url,
    sourceApi:   'amazon_creators',
  }
}

/**
 * Search Amazon for products (with real ratings) via the Creators API.
 * Returns { products, raw, error } — `raw` is the unparsed body so callers can
 * inspect/refine field paths during bring-up. Never throws.
 */
export async function searchAmazonCreators(env, { query, region = 'us', limit = 10, itemPage = 1, sortBy } = {}) {
  const token = await getCreatorsToken(env)
  if (!token) return { products: [], raw: null, error: 'amazon_not_configured_or_auth_failed' }

  const host        = (env.AMAZON_CREATORS_HOST ?? DEFAULT_HOST).replace(/\/$/, '')
  const marketplace = MARKETPLACE_BY_REGION[region] ?? MARKETPLACE_BY_REGION.us
  const partnerTag  = await resolveKey(env, 'AMAZON_ASSOCIATE_TAG')

  // Optional sort toward popularity/best-sellers. Opt-in via env so an unsupported
  // value can never silently break the search (the API may 400 on unknown sorts).
  const sort = sortBy ?? env.AMAZON_CREATORS_SORT ?? null

  const reqBody = {
    keywords:    query,
    itemCount:   Math.min(limit, 10),
    ...(itemPage && itemPage > 1 ? { itemPage } : {}),
    ...(sort ? { sortBy: sort } : {}),
    ...(partnerTag ? { partnerTag } : {}),
    partnerType: 'Associates',
    marketplace,
    resources: [
      'itemInfo.title',
      'images.primary.large',
      'offersV2.listings.price',
      'customerReviews.starRating',
      'customerReviews.count',
    ],
  }

  let res
  try {
    res = await fetch(`${host}/catalog/v1/searchItems`, {
      method: 'POST',
      headers: {
        Authorization:   `Bearer ${token}`,
        'x-marketplace': marketplace,
        'Content-Type':  'application/json',
        Accept:          'application/json',
      },
      body: JSON.stringify(reqBody),
    })
  } catch (e) {
    console.error(`[amazon] searchItems fetch failed: ${e.message}`)
    return { products: [], raw: null, error: `fetch_failed: ${e.message}` }
  }

  const bodyText = await res.text().catch(() => '')
  let json = null
  try { json = JSON.parse(bodyText) } catch { /* leave null */ }

  if (!res.ok) {
    console.error(`[amazon] searchItems ${res.status}: ${bodyText.slice(0, 300)}`)
    return { products: [], raw: json ?? bodyText.slice(0, 800), error: `http_${res.status}` }
  }

  // Response shape not fully documented — probe the likely containers.
  const items = json?.searchResult?.items ?? json?.items ?? json?.results ?? []
  const list  = Array.isArray(items) ? items : []
  const products = list.map((it) => mapAmazonItem(it, { marketplace }))
  return { products, raw: json, error: null }
}
