/**
 * storyboardService — Higgsfield Storyboard & Video Automation Pipeline
 *
 * Phase 1 · Shot List:   LLM parses script → scenes with MCSLA image prompts
 * Phase 2 · Reference:   Product image_url auto-fetched from Supabase, injected as reference
 * Phase 3 · Static Frames: Higgsfield (nano-banana-pro) generates start frame per scene
 * Phase 4 · Animation:   Higgsfield (seedance-2.0) image-to-video per scene
 *
 * State is stored in KV1 under key `storyboard:{scriptId}` so no new Supabase table is needed.
 */

import { getDb }           from '../lib/db.js'
import { uid }             from '../lib/uid.js'
import { callLLM }         from '../lib/llm.js'
import { generate, getStatus } from './higgsfieldService.js'
import { buildMcslaPrompt }    from '../lib/mcsla.js'

const KV_PREFIX = 'storyboard:'

// ── KV helpers ────────────────────────────────────────────────────────────────

async function readSb(env, scriptId) {
  if (!env.KV1) return null
  return env.KV1.get(`${KV_PREFIX}${scriptId}`, { type: 'json' })
}

async function writeSb(env, scriptId, data) {
  if (!env.KV1) throw new Error('KV1 não configurado — verifique wrangler.toml')
  await env.KV1.put(`${KV_PREFIX}${scriptId}`, JSON.stringify(data))
  return data
}

// ── Product resolution ────────────────────────────────────────────────────────

async function fetchProducts(env, productIds) {
  if (!productIds?.length) return []
  const db = getDb(env)
  let { data, error } = await db
    .from('products')
    .select('id, title, imageUrl, price, rating, reviewImages')
    .in('id', productIds)
  // reviewImages column may not exist yet (pre-migration 009) — retry without it
  if (error) {
    ;({ data } = await db
      .from('products')
      .select('id, title, imageUrl, price, rating')
      .in('id', productIds))
  }
  return data ?? []
}

// ── Phase 1: Shot List Generation ─────────────────────────────────────────────

export async function generateShotList(env, {
  scriptId,
  scriptText,
  blueprintType = 'longform',
  productIds    = [],
}) {
  const products    = await fetchProducts(env, productIds)
  const isShortForm = blueprintType.includes('short')
  const aspectRatio = isShortForm ? '9:16' : '16:9'
  const maxScenes   = isShortForm ? 6 : 20
  const sceneDur    = isShortForm ? '3-5' : '5-10'

  const productContext = products.length
    ? products.map((p, i) => `Produto ${i + 1}: "${p.title}" (id: ${p.id})`).join('\n')
    : 'Produto não especificado — crie cenas genéricas de produto.'

  const system = `Você é um Diretor de Criação especializado em vídeos de afiliados para YouTube.
Sua tarefa é dividir um roteiro em uma shot list visual para geração de imagens/vídeos com IA.
Regras obrigatórias:
- Cada cena representa ${sceneDur} segundos de narração
- Máximo de ${maxScenes} cenas no total
- Os prompts MCSLA devem ser escritos em INGLÊS (melhor performance nos modelos de imagem)
- O produto deve aparecer em destaque em sua cena específica
- Varie os ângulos: hero shot, close-up de detalhe, perspectiva de uso, ambiente
- Não inclua texto legível na cena (modelos de imagem geram texto incorreto)
Retorne APENAS JSON válido, sem markdown.`

  const userPrompt = `ROTEIRO:
${scriptText}

PRODUTOS:
${productContext}

Retorne um array JSON (máximo ${maxScenes} itens). Cada item:
{"scene_id":"scene-1","dialogue_text":"resumo curto da narração (máx 15 palavras)","duration_estimate":7,"product_id":"id-ou-null","mcsla":{"composition":"...","subject":"...","lighting":"...","aesthetic":"..."},"aspect_ratio":"${aspectRatio}"}

IMPORTANTE: dialogue_text deve ter NO MÁXIMO 15 palavras. JSON compacto, sem espaços extras.`

  // Request plain text so we control JSON parsing — avoids hard failures on truncation
  let rawText
  try {
    rawText = await callLLM(env, { system, prompt: userPrompt, maxTokens: 6000 })
  } catch (e) {
    throw new Error(`Falha ao gerar shot list: ${e.message}`)
  }

  // Strip markdown fences if present
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let rawScenes
  try {
    rawScenes = JSON.parse(cleaned)
  } catch {
    // Try to recover a partial array: find the last complete scene object
    const lastBrace = cleaned.lastIndexOf('},')
    if (lastBrace > 0) {
      try { rawScenes = JSON.parse(cleaned.slice(0, lastBrace + 1) + ']') } catch {}
    }
    if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
      throw new Error('A IA retornou JSON inválido para o shot list. Tente novamente.')
    }
  }

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))
  const scenes = (Array.isArray(rawScenes) ? rawScenes : []).slice(0, maxScenes).map((s, i) => ({
    scene_id:                    s.scene_id ?? `scene-${i + 1}`,
    dialogue_text:               s.dialogue_text ?? '',
    duration_estimate:           Number(s.duration_estimate) || 7,
    product_id:                  s.product_id ?? null,
    product_image_url:           s.product_id ? (productMap[s.product_id]?.imageUrl ?? null) : null,
    // Google review images/graphics for this product — available as B-roll /
    // reference assets in the video pipeline. Up to 3 URLs per scene.
    review_image_urls:           s.product_id
      ? (productMap[s.product_id]?.reviewImages ?? []).map(img => img?.url).filter(Boolean).slice(0, 3)
      : [],
    mcsla:                       s.mcsla ?? { subject: 'product on clean background' },
    aspect_ratio:                s.aspect_ratio ?? aspectRatio,
    // generation state
    frame_status:                'pending',   // pending | generating | done | error
    video_status:                'pending',
    frame_url:                   null,
    video_url:                   null,
    higgsfield_frame_request_id: null,
    higgsfield_video_request_id: null,
    error:                       null,
  }))

  const storyboard = {
    id:             uid(),
    script_id:      scriptId,
    blueprint_type: blueprintType,
    aspect_ratio:   aspectRatio,
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
    status:         'shot_list_ready',
    product_ids:    productIds,
    scenes,
  }

  return writeSb(env, scriptId, storyboard)
}

