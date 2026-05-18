import { uid } from '../lib/uid.js'

async function sendWhatsAppMessage(env, { to, body }) {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp not configured — add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets')
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${err.slice(0, 200)}`)
  }

  return res.json()
}

export async function sendDelivery(env, tenantId, db, { scriptId, voiceoverId, editorContact }) {
  let sq = db.from('scripts').select('id, blueprintId, language').eq('id', scriptId)
  if (tenantId) sq = sq.eq('tenant_id', tenantId)
  const { data: script, error: sErr } = await sq.single()
  if (sErr || !script) throw new Error(`Script ${scriptId} not found`)

  const scriptUrl = `${env.SUPABASE_URL}/storage/v1/object/public/scripts/${scriptId}.pdf`

  let voiceoverUrl = null
  if (voiceoverId) {
    let vq = db.from('voiceovers').select('fileUrl').eq('id', voiceoverId)
    if (tenantId) vq = vq.eq('tenant_id', tenantId)
    const { data: vo } = await vq.single()
    voiceoverUrl = vo?.fileUrl ?? null
  }

  const msg = [
    `📋 *Novo Conteúdo Pronto*`,
    `Blueprint: ${script.blueprintId} (${script.language?.toUpperCase()})`,
    `Script: ${scriptUrl}`,
    voiceoverUrl ? `🎙️ Voiceover: ${voiceoverUrl}` : '',
    `\nConfirme o recebimento. — Fábrica de Conteúdo`,
  ].filter(Boolean).join('\n')

  await sendWhatsAppMessage(env, { to: editorContact, body: msg })

  const { data, error } = await db.from('delivery_jobs').insert({
    id:            uid(),
    editorContact,
    scriptId,
    voiceoverId:   voiceoverId ?? null,
    scriptUrl,
    voiceoverUrl,
    status:        'completed',
    sentAt:        new Date().toISOString(),
    tenant_id:     tenantId,
  }).select().single()

  if (error) throw new Error(error.message)
  return data
}

export async function listDeliveries(env, tenantId, db) {
  let query = db
    .from('delivery_jobs')
    .select('*, scripts(blueprintId, language), voiceovers(voiceModel, duration)')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
