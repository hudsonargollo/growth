import { useState, useRef, useEffect } from 'react'
import {
  Mic, Play, Pause, Download, Loader2,
  Sparkles, Zap, Volume2,
} from 'lucide-react'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'
import { AILoadingOverlay, friendlyError } from './Scripts.jsx'

const VOICE_STEPS = [
  { icon: '📝', label: 'Lendo o roteiro…' },
  { icon: '🎙️', label: 'Processando voz com IA…' },
  { icon: '🔊', label: 'Sintetizando áudio…' },
  { icon: '🎵', label: 'Ajustando entonação e ritmo…' },
  { icon: '☁️', label: 'Fazendo upload do arquivo…' },
]

function AudioPlayer({ url }) {
  const audioRef                      = useRef(null)
  const [playing, setPlaying]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [duration, setDuration]       = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded = () => setPlaying(false)
    const onTime  = () => setProgress(el.currentTime)
    const onMeta  = () => setDuration(el.duration)
    el.addEventListener('ended', onEnded)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else         { el.play();  setPlaying(true)  }
  }

  function handleSeek(e) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect  = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const pct = duration ? (progress / duration) * 100 : 0
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 transition-all"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
      >
        {playing ? <Pause size={11} fill="white" /> : <Play size={11} fill="white" />}
      </button>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer overflow-hidden" onClick={handleSeek}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums shrink-0">{fmt(progress)}{duration ? ` / ${fmt(duration)}` : ''}</span>
    </div>
  )
}

