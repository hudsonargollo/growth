/**
 * Mercado Livre OAuth 2.0 routes
 *
 * GET  /api/ml/oauth/url      → returns ML authorization URL
 * GET  /api/ml/oauth/callback → exchanges code for tokens, stores refresh_token
 * GET  /api/ml/oauth/status   → checks if user token is stored
 * DELETE /api/ml/oauth        → disconnect
 *
 * Register redirect URI in ML Developer Portal → your app → Redirect URIs:
 *   https://fabricadeconteudo.clubemkt.digital/api/ml/oauth/callback
 */
import { Hono } from 'hono'
import { encrypt } from '../lib/crypto.js'
import { resolveKey } from '../lib/resolveKey.js'

const router = new Hono()

const REDIRECT_URI  = 'https://fabricadeconteudo.clubemkt.digital/api/ml/oauth/callback'
const FRONTEND_BASE = 'https://fabricadeconteudo.clubemkt.digital'
const ML_AUTH_BASE  = 'https://auth.mercadolivre.com.br'
const ML_TOKEN_URL  = 'https://api.mercadolibre.com/oauth/token'

/** Generate a cryptographically random code_verifier (43–128 chars, base64url) */
async function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64url(array)
}

/** SHA-256 hash of verifier, base64url-encoded → code_challenge */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64url(new Uint8Array(digest))
}

/** Base64url encoding (no padding) */
function base64url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// GET /api/ml/oauth/url
router.get('/oauth/url', async (c) => {
  const clientId = await resolveKey(c.env, 'ML_APP_ID')
  if (!clientId) return c.json({ error: 'ML_APP_ID não configurado.' }, 500)

  const codeVerifier   = await generateCodeVerifier()
  const codeChallenge  = await generateCodeChallenge(codeVerifier)

  // Store verifier for 10 minutes so callback can retrieve it
  if (c.env.KV1) {
    await c.env.KV1.put('ml:pkce:code_verifier', codeVerifier, { expirationTtl: 600 })
  }

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             clientId,
    redirect_uri:          REDIRECT_URI,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
    // offline_access is REQUIRED for ML to return a refresh_token (so we can keep
    // the user token alive); read grants the search/items scope. Without these,
    // no refresh token is issued and the access token dies in ~6h.
    scope:                 'offline_access read write',
  })

  return c.json({ url: `${ML_AUTH_BASE}/authorization?${params}` })
})

// GET /api/ml/oauth/callback
router.get('/oauth/callback', async (c) => {
  const code       = c.req.query('code')
  const errorParam = c.req.query('error')

  if (errorParam || !code) {
    const reason = encodeURIComponent(errorParam ?? 'missing_code')
    return c.redirect(`${FRONTEND_BASE}/settings?ml=error&reason=${reason}`)
  }

  const clientId     = await resolveKey(c.env, 'ML_APP_ID')
  const clientSecret = await resolveKey(c.env, 'ML_CLIENT_SECRET')
  const secret       = c.env.CREDENTIALS_SECRET

  if (!clientId || !clientSecret || !secret) {
    return c.redirect(`${FRONTEND_BASE}/settings?ml=error&reason=server_config`)
  }

  // Retrieve PKCE verifier stored during /oauth/url
  const codeVerifier = c.env.KV1 ? await c.env.KV1.get('ml:pkce:code_verifier') : null

  const tokenBody = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    redirect_uri:  REDIRECT_URI,
  })
  if (codeVerifier) tokenBody.set('code_verifier', codeVerifier)

  const tokenRes = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body:    tokenBody,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('[ml/oauth] Token exchange failed:', tokenRes.status, err.slice(0, 300))
    return c.redirect(`${FRONTEND_BASE}/settings?ml=error&reason=token_exchange`)
  }

  const tokenData = await tokenRes.json()
  const { access_token, refresh_token } = tokenData

  if (!access_token) {
    return c.redirect(`${FRONTEND_BASE}/settings?ml=error&reason=no_access_token`)
  }

  const now = new Date().toISOString()
  const { ciphertext: ac, iv: ai } = await encrypt(access_token, secret)
  await c.env.KV1.put('apikey:ML_USER_ACCESS_TOKEN', JSON.stringify({ ciphertext: ac, iv: ai, updated_at: now }))

  // refresh_token only returned on first authorization — store if present, keep existing if not
  if (refresh_token) {
    const { ciphertext: rc, iv: ri } = await encrypt(refresh_token, secret)
    await c.env.KV1.put('apikey:ML_USER_REFRESH_TOKEN', JSON.stringify({ ciphertext: rc, iv: ri, updated_at: now }))
  }

  console.log('[ml/oauth] User tokens stored successfully')
  return c.redirect(`${FRONTEND_BASE}/settings?ml=connected`)
})

