import { useState } from 'react'
import { Wand2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

function ScriptRow({ script }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
        onClick={() => script.text && setOpen((o) => !o)}>
        <td className="px-6 py-3 font-medium text-gray-800 max-w-xs truncate">{script.blueprintId}</td>
        <td className="px-6 py-3 text-gray-500 uppercase">{script.language}</td>
        <td className="px-6 py-3"><span className="font-semibold text-indigo-600">{script.confidence}%</span></td>
        <td className="px-6 py-3"><StatusBadge status="completed" /></td>
        <td className="px-6 py-3 text-gray-400">{timeAgo(script.createdAt)}</td>
        <td className="px-6 py-3 text-gray-400">
          {script.text && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </td>
      </tr>
      {open && script.text && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-6 py-4">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-auto">
              {script.text}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Scripts() {
  const { data, refetch } = useApi('/scripts')
  const scripts = data?.scripts ?? []

  const [blueprintId, setBlueprintId] = useState('top-n-review')
  const [language, setLanguage]       = useState('en')
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      await apiPost('/scripts/generate', { blueprintId, catalogIds: [], language })
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
        title="Script Generation"
        description="Blueprint-driven scripts aligned with your video format"
        action={
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Wand2 size={15} />
            {generating ? 'Generating…' : 'Generate Script'}
          </button>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Blueprint Configuration</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Blueprint Template</label>
            <select value={blueprintId} onChange={(e) => setBlueprintId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="top-n-review">Top-N Product Review</option>
              <option value="single-deep-dive">Single Product Deep Dive</option>
              <option value="comparison">Comparison (A vs B)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="en">English (EN)</option>
              <option value="es">Spanish (ES)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product Source</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Top Scored – This Week</option>
              <option>Manual Selection</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800">Scripts</h3>
          <span className="ml-auto text-xs text-gray-400">{scripts.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Blueprint</th>
              <th className="px-6 py-3 font-medium">Lang</th>
              <th className="px-6 py-3 font-medium">Confidence</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {scripts.length === 0
              ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No scripts yet — generate your first script above.</td></tr>
              : scripts.map((s) => <ScriptRow key={s.id} script={s} />)
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
