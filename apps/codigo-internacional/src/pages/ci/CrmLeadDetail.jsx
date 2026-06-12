import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Tag, Megaphone, MapPin, Clock, MessageSquarePlus,
  CheckCircle2, Circle, CircleDot, DollarSign, Rocket, MessageCircle, Building2, Instagram, FileText,
} from 'lucide-react'
import { useApi, apiPost, apiPatch, timeAgo } from '../../hooks/useApi.js'
import { LEAD_STATUSES, SALE_STATUSES, COMMISSION_STATUSES, meta, pill, brl, waLink, waGreeting } from './ciStatus.js'
import { revenueLabel, headcountLabel, yearsLabel, decisionLabel } from '../../lib/leadFields.js'
import { ErrorBanner, SegBtn } from './CrmLeads.jsx'

const MUTED = 'rgba(20,22,24,0.66)'
const FAINT = 'rgba(20,22,24,0.5)'

export default function CrmLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApi(`/ci/admin/leads/${id}`)
  const { data: closersData } = useApi('/ci/admin/closers')
  const lead = data?.lead
  const saleId = lead?.sale?.id ?? null
  const { data: saleData, refetch: refetchSale } = useApi(saleId ? `/ci/admin/sales/${saleId}` : null, [saleId])
  const sale = saleData?.sale

  const closers = closersData?.closers ?? []
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [note, setNote] = useState('')

  async function act(fn) {
    setBusy(true); setActionError(null)
    try { await fn(); await refetch(); if (saleId) await refetchSale() }
    catch (e) { setActionError(e.message) } finally { setBusy(false) }
  }

  if (loading) return <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: FAINT }}>Carregando…</div>
  if (error) return <ErrorBanner>{error}</ErrorBanner>
  if (!lead) return null

  const sm = meta(LEAD_STATUSES, lead.status)

  return (
    <div className="max-w-5xl">
      <button onClick={() => navigate('/admin/leads')} className="flex items-center gap-1.5 mb-5 transition-opacity hover:opacity-70" style={{ fontSize: 12, color: MUTED }}>
        <ArrowLeft size={14} /> Pipeline
      </button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="ci-h1" style={{ fontWeight: 400 }}>{lead.name || 'Sem nome'}</h1>
            <span className="ci-pill" style={pill(LEAD_STATUSES, lead.status)}>{sm.label}</span>
          </div>
          <div className="flex items-center gap-4 mt-2.5 flex-wrap ci-data" style={{ fontSize: 12, color: MUTED }}>
            {lead.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {lead.phone}</span>}
            {lead.email && <span className="flex items-center gap-1.5"><Mail size={12} /> {lead.email}</span>}
            {lead.instagram && <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-70"><Instagram size={12} /> @{lead.instagram}</a>}
            {lead.turma && <span className="flex items-center gap-1.5"><MapPin size={12} /> Turma {lead.turma}</span>}
          </div>
        </div>
        {lead.phone && (
          <a href={waLink(lead.phone, waGreeting(lead))} target="_blank" rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 transition-transform hover:scale-[1.02]"
            style={{ background: '#1f7a44', color: '#fff', fontWeight: 600, fontSize: 13, padding: '10px 16px' }}>
            <MessageCircle size={16} /> Enviar WhatsApp
          </a>
        )}
      </div>

      {actionError && <ErrorBanner>{actionError}</ErrorBanner>}

      {lead.status === 'incomplete' && (
        <div className="ci-card mb-5 flex items-start gap-2.5" style={{ padding: '12px 15px', borderLeft: '3px solid var(--ci-sand-deep)' }}>
          <Clock size={15} style={{ color: 'var(--ci-sand-deep)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            <strong>Aplicação incompleta.</strong> Esta pessoa informou nome e WhatsApp mas não concluiu a inscrição — não está no pipeline e não foi atribuída a um closer. Use para remarketing.
          </p>
        </div>
      )}

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          {(lead.company || lead.segmento || lead.revenue_band || lead.headcount || lead.instagram) && (
            <Card title="Perfil da empresa" icon={Building2}>
              {lead.company && <Row label="Empresa" value={lead.company} />}
              <Row label="Segmento" value={lead.segmento || '—'} />
              <Row label="Faturamento mensal" value={lead.revenue_band ? revenueLabel(lead.revenue_band) : '—'} />
              <Row label="Tamanho da equipe" value={lead.headcount ? headcountLabel(lead.headcount) : '—'} />
              {lead.instagram && <Row label="Instagram" value={`@${lead.instagram}`} />}
            </Card>
          )}

          <ApplicationCard lead={lead} />

          <Card title="Atribuição" icon={Megaphone}>
            <Row label="Origem (utm_source)" value={lead.utm_source || '—'} />
            <Row label="Parceiro / embaixador" value={lead.partner_name ? `${lead.partner_name} (${lead.partner_utm})` : 'Orgânico / sem atribuição'} />
            <Row label="Campanha" value={lead.utm_campaign || '—'} />
            <Row label="Meio" value={lead.utm_medium || '—'} />
            <Row label="Conteúdo / termo" value={[lead.utm_content, lead.utm_term].filter(Boolean).join(' · ') || '—'} />
          </Card>

          {sale && <SalePanel sale={sale} busy={busy} onAct={act} />}

          <Card title="Histórico" icon={Clock}>
            <div className="flex flex-col gap-3">
              {(lead.events ?? []).slice().reverse().map((ev) => <Event key={ev.id} ev={ev} />)}
              {(lead.events ?? []).length === 0 && <span style={{ fontSize: 11, color: FAINT }}>Sem eventos.</span>}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          <Card title="Status do lead" icon={Tag}>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.filter((s) => s.key !== 'won').map((s) => {
                const active = lead.status === s.key
                return (
                  <button key={s.key} disabled={busy || active}
                    onClick={() => act(() => apiPatch(`/ci/admin/leads/${id}/status`, { status: s.key, actor: 'crm' }))}
                    className="ci-data" style={{
                      fontSize: 11, padding: '6px 11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
                      cursor: active ? 'default' : 'pointer',
                      ...(active ? pill(LEAD_STATUSES, s.key) : { color: 'var(--ci-mineral)', background: 'transparent', border: '1px solid var(--ci-sand-deep)' }),
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title="Closer responsável" icon={Phone}>
            <div className="flex flex-wrap gap-2">
              <SegBtn active={!lead.assigned_closer_id} disabled={busy}
                onClick={() => act(() => apiPatch(`/ci/admin/leads/${id}/assign`, { closerId: null, actor: 'crm' }))}>
                Não atribuído
              </SegBtn>
              {closers.map((c) => (
                <SegBtn key={c.id} active={lead.assigned_closer_id === c.id} disabled={busy}
                  onClick={() => act(() => apiPatch(`/ci/admin/leads/${id}/assign`, { closerId: c.id, actor: 'crm' }))}>
                  {c.name}
                </SegBtn>
              ))}
            </div>
          </Card>

          {!sale && (
            <Card title="Fechar venda" icon={DollarSign}>
              <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
                Registra a venda e marca o lead como <strong>Fechado</strong>. As comissões <strong>previstas</strong> de todos os envolvidos são registradas na hora; viram comissões <strong>a pagar</strong> quando o pagamento é confirmado (status “Pago”).
              </p>
              <button className="ci-btn w-full" disabled={busy} onClick={() => act(() => apiPost('/ci/admin/sales', { leadId: id }))}>Registrar venda</button>
            </Card>
          )}

          <Card title="Adicionar nota" icon={MessageSquarePlus}>
            <textarea className="ci-input" rows={3} value={note} placeholder="Resumo da conversa, objeções, próximos passos…" onChange={(e) => setNote(e.target.value)} />
            <button className="ci-btn ci-btn--ghost w-full mt-2" disabled={busy || !note.trim()}
              onClick={() => act(async () => { await apiPost(`/ci/admin/leads/${id}/notes`, { text: note.trim(), actor: 'crm' }); setNote('') })}>Salvar nota</button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SalePanel({ sale, busy, onAct }) {
  const sm = meta(SALE_STATUSES, sale.status)
  const canPay = sale.status === 'pending_payment'
  const canOnboard = sale.status === 'paid'
  return (
    <Card title="Venda" icon={DollarSign}>
      <div className="flex items-center justify-between mb-3">
        <span className="ci-data" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ci-mineral)' }}>{brl(sale.amount)}</span>
        <span className="ci-pill" style={pill(SALE_STATUSES, sale.status)}>{sm.label}</span>
      </div>
      {(canPay || canOnboard) && (
        <div className="flex gap-2 mb-4">
          {canPay && <button className="ci-btn ci-btn--ghost flex-1" disabled={busy} onClick={() => onAct(() => apiPatch(`/ci/admin/sales/${sale.id}/status`, { status: 'paid' }))}>Marcar pago</button>}
          {canOnboard && <button className="ci-btn flex-1" disabled={busy} onClick={() => onAct(() => apiPatch(`/ci/admin/sales/${sale.id}/status`, { status: 'onboarding' }))}><Rocket size={13} /> Iniciar onboarding</button>}
        </div>
      )}
      {sale.journey?.length > 0 && (
        <div className="mb-4">
          <p className="ci-eyebrow mb-2">Jornada concierge</p>
          <div className="flex flex-col gap-1.5">
            {sale.journey.map((j) => {
              const next = j.status === 'pending' ? 'in_progress' : j.status === 'in_progress' ? 'done' : 'pending'
              const Icon = j.status === 'done' ? CheckCircle2 : j.status === 'in_progress' ? CircleDot : Circle
              const color = j.status === 'done' ? '#1f7a44' : j.status === 'in_progress' ? '#9c6f1e' : FAINT
              return (
                <button key={j.id} disabled={busy} onClick={() => onAct(() => apiPatch(`/ci/admin/journey/${j.id}`, { status: next }))}
                  className="flex items-center gap-2 text-left transition-colors hover:bg-[#141618]/[0.03]" style={{ padding: '4px 6px' }}>
                  <Icon size={14} style={{ color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: j.status === 'done' ? MUTED : 'var(--ci-mineral)', textDecoration: j.status === 'done' ? 'line-through' : 'none' }}>{j.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {sale.commissions?.length > 0 && (
        <div>
          <p className="ci-eyebrow mb-2">{sale.status === 'pending_payment' ? 'Comissões previstas' : 'Comissões'}</p>
          <div className="flex flex-col gap-1.5">
            {sale.commissions.map((cm) => (
              <div key={cm.id} className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                <span style={{ color: 'var(--ci-mineral)' }}>{cm.beneficiary_name} <span className="ci-data" style={{ color: FAINT }}>· {cm.rate}%</span></span>
                <span className="flex items-center gap-2">
                  <span className="ci-data" style={{ color: 'var(--ci-mineral)', fontWeight: 600 }}>{brl(cm.amount)}</span>
                  <span className="ci-pill" style={pill(COMMISSION_STATUSES, cm.status)}>{meta(COMMISSION_STATUSES, cm.status).label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function ApplicationCard({ lead }) {
  let a = null
  try { a = lead.application ? JSON.parse(lead.application) : null } catch { a = null }
  if (!a) return null
  const yesno = (v) => (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '—')
  return (
    <Card title="Aplicação (pré-venda)" icon={FileText}>
      <div className="grid grid-cols-2 gap-x-4">
        <Row label="Empreende há" value={a.years ? yearsLabel(a.years) : '—'} />
        <Row label="Impostos/ano (estimado)" value={a.tax_estimate || '—'} />
        <Row label="Disponível 7 dias" value={yesno(a.availability)} />
        <Row label="Confirma a vaga em" value={a.decision_timeline ? decisionLabel(a.decision_timeline) : '—'} />
      </div>
      <div className="mt-2" style={{ borderTop: '1px solid var(--ci-line-soft)' }}>
        <LongRow label="Quer conversa com o Pedro" value={yesno(a.wants_call)} />
        <LongRow label="Principal desafio hoje" value={a.main_challenge} />
        <LongRow label="Problema que quer resolver na sala" value={a.problem_to_solve} />
        <LongRow label="O que pode agregar à turma" value={a.value_add} />
      </div>
    </Card>
  )
}

function LongRow({ label, value }) {
  if (!value) return null
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
      <p style={{ fontSize: 10.5, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ fontSize: 12.5, color: 'var(--ci-mineral)', marginTop: 3, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value}</p>
    </div>
  )
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="ci-card">
      <div className="ci-card-h">{Icon && <Icon size={13} style={{ color: 'var(--ci-green)' }} />}<h3 className="ci-title">{title}</h3></div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
      <span style={{ fontSize: 11, color: FAINT }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--ci-mineral)', textAlign: 'right' }} className="truncate">{value}</span>
    </div>
  )
}

function Event({ ev }) {
  let payload = {}
  try { payload = ev.payload ? JSON.parse(ev.payload) : {} } catch { /* ignore */ }
  const text = {
    created: 'Lead criado',
    qualified: 'Perfil da empresa preenchido',
    status_change: `Status → ${payload.status ?? ''}`,
    assign: 'Closer reatribuído',
    turma_change: `Turma → ${payload.turma ?? '—'}`,
    note: payload.text,
    contact: 'Contato registrado',
  }[ev.type] ?? ev.type
  return (
    <div className="flex items-start gap-2.5">
      <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ci-green)', marginTop: 5, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 12, color: 'var(--ci-mineral)' }}>{text}</p>
        <p className="ci-data" style={{ fontSize: 10, color: FAINT }}>{ev.actor} · {timeAgo(ev.created_at)}</p>
      </div>
    </div>
  )
}
