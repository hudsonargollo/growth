import { ShoppingBag, FileText, Mic, Send, MessageSquare, TrendingUp } from 'lucide-react'
import StatCard    from '../components/StatCard.jsx'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'

// type → visual chip style
const TYPE_STYLES = {
  Mining:    'bg-indigo-100 text-indigo-700',
  Script:    'bg-violet-100 text-violet-700',
  Voiceover: 'bg-emerald-100 text-emerald-700',
  Delivery:  'bg-blue-100 text-blue-700',
  Comment:   'bg-amber-100 text-amber-700',
}

function SkeletonRows({ cols }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="border-b border-black/[0.04]">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-5 py-3">
          <div className="skeleton h-4" style={{ width: `${55 + (j * 10) % 35}%` }} />
        </td>
      ))}
    </tr>
  ))
}

export default function Dashboard() {
  const { data: miningData }   = useApi('/mining/catalog')
  const { data: sessionsData } = useApi('/mining/sessions')
  const { data: scriptsData }  = useApi('/scripts')
  const { data: voData }       = useApi('/voiceover')
  const { data: delivData }    = useApi('/delivery')
  const { data: commData }     = useApi('/comments')

  const products   = miningData?.products   ?? []
  const sessions   = sessionsData?.sessions ?? []
  const scripts    = scriptsData?.scripts   ?? []
  const voiceovers = voData?.voiceovers     ?? []
  const deliveries = delivData?.jobs        ?? []
  const comments   = commData?.jobs         ?? []

  const aiReplies = comments.filter((c) => c.source === 'AI' && c.status === 'completed').length
  const aiPct     = comments.length ? Math.round((aiReplies / comments.length) * 100) : 0

  const activity = [
    ...sessions.map((s)   => ({ type: 'Mining',    name: `${s.marketplace} – ${s.category}`,         status: s.status,    time: s.createdAt })),
    ...scripts.map((s)    => ({ type: 'Script',    name: s.title || s.blueprintId,                   status: 'completed', time: s.createdAt })),
    ...voiceovers.map((v) => ({ type: 'Voiceover', name: `${v.voiceModel} voice`,                    status: v.status,    time: v.createdAt })),
    ...deliveries.map((d) => ({ type: 'Delivery',  name: `Editor – ${d.editorContact}`,              status: d.status,    time: d.createdAt })),
    ...comments.map((c)   => ({ type: 'Comment',   name: c.comment?.slice(0, 50) ?? '—',             status: c.status,    time: c.createdAt })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 12)

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Visão Geral"
        title="Dashboard"
        description="Acompanhe seu pipeline de conteúdo em tempo real"
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard label="Produtos Catalogados"    value={products.length.toLocaleString()}   sub="Todos os marketplaces"                                                   icon={ShoppingBag}   color="indigo" />
        <StatCard label="Roteiros Gerados"        value={scripts.length.toLocaleString()}    sub={`${scripts.length} total`}                                               icon={FileText}      color="violet" />
        <StatCard label="Narrações Prontas"       value={voiceovers.length.toLocaleString()} sub={`${voiceovers.filter(v=>v.status==='completed').length} concluídas`}     icon={Mic}           color="green"  />
        <StatCard label="Entregas Enviadas"       value={deliveries.length.toLocaleString()} sub={`${deliveries.filter(d=>d.status==='completed').length} concluídas`}    icon={Send}          color="blue"   />
        <StatCard label="Comentários Respondidos" value={comments.length.toLocaleString()}   sub={`IA: ${aiPct}% · Humano: ${100 - aiPct}%`}                             icon={MessageSquare} color="yellow" />
        <StatCard label="Sessões de Mineração"    value={sessions.length.toLocaleString()}   sub={`${sessions.filter(s=>s.status==='completed').length} concluídas`}      icon={TrendingUp}    color="green"  />
      </div>

      <div className="card">
        <div className="card-header">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <TrendingUp size={12} className="text-white" />
          </div>
          <h3 className="card-title">Atividade Recente</h3>
          <span className="ml-auto text-[11px] text-gray-400 font-medium">{activity.length} eventos</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05]">
              <th className="th">Tipo</th>
              <th className="th">Tarefa</th>
              <th className="th">Status</th>
              <th className="th">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0
              ? <SkeletonRows cols={4} />
              : activity.map((job, i) => (
                <tr key={i} className="tr">
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${TYPE_STYLES[job.type] ?? 'bg-gray-100 text-gray-500'}`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{job.name}</td>
                  <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs tabular-nums">{timeAgo(job.time)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {activity.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <TrendingUp size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Nenhuma atividade ainda</p>
            <p className="text-xs text-gray-300 mt-1">Execute uma mineração para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
