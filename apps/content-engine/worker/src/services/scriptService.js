import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const FALLBACK_BLUEPRINTS = {
  'top-n-review': {
    name: 'Top-N Avaliação de Produtos',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',      duration: 60,  instructions: '' },
      { id: 's2', type: 'product', label: 'Produto #5',    duration: 90,  instructions: '' },
      { id: 's3', type: 'product', label: 'Produto #4',    duration: 90,  instructions: '' },
      { id: 's4', type: 'product', label: 'Produto #3',    duration: 120, instructions: '' },
      { id: 's5', type: 'product', label: 'Produto #2',    duration: 120, instructions: '' },
      { id: 's6', type: 'product', label: 'Produto #1',    duration: 150, instructions: '' },
      { id: 's7', type: 'cta',     label: 'CTA Final',     duration: 45,  instructions: '' },
    ],
  },
  'single-deep-dive': {
    name: 'Análise Aprofundada',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',        duration: 60,  instructions: '' },
      { id: 's2', type: 'product', label: 'Visão Geral',     duration: 120, instructions: '' },
      { id: 's3', type: 'product', label: 'Prós e Contras',  duration: 120, instructions: '' },
      { id: 's4', type: 'product', label: 'Demonstração',    duration: 150, instructions: '' },
      { id: 's5', type: 'cta',     label: 'CTA Final',       duration: 45,  instructions: '' },
    ],
  },
}

async function resolveOpenAIKey(env) {
  if (env.OPENAI_API_KEY) return env.OPENAI_API_KEY
  try {
    const db = getDb(env)
    const secret = env.CREDENTIALS_SECRET
    const { data } = await db.from('tool_credentials').select('passwordEncrypted, iv').eq('toolId', 'openai_api_key').single()
    if (data?.passwordEncrypted && data?.iv && secret) {
      const { decrypt } = await import('../lib/crypto.js')
      return await decrypt(data.passwordEncrypted, data.iv, secret)
    }
  } catch {}
  throw new Error('OPENAI_API_KEY não configurada — adicione em Configurações > Chaves de API')
}

