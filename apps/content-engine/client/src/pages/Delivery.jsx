import { useState } from 'react'
import { Send, CheckCircle, MessageCircle, Mic, Trash2, AlertCircle, X } from 'lucide-react'
import PageHeader    from '../components/PageHeader.jsx'
import StatusBadge   from '../components/StatusBadge.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'
import { scriptDisplayName } from '../lib/humanize.js'

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

  const selectedScript    = scripts.find(s => s.id === scriptId)
  const selectedVoiceover = voiceovers.find(v => v.id === voiceoverId)
  const matchingVoiceovers = scriptId
    ? voiceovers.filter(v => v.scriptId === scriptId)
    : voiceovers

  async function handleSend() {
    if (!scriptId)      { setError('Selecione um roteiro');       return }
    if (!editorContact) { setError('Informe o número do editor'); return }
    setSending(true); setError(null); setSuccess(false)
    try {
      await apiPost('/delivery/send', { scriptId, voiceoverId: voiceoverId || undefined, editorContact })
      await refetch()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (e) { setError(e.message) }
    finally     { setSending(false) }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Pipeline"
        title="Entrega para Editor"
        description="Envie roteiros e narrações ao editor via WhatsApp (Evolution API)"
        action={
          <button onClick={handleSend} disabled={sending || !scriptId || !editorContact}
            className="btn-primary" style={{ opacity: (sending || !scriptId || !editorContact) ? 0.5 : 1 }}>
            <Send size={14} />
            {sending ? 'Enviando…' : 'Enviar Agora'}
          </button>
        }
      />

      {/* Error / success banners */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.22)', color: '#FF3366' }}>
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={13} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(0,255,185,0.07)', border: '1px solid rgba(0,255,185,0.22)', color: '#00FFB9' }}>
          <CheckCircle size={14} className="shrink-0" />
          Mensagem enviada com sucesso via WhatsApp!
        </div>
      )}

      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* ── Form ── */}
        <div className="col-span-3 rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(15,15,22,0.70)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white/80">Nova Entrega</p>

          <div>
            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">Roteiro *</label>
            <select value={scriptId} onChange={e => { setScriptId(e.target.value); setVoiceoverId('') }}
              className="input">
              <option value="">— Selecione o roteiro —</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>
                  {scriptDisplayName(s)}{s.language ? ` · ${s.language.toUpperCase()}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">Narração (opcional)</label>
            <select value={voiceoverId} onChange={e => setVoiceoverId(e.target.value)} className="input">
              <option value="">— Sem narração —</option>
              {matchingVoiceovers.map(v => (
                <option key={v.id} value={v.id}>
                  {v.voiceModel} · {v.duration} · {v.provider ?? 'elevenlabs'}
                </option>
              ))}
            </select>
            {scriptId && matchingVoiceovers.length === 0 && (
              <p className="text-[11px] text-white/25 mt-1.5">Nenhuma narração gerada para este roteiro ainda</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">WhatsApp do Editor *</label>
            <input type="text" value={editorContact} onChange={e => setEditorContact(e.target.value)}
              placeholder="5511999999999" className="input" />
            <p className="text-[11px] text-white/25 mt-1.5">Código do país + DDD + número, sem espaços. Ex: 5511999999999</p>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="col-span-2 rounded-2xl p-5"
          style={{ background: 'rgba(15,15,22,0.70)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-bold text-white/80 mb-4">Pré-visualização</p>
          {selectedScript ? (
            <div className="space-y-2">
              {/* WhatsApp bubble */}
              <div className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[92%] space-y-1.5 text-xs"
                style={{ background: 'rgba(0,255,185,0.08)', border: '1px solid rgba(0,255,185,0.18)' }}>
                <p className="text-[10px] font-bold tracking-wide" style={{ color: '#00FFB9' }}>Fábrica de Conteúdo</p>
                <p className="text-white/80 font-semibold">Novo Conteúdo Pronto</p>
                <p style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span className="text-white/40">Roteiro: </span>{scriptDisplayName(selectedScript)}
                  {selectedScript.language ? ` (${selectedScript.language.toUpperCase()})` : ''}
                </p>
                {(selectedScript.sections ?? []).length > 0 && (
                  <p className="text-white/40 truncate">
                    <span className="text-white/40">Seções: </span>
                    {selectedScript.sections.map(s => s.label).join(' → ')}
                  </p>
                )}
                {voiceoverId && <p style={{ color: 'rgba(255,255,255,0.50)' }}>Narração em áudio em seguida.</p>}
                <p className="text-white/25 italic">Confirme o recebimento. — Fábrica de Conteúdo</p>
              </div>
              {voiceoverId && (
                <div className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[92%] flex items-center gap-2.5"
                  style={{ background: 'rgba(0,255,185,0.06)', border: '1px solid rgba(0,255,185,0.14)' }}>
                  <Mic size={15} style={{ color: '#00FFB9', flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold text-white/70">narração.mp3</p>
                    <p className="text-[10px] text-white/35">{selectedVoiceover?.duration ?? '—'}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <MessageCircle size={28} style={{ color: 'rgba(255,255,255,0.12)' }} />
              <p className="text-xs text-white/25 text-center">Selecione um roteiro para pré-visualizar</p>
            </div>
          )}
        </div>
      </div>

      {/* ── History table ── */}
      <div className="card">
        <div className="card-header">
          <Send size={13} style={{ color: '#8B5CF6' }} />
          <h3 className="card-title">Histórico de Entregas</h3>
          <span className="text-[11px] text-white/30 ml-1">{deliveries.length} total</span>
          {deliveries.length > 0 && (
            <button onClick={async () => {
              if (!window.confirm('Apagar todo o histórico de entregas?')) return
              await fetch('/api/delivery/all', { method: 'DELETE' }); refetch()
            }}
              className="ml-auto flex items-center gap-1.5 text-xs text-white/25 hover:text-[#FF3366] transition-colors px-2 py-1 rounded-lg hover:bg-[#FF3366]/[0.08]">
              <Trash2 size={11} /> Limpar
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                <td colSpan={5} className="px-5 py-10 text-center text-xs text-white/25">
                  Nenhuma entrega ainda.
                </td>
              </tr>
            ) : (
              deliveries.map(d => (
                <tr key={d.id} className="tr">
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-white/75 truncate max-w-[200px]">
                      {d.scripts?.title || scriptDisplayName(d.scripts) || d.scriptId?.slice(0,10) + '…'}
                    </p>
                    {d.scripts?.language && (
                      <p className="text-[10px] text-white/30 mt-0.5">{d.scripts.language.toUpperCase()}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/55">{d.editorContact}</td>
                  <td className="px-5 py-3">
                    {d.voiceoverId
                      ? <CheckCircle size={13} style={{ color: '#00FFB9' }} />
                      : <span className="text-white/20 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3 text-xs text-white/30 tabular-nums">{timeAgo(d.sentAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
