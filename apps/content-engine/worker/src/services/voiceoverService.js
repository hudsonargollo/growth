import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Voice catalogues ──────────────────────────────────────────────────────────

export const OPENAI_VOICES = [
  { id: 'nova',    label: 'Nova',    lang: 'PT/EN', gender: 'F', description: 'quente e natural' },
  { id: 'shimmer', label: 'Shimmer', lang: 'PT/EN', gender: 'F', description: 'clara e articulada' },
  { id: 'alloy',   label: 'Alloy',   lang: 'PT/EN', gender: 'N', description: 'equilibrada e versátil' },
  { id: 'echo',    label: 'Echo',    lang: 'PT/EN', gender: 'M', description: 'suave e conversacional' },
  { id: 'onyx',    label: 'Onyx',    lang: 'PT/EN', gender: 'M', description: 'grave e autoritativa' },
  { id: 'fable',   label: 'Fable',   lang: 'PT/EN', gender: 'M', description: 'expressiva e narrativa' },
]

export const ELEVENLABS_VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Valentina', lang: 'PT-BR', gender: 'F', description: 'voz feminina brasileira natural' },
  { id: 'gD1IexrzCvsXPHUuT0s3', label: 'Rafael',    lang: 'PT-BR', gender: 'M', description: 'voz masculina brasileira' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel',    lang: 'EN',    gender: 'F', description: 'calm and professional' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antonio',   lang: 'ES',    gender: 'M', description: 'well-rounded' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella',     lang: 'EN',    gender: 'F', description: 'warm and expressive' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam',      lang: 'EN',    gender: 'M', description: 'deep and authoritative' },
]

// ── Text helpers ──────────────────────────────────────────────────────────────

/**
 * Clean a raw script string so it reads naturally when spoken by a TTS engine.
 * Removes markdown syntax, stage directions, section headers, and formatting symbols.
 */
function cleanForTTS(raw) {
  return raw
    // Remove full lines that are ONLY stage directions / production notes in brackets
    .replace(/^\s*\[.*?\]\s*$/gm, '')
    // Remove inline stage directions between brackets (e.g. [corte rápido])
    .replace(/\[.*?\]/g, '')
    // Remove markdown headings (## Seção, # Título)
    .replace(/^#{1,6}\s*/gm, '')
    // Remove ROTEIRO: prefix lines  (e.g. "# ROTEIRO: Cadeira Gamer…")
    .replace(/^ROTEIRO:\s*/gim, '')
    // Remove bold/italic markers  (**texto**, *texto*, __texto__, _texto_)
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // Remove horizontal rules  --- or ___
    .replace(/^[-_]{3,}\s*$/gm, '')
    // Remove markdown-style list bullets at line start
    .replace(/^\s*[-*•]\s+/gm, '')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n').map((l) => l.trim()).join('\n')
    .trim()
}

function scriptToText(script) {
  // Prefer structured sections, fall back to raw text blob
  const sections = script.sections ?? []
  const raw = sections.length > 0
    ? sections.map((s) => s.content ?? '').filter(Boolean).join('\n\n')
    : (script.text ?? '')
  return cleanForTTS(raw)
}

function estimateDuration(byteLength, format = 'mp3') {
  // 128kbps MP3 ≈ 16 KB/s; opus ~8 KB/s
  const bytesPerSec = format === 'opus' ? 8000 : 16000
  const secs = Math.round(byteLength / bytesPerSec)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────

async function generateOpenAI(env, { text, voiceId, model = 'tts-1' }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY não configurada — adicione em Configurações')

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,               // tts-1 or tts-1-hd
      input: text,
      voice: voiceId,      // alloy | echo | fable | onyx | nova | shimmer
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS error ${res.status}: ${err.slice(0, 200)}`)
  }

  return res.arrayBuffer()
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

async function generateElevenLabs(env, { text, voiceId, stability, similarityBoost }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'ELEVENLABS_API_KEY')
  if (!key) throw new Error('ELEVENLABS_API_KEY não configurada — adicione em Configurações')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   key,
      'Content-Type': 'application/json',
      Accept:         'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs error ${res.status}: ${err.slice(0, 200)}`)
  }

  return res.arrayBuffer()
}

// ── Supabase Storage upload ───────────────────────────────────────────────────

async function ensureBucket(env, bucket) {
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  })
  // 200 = created, 409 = already exists — both are fine
  if (!res.ok && res.status !== 409) {
    const err = await res.text()
    console.warn(`[storage] bucket create ${res.status}: ${err.slice(0, 100)}`)
  }
}

