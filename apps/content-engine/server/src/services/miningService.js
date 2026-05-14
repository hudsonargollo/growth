import { db } from '../lib/db.js'
import { uid } from '../lib/uid.js'

function scoreProduct(p) {
  return Math.round((p.rating / 5) * 40 + Math.min(p.reviews / 10000, 1) * 30 + Math.max(0, (1 - p.price / 500)) * 30)
}

export async function runMiningSession({ marketplace, category }) {
  console.log(`[mining] Starting — marketplace: ${marketplace}, category: ${category}`)
  const sessionId = uid()

  const { error: sErr } = await db.from('mining_sessions').insert({
    id: sessionId, marketplace, category, status: 'in_progress',
  })
  if (sErr) throw new Error(sErr.message)

  // TODO: Replace with real MercadoLibre / Amazon API calls
  const products = Array.from({ length: 5 }, (_, i) => ({
    id:            uid(),
    marketplace,
    title:         `Stub Product ${i + 1} (${category})`,
    price:         Math.round(20 + Math.random() * 280),
    rating:        +(3.5 + Math.random() * 1.5).toFixed(1),
    reviews:       Math.round(100 + Math.random() * 9900),
    affiliateLink: `https://example.com/product/${i}`,
    imageUrl:      '',
    currency:      'USD',
    sourceApi:     marketplace,
    lastSeen:      new Date().toISOString(),
  })).map((p) => ({ ...p, score: scoreProduct(p) }))

  const { data: saved, error: pErr } = await db.from('products').insert(products).select()
  if (pErr) throw new Error(pErr.message)

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
    status: 'completed', productCount: saved.length, completedAt: new Date().toISOString(),
  }).eq('id', sessionId)

  console.log(`[mining] Complete — ${saved.length} products saved`)
  return { status: 'completed', sessionId, count: saved.length }
}

export async function getCatalog() {
  const { data, error } = await db.from('products').select('*').order('score', { ascending: false }).limit(100)
  if (error) throw new Error(error.message)
  return data
}

export async function getSessions() {
  const { data, error } = await db.from('mining_sessions').select('*').order('createdAt', { ascending: false }).limit(20)
  if (error) throw new Error(error.message)
  return data
}