// ── Phase 3: Static Frame Generation ─────────────────────────────────────────

export async function generateFrame(env, { scriptId, sceneIndex, overrideMcsla }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado — gere o shot list primeiro')

  const scene = sb.scenes[sceneIndex]
  if (!scene) throw new Error(`Cena ${sceneIndex} não encontrada`)

  const mcslaRaw = overrideMcsla ? { ...scene.mcsla, ...overrideMcsla } : scene.mcsla

  // Validate MCSLA has a subject at minimum
  if (!mcslaRaw.subject) mcslaRaw.subject = 'product on clean background'

  let result
  try {
    result = await generate(env, {
      intent:      'storyboard',                                // nano-banana-pro
      mcsla:       mcslaRaw,
      aspectRatio: scene.aspect_ratio ?? sb.aspect_ratio ?? '16:9',
      ...(scene.product_image_url ? { imageUrl: scene.product_image_url } : {}),
    })
  } catch (e) {
    sb.scenes[sceneIndex] = { ...scene, frame_status: 'error', error: e.message }
    await writeSb(env, scriptId, sb)
    throw e
  }

  sb.scenes[sceneIndex] = {
    ...scene,
    ...(overrideMcsla ? { mcsla: mcslaRaw } : {}),
    frame_status:                'generating',
    higgsfield_frame_request_id: result.requestId,
    frame_url:                   null,
    error:                       null,
  }
  sb.status     = 'frames_generating'
  sb.updated_at = new Date().toISOString()

  return writeSb(env, scriptId, sb)
}

export async function generateAllFrames(env, { scriptId }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  // Fire all pending/errored scenes in parallel; don't throw on individual failures
  await Promise.allSettled(
    sb.scenes.map((scene, i) =>
      (scene.frame_status === 'pending' || scene.frame_status === 'error')
        ? generateFrame(env, { scriptId, sceneIndex: i })
        : Promise.resolve()
    )
  )

  return readSb(env, scriptId)
}

// ── Frame status polling ───────────────────────────────────────────────────────

export async function pollFrameStatus(env, { scriptId }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  let changed = false

  await Promise.allSettled(
    sb.scenes.map(async (scene, i) => {
      if (scene.frame_status !== 'generating' || !scene.higgsfield_frame_request_id) return
      try {
        const status = await getStatus(env, scene.higgsfield_frame_request_id)
        if (status.status === 'COMPLETED' && status.mediaUrl?.length) {
          sb.scenes[i] = { ...scene, frame_status: 'done', frame_url: status.mediaUrl[0] }
          changed = true
        } else if (status.status === 'FAILED' || status.status === 'ERROR') {
          sb.scenes[i] = { ...scene, frame_status: 'error', error: 'Geração falhou no Higgsfield' }
          changed = true
        }
      } catch (e) {
        sb.scenes[i] = { ...scene, frame_status: 'error', error: e.message }
        changed = true
      }
    })
  )

  const allSettled = sb.scenes.every(s => s.frame_status === 'done' || s.frame_status === 'error')
  if (allSettled && sb.status === 'frames_generating') {
    sb.status = 'frames_ready'
    changed = true
  }

  if (changed) {
    sb.updated_at = new Date().toISOString()
    return writeSb(env, scriptId, sb)
  }
  return sb
}

