import express from 'express'

const app  = express()
const PORT = process.env.PORT || 3000
const SECRET = process.env.PROXY_SECRET ?? ''
const ML_BASE = 'https://api.mercadolibre.com'

app.use(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Proxy-Secret' }).sendStatus(204)
  }

  if (SECRET && req.headers['x-proxy-secret'] !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const mlUrl = `${ML_BASE}${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`

  const headers = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':          'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  }
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization']
  if (req.headers['content-type'])  headers['Content-Type']  = req.headers['content-type']

  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  const mlRes = await fetch(mlUrl, { method: req.method, headers, body: body?.length ? body : undefined })
  const data  = await mlRes.arrayBuffer()

  res.set('Access-Control-Allow-Origin', '*')
  res.set('Content-Type', mlRes.headers.get('Content-Type') ?? 'application/json')
  res.status(mlRes.status).send(Buffer.from(data))
})

app.listen(PORT, () => console.log(`ML proxy running on port ${PORT}`))
