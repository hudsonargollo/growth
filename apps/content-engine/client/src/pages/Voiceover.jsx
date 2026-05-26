import { useState, useRef, useEffect } from 'react'
import {
  Mic, Play, Pause, Download, Loader2,
  Sparkles, Zap, ChevronDown, Volume2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
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

// ── Inline audio player ───────────────────────────────────────────────────────

function AudioPlayer({ url }) {
  const audioRef          = useRef(null)
  const [playing, setPlaying]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [duration, setDuration]   = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnded    = () => setPlaying(false)
    const onTime     = () => setProgress(el.currentTime)
    const onMeta     = () => setDuration(el.duration)
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
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = ratio * duration
  }

  const pct = duration ? (progress / duration) * 100 : 0
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white shrink-0 transition-colors"
      >
        {playing ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
      </button>
      <div
        className="flex-1 h-1.5 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums shrink-0">
        {fmt(progress)}{duration ? ` / ${fmt(duration)}` : ''}
      </span>
    </div>
  )
}

// ── Voice card ────────────────────────────────────────────────────────────────

function VoiceCard({ voice, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(voice)}
      className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{voice.label}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          voice.lang.includes('PT') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {voice.lang}
        </span>
      </div>
      <p className="text-xs text-gray-400">{voice.description}</p>
      <span className="text-xs text-gray-400">{voice.gender === 'F' ? 'Feminina' : voice.gender === 'M' ? 'Masculina' : 'Neutra'}</span>
    </button>
  )
}

// ── Provider badge ────────────────────────────────────────────────────────────

