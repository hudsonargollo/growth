import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

export default function Delivery() {
  const { data, refetch }              = useApi('/delivery')
  const { data: scriptsData }          = useApi('/scripts')
  const { data: voData }               = useApi('/voiceover')

  const deliveries = data?.jobs        ?? []
  const scripts    = scriptsData?.scripts ?? []
  const voiceovers = voData?.voiceovers   ?? []

  const [scriptId, setScriptId]        = useState('')
  const [voiceoverId, setVoiceoverId]  = useState('')
  const [editorContact, setEditorContact] = useState('')
  const [sending, setSending]          = useState(false)
  const [error, setError]              = useState(null)

  async function handleSend() {
    if (!scriptId || !editorContact) { setError('Script and editor contact are required'); return }
    setSending(true)
    setError(null)
    try {
      await apiPost('/delivery/send', { scriptId, voiceoverId: voiceoverId || undefined, editorContact })
      await refetch()
      setScriptId('')
      setVoiceoverId('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Editor Delivery"
        description="Send scripts and voiceovers to your editor via WhatsApp"
        action={
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Send size={15} />
            {sending ? 'Sending…' : 'Send Now'}
          </button>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">New Delivery</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Script</label>
            <select value={scriptId} onChange={(e) => setScriptId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Select script —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.blueprintId} ({s.language?.toUpperCase()}) · {s.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Voiceover (optional)</label>
            <select value={voiceoverId} onChange={(e) => setVoiceoverId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— None —</option>
              {voiceovers.map((v) => (
                <option key={v.id} value={v.id}>{v.voiceModel} · {v.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Editor WhatsApp</label>
            <input type="text" value={editorContact} onChange={(e) => setEditorContact(e.target.value)}
              placeholder="+1 555 0100"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Delivery History</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Script</th>
              <th className="px-6 py-3 font-medium">Editor</th>
              <th className="px-6 py-3 font-medium">Voiceover</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Sent</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0
              ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No deliveries yet.</td></tr>
              : deliveries.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{d.scriptId?.slice(0, 12)}…</td>
                  <td className="px-6 py-3 text-gray-700">{d.editorContact}</td>
                  <td className="px-6 py-3">
                    {d.voiceoverId
                      ? <CheckCircle size={15} className="text-green-500" />
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-3 text-gray-400">{timeAgo(d.sentAt)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
