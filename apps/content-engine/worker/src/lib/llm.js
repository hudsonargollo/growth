/**
 * Shared LLM caller — prefers Anthropic Claude, falls back to OpenAI.
 * All text generation (scripts, niches) routes through here.
 */
import { resolveKey } from './resolveKey.js'

const CLAUDE_MODEL  = 'claude-haiku-4-5-20251001'
const OPENAI_MODEL  = 'gpt-4o-mini'

export async function callLLM(env, { system, prompt, maxTokens = 2000, json = false }) {
  const anthropicKey = await resolveKey(env, 'ANTHROPIC_API_KEY')
  if (anthropicKey) {
    return callClaude(anthropicKey, env.LLM_MODEL ?? CLAUDE_MODEL, { system, prompt, maxTokens, json })
  }

  const openaiKey = await resolveKey(env, 'OPENAI_API_KEY')
  if (openaiKey) {
    return callOpenAI(openaiKey, env.LLM_MODEL_OPENAI ?? OPENAI_MODEL, { system, prompt, maxTokens, json })
  }

  throw new Error('Nenhuma chave de LLM configurada — adicione ANTHROPIC_API_KEY ou OPENAI_API_KEY em Configurações')
}

async function callClaude(apiKey, model, { system, prompt, maxTokens, json }) {
  const messages = [{ role: 'user', content: prompt }]
  if (json) {
    messages[0].content += '\n\nResponda APENAS com JSON válido, sem markdown, sem explicações.'
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system:     system ?? 'You are a helpful assistant.',
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Anthropic API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  if (!text) throw new Error('Resposta vazia da Anthropic')

  if (json) {
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    return JSON.parse(cleaned)
  }
  return text
}

async function callOpenAI(apiKey, model, { system, prompt, maxTokens, json }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system ?? 'You are a helpful assistant.' },
        { role: 'user',   content: prompt },
      ],
      temperature:     0.7,
      max_tokens:      maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('Resposta vazia da OpenAI')

  return json ? JSON.parse(text) : text
}