function ProviderBadge({ provider }) {
  if (provider === 'openai') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
        <Zap size={10} /> OpenAI
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
      <Sparkles size={10} /> ElevenLabs
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Voiceover() {
  const { data: voData,  refetch }  = useApi('/voiceover')
  const { data: scrData }           = useApi('/scripts')
  const { data: voiceData }         = useApi('/voiceover/voices')

  const voiceovers = voData?.voiceovers ?? []
  const scripts    = scrData?.scripts   ?? []
  const openaiVoices    = voiceData?.openai     ?? []
  const elevenlabsVoices = voiceData?.elevenlabs ?? []

  const [scriptId,    setScriptId]    = useState('')
  const [provider,    setProvider]    = useState('openai')
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [model,       setModel]       = useState('tts-1')
  const [stability,   setStability]   = useState(75)
  const [similarity,  setSimilarity]  = useState(80)
  const [generating,  setGenerating]  = useState(false)
  const [error,       setError]       = useState(null)

  const voices = provider === 'openai' ? openaiVoices : elevenlabsVoices

  // Auto-select first voice when provider or voice list changes
  useEffect(() => {
    if (voices.length > 0) setSelectedVoice(voices[0])
  }, [provider, voices.length])

  async function handleGenerate() {
    if (!scriptId) { setError('Selecione um roteiro'); return }
    if (!selectedVoice) { setError('Selecione uma voz'); return }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/voiceover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          provider,
          voiceId:    selectedVoice.id,
          voiceLabel: selectedVoice.label,
          model:      provider === 'openai' ? model : undefined,
          stability:  stability / 100,
          similarityBoost: similarity / 100,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch()
    } catch (e) {
      console.error('[voiceover]', e.message)
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
    <div>
      <AILoadingOverlay show={generating} steps={VOICE_STEPS} title="Gerando Narração" />
      <PageHeader
        title="Narração"
        description="Gere áudio a partir dos seus roteiros com OpenAI TTS ou ElevenLabs"
        action={
          <button
            onClick={handleGenerate}
            disabled={generating || !scriptId}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
            {generating ? 'Gerando…' : 'Gerar Narração'}
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Config panel */}
        <div className="col-span-2 space-y-4">

          {/* Script selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Roteiro</h3>
            <select
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Selecione um roteiro —</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || s.blueprintId} · {s.language?.toUpperCase()}
                </option>
              ))}
            </select>
            {charCount > 0 && (
              <p className="text-xs text-gray-400">
                ~{charCount.toLocaleString()} caracteres
                {provider === 'openai' && charCount > 4096 && (
                  <span className="text-amber-500 ml-2">· será cortado em 4096 chars</span>
                )}
              </p>
            )}
          </div>

          {/* Provider toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Motor de TTS</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setProvider('openai')}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all ${
                  provider === 'openai'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <Zap size={13} className="text-emerald-500" /> OpenAI TTS
                </span>
                <span className="text-xs text-gray-400">Rápido · usa chave existente</span>
              </button>
              <button
                onClick={() => setProvider('elevenlabs')}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all ${
                  provider === 'elevenlabs'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <Sparkles size={13} className="text-violet-500" /> ElevenLabs
                </span>
                <span className="text-xs text-gray-400">Expressivo · requer chave</span>
              </button>
            </div>

            {/* OpenAI model quality toggle */}
            {provider === 'openai' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Qualidade</label>
                <div className="flex gap-2">
                  {[
                    { v: 'tts-1',    l: 'Padrão', hint: 'mais rápido' },
                    { v: 'tts-1-hd', l: 'HD',     hint: 'melhor qualidade' },
                  ].map((m) => (
                    <button
                      key={m.v}
                      onClick={() => setModel(m.v)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        model === m.v
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {m.l} <span className="opacity-70">· {m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ElevenLabs sliders */}
            {provider === 'elevenlabs' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estabilidade — {stability}%</label>
                  <input type="range" min="0" max="100" value={stability}
                    onChange={(e) => setStability(+e.target.value)}
                    className="w-full accent-violet-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Similaridade — {similarity}%</label>
                  <input type="range" min="0" max="100" value={similarity}
                    onChange={(e) => setSimilarity(+e.target.value)}
                    className="w-full accent-violet-600" />
                </div>
              </div>
            )}
          </div>

          {/* Voice picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                <Volume2 size={13} className="text-indigo-500" />
                Voz
              </h3>
              {selectedVoice && (
                <span className="text-xs text-gray-400">{selectedVoice.label} selecionada</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {voices.map((v) => (
                <VoiceCard
                  key={v.id}
                  voice={v}
                  selected={selectedVoice?.id === v.id}
                  onSelect={setSelectedVoice}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview of selected script */}
        <div className="col-span-3">
          {selectedScript ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
              <h3 className="font-semibold text-gray-800 mb-1">
                {selectedScript.title || selectedScript.blueprintId}
              </h3>
              <p className="text-xs text-gray-400 mb-4">{selectedScript.language?.toUpperCase()} · {timeAgo(selectedScript.createdAt)}</p>
              <div className="space-y-3 max-h-[480px] overflow-y-auto">
                {(selectedScript.sections ?? []).length > 0
                  ? selectedScript.sections.map((sec, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">{sec.label}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{sec.content}</p>
                    </div>
                  ))
                  : <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{selectedScript.text}</pre>
                }
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 h-64 flex items-center justify-center text-gray-400 text-sm">
              Selecione um roteiro para pré-visualizar
            </div>
          )}
        </div>
      </div>

      {/* Voiceovers list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Mic size={15} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800 text-sm">Narrações geradas</h3>
          <span className="ml-auto text-xs text-gray-400">{voiceovers.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
              <th className="px-5 py-2 font-medium">Roteiro</th>
              <th className="px-5 py-2 font-medium">Motor / Voz</th>
              <th className="px-5 py-2 font-medium">Player</th>
              <th className="px-5 py-2 font-medium">Duração</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Criado</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {voiceovers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                  Nenhuma narração ainda — selecione um roteiro e clique em Gerar Narração.
                </td>
              </tr>
            ) : (
              voiceovers.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-700 text-xs max-w-[160px] truncate">
                      {v.scripts?.title || v.scripts?.blueprintId || v.scriptId?.slice(0, 10) + '…'}
                    </div>
                    <div className="text-xs text-gray-400">{v.scripts?.language?.toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <ProviderBadge provider={v.provider ?? 'elevenlabs'} />
                      <span className="text-xs text-gray-500">{v.voiceModel}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {v.status === 'completed' && v.fileUrl && (
                      <AudioPlayer url={v.fileUrl} />
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{v.duration}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(v.createdAt)}</td>
                  <td className="px-5 py-3">
                    {v.fileUrl && (
                      <a
                        href={v.fileUrl}
                        download
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors block"
                        title="Download MP3"
                      >
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
