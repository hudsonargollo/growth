const ML_BASE = 'https://api.mercadolibre.com'

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Proxy-Secret' } })

  const secret = Deno.env.get('PROXY_SECRET') ?? ''
  if (secret && req.headers.get('X-Proxy-Secret') !== secret) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const clean = new Headers()
  clean.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
  clean.set('Accept', 'application/json, text/plain, */*')
  clean.set('Accept-Language', 'pt-BR,pt;q=0.9')

  // Forward Authorization and Content-Type if present
  const auth = req.headers.get('Authorization')
  if (auth) clean.set('Authorization', auth)
  const ct = req.headers.get('Content-Type')
  if (ct) clean.set('Content-Type', ct)

  // Forward body for POST requests
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined

  const mlRes = await fetch(`${ML_BASE}${url.pathname}${url.search}`, {
    method: req.method,
    headers: clean,
    body: body && body.byteLength > 0 ? body : undefined,
  })

  const resBody = await mlRes.arrayBuffer()
  return new Response(resBody, {
    status: mlRes.status,
    headers: { 'Content-Type': mlRes.headers.get('Content-Type') ?? 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
