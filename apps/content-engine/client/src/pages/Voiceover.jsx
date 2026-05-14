import { useState } from 'react'
import { Mic, Play, Download } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

export default function Voiceover() {
  const { data: voData,      refetch }      = useApi('/voiceover')
  const { data: scriptsData }               = useApi('/scripts')

  const voiceovers = voData?.voiceovers     ?? []
  const scripts    = scriptsData?.scripts   ?? []

  const [scriptId, setScriptId]             = useState('')
  const [voiceModel, setVoiceModel]         = useState('Rachel')
  const [stability, setStability]           = useState(75)
  const [similarityBoost, setSimilarityBoost] = useState(80)
  const [generating, setGenerating]         = useState(false)
  const [error, setError]                   = useState(null)

  async function handleGenerate() {
    if (!scriptId) { setError('Select a script first'); return }
    setGenerating(true)
    setError(null)
    try {
      await apiPost('/voiceover/generate', {
        scriptId,
        voiceModel,
        stability:       stability / 100,
        similarityBoost: similarityBoost / 100,
      })
      await refetch()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Voiceover Generation"
        description="ElevenLabs TTS — generate audio from scripts"
        action={
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Mic size={15} />
            {generating ? 'Generating…' : 'Generate Voiceover'}
          </button>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Voice Configuration</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Script</label>
            <select value={scriptId} onChange={(e) => setScriptId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Select a script —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.blueprintId} ({s.language?.toUpperCase()}) · {s.id.slice(0, 8)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Voice Model</label>
            <select value={voiceModel} onChange={(e) => setVoiceModel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Rachel">Rachel (EN)</option>
              <option value="Antonio">Antonio (ES)</option>
              <option value="Bella">Bella (EN)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stability — {stability}%</label>
            <input type="range" min="0" max="100" value={stability} onChange={(e) => setStability(+e.target.value)}
              className="w-full accent-indigo-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Similarity Boost — {similarityBoost}%</label>
            <input type="range" min="0" max="100" value={similarityBoost} onChange={(e) => setSimilarityBoost(+e.target.value)}
              className="w-full accent-indigo-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Voiceovers</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Script ID</th>
              <th className="px-6 py-3 font-medium">Voice</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {voiceovers.length === 0
              ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No voiceovers yet — select a script and generate above.</td></tr>
              : voiceovers.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{v.scriptId?.slice(0, 12)}…</td>
                  <td className="px-6 py-3 text-gray-700">{v.voiceModel}</td>
                  <td className="px-6 py-3 text-gray-700">{v.duration}</td>
                  <td className="px-6 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-6 py-3 text-gray-400">{timeAgo(v.createdAt)}</td>
                  <td className="px-6 py-3">
                    {v.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <a href={v.fileUrl} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors" title="Preview">
                          <Play size={14} />
                        </a>
                        <a href={v.fileUrl} download
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors" title="Download">
                          <Download size={14} />
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
