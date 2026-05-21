/**
 * MercadoLibre API Proxy — deploy to Deno Deploy
 *
 * Forwards requests to api.mercadolibre.com so they originate from Deno's
 * IP range instead of Cloudflare Workers' IPs (which ML blocks).
 *
 * Security: every request must include the header
 *   X-Proxy-Secret: <value of PROXY_SECRET env var>
 * Set PROXY_SECRET in Deno Deploy's environment settings.
 *
 * Usage from Cloudflare Worker:
 *   fetch(`${ML_PROXY_URL}/oauth/token`, { method: 'POST', ... })
 *   fetch(`${ML_PROXY_URL}/sites/MLB/search?q=...`, { headers: { Authorization: ... } })
 */

const ALLOWED_PREFIXES = [
  '/oauth/token',
  '/sites/',
  '/trends/',
  '/items/',
]

Deno.serve(async (req: Request): Promise<Response> => {
  // ── CORS pre-flight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Proxy-Secret',
      },
    })
  }

  // ── Secret validation ────────────────────────────────────────────────────────
  const secret = Deno.env.get('PROXY_SECRET')
  if (secret) {
    const incoming = req.headers.get('X-Proxy-Secret')
    if (incoming !== secret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ── Path allow-list (only forward known ML API paths) ────────────────────────
  const url = new URL(req.url)
  const path = url.pathname

  const allowed = ALLOWED_PREFIXES.some((p) => path.startsWith(p))
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'path not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Forward to MercadoLibre ──────────────────────────────────────────────────
  const target = `https://api.mercadolibre.com${path}${url.search}`

  const forwardHeaders = new Headers()
  const authHeader = req.headers.get('Authorization')
  if (authHeader) forwardHeaders.set('Authorization', authHeader)

  const contentType = req.headers.get('Content-Type')
  if (contentType) forwardHeaders.set('Content-Type', contentType)

  forwardHeaders.set('User-Agent', 'FabricaDeConteudo-Proxy/1.0')
  forwardHeaders.set('Accept', 'application/json')

  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined

  const upstream = await fetch(target, {
    method: req.method,
    headers: forwardHeaders,
    body,
  })

  const responseBody = await upstream.text()

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Proxied-From': 'deno-deploy',
    },
  })
})
