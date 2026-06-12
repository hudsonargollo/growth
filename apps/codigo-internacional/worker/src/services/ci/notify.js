/**
 * WhatsApp notifications for the Código Internacional pipeline.
 * Uses the Evolution API instance configured on the worker.
 */
import { first } from '../../lib/ci-db.js'

function evolutionBase(env) {
  return (env.EVOLUTION_API_URL ?? 'https://evo.clubemkt.digital').replace(/\/$/, '')
}
function evolutionInstance(env) {
  return env.CI_EVOLUTION_INSTANCE ?? 'CODIGOINTERNACIONAL'
}
function normalisePhone(contact) {
  const phone = String(contact ?? '').replace(/\D/g, '')
  return phone.length <= 11 ? `55${phone}` : phone
}

/** Fire-and-forget WhatsApp text. Never throws — notification failure must not block lead capture. */
export async function sendWhatsApp(env, { number, text }) {
  if (!number) return
  const apikey = env.CI_EVOLUTION_KEY ?? env.EVOLUTION_INSTANCE_KEY
  if (!apikey) { console.warn('[ci/notify] CI_EVOLUTION_KEY not set — skipping WhatsApp'); return }
  try {
    const url = `${evolutionBase(env)}/message/sendText/${evolutionInstance(env)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey },
      body: JSON.stringify({ number: normalisePhone(number), text }),
    })
    if (!res.ok) console.warn('[ci/notify] WhatsApp send failed:', res.status, (await res.text()).slice(0, 200))
  } catch (err) {
    console.warn('[ci/notify] WhatsApp send error:', err.message)
  }
}

// ── Human labels (mirror of src/lib/leadFields.js) ──────────────────────────────
const HEADCOUNT_LABELS = { solo: 'Apenas eu', '2-5': '2 a 5 pessoas', '6-20': '6 a 20 pessoas', '21-50': '21 a 50 pessoas', 'acima-50': 'Mais de 50 pessoas' }
const REVENUE_LABELS = {
  'ate-30k': 'Até R$30 mil/mês', '30-50k': 'R$30–50 mil/mês', '50-100k': 'R$50–100 mil/mês',
  '100-300k': 'R$100–300 mil/mês', '300k-1m': 'R$300 mil–1 mi/mês', 'acima-1m': 'Acima de R$1 mi/mês',
}
const YEARS_LABELS = { lt1: 'Menos de 1 ano', '1-3': '1 a 3 anos', '3-5': '3 a 5 anos', gt5: 'Mais de 5 anos' }
const DECISION_LABELS = { imediato: 'Imediatamente', '7d': 'Em até 7 dias', '30d': 'Em até 30 dias', avaliando: 'Ainda avaliando' }

const HIGH_VALUE_REVENUE = ['300k-1m', 'acima-1m']
const HIGH_VALUE_HEADCOUNT = ['21-50', 'acima-50']
const isHighValue = (lead) => HIGH_VALUE_REVENUE.includes(lead?.revenue_band) || HIGH_VALUE_HEADCOUNT.includes(lead?.headcount)

function parseApp(lead) {
  try { return lead?.application ? JSON.parse(lead.application) : null } catch { return null }
}

/** Cohort id (2026-07-12) → friendly date (12/07). */
function turmaLabel(id) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(id || ''))
  return m ? `${m[3]}/${m[2]}` : (id || null)
}

/** Lead counts for a given utm_source — gives the closer market context. */
async function sourceStats(env, utmSource) {
  if (!utmSource) return null
  return first(
    env,
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status != 'incomplete' THEN 1 ELSE 0 END) AS qualified,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won
       FROM leads WHERE lower(utm_source) = lower(?)`,
    [utmSource],
  )
}

