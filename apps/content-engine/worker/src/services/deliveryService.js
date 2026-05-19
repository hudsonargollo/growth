import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Evolution API helpers ─────────────────────────────────────────────────────

const EVOLUTION_INSTANCE_KEY = '5ECE11DCEC5C-4C62-8B35-9C2FBEE55F1B'

function evolutionHeaders(env) {
  return {
    'Content-Type': 'application/json',
    'apikey': env.EVOLUTION_INSTANCE_KEY ?? EVOLUTION_INSTANCE_KEY,
  }
}

function evolutionBase(env) {
  return (env.EVOLUTION_API_URL ?? 'https://auto.clubemkt.digital').replace(/\/$/, '')
}

function evolutionInstance(env) {
  return env.EVOLUTION_INSTANCE ?? 'FABRICADECONTEUDO'
}

// Normalise Brazilian phone numbers to Evolution API format (no + or spaces)
function normalisePhone(contact) {
  return contact.replace(/\D/g, '')
}

async function evolutionSendText(env, { number, text }) {
  const base     = evolutionBase(env)
  const instance = evolutionInstance(env)
  const url      = `${base}/message/sendText/${instance}`

  const res = await fetch(url, {
    method:  'POST',
    headers: evolutionHeaders(env),
    body: JSON.stringify({ number: normalisePhone(number), text }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution API error ${res.status}: ${err.slice(0, 300)}`)
  }
  return res.json()
}

async function evolutionSendAudio(env, { number, audioUrl, caption }) {
  const base     = evolutionBase(env)
  const instance = evolutionInstance(env)
  const url      = `${base}/message/sendMedia/${instance}`

  const res = await fetch(url, {
    method:  'POST',
    headers: evolutionHeaders(env),
    body: JSON.stringify({
      number:    normalisePhone(number),
      mediatype: 'audio',
      mimetype:  'audio/mpeg',
      media:     audioUrl,
      fileName:  'narração.mp3',
      caption:   caption ?? '',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[delivery] audio send error:', body.slice(0, 200))
    // Non-fatal — text message already sent
  }
}

// ── Message builder ───────────────────────────────────────────────────────────

function buildMessage(script, voiceoverUrl) {
  const title = script.title || script.blueprintId || 'Roteiro'
  const lines = [
    `📋 *Novo Conteúdo Pronto — Fábrica de Conteúdo*`,
    ``,
    `*Roteiro:* ${title} (${(script.language ?? 'pt').toUpperCase()})`,
  ]

  // Include script text inline if short enough, otherwise just the title
  const sections = script.sections ?? []
  if (sections.length > 0) {
    lines.push(`*Seções:* ${sections.map((s) => s.label).join(' → ')}`)
  }

  if (voiceoverUrl) {
    lines.push(``, `🎙️ Narração em áudio em seguida.`)
  }

  lines.push(``, `_Confirme o recebimento. — Fábrica de Conteúdo_`)
  return lines.join('\n')
}

// ── Main exports ──────────────────────────────────────────────────────────────

export async function sendDelivery(env, { scriptId, voiceoverId, editorContact }) {
  const db = getDb(env)

  const { data: script, error: sErr } = await db
    .from('scripts')
    .select('id, title, blueprintId, language, sections')
    .eq('id', scriptId)
    .single()
  if (sErr || !script) throw new Error(`Roteiro ${scriptId} não encontrado`)

  let voiceoverUrl = null
  if (voiceoverId) {
    const { data: vo } = await db
      .from('voiceovers')
      .select('fileUrl')
      .eq('id', voiceoverId)
      .single()
    voiceoverUrl = vo?.fileUrl ?? null
  }

  const msg = buildMessage(script, voiceoverUrl)

  // 1. Send the text summary
  await evolutionSendText(env, { number: editorContact, text: msg })

  // 2. If voiceover exists, send the audio file as a second message
  if (voiceoverUrl) {
    await evolutionSendAudio(env, {
      number:   editorContact,
      audioUrl: voiceoverUrl,
      caption:  `🎙️ ${script.title || script.blueprintId}`,
    })
  }

  const { data, error } = await db.from('delivery_jobs').insert({
    id:            uid(),
    editorContact,
    scriptId,
    voiceoverId:   voiceoverId ?? null,
    scriptUrl:     null,
    voiceoverUrl,
    status:        'completed',
    sentAt:        new Date().toISOString(),
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function listDeliveries(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('delivery_jobs')
    .select('*, scripts(title, blueprintId, language), voiceovers(voiceModel, duration)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
