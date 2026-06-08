import { useState } from 'react'
import { MessageSquare, ShieldCheck, AlertTriangle, RefreshCw, X } from 'lucide-react'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard    from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

const GUARDRAILS = [
  { label: 'Bloquear assédio / discurso de ódio',          defaultChecked: true  },
  { label: 'Bloquear desinformação',                        defaultChecked: true  },
  { label: 'Exigir divulgação de afiliados',                defaultChecked: true  },
  { label: 'Revisão humana para comentários sinalizados',   defaultChecked: true  },
  { label: 'Aplicar tom da marca',                          defaultChecked: true  },
  { label: 'Ignorar respostas em avaliações negativas',     defaultChecked: false },
]

export default function Comments() {
  const { data, refetch, loading } = useApi('/comments')
  const jobs = data?.jobs ?? []

  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState(null)

  const aiReplies    = jobs.filter(j => j.source === 'AI' && j.status === 'completed').length
  const humanReviewed = jobs.filter(j => j.source === 'human').length
  const flagged      = jobs.filter(j => j.flagged).length
  const aiPct        = jobs.length ? Math.round((aiReplies / jobs.length) * 100) : 0

  async function handleRunAgent() {
    setRunning(true); setError(null)
    try { await apiPost('/comments/run', {}); await refetch() }
    catch (e) { setError(e.message) }
    finally { setRunning(false) }
  }

  async function handleReview(id, decision) {
    try { await apiPost(`/comments/${id}/${decision}`, {}); await refetch() }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Pipeline"
        title="Automação de Comentários"
        description="Respostas via LLM com guardrails de segurança e revisão humana"
        action={
          <button onClick={handleRunAgent} disabled={running} className="btn-primary">
            {running ? <RefreshCw size={14} className="animate-spin" /> : <MessageSquare size={14} />}
            {running ? 'Executando…' : 'Executar Agente'}
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.22)', color: '#FF3366' }}>
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={13} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Processados" value={jobs.length.toLocaleString()}        sub="Desde sempre"               icon={MessageSquare} color="indigo" />
        <StatCard label="Respostas por IA"  value={aiReplies.toLocaleString()}          sub={`${aiPct}% do total`}       icon={ShieldCheck}   color="green"  />
        <StatCard label="Revisão Humana"    value={humanReviewed.toLocaleString()}      sub={`${100 - aiPct}% do total`} icon={MessageSquare} color="blue"   />
        <StatCard label="Sinalizados"       value={flagged.toLocaleString()}            sub="Aguardam revisão"           icon={AlertTriangle} color="yellow" />
      </div>

      {/* Guardrails */}
      <div className="rounded-2xl p-5 mb-5"
        style={{ background: 'rgba(15,15,22,0.70)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm font-bold text-white/80 mb-4">Guardrails &amp; Segurança</p>
        <div className="grid grid-cols-2 gap-3">
          {GUARDRAILS.map(g => (
            <label key={g.label}
              className="flex items-center gap-3 text-sm cursor-pointer select-none"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              <input type="checkbox" defaultChecked={g.defaultChecked}
                className="w-4 h-4 rounded cursor-pointer accent-violet-500 shrink-0" />
              {g.label}
            </label>
          ))}
        </div>
      </div>

      {/* Jobs list */}
      <div className="card">
        <div className="card-header">
          <MessageSquare size={13} style={{ color: '#8B5CF6' }} />
          <h3 className="card-title">Jobs de Comentários</h3>
          <span className="text-[11px] text-white/30 ml-1">{jobs.length} total</span>
        </div>

        {loading && (
          <div className="px-6 py-10 text-center text-xs text-white/25">Carregando…</div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <MessageSquare size={18} style={{ color: '#8B5CF6' }} />
            </div>
            <p className="text-sm font-medium text-white/40">Nenhum job ainda</p>
            <p className="text-xs text-white/25">Clique em "Executar Agente" para processar comentários.</p>
          </div>
        )}

        <div style={{ borderTop: jobs.length ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          {jobs.map(c => (
            <div key={c.id} className="px-5 py-4 transition-colors"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: c.flagged ? 'rgba(255,184,0,0.04)' : 'transparent',
              }}
              onMouseEnter={e => !c.flagged && (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
              onMouseLeave={e => !c.flagged && (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <p className="text-[10px] text-white/25 mb-1.5 font-mono">
                    Video: {c.videoId} · {timeAgo(c.createdAt)}
                  </p>
                  {/* Comment */}
                  <p className="text-sm text-white/70 font-medium leading-snug">
                    {c.comment}
                  </p>
                  {/* Reply */}
                  {c.reply && (
                    <p className="text-sm mt-2 pl-3 leading-relaxed"
                      style={{ color: '#a78bfa', borderLeft: '2px solid rgba(139,92,246,0.35)' }}>
                      ↳ {c.reply}
                    </p>
                  )}
                  {/* Flagged warning */}
                  {c.flagged && (
                    <p className="text-xs mt-2 flex items-center gap-1.5 font-medium"
                      style={{ color: '#FFB800' }}>
                      <AlertTriangle size={11} /> Sinalizado para revisão humana
                    </p>
                  )}
                </div>

                {/* Right column */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span className="text-[10px] text-white/25 font-mono uppercase">{c.source}</span>
                  {c.status === 'flagged' && (
                    <div className="flex gap-1.5 mt-1">
                      <button onClick={() => handleReview(c.id, 'approve')}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(0,255,185,0.10)', color: '#00FFB9', border: '1px solid rgba(0,255,185,0.22)' }}>
                        Aprovar
                      </button>
                      <button onClick={() => handleReview(c.id, 'reject')}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                        style={{ background: 'rgba(255,51,102,0.10)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.22)' }}>
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
