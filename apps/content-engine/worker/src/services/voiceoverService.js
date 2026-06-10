import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

// ── Voice catalogues ──────────────────────────────────────────────────────────

export const OPENAI_VOICES = [
  { id: 'nova',    label: 'Nova',    lang: 'PT/EN', gender: 'F', description: 'quente e natural' },
  { id: 'shimmer', label: 'Shimmer', lang: 'PT/EN', gender: 'F', description: 'clara e articulada' },
  { id: 'coral',   label: 'Coral',   lang: 'PT/EN', gender: 'F', description: 'amigável e expressiva' },
  { id: 'sage',    label: 'Sage',    lang: 'PT/EN', gender: 'F', description: 'calma e madura' },
  { id: 'alloy',   label: 'Alloy',   lang: 'PT/EN', gender: 'N', description: 'equilibrada e versátil' },
  { id: 'ash',     label: 'Ash',     lang: 'PT/EN', gender: 'M', description: 'firme e confiante' },
  { id: 'echo',    label: 'Echo',    lang: 'PT/EN', gender: 'M', description: 'suave e conversacional' },
  { id: 'onyx',    label: 'Onyx',    lang: 'PT/EN', gender: 'M', description: 'grave e autoritativa' },
  { id: 'fable',   label: 'Fable',   lang: 'PT/EN', gender: 'M', description: 'expressiva e narrativa' },
]

// Default playback speed for narrations. Modern short-form video reads too slow at
// 1.0×, so we ship a 1.2× default. ElevenLabs caps speed at 1.2; OpenAI allows up to 4.0.
export const DEFAULT_VOICE_SPEED = 1.2

/** Clamp a requested speed to the provider's supported range. */
function clampSpeed(speed, provider) {
  const s = Number(speed)
  if (!Number.isFinite(s)) return 1
  // ElevenLabs: 0.7–1.2 (voice_settings.speed). OpenAI: 0.25–4.0.
  if (provider === 'elevenlabs') return Math.min(1.2, Math.max(0.7, s))
  return Math.min(4.0, Math.max(0.25, s))
}

export const ELEVENLABS_VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Valentina', lang: 'PT-BR', gender: 'F', description: 'voz feminina brasileira natural' },
  { id: 'gD1IexrzCvsXPHUuT0s3', label: 'Rafael',    lang: 'PT-BR', gender: 'M', description: 'voz masculina brasileira' },
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel',    lang: 'EN',    gender: 'F', description: 'calm and professional' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antonio',   lang: 'ES',    gender: 'M', description: 'well-rounded' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella',     lang: 'EN',    gender: 'F', description: 'warm and expressive' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam',      lang: 'EN',    gender: 'M', description: 'deep and authoritative' },
]

// Google Gemini TTS voices — multilingual including PT-BR
export const GOOGLE_TTS_VOICES = [
  { id: 'Aoede',           label: 'Aoede',           lang: 'PT/EN/multi', gender: 'F', description: 'leve e descontraída' },
  { id: 'Kore',            label: 'Kore',             lang: 'PT/EN/multi', gender: 'F', description: 'firme e assertiva' },
  { id: 'Sulafat',         label: 'Sulafat',          lang: 'PT/EN/multi', gender: 'F', description: 'quente e acolhedora' },
  { id: 'Zephyr',          label: 'Zephyr',           lang: 'PT/EN/multi', gender: 'F', description: 'brilhante e animada' },
  { id: 'Puck',            label: 'Puck',             lang: 'PT/EN/multi', gender: 'M', description: 'animado e energético' },
  { id: 'Charon',          label: 'Charon',           lang: 'PT/EN/multi', gender: 'M', description: 'informativo e claro' },
  { id: 'Fenrir',          label: 'Fenrir',           lang: 'PT/EN/multi', gender: 'M', description: 'excitável e expressivo' },
  { id: 'Orus',            label: 'Orus',             lang: 'PT/EN/multi', gender: 'M', description: 'firme e confiante' },
]

// ── Audio helpers ─────────────────────────────────────────────────────────────

/**
 * Wrap raw PCM bytes (s16le, 24 kHz, mono) in a standard RIFF/WAV header.
 * Cloudflare Workers have no Node.js `Buffer` or `fs`, but DataView works fine.
 */