// GET /api/ml/oauth/token — returns decrypted access token for browser-side ML calls
router.get('/oauth/token', async (c) => {
  if (!c.env.KV1 || !c.env.CREDENTIALS_SECRET) return c.json({ token: null })
  const { decrypt } = await import('../lib/crypto.js')
  const stored = await c.env.KV1.get('apikey:ML_USER_ACCESS_TOKEN', { type: 'json' }).catch(() => null)
  if (!stored?.ciphertext) return c.json({ token: null })
  try {
    const token = await decrypt(stored.ciphertext, stored.iv, c.env.CREDENTIALS_SECRET)
    return c.json({ token: token ?? null })
  } catch {
    return c.json({ token: null })
  }
})

// GET /api/ml/oauth/status
router.get('/oauth/status', async (c) => {
  if (!c.env.KV1) return c.json({ connected: false, updated_at: null })
  // Check access token first, fall back to refresh token
  const access  = await c.env.KV1.get('apikey:ML_USER_ACCESS_TOKEN',  { type: 'json' })
  const refresh = await c.env.KV1.get('apikey:ML_USER_REFRESH_TOKEN', { type: 'json' })
  const stored  = access ?? refresh
  return c.json({ connected: !!stored?.ciphertext, updated_at: stored?.updated_at ?? null })
})

// DELETE /api/ml/oauth
router.delete('/oauth', async (c) => {
  if (c.env.KV1) {
    await c.env.KV1.delete('apikey:ML_USER_REFRESH_TOKEN')
    await c.env.KV1.delete('apikey:ML_USER_ACCESS_TOKEN')
  }
  return c.json({ ok: true })
})

// GET /api/ml/search?q=...&limit=20&sort=sold_quantity_desc&site=MLB
// Proxies the Mercado Livre search API through the Worker to avoid CORS blocks
// that happen when the browser calls api.mercadolibre.com directly.
// `site` defaults to 'MLB' (Brasil); pass 'MLM' for México.
router.get('/search', async (c) => {
  const q     = c.req.query('q')
  const limit = c.req.query('limit') ?? '20'
  const sort  = c.req.query('sort')  ?? 'sold_quantity_desc'
  const site  = c.req.query('site')  ?? 'MLB'

  if (!q?.trim()) return c.json({ error: 'Parâmetro q é obrigatório' }, 400)

  // Resolve auth token: KV-stored OAuth token → fresh client_credentials token
  let authToken = null
  if (c.env.KV1 && c.env.CREDENTIALS_SECRET) {
    try {
      const { decrypt } = await import('../lib/crypto.js')
      const stored = await c.env.KV1.get('apikey:ML_USER_ACCESS_TOKEN', { type: 'json' }).catch(() => null)
      if (stored?.ciphertext) {
        authToken = await decrypt(stored.ciphertext, stored.iv, c.env.CREDENTIALS_SECRET).catch(() => null)
      }
    } catch {}
  }
  if (!authToken) {
    try {
      const { getMLToken } = await import('../services/miningService.js')
      const { token } = await getMLToken(c.env)
      authToken = token
    } catch {}
  }

  const params = new URLSearchParams({ q: q.trim(), limit, sort })
  const headers = { Accept: 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`https://api.mercadolibre.com/sites/${site}/search?${params}`, { headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return c.json({ error: `ML API ${res.status}: ${err.message ?? 'erro'}`, status: res.status }, res.status === 401 ? 401 : 502)
  }

  const data = await res.json()
  return c.json(data)
})

export default router