function VoiceCard({ voice, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(voice)}
      className={`flex flex-col gap-1 p-3 rounded-xl text-left transition-all duration-150 ${
        selected
          ? 'ring-2 ring-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-indigo-50/60'
          : 'ring-1 ring-black/[0.07] bg-white hover:ring-indigo-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-gray-900">{voice.label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
          voice.lang?.includes('PT') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {voice.lang}
        </span>
      </div>
      <p className="text-xs text-gray-400">{voice.description}</p>
      <span className="text-[11px] text-gray-400">{voice.gender === 'F' ? '♀ Feminina' : voice.gender === 'M' ? '♂ Masculina' : '⊙ Neutra'}</span>
    </button>
  )
}

function ProviderBadge({ provider }) {
  if (provider === 'openai') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
      <Zap size={10} /> OpenAI
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
      <Sparkles size={10} /> ElevenLabs
    </span>
  )
}

export default function Voiceover() {
  const { data: voData,    refetch } = useApi('/voiceover')
  const { data: scrData }            = useApi('/scripts')
  const { data: voiceData }          = useApi('/voiceover/voices')

  const voiceovers       = voData?.voiceovers       ?? []
  const scripts          = scrData?.scripts          ?? []
  const openaiVoices     = voiceData?.openai         ?? []
  const elevenlabsVoices = voiceData?.elevenlabs     ?? []

  const [scriptId,      setScriptId]      = useState('')
  const [provider,      setProvider]      = useState('openai')
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [model,         setModel]         = useState('tts-1')
  const [stability,     setStability]     = useState(75)
  const [similarity,    setSimilarity]    = useState(80)
  const [generating,    setGenerating]    = useState(false)
  const [error,         setError]         = useState(null)

  const voices = provider === 'openai' ? openaiVoices : elevenlabsVoices

  useEffect(() => {
    if (voices.length > 0) setSelectedVoice(voices[0])
  }, [provider, voices.length])

  async function handleGenerate() {
    if (!scriptId)    { setError('Selecione um roteiro'); return }
    if (!selectedVoice){ setError('Selecione uma voz');  return }
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/voiceover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId, provider,
          voiceId:         selectedVoice.id,
          voiceLabel:      selectedVoice.label,
          model:           provider === 'openai' ? model : undefined,
          stability:       stability / 100,
          similarityBoost: similarity / 100,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch()
    } catch (e) {
      setError(friendlyError(e.message))
    } finally {
      setGenerating(false)
    }
  }

  const selectedScript = scripts.find((s) => s.id === scriptId)
  const charCount = selectedScript
    ? ((selectedScript.sections ?? []).map((s) => s.content ?? '').join('\n\n') || selectedScript.text || '').length
    : 0

  return (
    <div className="animate-fade-up">
      <AILoadingOverlay show={generating} steps={VOICE_STEPS} title="Gerando Narração" />
      <PageHeader
        overline="Pipeline"
        title="Narração"
        description="Gere áudio a partir dos seus roteiros com OpenAI TTS ou ElevenLabs"
        action={
          <button onClick={handleGenerate} disabled={generating || !scriptId} className="btn-primary">
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
            {generating ? 'Gerando…' : 'Gerar Narração'}
          </button>
        }
      />

      {error && <div className="alert-error mb-5">{error}</div>}

      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Config */}
        <div className="col-span-2 space-y-4">

          {/* Script selector */}
          <div className="card p-5 space-y-3">
            <h3 className="card-title">Roteiro</h3>
            <select value={scriptId} onChange={(e) => setScriptId(e.target.value)} className="select">
              <option value="">— Selecione um roteiro —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>{s.title || s.blueprintId} · {s.language?.toUpperCase()}</option>
              ))}
            </select>
            {charCount > 0 && (
              <p className="text-xs text-gray-400 tabular-nums">
                ~{charCount.toLocaleString()} caracteres
                {provider === 'openai' && charCount > 4096 && (
                  <span className="text-amber-500 ml-2">· será cortado em 4 096 chars</span>
                )}
              </p>
            )}
          </div>

          {/* Provider toggle */}
          <div className="card p-5 space-y-4">
            <h3 className="card-title">Motor de TTS</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'openai',      label: 'OpenAI TTS', sub: 'Rápido · usa chave existente', Icon: Zap,      clr: 'emerald' },
                { v: 'elevenlabs', label: 'ElevenLabs',  sub: 'Expressivo · requer chave',    Icon: Sparkles, clr: 'violet'  },
              ].map(({ v, label, sub, Icon, clr }) => (
                <button
                  key={v}
                  onClick={() => setProvider(v)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl transition-all duration-150 ${
                    provider === v
                      ? `ring-2 ring-${clr}-500 bg-${clr}-50/60 shadow-[0_0_0_4px_rgba(99,102,241,0.07)]`
                      : 'ring-1 ring-black/[0.07] hover:ring-black/[0.12]'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-[13px] font-semibold text-gray-900`}>
                    <Icon size={13} className={provider === v ? `text-${clr}-500` : 'text-gray-400'} />
                    {label}
                  </span>
                  <span className="text-[11px] text-gray-400">{sub}</span>
                </button>
              ))}
            </div>

            {provider === 'openai' && (
              <div>
                <label className="field-label">Qualidade</label>
                <div className="flex gap-2">
                  {[
                    { v: 'tts-1',    l: 'Padrão', hint: 'mais rápido'    },
                    { v: 'tts-1-hd', l: 'HD',     hint: 'melhor qualidade' },
                  ].map((m) => (
                    <button
                      key={m.v}
                      onClick={() => setModel(m.v)}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                        model === m.v
                          ? 'text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                      style={model === m.v ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}
                    >
                      {m.l} <span className="opacity-60 font-normal">· {m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {provider === 'elevenlabs' && (
              <div className="space-y-3">
                <div>
                  <label className="field-label">Estabilidade — {stability}%</label>
                  <input type="range" min="0" max="100" value={stability}
                    onChange={(e) => setStability(+e.target.value)}
                    className="w-full accent-violet-600" />
                </div>
                <div>
                  <label className="field-label">Similaridade — {similarity}%</label>
                  <input type="range" min="0" max="100" value={similarity}
                    onChange={(e) => setSimilarity(+e.target.value)}
                    className="w-full accent-violet-600" />
                </div>
              </div>
            )}
          </div>

          {/* Voice picker */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="card-title flex items-center gap-1.5">
                <Volume2 size={13} className="text-indigo-500" /> Voz
              </h3>
              {selectedVoice && (
                <span className="text-[11px] text-gray-400">{selectedVoice.label}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-0.5">
              {voices.map((v) => (
                <VoiceCard key={v.id} voice={v} selected={selectedVoice?.id === v.id} onSelect={setSelectedVoice} />
              ))}
            </div>
          </div>
        </div>

        {/* Script preview */}
        <div className="col-span-3">
          {selectedScript ? (
            <div className="card p-5 h-full">
              <h3 className="font-bold text-gray-900 text-[15px]">{selectedScript.title || selectedScript.blueprintId}</h3>
              <p className="text-[11px] text-gray-400 mb-4 mt-1 font-medium">
                {selectedScript.language?.toUpperCase()} · {timeAgo(selectedScript.createdAt)}
              </p>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(selectedScript.sections ?? []).length > 0
                  ? selectedScript.sections.map((sec, i) => (
                    <div key={i} className="ring-1 ring-black/[0.06] rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{sec.label}</p>
                      <p className="text-[13px] text-gray-700 whitespace-pre-wrap line-clamp-3">{sec.content}</p>
                    </div>
                  ))
                  : <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{selectedScript.text}</pre>
                }
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center text-gray-300">
              <div className="text-center">
                <Mic size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Selecione um roteiro para pré-visualizar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voiceovers table */}
      <div className="card">
        <div className="card-header">
          <Mic size={14} className="text-gray-400" />
          <h3 className="card-title">Narrações geradas</h3>
          <span className="ml-auto text-[11px] text-gray-400">{voiceovers.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05]">
              <th className="th">Roteiro</th>
              <th className="th">Motor / Voz</th>
              <th className="th">Player</th>
              <th className="th">Duração</th>
              <th className="th">Status</th>
              <th className="th">Criado</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {voiceovers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Mic size={24} className="text-gray-200" />
                    <p className="text-sm text-gray-400">Nenhuma narração ainda — selecione um roteiro e gere áudio</p>
                  </div>
                </td>
              </tr>
            ) : (
              voiceovers.map((v) => (
                <tr key={v.id} className="tr">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-800 text-[13px] max-w-[160px] truncate">
                      {v.scripts?.title || v.scripts?.blueprintId || v.scriptId?.slice(0, 10) + '…'}
                    </div>
                    <div className="text-[11px] text-gray-400">{v.scripts?.language?.toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <ProviderBadge provider={v.provider ?? 'elevenlabs'} />
                      <span className="text-[11px] text-gray-500">{v.voiceModel}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {v.status === 'completed' && v.fileUrl && <AudioPlayer url={v.fileUrl} />}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs tabular-nums">{v.duration}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs tabular-nums">{timeAgo(v.createdAt)}</td>
                  <td className="px-5 py-3">
                    {v.fileUrl && (
                      <a href={v.fileUrl} download
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors block">
                        <Download size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
