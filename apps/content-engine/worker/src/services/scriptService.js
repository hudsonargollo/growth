import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const FALLBACK_BLUEPRINTS = {
  'top-5-custo-beneficio': {
    name: 'Top 5 Custo-Benefício',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',                    duration: 60,  instructions: 'Hook forte com a promessa de revelar os 5 melhores produtos custo-benefício. Inclua aviso de afiliado.' },
      { id: 's2', type: 'product', label: 'Critérios de Seleção',        duration: 45,  instructions: 'Explique brevemente os critérios usados para ranquear os produtos.' },
      { id: 's3', type: 'product', label: 'Produto #5',                  duration: 90,  instructions: 'Apresente o produto, preço, pontos positivos e para quem vale.' },
      { id: 's4', type: 'product', label: 'Produto #4',                  duration: 90,  instructions: 'Apresente o produto, destaque o diferencial em relação ao #5.' },
      { id: 's5', type: 'product', label: 'Produto #3',                  duration: 120, instructions: 'Análise mais detalhada, prós e contras principais.' },
      { id: 's6', type: 'product', label: 'Produto #2',                  duration: 120, instructions: 'Análise detalhada, por que quase chegou ao topo.' },
      { id: 's7', type: 'product', label: 'Produto #1 — Melhor Escolha', duration: 150, instructions: 'O campeão: análise completa, por que é o melhor custo-benefício, link afiliado com destaque.' },
      { id: 's8', type: 'cta',     label: 'CTA Final',                   duration: 45,  instructions: 'Convite para se inscrever, ativar notificações e acessar os links na descrição.' },
    ],
  },
  'comparacao-1x1': {
    name: 'Comparação 1x1',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',              duration: 60,  instructions: 'Hook: qual dos dois você escolheria? Crie suspense. Aviso de afiliado.' },
      { id: 's2', type: 'product', label: 'Apresentação dos Dois', duration: 90,  instructions: 'Apresente ambos os produtos, preços e posicionamento de mercado.' },
      { id: 's3', type: 'product', label: 'Design e Construção',   duration: 90,  instructions: 'Compare qualidade de materiais, ergonomia e acabamento.' },
      { id: 's4', type: 'product', label: 'Performance e Recursos', duration: 120, instructions: 'Compare funcionalidades, testes práticos e resultados.' },
      { id: 's5', type: 'product', label: 'Custo-Benefício',        duration: 90,  instructions: 'Compare preço vs valor entregue por cada um.' },
      { id: 's6', type: 'product', label: 'Veredicto Final',        duration: 75,  instructions: 'Declare o vencedor, para quem cada um é indicado e os links afiliados.' },
      { id: 's7', type: 'cta',     label: 'CTA Final',              duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
  'review-detalhado': {
    name: 'Review Detalhado',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',                  duration: 60,  instructions: 'Hook com a principal dor que o produto resolve. Aviso de afiliado.' },
      { id: 's2', type: 'product', label: 'Visão Geral',               duration: 90,  instructions: 'O que é, para quem é, posicionamento de preço no mercado.' },
      { id: 's3', type: 'product', label: 'Unboxing e Design',         duration: 90,  instructions: 'Materiais, acabamento, o que vem na caixa, primeiras impressões.' },
      { id: 's4', type: 'product', label: 'Funcionalidades e Testes',  duration: 150, instructions: 'Teste prático de cada função principal, resultados reais.' },
      { id: 's5', type: 'product', label: 'Prós e Contras',            duration: 90,  instructions: 'Lista honesta de pontos positivos e negativos.' },
      { id: 's6', type: 'product', label: 'Para Quem Vale a Pena?',    duration: 60,  instructions: 'Perfil do comprador ideal, alternativas e faixa de preço justa.' },
      { id: 's7', type: 'cta',     label: 'CTA Final',                 duration: 45,  instructions: 'Link afiliado com urgência, inscrição e notificações.' },
    ],
  },
  'top-n-review': { name: 'Top-N Avaliação de Produtos', sections: [
    { id: 's1', type: 'intro',   label: 'Abertura',   duration: 60,  instructions: '' },
    { id: 's2', type: 'product', label: 'Produto #5', duration: 90,  instructions: '' },
    { id: 's3', type: 'product', label: 'Produto #4', duration: 90,  instructions: '' },
    { id: 's4', type: 'product', label: 'Produto #3', duration: 120, instructions: '' },
    { id: 's5', type: 'product', label: 'Produto #2', duration: 120, instructions: '' },
    { id: 's6', type: 'product', label: 'Produto #1', duration: 150, instructions: '' },
    { id: 's7', type: 'cta',     label: 'CTA Final',  duration: 45,  instructions: '' },
  ]},
}