async function uploadAudio(env, { buffer, fileName }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados')
  }

  const upload = () => fetch(
    `${env.SUPABASE_URL}/storage/v1/object/voiceovers/${fileName}`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert':     'true',
      },
      body: buffer,
    }
  )

  let res = await upload()

  if (!res.ok) {
    const errText = await res.text()
    // Bucket doesn't exist — create it and retry once
    if (errText.includes('Bucket not found') || res.status === 400) {
      await ensureBucket(env, 'voiceovers')
      res = await upload()
      if (!res.ok) {
        const err2 = await res.text()
        throw new Error(`Storage upload error ${res.status}: ${err2.slice(0, 200)}`)
      }
    } else {
      throw new Error(`Storage upload error ${res.status}: ${errText.slice(0, 200)}`)
    }
  }

  return `${env.SUPABASE_URL}/storage/v1/object/public/voiceovers/${fileName}`
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateVoiceover(env, {
  scriptId,
  provider    = 'openai',
  voiceId,
  voiceLabel,
  model       = 'tts-1',
  stability   = 0.75,
  similarityBoost = 0.80,
}) {
  const db = getDb(env)

  let script
  {
    const { data, error } = await db
      .from('scripts')
      .select('id, text, sections, language, blueprintId')
      .eq('id', scriptId)
      .single()
    if (error) {
      // sections column may not be in schema cache yet — retry with base columns
      const { data: d2, error: e2 } = await db
        .from('scripts')
        .select('id, text, language, blueprintId')
        .eq('id', scriptId)
        .single()
      if (e2 || !d2) throw new Error(`Roteiro ${scriptId} não encontrado: ${error.message}`)
      script = d2
    } else {
      script = data
    }
  }
  if (!script) throw new Error(`Roteiro ${scriptId} não encontrado`)

  const text = scriptToText(script)
  if (!text) throw new Error('Roteiro sem conteúdo — gere o roteiro primeiro')

  // Truncate to provider limits (OpenAI: 4096 chars per request; ElevenLabs: varies by plan)
  const MAX_CHARS = provider === 'openai' ? 4096 : 5000
  const textToSynth = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text

  let audioBuffer
  if (provider === 'openai') {
    const voice = voiceId ?? 'nova'
    audioBuffer = await generateOpenAI(env, { text: textToSynth, voiceId: voice, model })
  } else {
    const voice = voiceId ?? ELEVENLABS_VOICES[0].id
    audioBuffer = await generateElevenLabs(env, { text: textToSynth, voiceId: voice, stability, similarityBoost })
  }

  const fileName = `${scriptId}-${provider}-${Date.now()}.mp3`
  const fileUrl  = await uploadAudio(env, { buffer: audioBuffer, fileName })
  const duration = estimateDuration(audioBuffer.byteLength)

  const fullRow = {
    id:             uid(),
    scriptId,
    provider,
    voiceModel:     voiceLabel ?? voiceId,
    voiceId,
    fileUrl,
    duration,
    charCount:      textToSynth.length,
    bitrate:        '128kbps',
    stability,
    similarityBoost,
    status:         'completed',
  }

  let { data, error } = await db.from('voiceovers').insert(fullRow).select().single()

  if (error) {
    // provider/charCount columns may not be in schema cache — use only Prisma-original columns
    const baseRow = {
      id:             fullRow.id,
      scriptId,
      fileUrl,
      duration,
      voiceModel:     fullRow.voiceModel,
      voiceId:        voiceId ?? '',
      bitrate:        '128kbps',
      stability,
      similarityBoost,
      status:         'completed',
    }
    const { data: d2, error: e2 } = await db.from('voiceovers').insert(baseRow).select().single()
    if (e2) throw new Error(e2.message)
    data = d2
  }

  return data
}

export async function listVoiceovers(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('voiceovers')
    .select('id, scriptId, provider, voiceModel, voiceId, fileUrl, duration, status, createdAt, scripts(blueprintId, language)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) {
    // provider/voiceId may not be in schema cache — fall back to guaranteed columns
    const { data: d2, error: e2 } = await db
      .from('voiceovers')
      .select('id, scriptId, voiceModel, fileUrl, duration, status, createdAt')
      .order('createdAt', { ascending: false })
      .limit(50)
    if (e2) throw new Error(e2.message)
    return d2 ?? []
  }
  return data
}