// ── Phase 4: Video Animation ───────────────────────────────────────────────────

export async function animateScene(env, { scriptId, sceneIndex }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  const scene = sb.scenes[sceneIndex]
  if (!scene) throw new Error(`Cena ${sceneIndex} não encontrada`)
  if (!scene.frame_url) throw new Error('Frame estático não gerado — gere os frames primeiro')

  const mcslaMotion = {
    ...scene.mcsla,
    subject: `${scene.mcsla?.subject ?? 'product'}, smooth cinematic motion, subtle camera push-in`,
    aesthetic: `${scene.mcsla?.aesthetic ?? 'editorial'}, 4-8 second clip, no cuts`,
  }

  let result
  try {
    result = await generate(env, {
      intent:      'kinetic',                         // seedance-2.0 (4-15s clips)
      mcsla:       mcslaMotion,
      aspectRatio: scene.aspect_ratio ?? sb.aspect_ratio ?? '16:9',
      imageUrl:    scene.frame_url,                   // start frame → image-to-video
    })
  } catch (e) {
    sb.scenes[sceneIndex] = { ...scene, video_status: 'error', error: e.message }
    await writeSb(env, scriptId, sb)
    throw e
  }

  sb.scenes[sceneIndex] = {
    ...scene,
    video_status:                'generating',
    higgsfield_video_request_id: result.requestId,
    video_url:                   null,
    error:                       null,
  }
  sb.status     = 'animating'
  sb.updated_at = new Date().toISOString()

  return writeSb(env, scriptId, sb)
}

export async function animateAll(env, { scriptId }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  await Promise.allSettled(
    sb.scenes.map((scene, i) =>
      scene.frame_status === 'done' && (scene.video_status === 'pending' || scene.video_status === 'error')
        ? animateScene(env, { scriptId, sceneIndex: i })
        : Promise.resolve()
    )
  )

  return readSb(env, scriptId)
}

export async function pollVideoStatus(env, { scriptId }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  let changed = false

  await Promise.allSettled(
    sb.scenes.map(async (scene, i) => {
      if (scene.video_status !== 'generating' || !scene.higgsfield_video_request_id) return
      try {
        const status = await getStatus(env, scene.higgsfield_video_request_id)
        if (status.status === 'COMPLETED' && status.mediaUrl?.length) {
          sb.scenes[i] = { ...scene, video_status: 'done', video_url: status.mediaUrl[0] }
          changed = true
        } else if (status.status === 'FAILED' || status.status === 'ERROR') {
          sb.scenes[i] = { ...scene, video_status: 'error', error: 'Animação falhou' }
          changed = true
        }
      } catch (e) {
        sb.scenes[i] = { ...scene, video_status: 'error', error: e.message }
        changed = true
      }
    })
  )

  const allDone = sb.scenes.every(s => s.video_status === 'done' || s.video_status === 'error')
  if (allDone && sb.status === 'animating') {
    sb.status = 'done'
    changed = true
  }

  if (changed) {
    sb.updated_at = new Date().toISOString()
    return writeSb(env, scriptId, sb)
  }
  return sb
}

// ── Read / Update ─────────────────────────────────────────────────────────────

export async function getStoryboard(env, scriptId) {
  return readSb(env, scriptId)
}

export async function updateSceneMcsla(env, { scriptId, sceneIndex, mcsla }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  const scene = sb.scenes[sceneIndex]
  if (!scene) throw new Error(`Cena ${sceneIndex} não encontrada`)

  sb.scenes[sceneIndex] = {
    ...scene,
    mcsla:        { ...scene.mcsla, ...mcsla },
    frame_status: 'pending',   // reset so user can regenerate with new prompt
    frame_url:    null,
    error:        null,
  }
  sb.updated_at = new Date().toISOString()

  return writeSb(env, scriptId, sb)
}

export async function updateProductReference(env, { scriptId, sceneIndex, productImageUrl }) {
  const sb = await readSb(env, scriptId)
  if (!sb) throw new Error('Storyboard não encontrado')

  const scene = sb.scenes[sceneIndex]
  if (!scene) throw new Error(`Cena ${sceneIndex} não encontrada`)

  sb.scenes[sceneIndex] = { ...scene, product_image_url: productImageUrl, frame_status: 'pending', frame_url: null }
  sb.updated_at = new Date().toISOString()

  return writeSb(env, scriptId, sb)
}

export async function deleteStoryboard(env, scriptId) {
  if (!env.KV1) return
  await env.KV1.delete(`${KV_PREFIX}${scriptId}`)
}
