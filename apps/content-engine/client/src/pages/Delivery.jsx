import { useState } from 'react'
import { Send, CheckCircle, MessageCircle, Mic } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

export default function Delivery() {
  const { data, refetch }     = useApi('/delivery')
  const { data: scriptsData } = useApi('/scripts')
  const { data: voData }      = useApi('/voiceover')

  const deliveries = data?.jobs           ?? []
  const scripts    = scriptsData?.scripts ?? []
  const voiceovers = voData?.voiceovers   ?? []

  const [scriptId,      setScriptId]      = useState('')
  const [voiceoverId,   setVoiceoverId]   = useState('')
  const [editorContact, setEditorContact] = useState('')
  const [sending,       setSending]       = useState(false)
  const [error,         setError]         = useState(null)
  const [success,       setSuccess]       = useState(false)

  const selectedScript   = scripts.find((s) => s.id === scriptId)
  const selectedVoiceover = voiceovers.find((v) => v.id === voiceoverId)

  // Filter voiceovers to only those matching the selected script
  const matchingVoiceovers = scriptId
    ? voiceovers.filter((v) => v.scriptId === scriptId)
    : voiceovers

  async function handleSend() {
    if (!scriptId)      { setError('Selecione um roteiro');              return }
    if (!editorContact) { setError('Informe o número do editor');        return }
    setSending(true)
    setError(null)
    setSuccess(false)
    try {
      await apiPost('/delivery/send', {
        scriptId,
        voiceoverId: voiceoverId || undefined,
        editorContact,
      })
      await refetch()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Entrega para Editor"
        description="Envie roteiros e narrações ao editor via WhatsApp (Evolution API)"
        action={
          <button
            onClick={handleSend}
            disabled={sending || !scriptId || !editorContact}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Send size={15} />
            {sending ? 'Enviando…' : 'Enviar Agora'}
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={15} /> Mensagem enviada com sucesso via WhatsApp!
        </div>
      )}

      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Form */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Nova Entrega</h3>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Roteiro *</label>
            <select
              value={scriptId}
              onChange={(e) => { setScriptId(e.target.value); setVoiceoverId('') }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Selecione o roteiro —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || s.blueprintId} · {s.language?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Narração (opcional)</label>
            <select
              value={voiceoverId}
              onChange={(e) => setVoiceoverId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sem narração —</option>
              {matchingVoiceovers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.voiceModel} · {v.duration} · {v.provider ?? 'elevenlabs'}
                </option>
              ))}
            </select>
            {scriptId && matchingVoiceovers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Nenhuma narração gerada para este roteiro ainda</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp do Editor *</label>
            <input
              type="text"
              value={editorContact}
              onChange={(e) => setEditorContact(e.target.value)}
              placeholder="5511999999999"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Código do país + DDD + número, sem espaços. Ex: 5511999999999</p>
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Pré-visualização</h3>
          {selectedScript ? (
            <div className="space-y-3">
              <div className="bg-[#dcf8c6] rounded-xl rounded-tl-none px-4 py-3 max-w-[90%] text-sm text-gray-800 space-y-1.5 shadow-sm">
                <p className="font-semibold text-xs text-gray-500">Fábrica de Conteúdo</p>
                <p>📋 <strong>Novo Conteúdo Pronto — Fábrica de Conteúdo</strong></p>
                <p><strong>Roteiro:</strong> {selectedScript.title || selectedScript.blueprintId} ({(selectedScript.language ?? 'pt').toUpperCase()})</p>
                {(selectedScript.sections ?? []).length > 0 && (
                  <p><strong>Seções:</strong> {selectedScript.sections.map((s) => s.label).join(' → ')}</p>
                )}
                {voiceoverId && <p>🎙️ Narração em áudio em seguida.</p>}
                <p className="text-xs text-gray-500 italic">Confirme o recebimento. — Fábrica de Conteúdo</p>
              </div>
              {voiceoverId && (
                <div className="bg-[#dcf8c6] rounded-xl rounded-tl-none px-4 py-3 max-w-[90%] flex items-center gap-2 shadow-sm">
                  <Mic size={16} className="text-gray-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">narração.mp3</p>
                    <p className="text-xs text-gray-400">{selectedVoiceover?.duration ?? '—'}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <MessageCircle size={32} className="mb-2" />
              <p className="text-sm">Selecione um roteiro para pré-visualizar</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Send size={14} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800 text-sm">Histórico de Entregas</h3>
          <span className="ml-auto text-xs text-gray-400">{deliveries.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
              <th className="px-5 py-2 font-medium">Roteiro</th>
              <th className="px-5 py-2 font-medium">Editor</th>
              <th className="px-5 py-2 font-medium">Narração</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Enviado</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                  Nenhuma entrega ainda.
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-700 text-xs truncate max-w-[180px]">
                      {d.scripts?.title || d.scripts?.blueprintId || d.scriptId?.slice(0, 12) + '…'}
                    </div>
                    <div className="text-xs text-gray-400">{d.scripts?.language?.toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{d.editorContact}</td>
                  <td className="px-5 py-3">
                    {d.voiceoverId
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(d.sentAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