async function llm(env, opts) {
  const { callLLM } = await import('../lib/llm.js')
  return callLLM(env, opts)
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

    const reviews = (p.blogReviews ?? []).slice(0, 3)
    const reviewBlock = reviews.length
      ? `\n   Opiniões de blogs:\n${reviews.map(r => `   • [${r.source}] ${r.snippet}`).join('\n')}`
      : ''

    return `${i + 1}. ${p.title}\n   Preço: ${price} | Avaliação: ${p.rating || '—'}★ | Reviews: ${(p.reviews ?? 0).toLocaleString()} | Marketplace: ${p.marketplace}${links ? `\n   Links afiliado: ${links}` : ''}${reviewBlock}`
  }).join('\n\n')
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


export async function generateScript(env, { blueprintId, blueprintData, catalogIds, productIds, language, channelProfileId }) {
  const db = getDb(env)

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
Quando "Opiniões de blogs" estiverem disponíveis para um produto, use os snippets como base factual para pontos técnicos, prós/contras e argumentos de venda — mas reescreva com a voz do canal, nunca copie literalmente.
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

  const text = await llm(env, { system: systemPrompt, prompt: userPrompt, maxTokens: 3000 })

  // Parse sections from the generated text
  const parsedSections = parseSections(text, sections)

  const dateStr     = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const productName = products[0]?.title?.slice(0, 40)
  const scriptTitle = productName
    ? `${blueprint.name} — ${productName}`
    : `${blueprint.name} · ${dateStr}`

  const baseRow = {
    id:             uid(),
    catalogEntryId: null,
    blueprintId:    blueprint.id ?? blueprintId ?? 'custom',
    text,
    language:       language ?? 'pt',
    confidence:     92,
    version:        1,
    prompt:         userPrompt,
  }

  // Try progressively simpler inserts as schema columns may not exist yet
  async function tryInsert(row) {
    const { data, error } = await db.from('scripts').insert(row).select().single()
    return { data, error }
  }

  const fullRow = { ...baseRow, sections: parsedSections, title: scriptTitle, ...(profile?.id ? { channelProfileId: profile.id } : {}) }

  let { data: saved, error: err } = await tryInsert(fullRow)

  if (err) {
    const msg = err.message ?? ''
    if (msg.includes('channelProfileId')) {
      // Strip channelProfileId and retry
      const { channelProfileId: _, ...withoutProfile } = fullRow
      ;({ data: saved, error: err } = await tryInsert(withoutProfile))
    }
    if (err && (msg.includes('sections') || msg.includes('title') || err.message?.includes('sections') || err.message?.includes('title'))) {
      // Strip new columns entirely and retry with base row
      ;({ data: saved, error: err } = await tryInsert(baseRow))
    }
    if (err) throw new Error(err.message)
  }

  return saved
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
  const db = getDb(env)

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

  const text = await llm(env, { system: sysPrompt, prompt: userPrompt, maxTokens: 800 })

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
  if (error) {
    // Schema cache may be ahead of DB — fall back to guaranteed base columns
    const { data: fallback, error: e2 } = await db
      .from('scripts')
      .select('id, "catalogEntryId", "blueprintId", text, language, confidence, version, "createdAt"')
      .order('createdAt', { ascending: false })
      .limit(50)
    if (e2) throw new Error(e2.message)
    return fallback ?? []
  }
  return data
}
