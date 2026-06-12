import { Hono } from 'hono'
import { cors } from 'hono/cors'
import ciRouter from './routes/ci.js'

const app = new Hono()

// Allow the landing/CRM origins (prod alias + Pages preview hashes + local dev).
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin
    if (/^https:\/\/([a-z0-9-]+\.)?codigo-internacional\.pages\.dev$/.test(origin)) return origin
    // Custom domain (apex + www)
    if (/^https:\/\/(www\.)?codigointernacional\.com\.br$/.test(origin)) return origin
    if (/^http:\/\/localhost:(5173|5174|5175)$/.test(origin)) return origin
    return undefined
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))
app.route('/api/ci', ciRouter)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

export default app
