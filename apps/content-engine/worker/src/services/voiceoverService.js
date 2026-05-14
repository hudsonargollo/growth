import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const VOICE_IDS = { Rachel: '21m00Tcm4TlvDq8ikWAM', Antonio: 'ErXwobaYiN019PkySvjV', Bella: 'EXAVITQu4vr4xnSDxMaL' }

export async function generateVoiceover(env, { scriptId, voiceModel, stability, similarityBoost }) {
  const db = getDb(env)
  const { data: script, error: sErr } = await db.from('scripts').select('id, text').eq('id', scriptId).single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)

  const voiceId = VOICE_IDS[voiceModel] ?? VOICE_IDS.Rachel

  // TODO: call ElevenLabs API with env.ELEVENLABS_API_KEY
  // const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  //   method: 'POST',
  //   headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text: script.text, model_id: 'eleven_multilingual_v2', voice_settings: { stability, similarity_boost: similarityBoost } }),
  // })
  // Upload audio buffer to Supabase Storage, get fileUrl

  const fileUrl = `${env.SUPABASE_URL}/storage/v1/object/public/voiceovers/${scriptId}.mp3`

  const { data, error } = await db.from('voiceovers').insert({
    id: uid(), scriptId, fileUrl, duration: '4:12', voiceModel, voiceId,
    bitrate: '128kbps', stability, similarityBoost, status: 'completed',
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listVoiceovers(env) {
  const db = getDb(env)
  const { data, error } = await db.from('voiceovers').select('*, scripts(blueprintId, language)').order('createdAt', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  return data
}
