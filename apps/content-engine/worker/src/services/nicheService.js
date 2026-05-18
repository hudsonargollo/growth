const LONGFORM_PROMPT = (year) => `
Act like an elite YouTube affiliate marketing strategist specializing in long-form, faceless product review videos for the Brazilian market.
Your task is to find the best niches and products for the YouTube channel "Me Ajuda Na Escolha" (Help Me Choose). This channel creates 8-to-12-minute "Top 5" or "Top 3" countdown listicles focused on helping consumers find the best "cost-benefit" (custo-benefício) products, driving affiliate sales through Amazon Brasil and Mercado Livre.
Find 5 specific product categories that are currently trending in ${year}, have high search volume in Brazil, and possess strong affiliate monetization potential right now.
For each of the 5 categories, give me:
Why it fits the channel: Why this category performs exceptionally well in a long-form "Top 5 Countdown" video format.
Target Audience: The specific demographic and pain points of the Brazilian consumers buying these products.
Earning Potential: Estimated affiliate commission range and whether it is best for high-volume low-ticket sales or high-ticket considered purchases.
Review Angle: The best technical angle to focus on during the review (e.g., energy efficiency, smart home integration, durability, time-saving).
The Hook: An example of a strong, long-form curiosity hook tailored to this specific product's main pain point.
Saturation: How saturated this specific niche currently is on Brazilian YouTube product review channels.
SEO Title Example: The easiest, highest-converting SEO title using the channel's standard formula (e.g., "As 5 Melhores [Produto] Custo-benefício em ${year}...").
Then, rank all 5 categories based on:
Current earning potential (commission rates vs. conversion likelihood).
Ease of maintaining high viewer retention in a long-form video.
Ease of researching technical specs and buyer reviews for the script.
Long-term, evergreen scalability (will people still search for this next year?).
Keep it highly practical and focused on realistic money-making opportunities in the Brazilian e-commerce space, avoiding generic or overly broad advice.

Respond ONLY with a valid JSON object using this exact structure (all text in Brazilian Portuguese):
{
  "year": ${year},
  "format": "longform",
  "niches": [
    {
      "rank": 1,
      "category": "Nome da categoria para busca (ex: fone de ouvido bluetooth)",
      "searchKeyword": "palavra-chave principal no YouTube",
      "whyItFits": "Por que funciona muito bem no formato Top 5...",
      "targetAudience": "Quem compra e qual a dor principal...",
      "commissionRange": "ex: R$15–80 por venda",
      "salesType": "alto volume baixo ticket",
      "reviewAngle": "Ângulo técnico principal da review...",
      "hook": "Exemplo de gancho de abertura para o vídeo...",
      "saturation": "baixa",
      "seoTitle": "Os 5 Melhores [Produto] Custo-benefício em ${year} | Qual Comprar?",
      "scores": {
        "earningPotential": 9,
        "retention": 8,
        "researchability": 7,
        "evergreen": 9
      }
    }
  ]
}

saturation must be exactly one of: "baixa", "média", "alta"
salesType must be exactly one of: "alto volume baixo ticket", "alto ticket considerado", "equilibrado"
scores are integers 1–10. rank the niches by total score descending (rank 1 = best overall).
`.trim()

const SHORTFORM_PROMPT = (year) => `
Act like an elite affiliate marketing strategist specializing in short-form vertical content (TikTok, Instagram Reels, and YouTube Shorts) for the Brazilian market.
Your task is to find the best niches and products for the channel "Me Ajuda Na Escolha" (Help Me Choose) to use in their short-form content strategy. This channel focuses on helping consumers find the best "cost-benefit" (custo-benefício) products, driving affiliate sales through Amazon Brasil and Mercado Livre.
Unlike their long-form videos, these short-form videos must be 30 to 60 seconds long, highly visual, fast-paced, and optimized for immediate impulse clicks.
Find 5 specific product categories or items that are currently trending in ${year}, have high viral potential on short-form platforms in Brazil, and possess strong affiliate monetization potential right now.
For each of the 5 categories, give me:
Why it fits short-form: Why this category performs exceptionally well on TikTok/Reels/Shorts (e.g., visually satisfying, solves an immediate pain point, high impulse buy rate).
Target Audience: The specific demographic of Brazilian consumers buying these products.
Earning Potential: Estimated affiliate commission range.
Best-Performing Video Style: The specific format for maximum conversions (e.g., Rapid Top 3 countdown, fast problem/solution, satisfying product demo, or "TikTok made me buy it" aesthetic).
The Hook (First 3 Seconds): An exact, scroll-stopping 3-second hook written in Portuguese that agitates a pain point or builds immense curiosity.
Ticket Type: Is this better for low-ticket impulse buys or mid-ticket considered purchases?
Saturation: How saturated this specific niche currently is on Brazilian short-form platforms.
Easiest Content Angle: The simplest, most effective angle to create a high-converting 30-60 second video.
Then, rank all 5 categories based on:
Current earning potential (commission rates vs. conversion likelihood).
Ease of creating viral short-form content (visual appeal and shareability).
Beginner friendliness (how easy it is to script and find visuals for).
Long-term scalability.
Keep it highly practical, focused on visual engagement, and targeted at realistic money-making opportunities in the Brazilian e-commerce space for short-form content. Avoid generic advice.

Respond ONLY with a valid JSON object using this exact structure (all text in Brazilian Portuguese):
{
  "year": ${year},
  "format": "shortform",
  "niches": [
    {
      "rank": 1,
      "category": "Nome da categoria para busca (ex: organizador de gaveta)",
      "searchKeyword": "hashtag ou termo viral principal",
      "whyItFitsShortForm": "Por que performa muito bem no TikTok/Reels/Shorts...",
      "targetAudience": "Quem compra e qual a dor principal...",
      "commissionRange": "ex: R$5–25 por venda",
      "ticketType": "baixo ticket impulso",
      "bestVideoStyle": "Formato ideal do vídeo (ex: demo satisfatório, Top 3 rápido, antes/depois)...",
      "hook": "Gancho exato dos primeiros 3 segundos em português...",
      "saturation": "baixa",
      "easiestContentAngle": "Ângulo mais simples e eficaz para criar o vídeo...",
      "scores": {
        "earningPotential": 8,
        "viralPotential": 9,
        "beginnerFriendly": 9,
        "evergreen": 7
      }
    }
  ]
}

saturation must be exactly one of: "baixa", "média", "alta"
ticketType must be exactly one of: "baixo ticket impulso", "médio ticket considerado", "alto ticket considerado"
scores are integers 1–10. rank the niches by total score descending (rank 1 = best overall).
`.trim()

async function callOpenAI(env, prompt) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'OPENAI_API_KEY')
  if (!key) {
    throw new Error('OPENAI_API_KEY não configurada — adicione nas Configurações.')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:           env.LLM_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Brazilian affiliate marketing expert. Respond only with valid JSON, no markdown, no explanation.' },
        { role: 'user',   content: prompt },
      ],
      temperature:     0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `OpenAI error ${res.status}`)
  }

  const data    = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Resposta vazia da OpenAI')

  return JSON.parse(content)
}

export async function generateNicheReport(env, { format = 'longform' } = {}) {
  const year   = new Date().getFullYear()
  const prompt = format === 'shortform' ? SHORTFORM_PROMPT(year) : LONGFORM_PROMPT(year)
  const parsed = await callOpenAI(env, prompt)
  return { ...parsed, format, generatedAt: new Date().toISOString() }
}
