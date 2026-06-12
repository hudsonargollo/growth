import { useState } from 'react'
import { CalendarCheck, MessageCircle, ArrowRightLeft } from 'lucide-react'
import { useApi, apiPatch, timeAgo } from '../../hooks/useApi.js'
import { SALE_STATUSES, meta, pill, brl, waLink, waGreeting } from './ciStatus.js'
import { Header, ErrorBanner } from './CrmLeads.jsx'

const FALLBACK_COHORTS = [
  { id: '2026-07-12', label: 'Turma 1 — 12/07' },
  { id: '2026-07-19', label: 'Turma 2 — 19/07' },
  { id: '2026-07-26', label: 'Turma 3 — 26/07' },
  { id: '2026-08-02', label: 'Turma 4 — 02/08' },
]

export default function CrmTurmas() {
  const { data, loading, error, refetch } = useApi('/ci/admin/clients')
  const clients = data?.clients ?? []
  const cohorts = data?.cohorts?.length ? data.cohorts : FALLBACK_COHORTS
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function move(id, turma) {
    setBusy(true); setActionError(null)
    try { await apiPatch(`/ci/admin/leads/${id}/turma`, { turma, actor: 'crm' }); await refetch() }
    catch (e) { setActionError(e.message) } finally { setBusy(false) }
  }

  // Group clients by their chosen turma, plus a catch-all for undefined.
  const known = new Set(cohorts.map((c) => c.id))
  const groups = [
    ...cohorts.map((c) => ({ ...c, clients: clients.filter((cl) => cl.turma === c.id) })),
    { id: '', label: 'Sem turma definida', clients: clients.filter((cl) => !cl.turma || !known.has(cl.turma)) },
  ]

  return (
    <div>
      <Header
        title="Turmas"
        subtitle="Clientes fechados, agrupados pela turma que escolheram no formulário."
        right={<span className="ci-data hidden sm:inline" style={{ fontSize: 11, color: 'rgba(20,22,24,0.55)' }}>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</span>}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {actionError && <ErrorBanner>{actionError}</ErrorBanner>}
      {loading && <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Carregando…</div>}

      {!loading && (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id || 'none'} className="ci-card">
              <div className="ci-card-h justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={14} style={{ color: 'var(--ci-green)' }} />
                  <h3 className="ci-title">{g.label}</h3>
                </div>
                <span className="ci-data" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ci-green)', background: 'rgba(46,74,67,0.1)', border: '1px solid rgba(46,74,67,0.25)', borderRadius: 999, padding: '1px 9px' }}>
                  {g.clients.length}
                </span>
              </div>

              <div>
                {g.clients.map((cl) => (
                  <div key={cl.id} className="p-4" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ci-mineral)' }} className="truncate">{cl.name || 'Sem nome'}</p>
                        <p className="ci-data truncate" style={{ fontSize: 11, color: 'rgba(20,22,24,0.6)', marginTop: 2 }}>{cl.phone || '—'}{cl.email ? ` · ${cl.email}` : ''}</p>
                        <p style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.5)', marginTop: 3 }}>
                          {cl.closer_name ? `Closer: ${cl.closer_name}` : 'Sem closer'}{cl.partner_name ? ` · via ${cl.partner_name}` : ''} · {timeAgo(cl.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {cl.sale_status && <span className="ci-pill" style={pill(SALE_STATUSES, cl.sale_status)}>{meta(SALE_STATUSES, cl.sale_status).label}</span>}
                        {cl.phone && (
                          <a href={waLink(cl.phone, waGreeting(cl))} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1" style={{ fontSize: 11, color: '#1f7a44' }}>
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {/* move to another turma */}
                    <div className="mt-3">
                      <p className="ci-eyebrow flex items-center gap-1.5"><ArrowRightLeft size={11} /> Mover para</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {cohorts.filter((c) => c.id !== cl.turma).map((c) => (
                          <button key={c.id} type="button" disabled={busy} onClick={() => move(cl.id, c.id)}
                            className="ci-data" style={{ fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7, cursor: busy ? 'default' : 'pointer', color: 'var(--ci-mineral)', background: 'transparent', border: '1px solid var(--ci-line)' }}>
                            {c.label.split('—').pop().trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {g.clients.length === 0 && (
                  <p className="p-8 text-center" style={{ fontSize: 12, color: 'rgba(20,22,24,0.5)' }}>Nenhum cliente nesta turma.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
