import { useState } from 'react'
import { MessageSquare, ShieldCheck, AlertTriangle, RefreshCw, Bot, User, CheckCircle2, XCircle } from 'lucide-react'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard    from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

const GUARDRAILS = [
  { label: 'Bloquear assédio / discurso de ódio',          defaultChecked: true },
  { label: 'Bloquear desinformação',                        defaultChecked: true },
  { label: 'Exigir divulgação de afiliados',                defaultChecked: true },
  { label: 'Revisão humana para comentários sinalizados',   defaultChecked: true },
  { label: 'Aplicar tom da marca',                          defaultChecked: true },
  { label: 'Ignorar respostas em avaliações negativas',     defaultChecked: false },
]

function Toggle({ defaultChecked }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button
      type="button"
      onClick={() => setOn(v => !v)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ background: on ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e5e7eb' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
        style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

export default function Comments() {
  const { data, refetch, loading } = useApi('/comments')
  const jobs = data?.jobs ?? []

  const [running, setRunning] = useState(false)
  const [error,   setError]   = useState(null)

  const aiReplies     = jobs.filter((j) => j.source === 'AI' && j.status === 'completed').length
  const humanReviewed = jobs.filter((j) => j.source === 'human').length
  const flaggedCount  = jobs.filter((j) => j.flagged).length
  const aiPct         = jobs.length ? Math.round((aiReplies / jobs.length) * 100) : 0

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
        overline="Automação"
        title="Comentários"
        description="Respostas via LLM com guardrails de segurança e revisão humana"
        action={
          <button onClick={handleRunAgent} disabled={running} className="btn-primary">
            {running ? <RefreshCw size={15} className="animate-spin" /> : <MessageSquare size={15} />}
            {running ? 'Executando…' : 'Executar Agente'}
          </button>
        }
      />

      {error && <div className="alert-error mb-5">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Processados" value={jobs.length.toLocaleString()}        sub="Desde sempre"              icon={MessageSquare} color="indigo" />
        <StatCard label="Respostas por IA"  value={aiReplies.toLocaleString()}          sub={`${aiPct}% do total`}      icon={Bot}           color="green"  />
        <StatCard label="Revisão Humana"    value={humanReviewed.toLocaleString()}       sub={`${100-aiPct}% do total`}  icon={User}          color="blue"   />
        <StatCard label="Sinalizados"       value={flaggedCount.toLocaleString()}        sub="Aguardam revisão"          icon={AlertTriangle} color="yellow" />
      </div>

      {/* Guardrails */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={15} className="text-indigo-500" />
          <h3 className="card-title">Guardrails &amp; Segurança</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GUARDRAILS.map((g) => (
            <label
              key={g.label}
              className="flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-xl bg-gray-50 ring-1 ring-black/[0.05] cursor-pointer hover:bg-gray-100/80 transition-colors"
            >
              <span className="text-[13px] text-gray-700 font-medium">{g.label}</span>
              <Toggle defaultChecked={g.defaultChecked} />
            </label>
          ))}
        </div>
      </div>

      {/* Comment jobs */}
      <div className="card">
        <div className="card-header">
          <MessageSquare size={14} className="text-gray-400" />
          <h3 className="card-title">Jobs de Comentários</h3>
          <span className="ml-auto text-[11px] text-gray-400">{jobs.length} total</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={18} className="animate-spin text-indigo-400" />
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <MessageSquare size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Nenhum job ainda</p>
            <p className="text-xs text-gray-300 mt-1">Clique em "Executar Agente" para processar comentários</p>
          </div>
        )}

        <div className="divide-y divide-black/[0.04]">
          {jobs.map((c) => (
            <div
              key={c.id}
              className={`px-6 py-4 transition-colors ${c.flagged ? 'bg-orange-50/60' : 'hover:bg-gray-50/60'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400 mb-1.5 font-medium">
                    Video: <span className="font-mono">{c.videoId}</span> · {timeAgo(c.createdAt)}
                  </p>
                  <p className="text-[13px] text-gray-800 font-medium leading-relaxed">
                    💬 {c.comment}
                  </p>
                  {c.reply && (
                    <p className="text-[13px] text-indigo-700 mt-2.5 pl-3 border-l-2 border-indigo-200 leading-relaxed">
                      {c.reply}
                    </p>
                  )}
                  {c.flagged && (
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1.5 font-medium">
                      <AlertTriangle size={12} /> Sinalizado para revisão humana
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                    c.source === 'AI' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.source === 'AI' ? 'IA' : 'Humano'}
                  </span>
                  {c.status === 'flagged' && (
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => handleReview(c.id, 'approve')}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-semibold px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <CheckCircle2 size={11} /> Aprovar
                      </button>
                      <button
                        onClick={() => handleReview(c.id, 'reject')}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <XCircle size={11} /> Rejeitar
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
