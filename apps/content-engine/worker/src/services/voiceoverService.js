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

function scriptToText(script) {
  // Prefer structured sections, fall back to raw text blob
  const sections = script.sections ?? []
  if (sections.length > 0) {
    return sections
      .map((s) => s.content ?? '')
      .filter(Boolean)
      .join('\n\n')
  }
  return script.text ?? ''
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

async function uploadAudio(env, { buffer, fileName }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados')
  }

  const res = await fetch(
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Storage upload error ${res.status}: ${err.slice(0, 200)}`)
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

  const { data: script, error: sErr } = await db
    .from('scripts')
    .select('id, text, sections, title, blueprintId, language')
    .eq('id', scriptId)
    .single()
  if (sErr || !script) throw new Error(`Roteiro ${scriptId} não encontrado`)

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

  const { data, error } = await db.from('voiceovers').insert({
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
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function listVoiceovers(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('voiceovers')
    .select('id, scriptId, provider, voiceModel, voiceId, fileUrl, duration, status, createdAt, scripts(title, blueprintId, language)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