function buildProductList(products) {
  return products.map((p, i) => {
    const price = p.price
      ? `R$${Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'preço não disponível'
    const amazonLink = p.amazonAffiliateLink || (p.marketplace === 'amazon' ? p.affiliateLink : '')
    const mlLink     = p.mlAffiliateLink     || (p.marketplace === 'mercadolivre' ? p.affiliateLink : '')
    const links = [
      amazonLink ? `Amazon: ${amazonLink}` : '',
      mlLink     ? `Mercado Livre: ${mlLink}` : '',
    ].filter(Boolean).join(' | ')
    return `${i + 1}. ${p.title}\n   Preço: ${price} | Avaliação: ${p.rating || '—'}★ | Reviews: ${(p.reviews ?? 0).toLocaleString()} | Marketplace: ${p.marketplace}${links ? `\n   Links afiliado: ${links}` : ''}`
  }).join('\n')
}

function buildChannelContext(profile) {
  if (!profile) return ''
  return `
CANAL: ${profile.channelName || 'canal de reviews'}
NICHO: ${profile.niche || 'produtos de consumo'}
PÚBLICO-ALVO: ${profile.targetAudience || 'consumidores brasileiros'}
TOM DE VOZ: ${profile.tone || 'energético e informativo'}
ESTILO DE ABERTURA: ${profile.introStyle || 'hook_question'}
CTA PADRÃO: ${profile.ctaStyle || 'links na descrição'}
FRASES ASSINATURA: ${profile.signaturePhrases || ''}
`.trim()
}

async function callOpenAI(openaiKey, model, systemPrompt, userPrompt, maxTokens = 2000) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens:  maxTokens,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  return { text: json.choices?.[0]?.message?.content ?? '', tokens: json.usage?.total_tokens ?? 0 }
}

export async function generateScript(env, { blueprintId, blueprintData, catalogIds, productIds, language, channelProfileId }) {
  const openaiKey = await resolveOpenAIKey(env)
  const db        = getDb(env)

  // Resolve blueprint — prefer explicit blueprintData, then DB lookup, then fallback
  let blueprint = blueprintData
  if (!blueprint && blueprintId) {
    try {
      const { data } = await db.from('blueprints').select('*').eq('id', blueprintId).single()
      if (data) blueprint = data
    } catch {}
    if (!blueprint) blueprint = FALLBACK_BLUEPRINTS[blueprintId] ?? FALLBACK_BLUEPRINTS['top-n-review']
  }
  if (!blueprint) blueprint = FALLBACK_BLUEPRINTS['top-n-review']

  // Resolve channel profile
  let profile = null
  if (channelProfileId) {
    try {
      const { data } = await db.from('channel_profiles').select('*').eq('id', channelProfileId).single()
      profile = data
    } catch {}
  }
  if (!profile) {
    try {
      const { data } = await db.from('channel_profiles').select('*').order('createdAt', { ascending: true }).limit(1).maybeSingle()
      profile = data
    } catch {}
  }

  // Resolve products
  let products = []
  const ids = productIds ?? catalogIds ?? []
  if (ids.length) {
    const { data: directProducts } = await db.from('products').select('*').in('id', ids)
    products = directProducts ?? []
  }
  if (!products.length) {
    const { data: top } = await db.from('products').select('*').order('score', { ascending: false }).limit(5)
    products = top ?? []
  }
  if (!products.length) {
    throw new Error('Nenhum produto no catálogo — execute uma sessão de mineração primeiro')
  }

  const sections       = blueprint.sections ?? []
  const productList    = buildProductList(products)
  const channelContext = buildChannelContext(profile)
  const totalSeconds   = sections.reduce((s, sec) => s + (sec.duration ?? 60), 0)
  const sectionLabels  = sections.map((s) => s.label).join(' → ')

  const systemPrompt = `Você é um roteirista de YouTube especializado em reviews de produtos para o mercado brasileiro.
Escreva roteiros envolventes e persuasivos que seguem exatamente a estrutura fornecida.
Sempre inclua aviso de afiliado. Mantenha um tom ${profile?.tone || 'energético e informativo'}.
Quando links de afiliados estiverem disponíveis, inclua-os nas chamadas de descrição e no CTA.
Idioma: ${language?.toUpperCase() ?? 'PT'}`

  const userPrompt = `Escreva um roteiro de YouTube "${blueprint.name}" com duração aproximada de ${Math.round(totalSeconds / 60)} minutos.

${channelContext ? `CONTEXTO DO CANAL:\n${channelContext}\n` : ''}
ESTRUTURA (seções): ${sectionLabels}
${sections.map((s) => s.instructions ? `- ${s.label}: ${s.instructions}` : '').filter(Boolean).join('\n')}

PRODUTOS A REVISAR:
${productList}

INSTRUÇÕES:
- Cada seção claramente marcada com [NOME_DA_SEÇÃO]
- Inclua o link afiliado de cada produto na chamada (ex: "Link na descrição: <url>")
- Aviso de afiliado no início ou final
- CTA com incentivo a se inscrever e ativar notificações
- Tom conversacional e natural em ${language?.toUpperCase() ?? 'PT'}
- Cada seção deve ter aproximadamente ${Math.round(totalSeconds / sections.length / 60 * 100)} palavras`

  const { text, tokens } = await callOpenAI(openaiKey, env.LLM_MODEL ?? 'gpt-4o-mini', systemPrompt, userPrompt, 3000)

  // Parse sections from the generated text
  const parsedSections = parseSections(text, sections)

  const scriptTitle = `${blueprint.name} — ${products[0]?.title?.slice(0, 40) ?? 'Roteiro'}`

  const { data, error } = await db.from('scripts').insert({
    id:               uid(),
    catalogEntryId:   ids[0] ?? null,
    blueprintId:      blueprint.id ?? blueprintId ?? 'custom',
    text,
    sections:         parsedSections,
    title:            scriptTitle,
    language:         language ?? 'pt',
    confidence:       Math.min(99, Math.round(85 + (tokens / 100))),
    version:          1,
    prompt:           userPrompt,
    channelProfileId: profile?.id ?? null,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

function parseSections(text, blueprintSections) {
  // Try to split by [SECTION] markers
  const sectionPattern = /\[([^\]]+)\]/g
  const parts = text.split(sectionPattern)
  // parts: [before first marker, label1, content1, label2, content2, ...]
  const parsed = []
  for (let i = 1; i < parts.length; i += 2) {
    parsed.push({
      label:   parts[i] ?? '',
      content: (parts[i + 1] ?? '').trim(),
    })
  }

  // Merge with blueprint sections to preserve type metadata
  return blueprintSections.map((sec, idx) => ({
    id:           sec.id ?? uid(),
    type:         sec.type ?? 'product',
    label:        sec.label,
    duration:     sec.duration ?? 60,
    instructions: sec.instructions ?? '',
    content:      parsed[idx]?.content ?? parsed.find((p) => p.label.toLowerCase().includes(sec.label.toLowerCase()))?.content ?? '',
  }))
}

export async function regenerateSection(env, { scriptId, sectionIndex, instructions }) {
  const openaiKey = await resolveOpenAIKey(env)
  const db        = getDb(env)

  const { data: script, error } = await db.from('scripts').select('*').eq('id', scriptId).single()
  if (error || !script) throw new Error('Roteiro não encontrado')

  const sections = script.sections ?? []
  const section  = sections[sectionIndex]
  if (!section) throw new Error(`Seção ${sectionIndex} não encontrada`)

  // Resolve channel profile for context
  let profile = null
  if (script.channelProfileId) {
    try {
      const { data } = await db.from('channel_profiles').select('*').eq('id', script.channelProfileId).single()
      profile = data
    } catch {}
  }

  const contextSections = sections.map((s, i) => {
    if (i === sectionIndex) return `[${s.label}] (REESCREVER ESTA SEÇÃO)`
    return `[${s.label}]: ${s.content?.slice(0, 100) ?? ''}…`
  }).join('\n')

  const sysPrompt = `Você é um roteirista de YouTube. Reescreva APENAS a seção indicada mantendo consistência com o restante do roteiro.
Tom: ${profile?.tone ?? 'energético e informativo'}. Idioma: ${script.language?.toUpperCase() ?? 'PT'}.
Retorne APENAS o conteúdo da seção, sem marcadores extras.`

  const userPrompt = `ROTEIRO ATUAL (contexto):
${contextSections}

REESCREVA a seção "${section.label}" com as seguintes instruções adicionais:
${instructions || 'Melhore o engajamento e o apelo à ação. Mantenha o tom do canal.'}

Duração alvo: ~${Math.round((section.duration ?? 60) / 60 * 130)} palavras.`

  const { text } = await callOpenAI(openaiKey, env.LLM_MODEL ?? 'gpt-4o-mini', sysPrompt, userPrompt, 800)

  sections[sectionIndex] = { ...section, content: text.trim() }

  const { data: updated, error: uErr } = await db
    .from('scripts')
    .update({ sections, updatedAt: new Date().toISOString() })
    .eq('id', scriptId)
    .select()
    .single()
  if (uErr) throw new Error(uErr.message)
  return updated
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