export function pcmToWav(pcmArrayBuffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const pcm      = new Uint8Array(pcmArrayBuffer)
  const header   = new ArrayBuffer(44)
  const view     = new DataView(header)
  const byteRate = sampleRate * channels * (bitDepth / 8)
  const blockAlign = channels * (bitDepth / 8)

  const str = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)) }
  str(0, 'RIFF')
  view.setUint32(4,  36 + pcm.byteLength, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16,          true)  // PCM chunk size
  view.setUint16(20, 1,           true)  // PCM format
  view.setUint16(22, channels,    true)
  view.setUint32(24, sampleRate,  true)
  view.setUint32(28, byteRate,    true)
  view.setUint16(32, blockAlign,  true)
  view.setUint16(34, bitDepth,    true)
  str(36, 'data')
  view.setUint32(40, pcm.byteLength, true)

  const wav = new Uint8Array(44 + pcm.byteLength)
  wav.set(new Uint8Array(header), 0)
  wav.set(pcm, 44)
  return wav.buffer
}

/** Decode a base64 string → ArrayBuffer (works in Cloudflare Workers via atob) */
export function base64ToArrayBuffer(b64) {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── Text helpers ──────────────────────────────────────────────────────────────

// Section types and label keywords that are visual-only / metadata — never spoken
const SKIP_SECTION_TYPES = new Set(['title', 'thumbnail', 'metadata', 'seo'])

// Labels that indicate a section is purely visual/metadata even when type is 'intro'
const SKIP_LABEL_KEYWORDS = ['título seo', 'titulo seo', 'seo title', 'título', 'thumbnail']

function isSkippedSection(s) {
  if (SKIP_SECTION_TYPES.has(s.type ?? '')) return true
  const labelLow = (s.label ?? '').toLowerCase()
  if (SKIP_LABEL_KEYWORDS.some(k => labelLow.includes(k))) return true
  // Any "title"/"seo" label (accent-insensitive) is metadata — never spoken
  const labelNorm = labelLow.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/\b(titulo|seo|title)\b/.test(labelNorm)) return true
  // Duration 0 sections are always metadata (e.g. PRAC SEO title sections)
  if (Number(s.duration) === 0) return true
  return false
}

// Normalize a script language string → 'pt' | 'es' | 'en'
function langOf(language) {
  const l = (language ?? 'pt').toLowerCase()
  return l.startsWith('en') ? 'en' : l.startsWith('es') ? 'es' : 'pt'
}

/**
 * Convert written prices into spoken form in the script's language, so the TTS
 * engine never reads currency symbols literally.
 *   PT:  "R$199,99"  → "199 reais e 99 centavos"
 *   EN:  "$199.99"   → "199 dollars and 99 cents"
 *   ES:  "€199,99"   → "199 euros con 99 céntimos"
 *        "$199" (MX) → "199 pesos"
 */
function normaliseCurrency(text, lang = 'pt') {
  const minor = lang === 'es' ? 'céntimos' : lang === 'en' ? 'cents' : 'centavos'
  const conj  = lang === 'es' ? 'con'      : lang === 'en' ? 'and'   : 'e'
  const NAME = {
    BRL: ['real', 'reais'],
    EUR: ['euro', 'euros'],
    MXN: ['peso', 'pesos'],
    USD: (lang === 'pt' || lang === 'es') ? ['dólar', 'dólares'] : ['dollar', 'dollars'],
  }
  // A bare "$" means USD (en), peso (es/Mexico), or — defensively — real (pt)
  const bareDollar = lang === 'es' ? 'MXN' : lang === 'en' ? 'USD' : 'BRL'

  // Parse "1.299,99" / "1,299.99" / "199" → [major, cents]
  function parseAmount(raw) {
    const s = raw.trim()
    const m = s.match(/^(.+?)[.,](\d{2})$/)   // trailing 2-digit decimal
    if (m) return [parseInt(m[1].replace(/[.,]/g, '') || '0', 10), parseInt(m[2], 10)]
    return [parseInt(s.replace(/[.,]/g, '') || '0', 10), 0]
  }
  function build(cur, raw) {
    const [major, cents] = parseAmount(raw)
    if (isNaN(major)) return raw
    const [sing, plur] = NAME[cur] || NAME.USD
    const mWord = major === 1 ? sing : plur
    return cents > 0 ? `${major} ${mWord} ${conj} ${cents} ${minor}` : `${major} ${mWord}`
  }

  return text
    .replace(/MX\$\s*([\d.,]+)/g, (_, n) => build('MXN', n))
    .replace(/R\$\s*([\d.,]+)/g,  (_, n) => build('BRL', n))
    .replace(/US\$\s*([\d.,]+)/g, (_, n) => build('USD', n))
    .replace(/USD\s*([\d.,]+)/gi, (_, n) => build('USD', n))
    .replace(/€\s*([\d.,]+)/g,    (_, n) => build('EUR', n))
    .replace(/([\d.,]+)\s*€/g,    (_, n) => build('EUR', n))   // suffix "199,99 €"
    .replace(/\$\s*([\d.,]+)/g,   (_, n) => build(bareDollar, n))
    // Strip any leftover bare symbols
    .replace(/[R$€]\$?/g, '')
}

