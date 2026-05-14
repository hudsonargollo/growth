import { ShoppingBag, FileText, Mic, Send, MessageSquare, TrendingUp } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'

function LoadingRows({ cols }) {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i} className="border-b border-gray-50">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-6 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
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

  const aiReplies    = comments.filter((c) => c.source === 'AI' && c.status === 'completed').length
  const humanReplies = comments.filter((c) => c.source === 'human').length
  const aiPct        = comments.length ? Math.round((aiReplies / comments.length) * 100) : 0

  // Build unified recent activity feed
  const activity = [
    ...sessions.map((s)   => ({ type: 'Mining',    name: `${s.marketplace} – ${s.category}`,  status: s.status,  time: s.createdAt })),
    ...scripts.map((s)    => ({ type: 'Script',    name: s.blueprintId,                        status: 'completed', time: s.createdAt })),
    ...voiceovers.map((v) => ({ type: 'Voiceover', name: `${v.voiceModel} voice`,              status: v.status,  time: v.createdAt })),
    ...deliveries.map((d) => ({ type: 'Delivery',  name: `Editor – ${d.editorContact}`,        status: d.status,  time: d.createdAt })),
    ...comments.map((c)   => ({ type: 'Comment',   name: c.comment?.slice(0, 50),              status: c.status,  time: c.createdAt })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10)

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your content pipeline" />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard label="Products Cataloged"  value={products.length.toLocaleString()}   sub="All marketplaces"                          icon={ShoppingBag}   color="indigo" />
        <StatCard label="Scripts Generated"   value={scripts.length.toLocaleString()}    sub={`${scripts.length} total`}                 icon={FileText}      color="blue"   />
        <StatCard label="Voiceovers Ready"    value={voiceovers.length.toLocaleString()} sub={`${voiceovers.filter(v=>v.status==='completed').length} completed`} icon={Mic} color="green" />
        <StatCard label="Deliveries Sent"     value={deliveries.length.toLocaleString()} sub={`${deliveries.filter(d=>d.status==='completed').length} completed`} icon={Send} color="yellow" />
        <StatCard label="Comments Replied"    value={comments.length.toLocaleString()}   sub={`AI: ${aiPct}% · Human: ${100 - aiPct}%`} icon={MessageSquare} color="indigo" />
        <StatCard label="Mining Sessions"     value={sessions.length.toLocaleString()}   sub={`${sessions.filter(s=>s.status==='completed').length} completed`}  icon={TrendingUp} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Activity</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Job</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0
              ? <LoadingRows cols={4} />
              : activity.map((job, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-500">{job.type}</td>
                  <td className="px-6 py-3 font-medium text-gray-800 max-w-xs truncate">{job.name}</td>
                  <td className="px-6 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-6 py-3 text-gray-400">{timeAgo(job.time)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
