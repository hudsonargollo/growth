import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Tag, UserCheck, Search, MessageCircle } from 'lucide-react'
import { useApi, timeAgo } from '../../hooks/useApi.js'
import { LEAD_STATUSES, waLink, waGreeting } from './ciStatus.js'

const BOARD_CAP = 300

export default function CrmLeads() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')

  const qs = new URLSearchParams({ limit: String(BOARD_CAP) })
  if (query) qs.set('search', query)
  const { data, loading, error } = useApi(`/ci/admin/leads?${qs.toString()}`, [query])
  const { data: statsData } = useApi('/ci/admin/leads/stats')
  const leads = data?.leads ?? []
  const counts = statsData?.counts ?? {}
  const byStatus = (key) => leads.filter((l) => l.status === key)

  return (
    <div>
      <Header
        title="Pipeline de Leads"
        subtitle="Do primeiro contato ao onboarding."
        right={<span style={{ fontSize: 11, color: 'rgba(20,22,24,0.45)' }} className="hidden sm:inline ci-data">{data?.total ?? 0} leads</span>}
      />

      <form onSubmit={(e) => { e.preventDefault(); setQuery(term.trim()) }} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={14} style={{ color: 'var(--ci-sand-deep)', position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="ci-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome, e-mail ou WhatsApp…" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <button type="submit" className="ci-btn ci-btn--ghost shrink-0">Buscar</button>
        {query && <button type="button" className="ci-btn ci-btn--ghost shrink-0" onClick={() => { setTerm(''); setQuery('') }}>Limpar</button>}
      </form>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading && <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Carregando…</div>}

      {!loading && (
        <div className="flex gap-3.5 overflow-x-auto pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible -mx-1 px-1 items-start" style={{ scrollSnapType: 'x proximity' }}>
          {LEAD_STATUSES.map((s) => {
            const col = byStatus(s.key)
            const total = counts[s.key] ?? col.length
            const hidden = Math.max(total - col.length, 0)
            return (
              <div key={s.key} className="shrink-0 w-[80vw] sm:w-[46vw] lg:w-auto min-w-0" style={{ scrollSnapAlign: 'start' }}>
                <div className="flex flex-col overflow-hidden" style={{ background: 'var(--ci-ivory)', border: '1px solid var(--ci-line)', borderTop: `3px solid ${s.color}`, borderRadius: 12, boxShadow: 'var(--ci-shadow)' }}>
                  {/* lane header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color, flexShrink: 0 }} />
                      <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ci-mineral)' }}>{s.label}</span>
                    </div>
                    <span className="ci-data shrink-0" style={{ fontSize: 10.5, fontWeight: 700, color: s.color, background: `${s.color}1a`, border: `1px solid ${s.color}40`, borderRadius: 999, padding: '1px 8px', minWidth: 24, textAlign: 'center' }}>{total}</span>
                  </div>
                  {/* lane body */}
                  <div className="flex flex-col gap-2 p-2.5" style={{ background: 'rgba(20,22,24,0.03)', minHeight: 96 }}>
                    {col.map((l) => <LeadCard key={l.id} lead={l} onClick={() => navigate(`/admin/leads/${l.id}`)} />)}
                    {col.length === 0 && (
                      <div className="grid place-items-center" style={{ fontSize: 10, color: 'rgba(20,22,24,0.4)', minHeight: 70, border: '1px dashed var(--ci-line)', borderRadius: 8 }}>vazio</div>
                    )}
                    {hidden > 0 && <p className="text-center" style={{ fontSize: 10, color: 'rgba(20,22,24,0.55)', padding: '4px' }}>+{hidden} — refine a busca</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, onClick }) {
  return (
    <button onClick={onClick} className="ci-card text-left w-full transition-colors hover:border-[#2e4a43]/40" style={{ padding: '12px 13px' }}>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }} className="truncate">{lead.name || 'Sem nome'}</p>
      {lead.phone && (
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="flex items-center gap-1.5 truncate ci-data" style={{ fontSize: 11, color: 'rgba(20,22,24,0.5)' }}>
            <Phone size={11} /> {lead.phone}
          </span>
          <span
            role="button" tabIndex={0} title="Enviar WhatsApp"
            onClick={(e) => { e.stopPropagation(); window.open(waLink(lead.phone, waGreeting(lead)), '_blank', 'noopener') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); window.open(waLink(lead.phone, waGreeting(lead)), '_blank', 'noopener') } }}
            className="shrink-0 grid place-items-center"
            style={{ width: 24, height: 24, color: '#1f7a44', background: 'rgba(31,122,68,0.10)', border: '1px solid rgba(31,122,68,0.30)' }}
          >
            <MessageCircle size={13} />
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="ci-chip truncate"><Tag size={10} /> <span className="truncate">{lead.partner_name || lead.utm_source || 'orgânico'}</span></span>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="flex items-center gap-1 truncate" style={{ fontSize: 10, color: 'rgba(20,22,24,0.58)' }}><UserCheck size={10} /> {lead.closer_name || '—'}</span>
        <span className="ci-data shrink-0" style={{ fontSize: 10, color: 'rgba(20,22,24,0.5)' }}>{timeAgo(lead.created_at)}</span>
      </div>
    </button>
  )
}

export function Header({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7">
      <div>
        <h1 className="ci-h1">{title}</h1>
        {subtitle && <p style={{ fontSize: 12.5, color: 'rgba(20,22,24,0.5)', marginTop: 5 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function ErrorBanner({ children }) {
  return (
    <div style={{ background: 'rgba(155,44,44,0.07)', border: '1px solid rgba(155,44,44,0.25)', color: '#9b2c2c', fontSize: 13, padding: '11px 14px', marginBottom: 18 }}>
      {children}
    </div>
  )
}

/** Squared selectable button — replaces dropdowns across the CRM. */
export function SegBtn({ active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="ci-data"
      style={{
        fontSize: 11, padding: '9px 12px', textTransform: 'uppercase', letterSpacing: '0.06em',
        fontWeight: 600, borderRadius: 8, cursor: disabled ? 'default' : 'pointer', transition: 'all .15s',
        ...(active
          ? { background: 'var(--ci-mineral)', color: 'var(--ci-ivory)', border: '1px solid var(--ci-mineral)' }
          : { background: 'transparent', color: 'var(--ci-mineral)', border: '1px solid var(--ci-line)' }),
      }}
    >
      {children}
    </button>
  )
}