/**
 * Clean a raw script string so it reads naturally when spoken by a TTS engine.
 * Removes markdown syntax, stage directions, section headers, and formatting symbols.
 * @param {string} raw
 * @param {string} lang – 'pt' | 'es' | 'en' (drives spoken-currency conversion)
 */
function cleanForTTS(raw, lang = 'pt') {
  let text = raw
    // Remove raw URLs — never spoken aloud
    .replace(/https?:\/\/\S+/g, '')
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
    // Remove "Link na descrição: <anything>" lines — visual-only CTA
    .replace(/^.*[Ll]ink\s+(na\s+descrição|in\s+the\s+description|no\s+comentário|in\s+bio).*$/gm, '')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n').map((l) => l.trim()).join('\n')
    .trim()

  // Convert written prices → spoken form in the script's language
  text = normaliseCurrency(text, lang)

  return text
}

/**
 * Convert a script record into plain text ready for TTS.
 * – Skips sections whose `type` is visual-only (title, thumbnail, etc.)
 * – Strips the script's own `title` if it appears verbatim as the first line
 *   of any section (prevents the narrator reading out the video title).
 * – Applies Portuguese currency normalisation when language is PT.
 */
function scriptToText(script) {
  const lang      = langOf(script.language)
  const sections  = script.sections ?? []
  const titleText = (script.title ?? '').trim().toLowerCase()

  let raw
  if (sections.length > 0) {
    raw = sections
      // Drop visual-only sections (title cards, thumbnail copy, etc.)
      .filter((s) => !isSkippedSection(s))
      .map((s) => {
        let content = s.content ?? ''
        // Strip the script title if it's the literal first line of a section
        // (avoids narrator reading "Top 5 Power Banks Mai 26" aloud)
        if (titleText) {
          const firstLine = content.split('\n')[0].trim().toLowerCase()
          if (firstLine === titleText || firstLine === `# ${titleText}` || firstLine === `## ${titleText}`) {
            content = content.split('\n').slice(1).join('\n')
          }
        }
        return content
      })
      .filter(Boolean)
      .join('\n\n')
  } else {
    raw = script.text ?? ''
  }

  return cleanForTTS(raw, lang)
}

