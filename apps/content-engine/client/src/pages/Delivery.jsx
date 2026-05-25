import { useState } from 'react'
import { Send, CheckCircle, MessageCircle, Mic, Trash2 } from 'lucide-react'
import PageHeader  from '../components/PageHeader.jsx'
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

  const selectedScript    = scripts.find((s) => s.id === scriptId)
  const selectedVoiceover = voiceovers.find((v) => v.id === voiceoverId)
  const matchingVoiceovers = scriptId
    ? voiceovers.filter((v) => v.scriptId === scriptId)
    : voiceovers

  async function handleSend() {
    if (!scriptId)      { setError('Selecione um roteiro');       return }
    if (!editorContact) { setError('Informe o número do editor'); return }
    setSending(true); setError(null); setSuccess(false)
    try {
      await apiPost('/delivery/send', { scriptId, voiceoverId: voiceoverId || undefined, editorContact })
      await refetch(); setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) { setError(e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Pipeline"
        title="Entrega para Editor"
        description="Envie roteiros e narrações ao editor via WhatsApp (Evolution API)"
        action={
          <button onClick={handleSend} disabled={sending || !scriptId || !editorContact} className="btn-primary">
            <Send size={15} />
            {sending ? 'Enviando…' : 'Enviar Agora'}
          </button>
        }
      />

      {error   && <div className="alert-error   mb-5">{error}</div>}
      {success && <div className="alert-success mb-5"><CheckCircle size={15} /> Mensagem enviada com sucesso via WhatsApp!</div>}

      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Form */}
        <div className="col-span-3 card p-6 space-y-5">
          <h3 className="card-title">Nova Entrega</h3>

          <div>
            <label className="field-label">Roteiro *</label>
            <select value={scriptId} onChange={(e) => { setScriptId(e.target.value); setVoiceoverId('') }} className="select">
              <option value="">— Selecione o roteiro —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.title || s.blueprintId} · {s.language?.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Narração (opcional)</label>
            <select value={voiceoverId} onChange={(e) => setVoiceoverId(e.target.value)} className="select">
              <option value="">— Sem narração —</option>
              {matchingVoiceovers.map((v) => (
                <option key={v.id} value={v.id}>{v.voiceModel} · {v.duration} · {v.provider ?? 'elevenlabs'}</option>
              ))}
            </select>
            {scriptId && matchingVoiceovers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">Nenhuma narração gerada para este roteiro ainda</p>
            )}
          </div>

          <div>
            <label className="field-label">WhatsApp do Editor *</label>
            <input
              type="text"
              value={editorContact}
              onChange={(e) => setEditorContact(e.target.value)}
              placeholder="5511999999999"
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1.5">Código do país + DDD + número, sem espaços. Ex: 5511999999999</p>
          </div>
        </div>

        {/* Preview — WhatsApp bubble */}
        <div className="col-span-2 card p-5">
          <h3 className="card-title mb-4">Pré-visualização</h3>
          {selectedScript ? (
            <div className="space-y-3">
              <div
                className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[92%] text-sm text-gray-800 space-y-1.5 shadow-sm"
                style={{ background: '#dcf8c6' }}
              >
                <p className="font-bold text-[10px] text-gray-500 uppercase tracking-wide">Fábrica de Conteúdo</p>
                <p>📋 <strong>Novo Conteúdo Pronto</strong></p>
                <p><strong>Roteiro:</strong> {selectedScript.title || selectedScript.blueprintId} ({(selectedScript.language ?? 'pt').toUpperCase()})</p>
                {(selectedScript.sections ?? []).length > 0 && (
                  <p><strong>Seções:</strong> {selectedScript.sections.map((s) => s.label).join(' → ')}</p>
                )}
                {voiceoverId && <p>🎙️ Narração em áudio em seguida.</p>}
                <p className="text-[11px] text-gray-400 italic">Confirme o recebimento. — Fábrica de Conteúdo</p>
              </div>
              {voiceoverId && (
                <div
                  className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[92%] flex items-center gap-2.5 shadow-sm"
                  style={{ background: '#dcf8c6' }}
                >
                  <Mic size={16} className="text-gray-500 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-700">narração.mp3</p>
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
      <div className="card">
        <div className="card-header">
          <Send size={14} className="text-gray-400" />
          <h3 className="card-title">Histórico de Entregas</h3>
          <span className="ml-auto text-[11px] text-gray-400">{deliveries.length} total</span>
          {deliveries.length > 0 && (
            <button
              onClick={async () => {
                if (!window.confirm('Apagar todo o histórico de entregas?')) return
                await fetch('/api/delivery/all', { method: 'DELETE' })
                refetch()
              }}
              className="btn-danger"
            >
              <Trash2 size={11} /> Limpar
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05]">
              <th className="th">Roteiro</th>
              <th className="th">Editor</th>
              <th className="th">Narração</th>
              <th className="th">Status</th>
              <th className="th">Enviado</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="empty-state py-8">
                    <div className="empty-icon-wrap mx-auto">
                      <Send size={18} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400">Nenhuma entrega ainda</p>
                  </div>
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="tr">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-800 text-[13px] truncate max-w-[180px]">
                      {d.scripts?.title || d.scripts?.blueprintId || d.scriptId?.slice(0, 12) + '…'}
                    </div>
                    <div className="text-[11px] text-gray-400">{d.scripts?.language?.toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-[13px] font-mono">{d.editorContact}</td>
                  <td className="px-5 py-3">
                    {d.voiceoverId
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs tabular-nums">{timeAgo(d.sentAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
