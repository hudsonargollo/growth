import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

async function sendWhatsAppMessage(env, { to, body }) {
  // TODO: call WhatsApp Cloud API with env.WHATSAPP_TOKEN
  // await fetch(`https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  // })
  console.log(`[delivery] WhatsApp stub -> ${to}: ${body.slice(0, 80)}`)
}

export async function sendDelivery(env, { scriptId, voiceoverId, editorContact }) {
  const db = getDb(env)

  const { data: script, error: sErr } = await db.from('scripts').select('id').eq('id', scriptId).single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)

  const scriptUrl = `${env.SUPABASE_URL}/storage/v1/object/public/scripts/${scriptId}.pdf`
  let voiceoverUrl = null
  if (voiceoverId) {
    const { data: vo } = await db.from('voiceovers').select('fileUrl').eq('id', voiceoverId).single()
    voiceoverUrl = vo?.fileUrl ?? null
  }

  const msg = [`New Content Ready`, `Script: ${scriptUrl}`, voiceoverUrl ? `Voiceover: ${voiceoverUrl}` : '', `Content Engine`].filter(Boolean).join('\n')
  await sendWhatsAppMessage(env, { to: editorContact, body: msg })

  const { data, error } = await db.from('delivery_jobs').insert({
    id: uid(), editorContact, scriptId, voiceoverId: voiceoverId ?? null,
    scriptUrl, voiceoverUrl, status: 'completed', sentAt: new Date().toISOString(),
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function listDeliveries(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('delivery_jobs')
    .select('*, scripts(blueprintId, language), voiceovers(voiceModel, duration)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data
}
