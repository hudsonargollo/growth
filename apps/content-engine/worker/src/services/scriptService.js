import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const blueprints = {
  'top-n-review':     { name: 'Top-N Product Review',    sections: ['intro', 'product_highlights', 'value_proposition', 'cta'] },
  'single-deep-dive': { name: 'Single Product Deep Dive', sections: ['intro', 'overview', 'pros_cons', 'demo', 'cta'] },
  'comparison':       { name: 'Comparison (A vs B)',      sections: ['intro', 'product_a', 'product_b', 'verdict', 'cta'] },
}

export async function generateScript(env, { blueprintId, catalogIds, language }) {
  const db = getDb(env)
  const blueprint = blueprints[blueprintId] ?? blueprints['top-n-review']

  let products = []
  if (catalogIds?.length) {
    const { data: entries } = await db.from('catalog_entries').select('*, products(*)').in('id', catalogIds)
    products = (entries ?? []).map((e) => e.products).filter(Boolean)
  }
  if (!products.length) {
    products = (catalogIds ?? []).map((id, i) => ({ title: `Product ${id}`, price: 99 + i * 20, rating: 4.5, reviews: 1000 }))
  }

  const prompt = `Generate a ${blueprint.name} in ${language.toUpperCase()}. Structure: ${blueprint.sections.join(' > ')}. Products: ${products.map((p) => p.title).join(', ')}. Include affiliate disclosure.`

  // TODO: replace with real OpenAI call using env.OPENAI_API_KEY
  const text = `[INTRO] Welcome back!\n\n[HIGHLIGHTS]\n${products.map((p, i) => `#${i + 1} ${p.title}`).join('\n')}\n\n[CTA] Check affiliate links below. We may earn a commission.`

  const { data, error } = await db.from('scripts').insert({
    id: uid(), catalogEntryId: catalogIds?.[0] ?? null, blueprintId, text, language,
    confidence: Math.round(80 + Math.random() * 15), version: 1, prompt,
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listScripts(env) {
  const db = getDb(env)
  const { data, error } = await db.from('scripts').select('*').order('createdAt', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  return data
}
