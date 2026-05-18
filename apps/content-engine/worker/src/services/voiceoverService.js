import { uid } from '../lib/uid.js'

// ElevenLabs voice IDs — update these if you clone your own voice
const VOICE_IDS = {
  Rachel:  '21m00Tcm4TlvDq8ikWAM',
  Antonio: 'ErXwobaYiN019PkySvjV',
  Bella:   'EXAVITQu4vr4xnSDxMaL',
}

export async function generateVoiceover(env, tenantId, db, { scriptId, voiceModel, stability, similarityBoost }) {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured — add it via: wrangler secret put ELEVENLABS_API_KEY')
  }

  let q = db.from('scripts').select('id, text').eq('id', scriptId)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data: script, error: sErr } = await q.single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)
  if (!script.text) throw new Error('Script has no text content')

  const voiceId = VOICE_IDS[voiceModel] ?? VOICE_IDS.Rachel

  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept:         'audio/mpeg',
    },
    body: JSON.stringify({
      text:       script.text,
      model_id:   'eleven_multilingual_v2',
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  })

  if (!ttsRes.ok) {
    const err = await ttsRes.text()
    throw new Error(`ElevenLabs API error ${ttsRes.status}: ${err.slice(0, 200)}`)
  }

  const audioBuffer = await ttsRes.arrayBuffer()
  // Namespace storage path by tenant to prevent URL guessing across tenants
  const storagePath = tenantId
    ? `tenant/${tenantId}/${scriptId}-${Date.now()}.mp3`
    : `${scriptId}-${Date.now()}.mp3`

  const uploadRes = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/voiceovers/${storagePath}`,
    {
      method:  'POST',
      headers: {
        // Storage uploads use service role key — storage bucket RLS is separate
        Authorization:  `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert':     'true',
      },
      body: audioBuffer,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Supabase Storage upload error ${uploadRes.status}: ${err.slice(0, 200)}`)
  }

  const fileUrl = `${env.SUPABASE_URL}/storage/v1/object/public/voiceovers/${storagePath}`

  const durationSec = Math.round(audioBuffer.byteLength / 16000)
  const duration    = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`

  const { data, error } = await db.from('voiceovers').insert({
    id:              uid(),
    scriptId,
    fileUrl,
    duration,
    voiceModel,
    voiceId,
    bitrate:         '128kbps',
    stability,
    similarityBoost,
    status:          'completed',
    tenant_id:       tenantId,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function listVoiceovers(env, tenantId, db) {
  let query = db.from('voiceovers').select('*, scripts(blueprintId, language)').order('createdAt', { ascending: false }).limit(50)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
