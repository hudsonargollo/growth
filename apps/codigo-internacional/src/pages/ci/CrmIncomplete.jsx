import { useNavigate } from 'react-router-dom'
import { Phone, MessageCircle, Instagram, Clock } from 'lucide-react'
import { useApi, timeAgo } from '../../hooks/useApi.js'
import { waLink } from './ciStatus.js'
import { Header, ErrorBanner } from './CrmLeads.jsx'

const MUTED = 'rgba(20,22,24,0.6)'
const FAINT = 'rgba(20,22,24,0.45)'

// A gentler remarketing greeting (they never finished the application).
function rmktGreeting(lead) {
  const name = (lead?.name || '').split(' ')[0]
  return `Olá${name ? ' ' + name : ''}! Aqui é o Pedro Silvestrini, d'O Código Internacional. Vi que você começou a sua inscrição mas não chegou a concluir — quer que eu te ajude a finalizar e garantir a sua vaga?`
}

export default function CrmIncomplete() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi('/ci/admin/leads?status=incomplete&limit=300')
  const leads = data?.leads ?? []

  return (
    <div>
      <Header
        title="Aplicações incompletas"
        subtitle="Começaram com nome + WhatsApp mas não concluíram. Fora do pipeline — para remarketing."
        right={<span className="hidden sm:inline ci-data" style={{ fontSize: 11, color: FAINT }}>{data?.total ?? 0} contatos</span>}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading && <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: MUTED }}>Carregando…</div>}

      {!loading && leads.length === 0 && (
        <div className="ci-card" style={{ padding: '28px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: MUTED }}>Ninguém abandonou a inscrição ainda. 🎯</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {leads.map((l) => (
            <div key={l.id} className="ci-card flex items-center gap-3" style={{ padding: '13px 15px' }}>
              <div className="min-w-0 flex-1">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ci-mineral)' }}>{l.name || 'Sem nome'}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap ci-data" style={{ fontSize: 11, color: MUTED }}>
                  {l.phone && <span className="flex items-center gap-1"><Phone size={11} /> {l.phone}</span>}
                  {l.instagram && <span className="flex items-center gap-1"><Instagram size={11} /> @{l.instagram}</span>}
                </div>
                <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10, color: FAINT }}>
                  <Clock size={10} /> iniciou {timeAgo(l.created_at)}
                  {l.utm_source && <span> · {l.partner_name || l.utm_source}</span>}
                </div>
              </div>
              {l.phone && (
                <a href={waLink(l.phone, rmktGreeting(l))} target="_blank" rel="noopener noreferrer"
                  title="Chamar no WhatsApp"
                  className="shrink-0 grid place-items-center transition-transform hover:scale-105"
                  style={{ width: 34, height: 34, color: '#fff', background: '#1f7a44' }}>
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
