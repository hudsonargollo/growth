/**
 * YouTube OAuth 2.0 routes
 *
 * GET    /api/youtube/oauth/url      → returns Google authorization URL
 * GET    /api/youtube/oauth/callback → exchanges code for tokens, stores refresh_token encrypted
 * GET    /api/youtube/oauth/status   → checks if refresh token is stored
 * DELETE /api/youtube/oauth          → disconnect (removes stored refresh token)
 *
 * Prerequisites (set as Wrangler secrets — never in code):
 *   npx wrangler secret put GOOGLE_CLIENT_ID
 *   npx wrangler secret put GOOGLE_CLIENT_SECRET
 *
 * Register this redirect URI in Google Cloud Console → OAuth 2.0 Credentials:
 *   https://fabricadeconteudo.clubemkt.digital/api/youtube/oauth/callback
 */
import { Hono } from 'hono'
import { getDb }   from '../lib/db.js'
import { encrypt } from '../lib/crypto.js'
import { uid }     from '../lib/uid.js'

const router = new Hono()

const ROOT_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const REDIRECT_URI   = 'https://fabricadeconteudo.clubemkt.digital/api/youtube/oauth/callback'
const FRONTEND_BASE  = 'https://fabricadeconteudo.clubemkt.digital'

// YouTube comment scope — force-ssl includes read + write on comments
const SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl'

// ── GET /api/youtube/oauth/url ─────────────────────────────────────────────────
// Returns the Google OAuth authorization URL; the frontend redirects the user there.
router.get('/oauth/url', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return c.json({ error: 'GOOGLE_CLIENT_ID not configured. Run: npx wrangler secret put GOOGLE_CLIENT_ID' }, 500)
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',  // request refresh_token
    prompt:        'consent',  // always return refresh_token (even if previously granted)
  })

  return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
})

// ── GET /api/youtube/oauth/callback ───────────────────────────────────────────
// Google redirects here after user consent. Exchange code for tokens and store refresh_token.
router.get('/oauth/callback', async (c) => {
  const code        = c.req.query('code')
  const errorParam  = c.req.query('error')

  // User denied consent or other OAuth error
  if (errorParam || !code) {
    const reason = encodeURIComponent(errorParam ?? 'missing_code')
    return c.redirect(`${FRONTEND_BASE}/settings?youtube=error&reason=${reason}`)
  }

  const clientId     = c.env.GOOGLE_CLIENT_ID
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET
  const secret       = c.env.CREDENTIALS_SECRET

  if (!clientId || !clientSecret || !secret) {
    console.error('[youtube/oauth] Missing server-side env vars')
    return c.redirect(`${FRONTEND_BASE}/settings?youtube=error&reason=server_config`)
  }

  // Exchange authorization code → access_token + refresh_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('[youtube/oauth] Token exchange failed:', tokenRes.status, errText.slice(0, 300))
    return c.redirect(`${FRONTEND_BASE}/settings?youtube=error&reason=token_exchange`)
  }

  const { refresh_token, access_token } = await tokenRes.json()

  // refresh_token is only present on first auth (or after explicit revocation).
  // We use prompt=consent above to guarantee it's always returned.
  if (!refresh_token) {
    console.error('[youtube/oauth] No refresh_token in response')
    return c.redirect(`${FRONTEND_BASE}/settings?youtube=error&reason=no_refresh_token`)
  }

  // Encrypt and store the refresh_token in tenant_api_keys
  const { ciphertext, iv } = await encrypt(refresh_token, secret)
  const db = getDb(c.env)

  const { error: dbErr } = await db
    .from('tenant_api_keys')
    .upsert(
      {
        id:              uid(),
        tenant_id:       ROOT_TENANT_ID,
        key_name:        'GOOGLE_REFRESH_TOKEN',
        value_encrypted: ciphertext,
        iv,
        label:           `connected ${new Date().toISOString().slice(0, 10)}`,
        updated_at:      new Date().toISOString(),
        updated_by:      null,
      },
      { onConflict: 'tenant_id,key_name' },
    )

  if (dbErr) {
    console.error('[youtube/oauth] DB upsert error:', dbErr.message)
    return c.redirect(`${FRONTEND_BASE}/settings?youtube=error&reason=db_error`)
  }

  console.log('[youtube/oauth] Refresh token stored successfully')
  return c.redirect(`${FRONTEND_BASE}/settings?youtube=connected`)
})

// ── GET /api/youtube/oauth/status ─────────────────────────────────────────────
// Returns whether a refresh token is stored (used by the Settings UI on load).
router.get('/oauth/status', async (c) => {
  const db = getDb(c.env)
  const { data } = await db
    .from('tenant_api_keys')
    .select('updated_at, label')
    .eq('tenant_id', ROOT_TENANT_ID)
    .eq('key_name', 'GOOGLE_REFRESH_TOKEN')
    .maybeSingle()

  return c.json({
    connected:  !!data,
    updated_at: data?.updated_at ?? null,
    label:      data?.label ?? null,
  })
})

// ── DELETE /api/youtube/oauth ──────────────────────────────────────────────────
// Removes the stored refresh token (disconnect YouTube).
router.delete('/oauth', async (c) => {
  const db = getDb(c.env)
  await db
    .from('tenant_api_keys')
    .delete()
    .eq('tenant_id', ROOT_TENANT_ID)
    .eq('key_name', 'GOOGLE_REFRESH_TOKEN')

  return c.json({ ok: true })
})

export default router
