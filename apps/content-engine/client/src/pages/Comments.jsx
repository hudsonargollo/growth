import { useState } from 'react'
import { MessageSquare, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

export default function Comments() {
  const { data, refetch, loading } = useApi('/comments')
  const jobs = data?.jobs ?? []

  const [running, setRunning] = useState(false)
  const [error, setError]     = useState(null)

  const aiReplies    = jobs.filter((j) => j.source === 'AI' && j.status === 'completed').length
  const humanReviewed = jobs.filter((j) => j.source === 'human').length
  const flagged      = jobs.filter((j) => j.flagged).length
  const aiPct        = jobs.length ? Math.round((aiReplies / jobs.length) * 100) : 0

  async function handleRunAgent() {
    setRunning(true)
    setError(null)
    try {
      await apiPost('/comments/run', {})
      await refetch()
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleReview(id, decision) {
    try {
      await apiPost(`/comments/${id}/${decision}`, {})
      await refetch()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Comment Automation"
        description="LLM-powered replies with safety guardrails and human-in-the-loop escalation"
        action={
          <button onClick={handleRunAgent} disabled={running}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {running ? <RefreshCw size={15} className="animate-spin" /> : <MessageSquare size={15} />}
            {running ? 'Running…' : 'Run Agent Now'}
          </button>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Processed"  value={jobs.length.toLocaleString()}        sub="All time"                    icon={MessageSquare} color="indigo" />
        <StatCard label="AI Replies"       value={aiReplies.toLocaleString()}           sub={`${aiPct}% of total`}        icon={ShieldCheck}   color="green"  />
        <StatCard label="Human Reviewed"   value={humanReviewed.toLocaleString()}       sub={`${100 - aiPct}% of total`}  icon={MessageSquare} color="blue"   />
        <StatCard label="Flagged"          value={flagged.toLocaleString()}             sub="Needs review"                icon={AlertTriangle} color="yellow" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Guardrails & Safety</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Block harassment / hate speech',    defaultChecked: true },
            { label: 'Block misinformation claims',       defaultChecked: true },
            { label: 'Enforce affiliate disclosure',      defaultChecked: true },
            { label: 'Human review for flagged comments', defaultChecked: true },
            { label: 'Brand tone enforcement',            defaultChecked: true },
            { label: 'Skip replies on negative reviews',  defaultChecked: false },
          ].map((g) => (
            <label key={g.label} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" defaultChecked={g.defaultChecked} className="accent-indigo-600 w-4 h-4" />
              {g.label}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Comment Jobs</h3>
        </div>
        {loading && <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading…</div>}
        {!loading && jobs.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No comment jobs yet — click "Run Agent Now" to process comments.</div>
        )}
        <div className="divide-y divide-gray-50">
          {jobs.map((c) => (
            <div key={c.id} className={`px-6 py-4 ${c.flagged ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Video: {c.videoId} · {timeAgo(c.createdAt)}</p>
                  <p className="text-sm text-gray-700 font-medium">💬 {c.comment}</p>
                  {c.reply && (
                    <p className="text-sm text-indigo-700 mt-2 pl-3 border-l-2 border-indigo-200">↳ {c.reply}</p>
                  )}
                  {c.flagged && (
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} /> Flagged for human review
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-gray-400">{c.source}</span>
                  {c.status === 'flagged' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleReview(c.id, 'approve')}
                        className="text-xs text-green-600 hover:underline font-medium">Approve</button>
                      <button onClick={() => handleReview(c.id, 'reject')}
                        className="text-xs text-red-500 hover:underline font-medium">Reject</button>
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
