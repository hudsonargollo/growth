import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const blueprints = {
  'top-n-review':     { name: 'Top-N Product Review',    sections: ['intro', 'product_highlights', 'value_proposition', 'cta'] },
  'single-deep-dive': { name: 'Single Product Deep Dive', sections: ['intro', 'overview', 'pros_cons', 'demo', 'cta'] },
  'comparison':       { name: 'Comparison (A vs B)',      sections: ['intro', 'product_a', 'product_b', 'verdict', 'cta'] },
}

export async function generateScript(env, { blueprintId, catalogIds, language }) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured — add it via: wrangler secret put OPENAI_API_KEY')
  }

  const db        = getDb(env)
  const blueprint = blueprints[blueprintId] ?? blueprints['top-n-review']

  // Fetch real products from catalog
  let products = []
  if (catalogIds?.length) {
    const { data: entries } = await db
      .from('catalog_entries')
      .select('*, products(*)')
      .in('id', catalogIds)
    products = (entries ?? []).map((e) => e.products).filter(Boolean)
  }

  if (!products.length) {
    // Fall back to top-scored products from catalog
    const { data: topProducts } = await db
      .from('products')
      .select('*')
      .order('score', { ascending: false })
      .limit(5)
    products = topProducts ?? []
  }

  if (!products.length) {
    throw new Error('No products in catalog — run a mining session first')
  }

  const productList = products
    .map((p, i) => `${i + 1}. ${p.title} — $${p.price}, ${p.rating}★, ${p.reviews.toLocaleString()} reviews, link: ${p.affiliateLink}`)
    .join('\n')

  const systemPrompt = `You are a YouTube script writer for a product review channel. 
Write engaging, persuasive scripts that follow the given structure exactly.
Always include affiliate disclosure. Keep tone energetic and informative.
Language: ${language.toUpperCase()}`

  const userPrompt = `Write a "${blueprint.name}" YouTube script.
Structure: ${blueprint.sections.join(' → ')}
Products:
${productList}

Requirements:
- Each section clearly labeled with [SECTION_NAME]
- Affiliate disclosure at the end
- Call to action with subscribe reminder
- Natural, conversational tone`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       env.LLM_MODEL ?? 'gpt-4o-mini',
      messages:    [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens:  2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json       = await res.json()
  const text       = json.choices?.[0]?.message?.content ?? ''
  const tokenCount = json.usage?.total_tokens ?? 0

  const { data, error } = await db.from('scripts').insert({
    id:             uid(),
    catalogEntryId: catalogIds?.[0] ?? null,
    blueprintId,
    text,
    language,
    confidence:     Math.min(99, Math.round(85 + (tokenCount / 100))),
    version:        1,
    prompt:         userPrompt,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function listScripts(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('scripts')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
