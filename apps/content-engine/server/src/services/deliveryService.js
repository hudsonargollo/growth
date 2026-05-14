import { db } from '../lib/db.js'
import { uid } from '../lib/uid.js'

async function sendWhatsAppMessage({ to, body }) {
  // TODO: call WhatsApp Cloud API
  // await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { ... })
  console.log(`[delivery] WhatsApp stub -> ${to}: ${body.slice(0, 80)}`)
}

export async function sendDelivery({ scriptId, voiceoverId, editorContact }) {
  const { data: script, error: sErr } = await db.from('scripts').select('id').eq('id', scriptId).single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)

  const scriptUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/scripts/${scriptId}.pdf`
  let voiceoverUrl = null
  if (voiceoverId) {
    const { data: vo } = await db.from('voiceovers').select('fileUrl').eq('id', voiceoverId).single()
    voiceoverUrl = vo?.fileUrl ?? null
  }

  const msg = [
    `New Content Ready`,
    `Script: ${scriptUrl}`,
    voiceoverUrl ? `Voiceover: ${voiceoverUrl}` : '',
    `Content Engine`,
  ].filter(Boolean).join('\n')
  await sendWhatsAppMessage({ to: editorContact, body: msg })

  const { data, error } = await db.from('delivery_jobs').insert({
    id:            uid(),
    editorContact,
    scriptId,
    voiceoverId:   voiceoverId ?? null,
    scriptUrl,
    voiceoverUrl,
    status:        'completed',
    sentAt:        new Date().toISOString(),
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listDeliveries() {
  const { data, error } = await db
    .from('delivery_jobs')
    .select('*, scripts(blueprintId, language), voiceovers(voiceModel, duration)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