function estimateDuration(byteLength, format = 'mp3') {
  // 128kbps MP3 ≈ 16 KB/s; WAV s16le 24kHz mono = 48 KB/s; opus ~8 KB/s
  const bytesPerSec = format === 'wav' ? 48000 : format === 'opus' ? 8000 : 16000
  const secs = Math.round((byteLength - (format === 'wav' ? 44 : 0)) / bytesPerSec)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

// ── OpenAI TTS ────────────────────────────────────────────────────────────────

async function generateOpenAI(env, { text, voiceId, model = 'tts-1', speed = DEFAULT_VOICE_SPEED }) {
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
      voice: voiceId,      // alloy | echo | fable | onyx | nova | shimmer | ash | coral | sage
      speed: clampSpeed(speed, 'openai'),  // 0.25–4.0, default 1.2×
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

async function generateElevenLabs(env, { text, voiceId, stability, similarityBoost, speed = DEFAULT_VOICE_SPEED }) {
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
      voice_settings: { stability, similarity_boost: similarityBoost, speed: clampSpeed(speed, 'elevenlabs') },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs error ${res.status}: ${err.slice(0, 200)}`)
  }

  return res.arrayBuffer()
}

// ── ElevenLabs TTS with timestamps (drives the video timeline) ─────────────────

/**
 * Synthesize speech AND return alignment. The video generator needs to know when
 * each word is spoken so captions/transitions land on the right frame.
 *
 * NB: ElevenLabs returns CHARACTER-level alignment (not word-level as the PRD
 * states). We aggregate characters → words here so the composer gets clean
 * { text, start, end, type:'word' } entries.
 *
 * @returns {Promise<{ audio: ArrayBuffer, alignment: Array<{text,start,end,type}>, words: Array }>}
 */
async function generateElevenLabsAligned(env, { text, voiceId, stability, similarityBoost }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'ELEVENLABS_API_KEY')
  if (!key) throw new Error('ELEVENLABS_API_KEY não configurada — adicione em Configurações')

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs (timestamps) error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  if (!json.audio_base64) throw new Error('ElevenLabs: resposta sem audio_base64')
  // Prefer normalized_alignment (handles punctuation) when present.
  const a = json.normalized_alignment ?? json.alignment ?? {}
  const words = charsToWords(a)
  return { audio: base64ToArrayBuffer(json.audio_base64), alignment: words, words }
}

/**
 * Collapse ElevenLabs character arrays into word objects.
 * Input: { characters[], character_start_times_seconds[], character_end_times_seconds[] }
 */
export function charsToWords(alignment) {
  const chars = alignment.characters ?? []
  const starts = alignment.character_start_times_seconds ?? []
  const ends = alignment.character_end_times_seconds ?? []
  const words = []
  let cur = null

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const isSpace = /\s/.test(ch)
    if (isSpace) {
      if (cur) { words.push(cur); cur = null }
      continue
    }
    if (!cur) cur = { text: '', start: starts[i] ?? 0, end: ends[i] ?? 0, type: 'word' }
    cur.text += ch
    cur.end = ends[i] ?? cur.end
  }
  if (cur) words.push(cur)
  return words
}

/**
 * Synthesize a script's voiceover with alignment and upload the audio.
 * Returns { audioUrl, alignment, duration }.
 */
export async function generateAlignedVoiceover(env, {
  scriptId,
  voiceId = ELEVENLABS_VOICES[0].id,
  stability = 0.75,
  similarityBoost = 0.80,
}) {
  const db = getDb(env)
  const { data: script, error } = await db
    .from('scripts')
    .select('id, text, sections, title, blueprintId')
    .eq('id', scriptId)
    .single()
  if (error || !script) throw new Error(`Roteiro ${scriptId} não encontrado`)

  const text = scriptToText(script)
  if (!text) throw new Error('Roteiro sem conteúdo — gere o roteiro primeiro')
  const textToSynth = text.length > 5000 ? text.slice(0, 5000) : text

  const { audio, alignment } = await generateElevenLabsAligned(env, {
    text: textToSynth, voiceId, stability, similarityBoost,
  })

  const fileName = `aligned-${scriptId}-${voiceId}.mp3`
  const audioUrl = await uploadAudio(env, { buffer: audio, fileName, contentType: 'audio/mpeg' })
  const duration = alignment.length ? alignment[alignment.length - 1].end : 0

  return { audioUrl, alignment, duration }
}

// ── Google Gemini TTS ─────────────────────────────────────────────────────────

const GOOGLE_TTS_MODEL = 'gemini-2.5-flash-preview-tts'

async function generateGoogle(env, { text, voiceId }) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'GOOGLE_API_KEY')
  if (!key) throw new Error('GOOGLE_API_KEY não configurada — adicione em Configurações')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_TTS_MODEL}:generateContent`,
    {
      method:  'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId ?? 'Aoede' },
            },
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google TTS error ${res.status}: ${err.slice(0, 300)}`)
  }

  const json      = await res.json()
  const b64Audio  = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!b64Audio)  throw new Error('Google TTS: resposta sem dados de áudio')

  // Response is raw PCM (s16le, 24 kHz, mono) — wrap in WAV header
  const pcmBuffer = base64ToArrayBuffer(b64Audio)
  return pcmToWav(pcmBuffer)
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

async function uploadAudio(env, { buffer, fileName, contentType = 'audio/mpeg' }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados')
  }

  const upload = () => fetch(
    `${env.SUPABASE_URL}/storage/v1/object/voiceovers/${fileName}`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType,
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
  speed       = DEFAULT_VOICE_SPEED,
}) {
  const db = getDb(env)

  let script
  {
    const { data, error } = await db
      .from('scripts')
      .select('id, text, sections, language, blueprintId, title')
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

  // Provider-specific char limits
  const MAX_CHARS = provider === 'openai' ? 4096 : 5000
  const textToSynth = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text

  let audioBuffer
  let audioExt         = 'mp3'
  let audioContentType = 'audio/mpeg'

  if (provider === 'openai') {
    audioBuffer = await generateOpenAI(env, { text: textToSynth, voiceId: voiceId ?? 'nova', model, speed })
  } else if (provider === 'google') {
    audioBuffer      = await generateGoogle(env, { text: textToSynth, voiceId: voiceId ?? 'Aoede' })
    audioExt         = 'wav'
    audioContentType = 'audio/wav'
  } else {
    audioBuffer = await generateElevenLabs(env, { text: textToSynth, voiceId: voiceId ?? ELEVENLABS_VOICES[0].id, stability, similarityBoost, speed })
  }

  // Build a human-readable filename from the script title
  // e.g. "short-viral-hook-protetor-bucal-valentina-elevenlabs.mp3"
  const titleSlug = (script.title ?? script.blueprintId ?? scriptId)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const voiceSlug = (voiceLabel ?? voiceId ?? provider)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const fileName = `${titleSlug}--${voiceSlug}-${provider}.${audioExt}`
  const fileUrl  = await uploadAudio(env, { buffer: audioBuffer, fileName, contentType: audioContentType })
  const duration = estimateDuration(audioBuffer.byteLength, audioExt === 'wav' ? 'wav' : 'mp3')

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
    speed,
    status:         'completed',
  }

  let { data, error } = await db.from('voiceovers').insert(fullRow).select().single()

  // Tier 2 — provider/charCount columns may not exist yet; fall back to original schema
  if (error) {
    const isColErr = (e) => e?.message && (
      e.message.includes('Could not find') || e.message.includes('column') || e.message.includes('does not exist')
    )
    if (!isColErr(error)) throw new Error(error.message)

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

/**
 * Generate one TTS audio file per section of a script.
 *
 * Returns an array of { sectionIndex, sectionLabel, sectionType, audioUrl, duration }
 * and inserts one voiceovers row per section so the UI can link downloads to sections.
 *
 * Provider fallbacks and char limits mirror generateVoiceover.
 */
export async function generateVoiceoverSections(env, {
  scriptId,
  provider        = 'elevenlabs',
  voiceId,
  voiceLabel,
  model           = 'tts-1',
  stability       = 0.75,
  similarityBoost = 0.80,
  speed           = DEFAULT_VOICE_SPEED,
}) {
  const db = getDb(env)

  const { data: script, error: fetchErr } = await db
    .from('scripts').select('id, text, sections, language, blueprintId, title').eq('id', scriptId).single()
  if (fetchErr || !script) throw new Error(`Roteiro ${scriptId} não encontrado`)

  const lang = langOf(script.language)
  const rawSections = (script.sections ?? []).filter((s) => !isSkippedSection(s) && s.content?.trim())
  if (!rawSections.length) throw new Error('Roteiro sem seções — gere o roteiro primeiro')

  const MAX_CHARS    = provider === 'openai' ? 4096 : 5000
  const isGoogle     = provider === 'google'
  const audioExt     = isGoogle ? 'wav' : 'mp3'
  const contentType  = isGoogle ? 'audio/wav' : 'audio/mpeg'

  const titleSlug = (script.title ?? script.blueprintId ?? scriptId)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
  const voiceSlug = (voiceLabel ?? voiceId ?? provider)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  const results = []
  const isColErr = (e) => e?.message && (e.message.includes('Could not find') || e.message.includes('column') || e.message.includes('does not exist'))

  for (let i = 0; i < rawSections.length; i++) {
    const sec     = rawSections[i]
    let   text    = cleanForTTS(sec.content, lang)
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS)
    if (!text) continue

    let audioBuffer
    try {
      if (provider === 'openai') {
        audioBuffer = await generateOpenAI(env, { text, voiceId: voiceId ?? 'nova', model, speed })
      } else if (isGoogle) {
        audioBuffer = await generateGoogle(env, { text, voiceId: voiceId ?? 'Aoede' })
      } else {
        audioBuffer = await generateElevenLabs(env, { text, voiceId: voiceId ?? ELEVENLABS_VOICES[0].id, stability, similarityBoost, speed })
      }
    } catch (e) {
      console.error(`[voiceover/sections] TTS failed for section ${i} (${sec.label}):`, e.message)
      results.push({ sectionIndex: i, sectionLabel: sec.label, sectionType: sec.type, error: e.message })
      continue
    }

    const labelSlug = sec.label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
    const fileName  = `${titleSlug}--sec${i + 1}-${labelSlug}--${voiceSlug}-${provider}.${audioExt}`
    const fileUrl   = await uploadAudio(env, { buffer: audioBuffer, fileName, contentType })
    const duration  = estimateDuration(audioBuffer.byteLength, audioExt === 'wav' ? 'wav' : 'mp3')

    const fullRow = {
      id:             uid(),
      scriptId,
      provider,
      voiceModel:     voiceLabel ?? voiceId,
      voiceId,
      fileUrl,
      duration,
      charCount:      text.length,
      bitrate:        '128kbps',
      stability,
      similarityBoost,
      speed,
      sectionLabel:   sec.label,
      sectionIndex:   i,
      status:         'completed',
    }

    let { data: saved, error: insErr } = await db.from('voiceovers').insert(fullRow).select().single()
    if (insErr && isColErr(insErr)) {
      const { charCount: _c, sectionLabel: _sl, sectionIndex: _si, speed: _sp, ...baseRow } = fullRow
      const { data: d2, error: e2 } = await db.from('voiceovers').insert(baseRow).select().single()
      if (!e2) saved = d2
    }

    results.push({ sectionIndex: i, sectionLabel: sec.label, sectionType: sec.type, audioUrl: fileUrl, duration, id: saved?.id })
  }

  return results
}

// ── Voice preview ─────────────────────────────────────────────────────────────

// Short, language-matched sample so the user can hear a voice before committing.
const PREVIEW_SAMPLE = {
  pt: 'Olá! Esta é uma prévia da minha voz. É assim que vou narrar o seu vídeo.',
  es: '¡Hola! Esta es una muestra de mi voz. Así narraré tu video.',
  en: 'Hi there! This is a preview of my voice. This is how I will narrate your video.',
}

/**
 * Synthesize a short fixed sample for a given voice so the picker can play a
 * preview. Returns the raw audio buffer + content type (no DB write, no upload).
 */
export async function generateVoicePreview(env, {
  provider        = 'elevenlabs',
  voiceId,
  model           = 'tts-1',
  stability       = 0.75,
  similarityBoost = 0.80,
  speed           = DEFAULT_VOICE_SPEED,
  lang            = 'pt',
}) {
  const text = PREVIEW_SAMPLE[langOf(lang)] ?? PREVIEW_SAMPLE.pt

  if (provider === 'openai') {
    const buffer = await generateOpenAI(env, { text, voiceId: voiceId ?? 'nova', model, speed })
    return { buffer, contentType: 'audio/mpeg' }
  }
  if (provider === 'google') {
    const buffer = await generateGoogle(env, { text, voiceId: voiceId ?? 'Aoede' })
    return { buffer, contentType: 'audio/wav' }
  }
  const buffer = await generateElevenLabs(env, {
    text, voiceId: voiceId ?? ELEVENLABS_VOICES[0].id, stability, similarityBoost, speed,
  })
  return { buffer, contentType: 'audio/mpeg' }
}

/**
 * Fetch the live ElevenLabs voice library for the configured account so the UI
 * can offer every available voice (premade + cloned), not just the curated few.
 * Returns null when no key is set or the request fails, so callers fall back to
 * the static ELEVENLABS_VOICES list.
 */
export async function fetchElevenLabsVoices(env) {
  const { resolveKey } = await import('../lib/resolveKey.js')
  const key = await resolveKey(env, 'ELEVENLABS_API_KEY')
  if (!key) return null
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } })
    if (!res.ok) return null
    const json   = await res.json()
    const voices = (json.voices ?? []).map((v) => {
      const labels = v.labels ?? {}
      const gender = labels.gender === 'female' ? 'F' : labels.gender === 'male' ? 'M' : 'N'
      const lang   = (labels.language || labels.accent || 'multi').toString().toUpperCase()
      const desc   = [labels.descriptive, labels.accent, labels.use_case].filter(Boolean).join(' · ')
      return { id: v.voice_id, label: v.name, lang, gender, description: desc || v.category || '' }
    })
    return voices.length ? voices : null
  } catch {
    return null
  }
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
