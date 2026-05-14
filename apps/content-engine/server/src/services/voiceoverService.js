import { db } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const VOICE_IDS = {
  Rachel:  '21m00Tcm4TlvDq8ikWAM',
  Antonio: 'ErXwobaYiN019PkySvjV',
  Bella:   'EXAVITQu4vr4xnSDxMaL',
}

export async function generateVoiceover({ scriptId, voiceModel, stability, similarityBoost }) {
  const { data: script, error: sErr } = await db.from('scripts').select('id').eq('id', scriptId).single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)

  const voiceId = VOICE_IDS[voiceModel] ?? VOICE_IDS.Rachel
  const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/voiceovers/${scriptId}.mp3`

  // TODO: call ElevenLabs API, upload audio to Supabase Storage, replace fileUrl
  // const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, { ... })

  const { data, error } = await db.from('voiceovers').insert({
    id:              uid(),
    scriptId,
    fileUrl,
    duration:        '4:12',
    voiceModel,
    voiceId,
    bitrate:         '128kbps',
    stability,
    similarityBoost,
    status:          'completed',
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listVoiceovers() {
  const { data, error } = await db
    .from('voiceovers')
    .select('*, scripts(blueprintId, language)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