/** Company-profile lines (only what the lead actually filled). */
function profileLines(lead) {
  const app = parseApp(lead)
  const lines = []
  if (lead.company) lines.push(`🏢 *Empresa:* ${lead.company}`)
  if (lead.segmento) lines.push(`🧩 *Segmento:* ${lead.segmento}`)
  if (lead.revenue_band) lines.push(`💰 *Faturamento:* ${REVENUE_LABELS[lead.revenue_band] || lead.revenue_band}`)
  if (lead.headcount) lines.push(`👥 *Equipe:* ${HEADCOUNT_LABELS[lead.headcount] || lead.headcount}`)
  if (app?.tax_estimate) lines.push(`🧾 *Impostos/ano:* ${app.tax_estimate}`)
  if (app?.years) lines.push(`📅 *Empreende há:* ${YEARS_LABELS[app.years] || app.years}`)
  if (lead.turma) lines.push(`🎓 *Turma:* ${turmaLabel(lead.turma)}`)
  if (app?.decision_timeline) lines.push(`⏱️ *Confirma a vaga:* ${DECISION_LABELS[app.decision_timeline] || app.decision_timeline}`)
  if (app?.wants_call) lines.push(`☎️ *Quer falar com o Pedro:* ${app.wants_call === 'sim' ? 'Sim' : 'Não'}`)
  return lines
}

/** Build the rich lead card sent to the closer / owner. */
async function buildLeadCard(env, { lead, partner, closer, ownerCopy = false }) {
  const hot = isHighValue(lead)
  const stats = await sourceStats(env, lead.utm_source)
  const profile = profileLines(lead)

  const header = ownerCopy
    ? '📥 *Lead — cópia (Código Internacional)*'
    : hot
      ? '🔥 *NOVO LEAD — ALTO VALOR*'
      : '🎯 *Novo lead qualificado*'

  const origem = partner ? `${partner.name} (${partner.utm_source})` : (lead.utm_source || 'orgânico')

  const lines = [
    header,
    '',
    `👤 *${lead.name || '—'}*`,
    `📱 ${lead.phone || '—'}`,
    lead.email ? `✉️ ${lead.email}` : null,
    lead.instagram ? `📸 instagram.com/${String(lead.instagram).replace(/^@+/, '')}` : null,
    profile.length ? '' : null,
    ...profile,
    '',
    hot ? '⚡ *Empresa de porte* — prioridade máxima, fale agora.' : null,
    hot ? '' : null,
    `🔗 *Origem:* ${origem}`,
    stats ? `📊 *Dessa origem:* ${stats.qualified || 0} ${Number(stats.qualified) === 1 ? 'lead' : 'leads'} · ${stats.won || 0} fechado(s)` : null,
    closer ? `🎧 *Closer:* ${closer.name}` : null,
    '',
    ownerCopy ? '_Cópia automática para acompanhamento._' : (hot ? '_Esse merece resposta imediata._ 🚀' : '_Fale com ele o quanto antes._'),
  ].filter((v) => v !== null && v !== undefined)

  return lines.join('\n')
}

/** Notify the closer (Pedro) that a new qualified lead came in. */
export async function notifyNewLead(env, { closer, lead, partner }) {
  await sendWhatsApp(env, { number: closer?.whatsapp, text: await buildLeadCard(env, { lead, partner, closer }) })
}

/** Owner copy — sent to CI_OWNER_WHATSAPP (Hudson). */
export async function notifyOwner(env, { number, lead, partner, closer }) {
  await sendWhatsApp(env, { number, text: await buildLeadCard(env, { lead, partner, closer, ownerCopy: true }) })
}

/** Instant, personal confirmation to the LEAD — from Pedro. */
export async function notifyLead(env, { lead }) {
  if (!lead?.phone) return
  const name = (lead.name || '').split(' ')[0]
  const text = [
    `Olá${name ? ' ' + name : ''}! 👋`,
    '',
    'Aqui é o *Pedro Silvestrini*.',
    '',
    'Recebi a sua aplicação para o Código Internacional e já estou olhando pessoalmente. ✅',
    '',
    'As turmas são pequenas — *10 empresários cada* — então eu falo com cada candidato antes de confirmar a vaga. Em breve te chamo por aqui para a nossa conversa.',
    '',
    'Pode me responder por aqui quando quiser. Vamos zerar esse imposto. 🇵🇾',
  ].join('\n')
  await sendWhatsApp(env, { number: lead.phone, text })
}
