import { useState, useRef, useEffect } from 'react'
import {
  Mic, Play, Pause, Download, Loader2,
  Sparkles, Zap, Volume2, KeyRound, Check, Eye, EyeOff, Trash2,
  Layers, CheckCircle2, FileText, Music, UploadCloud, AlertTriangle,
} from 'lucide-react'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LanguageFollowUp from '../components/LanguageFollowUp.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'
import { AILoadingOverlay, friendlyError, sleep } from './Scripts.jsx'
import { findLanguageSiblings, normalizeLang } from '../lib/languages.js'

// ── Inline API-key setup (appears when a provider key is missing) ─────────────

function InlineKeySetup({ keyName, label, onSaved }) {
  const [value,   setValue]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState(null)
  const [visible, setVisible] = useState(false)

  async function save() {
    if (!value.trim()) return
    setSaving(true); setErr(null)
    try {
      const res  = await fetch(`/api/apikeys/${keyName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setSaved(true)
      setTimeout(() => onSaved(), 800)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      marginTop: 10, padding: '12px 14px', borderRadius: 12,
      background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
    }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', marginBottom: 8 }}>
        <KeyRound size={11} style={{ display: 'inline', marginRight: 5, color: '#A78BFA' }} />
        Cole sua chave <strong style={{ color: '#A78BFA' }}>{label}</strong> para continuar:
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type={visible ? 'text' : 'password'}
            placeholder={`${keyName}...`}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{
              width: '100%', padding: '7px 36px 7px 10px', borderRadius: 8, fontSize: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => setVisible(v => !v)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0,
            }}
          >
            {visible ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
        <button
          onClick={save}
          disabled={saving || !value.trim()}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: saved ? '#00FFB9' : value.trim() ? '#8B5CF6' : 'rgba(255,255,255,0.08)',
            color: saved ? '#07070B' : 'white',
            border: 'none', cursor: value.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 200ms',
          }}
        >
          {saving ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
           : saved  ? <><Check size={11} /> Salvo!</>
           : 'Salvar'}
        </button>
      </div>
      {err && <p style={{ fontSize: 11, color: '#FF3366', marginTop: 6 }}>{err}</p>}
    </div>
  )
}

const VOICE_STEPS = [
  { icon: FileText,    label: 'Lendo o roteiro e preparando o texto, a pontuação e as pausas para a síntese de voz…' },
  { icon: Mic,         label: 'Processando a voz com IA e calibrando o timbre e o tom da voz selecionada…' },
  { icon: Volume2,     label: 'Sintetizando o áudio frase por frase, com pronúncia e ênfase naturais…' },
  { icon: Music,       label: 'Ajustando a entonação, o ritmo e a respiração para que a narração soe humana…' },
  // Final step — held on screen until the upload actually finishes.
  { icon: UploadCloud, label: 'Finalizando e enviando o arquivo de áudio. Quase pronto — mantenha esta janela aberta…' },
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
        style={{ background: '#8B5CF6', boxShadow: '0 0 14px rgba(139,92,246,0.45)' }}
      >
        {playing ? <Pause size={11} fill="white" /> : <Play size={11} fill="white" />}
      </button>
      <div className="flex-1 h-1.5 rounded-full cursor-pointer overflow-hidden" style={{background:"rgba(255,255,255,0.08)"}} onClick={handleSeek}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#8B5CF6,#CCFF00)' }} />
      </div>
      <span className="text-xs text-white/35 tabular-nums shrink-0">{fmt(progress)}{duration ? ` / ${fmt(duration)}` : ''}</span>
    </div>
  )
}

function VoiceCard({ voice, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(voice)}
      className={`flex flex-col gap-1 p-3 rounded-xl text-left transition-all duration-150 ${
        selected
          ? 'ring-2 ring-violet-500 shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-violet-500/10'
          : 'ring-1 ring-white/[0.07] bg-[#0F0F16] hover:ring-violet-500/40 hover:bg-[#0F0F16]/[0.03]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-white/90">{voice.label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
          voice.lang?.includes('PT') ? 'bg-[#00FFB9]/12 text-[#00FFB9]' : 'bg-[#0F0F16]/[0.05] text-white/40'
        }`}>
          {voice.lang}
        </span>
      </div>
      <p className="text-xs text-white/35">{voice.description}</p>
      <span className="text-[11px] text-white/35">{voice.gender === 'F' ? 'Feminina' : voice.gender === 'M' ? 'Masculina' : 'Neutra'}</span>
    </button>
  )
}

function ProviderBadge({ provider }) {
  if (provider === 'openai') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#00FFB9]/12 text-[#00FFB9] font-bold">
      <Zap size={10} /> OpenAI
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-bold">
      <Sparkles size={10} /> ElevenLabs
    </span>
  )
}

// Map provider → KV key name and display label
const PROVIDER_KEY = {
  openai:     { keyName: 'OPENAI_API_KEY',     label: 'OpenAI'     },
  elevenlabs: { keyName: 'ELEVENLABS_API_KEY', label: 'ElevenLabs' },
  google:     { keyName: 'GOOGLE_API_KEY',     label: 'Google'     },
}

export default function Voiceover() {
  const { data: voData,    refetch }          = useApi('/voiceover')
  const { data: scrData }                     = useApi('/scripts')
  const { data: voiceData }                   = useApi('/voiceover/voices')
  const { data: keysData, refetch: refetchKeys } = useApi('/apikeys')

  const voiceovers       = voData?.voiceovers       ?? []
  const scripts          = scrData?.scripts          ?? []
  const openaiVoices     = voiceData?.openai         ?? []
  const elevenlabsVoices = voiceData?.elevenlabs     ?? []

  // Build a set of configured key names for quick lookup
  const configuredKeys = new Set((keysData?.keys ?? []).map(k => k.key_name))

  const [scriptId,       setScriptId]       = useState('')
  const [provider,       setProvider]       = useState('elevenlabs')
  const [selectedVoice,  setSelectedVoice]  = useState(null)
  const [model,          setModel]          = useState('tts-1')
  const [stability,      setStability]      = useState(75)
  const [similarity,     setSimilarity]     = useState(80)
  const [generating,     setGenerating]     = useState(false)
  const [voDone,         setVoDone]         = useState(false)  // success → animated green check
  const [lastVo,         setLastVo]         = useState(null)   // { sourceScript, siblings, settings } for the language follow-up
  const [voLangDone,     setVoLangDone]     = useState([])     // language codes already narrated
  const [voLangBusy,     setVoLangBusy]     = useState(null)   // language code currently narrating
  const [error,          setError]          = useState(null)
  const [checkedVo,      setCheckedVo]      = useState([])
  const [deleting,       setDeleting]       = useState(false)
  // Per-section audio mode
  const [audioMode,      setAudioMode]      = useState('full')   // 'full' | 'sections'
  const [sectionResults, setSectionResults] = useState(null)     // array of section voiceovers after generation
  // Step-by-step wizard state
  const [voStep,         setVoStep]         = useState(1)        // 1 | 2 | 3

  const voices = provider === 'openai' ? openaiVoices : elevenlabsVoices

  // Is the current provider's API key configured?
  const providerKeyName   = PROVIDER_KEY[provider]?.keyName
  const providerKeyLabel  = PROVIDER_KEY[provider]?.label
  const providerKeyMissing = providerKeyName && !configuredKeys.has(providerKeyName)

  useEffect(() => {
    if (voices.length === 0) return
    // Default to Rachel for ElevenLabs, first voice for other providers
    const rachel = voices.find(v => v.id === '21m00Tcm4TlvDq8ikWAM')
    setSelectedVoice(provider === 'elevenlabs' && rachel ? rachel : voices[0])
  }, [provider, voices.length])

  // Narrate a given script id with a fixed set of voice settings. Shared by the
  // main flow and the "another language" follow-up so siblings reuse the voice.
  async function postVoiceover(targetScriptId, settings) {
    const commonBody = {
      scriptId:        targetScriptId,
      provider:        settings.provider,
      voiceId:         settings.voiceId,
      voiceLabel:      settings.voiceLabel,
      model:           settings.provider === 'openai' ? settings.model : undefined,
      stability:       settings.stability / 100,
      similarityBoost: settings.similarity / 100,
    }
    const url = settings.audioMode === 'sections'
      ? '/api/voiceover/generate-sections'
      : '/api/voiceover/generate'
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commonBody),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? res.statusText)
    return data
  }

  async function handleGenerate() {
    if (!scriptId)    { setError('Selecione um roteiro'); return }
    if (!selectedVoice){ setError('Selecione uma voz');  return }
    setGenerating(true); setVoDone(false); setError(null); setSectionResults(null)
    const settings = { provider, voiceId: selectedVoice.id, voiceLabel: selectedVoice.label, model, stability, similarity, audioMode }
    try {
      const data = await postVoiceover(scriptId, settings)
      if (audioMode === 'sections') setSectionResults(data.sections ?? [])
      await refetch()
      // Set up the language follow-up: only offered when sibling-language
      // versions of this exact script already exist.
      const sourceScript = scripts.find((s) => s.id === scriptId)
      const siblings     = findLanguageSiblings(sourceScript, scripts)
      setLastVo({ sourceScript, siblings, settings })
      setVoLangDone([normalizeLang(sourceScript?.language)])
      setVoDone(true)
      await sleep(1100) // let the green check land before hiding the overlay
    } catch (e) {
      setError(friendlyError(e.message))
    } finally {
      setGenerating(false); setVoDone(false)
    }
  }

  // Follow-up: narrate a sibling-language script with the same voice settings.
  async function handleGenerateSiblingVoice(code) {
    if (!lastVo) return
    const target = normalizeLang(code)
    const sib    = lastVo.siblings.find((s) => normalizeLang(s.language) === target)
    if (!sib) return
    setVoLangBusy(target); setError(null)
    try {
      await postVoiceover(sib.id, lastVo.settings)
      await refetch()
      setVoLangDone((prev) => (prev.includes(target) ? prev : [...prev, target]))
    } catch (e) {
      setError(friendlyError(e.message))
    } finally {
      setVoLangBusy(null)
    }
  }

  async function handleDeleteVoiceovers(ids, all = false) {
    const label = all
      ? `Excluir TODAS as ${voiceovers.length} narrações? Esta ação não pode ser desfeita.`
      : ids.length === 1
        ? 'Excluir esta narração?'
        : `Excluir ${ids.length} narrações selecionadas?`
    if (!confirm(label)) return
    setDeleting(true)
    try {
      const url  = all || ids.length > 1 ? '/api/voiceover' : `/api/voiceover/${ids[0]}`
      const body = all ? { all: true } : ids.length > 1 ? { ids } : undefined
      const res  = await fetch(url, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erro ao excluir') }
      setCheckedVo([])
      await refetch()
    } catch (e) {
      setError(friendlyError(e.message))
    } finally {
      setDeleting(false)
    }
  }

  function toggleCheckVo(id) {
    setCheckedVo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleCheckAllVo() {
    setCheckedVo(prev => prev.length === voiceovers.length ? [] : voiceovers.map(v => v.id))
  }

  const selectedScript = scripts.find((s) => s.id === scriptId)
  const charCount = selectedScript
    ? ((selectedScript.sections ?? []).map((s) => s.content ?? '').join('\n\n') || selectedScript.text || '').length
    : 0

  // ── Wizard step definitions ────────────────────────────────────────────────
  const voStepDefs = [
    {
      n: 1, label: 'Roteiro',
      hint: 'Escolha o roteiro a narrar',
      sublabel: selectedScript ? (selectedScript.title || selectedScript.blueprintId) : null,
      done: voStep > 1,
      active: voStep === 1,
    },
    {
      n: 2, label: 'Voz & Motor',
      hint: 'Defina o engine TTS e a voz',
      sublabel: voStep >= 2 && selectedVoice
        ? `${provider === 'openai' ? 'OpenAI' : 'ElevenLabs'} · ${selectedVoice.label}`
        : null,
      done: voStep > 2,
      active: voStep === 2,
    },
    {
      n: 3, label: 'Ajustes & Gerar',
      hint: 'Fine-tune e geração do áudio',
      sublabel: voStep === 3 && charCount > 0
        ? `~${charCount.toLocaleString()} chars`
        : null,
      done: false,
      active: voStep === 3,
    },
  ]

  return (
    <div className="animate-fade-up">
      <AILoadingOverlay show={generating} done={voDone} steps={VOICE_STEPS} title="Gerando Narração" doneLabel="Narração Concluída" />
      <PageHeader
        overline="Pipeline"
        title="Narração"
        description="Gere áudio a partir dos seus roteiros com OpenAI TTS ou ElevenLabs"
      />

      {error && (
        <div className="alert-error mb-5">
          {error.replace(/Adicione em Configurações.*?\./i, '').trim()}
        </div>
      )}

      {/* ── Wizard layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-6 mb-6">

        {/* Left: step tracker */}
        <div className="col-span-2">
          {/* Progress bar */}
          <div className="mb-5 px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/20 mb-1">Progresso</p>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: voStep === 1 ? '15%' : voStep === 2 ? '55%' : '100%',
                  background: 'linear-gradient(90deg, #8B5CF6, #CCFF00)',
                }} />
            </div>
          </div>

          {/* Steps */}
          {voStepDefs.map((step, i) => (
            <div key={step.n} className="flex items-stretch gap-4">
              {/* Circle + connector */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all duration-300"
                  style={{
                    background: step.done
                      ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)'
                      : step.active
                        ? '#CCFF00'
                        : 'rgba(255,255,255,0.06)',
                    color: step.done ? '#fff' : step.active ? '#07070B' : 'rgba(255,255,255,0.20)',
                    boxShadow: step.active
                      ? '0 0 0 4px rgba(204,255,0,0.15), 0 0 16px rgba(204,255,0,0.25)'
                      : step.done
                        ? '0 0 0 3px rgba(139,92,246,0.18)'
                        : 'none',
                  }}>
                  {step.done ? <Check size={11} strokeWidth={3} /> : step.n}
                </div>
                {i < 2 && (
                  <div className="w-0.5 flex-1 mt-2 mb-0 min-h-[52px] rounded-full transition-all duration-300"
                    style={{
                      background: step.done
                        ? 'linear-gradient(180deg,rgba(139,92,246,0.55),rgba(139,92,246,0.20))'
                        : 'rgba(255,255,255,0.05)',
                    }} />
                )}
              </div>

              {/* Label */}
              <div className="pt-0.5 pb-8 flex-1 min-w-0">
                <button
                  onClick={() => { if (step.done || step.active) setVoStep(step.n) }}
                  disabled={!step.done && !step.active}
                  className="text-[13px] font-bold transition-colors disabled:cursor-default leading-tight"
                  style={{
                    color: step.active ? 'rgba(255,255,255,0.92)'
                         : step.done   ? '#a78bfa'
                         :               'rgba(255,255,255,0.22)',
                  }}>
                  {step.label}
                </button>
                {step.sublabel ? (
                  <p className="text-[11px] mt-0.5 truncate font-medium"
                    style={{ color: step.active ? '#CCFF00' : '#a78bfa' }}>
                    {step.sublabel}
                  </p>
                ) : (
                  <p className="text-[11px] mt-0.5 leading-tight"
                    style={{ color: step.active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)' }}>
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Help card */}
          <div className="mt-2 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] text-white/35 leading-relaxed">
              {voStep === 1 && 'Selecione o roteiro que será narrado. O conteúdo de cada seção é enviado ao motor de TTS.'}
              {voStep === 2 && 'Escolha entre OpenAI TTS (rápido) ou ElevenLabs (expressivo). Depois selecione a voz ideal.'}
              {voStep === 3 && 'Ajuste a qualidade e os parâmetros de entonação antes de gerar o áudio final.'}
            </p>
          </div>
        </div>

        {/* Right: step content */}
        <div className="col-span-3 space-y-4">

          {/* ── STEP 1: Script selection ───────────────────────────────────────── */}
          {voStep === 1 && (
            <>
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Selecione o Roteiro</span>
                </div>
                <div className="p-4 space-y-3">
                  <select value={scriptId} onChange={(e) => { setScriptId(e.target.value); setSectionResults(null) }} className="input">
                    <option value="">— Selecione um roteiro —</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>{s.title || s.blueprintId} · {s.language?.toUpperCase()}</option>
                    ))}
                  </select>
                  {charCount > 0 && (
                    <p className="text-xs text-white/35 tabular-nums">
                      ~{charCount.toLocaleString()} caracteres
                      {provider === 'openai' && charCount > 4096 && (
                        <span className="text-amber-500 ml-2">· será cortado em 4 096 chars</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Script preview */}
              {selectedScript ? (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-white/85 leading-tight">{selectedScript.title || selectedScript.blueprintId}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        {selectedScript.language?.toUpperCase()} · {timeAgo(selectedScript.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
                    {(selectedScript.sections ?? []).length > 0
                      ? selectedScript.sections.map((sec, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1">{sec.label}</p>
                          <p className="text-[12px] text-white/60 whitespace-pre-wrap line-clamp-3 leading-relaxed">{sec.content}</p>
                        </div>
                      ))
                      : <pre className="text-xs text-white/55 whitespace-pre-wrap font-mono leading-relaxed">{selectedScript.text}</pre>
                    }
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl flex items-center justify-center py-16"
                  style={{ border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                  <div className="text-center">
                    <Mic size={28} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-white/25">Selecione um roteiro para pré-visualizar</p>
                  </div>
                </div>
              )}

              {/* Next step CTA */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setVoStep(2)}
                  disabled={!scriptId}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ background: '#CCFF00', color: '#07070B' }}>
                  Próximo: Voz & Motor →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Voice & TTS engine ─────────────────────────────────────── */}
          {voStep === 2 && (
            <>
              {/* Audio mode */}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Modo de Geração</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'full',     label: 'Áudio completo', sub: 'Um arquivo por roteiro', Icon: Mic    },
                      { v: 'sections', label: 'Por seção',      sub: 'Um arquivo por seção',   Icon: Layers },
                    ].map(({ v, label, sub, Icon }) => (
                      <button
                        key={v}
                        onClick={() => { setAudioMode(v); setSectionResults(null) }}
                        className="flex flex-col items-start gap-1 p-3 rounded-xl transition-all duration-150"
                        style={{
                          outline: audioMode === v ? '2px solid rgba(139,92,246,0.70)' : '1px solid rgba(255,255,255,0.07)',
                          background: audioMode === v ? 'rgba(139,92,246,0.10)' : 'transparent',
                        }}>
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold"
                          style={{ color: audioMode === v ? '#a78bfa' : 'rgba(255,255,255,0.70)' }}>
                          <Icon size={13} /> {label}
                        </span>
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</span>
                      </button>
                    ))}
                  </div>
                  {audioMode === 'sections' && (
                    <p className="text-[11px] rounded-lg px-3 py-2"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(255,255,255,0.50)' }}>
                      Cada seção do roteiro receberá um arquivo de áudio separado.
                    </p>
                  )}
                </div>
              </div>

              {/* TTS engine */}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Motor de TTS</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'openai',     label: 'OpenAI TTS',  sub: 'Rápido · chave existente', Icon: Zap      },
                      { v: 'elevenlabs', label: 'ElevenLabs',  sub: 'Expressivo · requer chave', Icon: Sparkles },
                    ].map(({ v, label, sub, Icon }) => (
                      <button key={v} onClick={() => setProvider(v)}
                        className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl transition-all duration-150"
                        style={{
                          outline: provider === v ? '2px solid rgba(139,92,246,0.70)' : '1px solid rgba(255,255,255,0.07)',
                          background: provider === v ? 'rgba(139,92,246,0.10)' : 'transparent',
                        }}>
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold"
                          style={{ color: provider === v ? '#a78bfa' : 'rgba(255,255,255,0.70)' }}>
                          <Icon size={13} /> {label}
                        </span>
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Inline key setup */}
                  {providerKeyMissing && (
                    <InlineKeySetup
                      keyName={providerKeyName}
                      label={providerKeyLabel}
                      onSaved={() => { refetchKeys(); setError(null) }}
                    />
                  )}
                </div>
              </div>

              {/* Voice picker */}
              {!providerKeyMissing && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                      <Volume2 size={12} style={{ color: '#a78bfa' }} /> Voz
                    </span>
                    {selectedVoice && (
                      <span className="text-[11px] text-white/35">{selectedVoice.label}</span>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {voices.map((v) => (
                      <VoiceCard key={v.id} voice={v} selected={selectedVoice?.id === v.id} onSelect={setSelectedVoice} />
                    ))}
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setVoStep(1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  ← Voltar
                </button>
                <button
                  onClick={() => setVoStep(3)}
                  disabled={!selectedVoice || providerKeyMissing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ background: '#CCFF00', color: '#07070B' }}>
                  Próximo: Ajustes & Gerar →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Fine-tune & Generate ──────────────────────────────────── */}
          {voStep === 3 && (
            <>
              {/* Summary card */}
              <div className="rounded-2xl p-4 flex items-center gap-4"
                style={{ border: '1px solid rgba(204,255,0,0.15)', background: 'rgba(204,255,0,0.04)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(204,255,0,0.12)' }}>
                  <Mic size={16} style={{ color: '#CCFF00' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/80 truncate">
                    {selectedScript?.title || selectedScript?.blueprintId || '—'}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {provider === 'openai' ? 'OpenAI TTS' : 'ElevenLabs'} · {selectedVoice?.label}
                    {charCount > 0 && ` · ~${charCount.toLocaleString()} chars`}
                    {audioMode === 'sections' && ' · por seção'}
                  </p>
                </div>
                <CheckCircle2 size={16} style={{ color: '#CCFF00', opacity: 0.7 }} />
              </div>

              {/* Quality settings */}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Ajustes de Qualidade</span>
                </div>
                <div className="p-4 space-y-4">
                  {provider === 'openai' && (
                    <div>
                      <label className="field-label mb-2 block">Modelo</label>
                      <div className="flex gap-2">
                        {[
                          { v: 'tts-1',    l: 'Padrão', hint: 'mais rápido'      },
                          { v: 'tts-1-hd', l: 'HD',     hint: 'melhor qualidade' },
                        ].map((m) => (
                          <button key={m.v} onClick={() => setModel(m.v)}
                            className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                            style={model === m.v
                              ? { background: '#CCFF00', color: '#07070B', borderColor: '#CCFF00' }
                              : { background: 'transparent', color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.10)' }}>
                            {m.l} <span className="opacity-60 font-normal">· {m.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {provider === 'elevenlabs' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="field-label">Estabilidade</label>
                          <span className="text-xs font-bold tabular-nums" style={{ color: '#a78bfa' }}>{stability}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={stability}
                          onChange={(e) => setStability(+e.target.value)}
                          className="w-full accent-violet-600" />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-white/20">Variado</span>
                          <span className="text-[10px] text-white/20">Estável</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="field-label">Similaridade</label>
                          <span className="text-xs font-bold tabular-nums" style={{ color: '#a78bfa' }}>{similarity}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={similarity}
                          onChange={(e) => setSimilarity(+e.target.value)}
                          className="w-full accent-violet-600" />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-white/20">Criativo</span>
                          <span className="text-[10px] text-white/20">Fiel ao original</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {provider === 'openai' && charCount > 4096 && (
                    <p className="text-[11px] rounded-lg px-3 py-2"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', color: 'rgba(245,158,11,0.80)' }}>
                      <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />O roteiro tem {charCount.toLocaleString()} chars — será truncado em 4 096.
                    </p>
                  )}
                </div>
              </div>

              {/* Nav + generate */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setVoStep(2)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  ← Voltar
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !scriptId || !selectedVoice}
                  className="flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    background: generating ? 'rgba(204,255,0,0.50)' : '#CCFF00',
                    color: '#07070B',
                    boxShadow: generating ? 'none' : '0 0 20px rgba(204,255,0,0.30)',
                  }}>
                  {generating
                    ? <><Loader2 size={15} className="animate-spin" /> Gerando…</>
                    : <><Mic size={15} /> Gerar Narração</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Opt-in: narrate the same script in another language — only shown when
          sibling-language versions of this script already exist. */}
      {lastVo && lastVo.siblings.length > 0 && (
        <LanguageFollowUp
          title="Gerar a narração em outro idioma?"
          subtitle="Este roteiro também existe em outros idiomas. Gere a narração dessas versões com a mesma voz e os mesmos ajustes."
          currentCode={normalizeLang(lastVo.sourceScript?.language)}
          options={[...new Set(lastVo.siblings.map((s) => normalizeLang(s.language)))]}
          doneCodes={voLangDone}
          busyCode={voLangBusy}
          onPick={handleGenerateSiblingVoice}
        />
      )}

      {/* Per-section results panel (shown right after sections generation) */}
      {sectionResults && sectionResults.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <Layers size={14} style={{ color: '#a78bfa' }} />
            <h3 className="card-title">Áudios por seção gerados</h3>
            <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {sectionResults.length} seção{sectionResults.length !== 1 ? 'ões' : ''}
            </span>
            <button onClick={() => setSectionResults(null)}
              className="p-1 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/5 transition-colors ml-2">
              <Trash2 size={12} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {sectionResults.map((sec, i) => (
              <div key={sec.id ?? i} className="flex items-center gap-4 px-5 py-3">
                {/* Index + label */}
                <div className="shrink-0 w-6 text-center">
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="shrink-0 min-w-[110px]">
                  <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {sec.sectionLabel ?? `Seção ${i + 1}`}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    {sec.sectionType ?? ''}{sec.duration ? ` · ${sec.duration}` : ''}
                  </p>
                </div>
                {/* Audio player */}
                <div className="flex-1 min-w-0">
                  {sec.audioUrl ? (
                    <AudioPlayer url={sec.audioUrl} />
                  ) : (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Sem URL de áudio</span>
                  )}
                </div>
                {/* Download + status */}
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle2 size={13} style={{ color: '#00FFB9' }} />
                  {sec.audioUrl && (
                    <a href={sec.audioUrl} download
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'rgba(255,255,255,0.30)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.30)'}>
                      <Download size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voiceovers table */}
      <div className="card">
        <div className="card-header min-h-[48px]">
          {checkedVo.length > 0 ? (
            <>
              <span className="text-xs font-semibold text-white/60">{checkedVo.length} selecionada{checkedVo.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => handleDeleteVoiceovers(checkedVo)}
                disabled={deleting}
                className="ml-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FF3366]/12 border border-[#FF3366]/25 text-[#FF3366] hover:bg-[#FF3366]/20 transition-colors"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Excluir selecionadas
              </button>
              <button
                onClick={() => handleDeleteVoiceovers([], true)}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FF3366]/6 border border-[#FF3366]/15 text-[#FF3366]/70 hover:bg-[#FF3366]/15 transition-colors"
              >
                Excluir todas
              </button>
              <button onClick={() => setCheckedVo([])} className="ml-auto text-xs text-white/35 hover:text-white/60">Cancelar</button>
            </>
          ) : (
            <>
              <Mic size={14} className="text-white/35" />
              <h3 className="card-title">Narrações geradas</h3>
              <span className="ml-auto text-[11px] text-white/35">{voiceovers.length} total</span>
              {voiceovers.length > 0 && (
                <button
                  onClick={() => handleDeleteVoiceovers([], true)}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-white/25 hover:text-[#FF3366] hover:bg-[#FF3366]/8 border border-transparent hover:border-[#FF3366]/20 transition-colors"
                  title="Excluir todas as narrações"
                >
                  <Trash2 size={12} /> Limpar tudo
                </button>
              )}
            </>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pl-4 pr-2 py-2 w-8">
                {voiceovers.length > 0 && (
                  <input
                    type="checkbox"
                    checked={checkedVo.length === voiceovers.length && voiceovers.length > 0}
                    ref={(el) => { if (el) el.indeterminate = checkedVo.length > 0 && checkedVo.length < voiceovers.length }}
                    onChange={toggleCheckAllVo}
                    className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                  />
                )}
              </th>
              <th className="th">Roteiro</th>
              <th className="th">Motor / Voz</th>
              <th className="th">Player</th>
              <th className="th">Duração</th>
              <th className="th">Status</th>
              <th className="th">Criado</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="group">
            {voiceovers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Mic size={24} className="text-white/20" />
                    <p className="text-sm text-white/35">Nenhuma narração ainda — selecione um roteiro e gere áudio</p>
                  </div>
                </td>
              </tr>
            ) : (
              voiceovers.map((v) => (
                <tr key={v.id} className={`tr ${checkedVo.includes(v.id) ? 'bg-[#FF3366]/5' : ''}`}>
                  <td className="pl-4 pr-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedVo.includes(v.id)}
                      onChange={() => toggleCheckVo(v.id)}
                      className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-white/80 text-[13px] max-w-[160px] truncate">
                      {v.scripts?.title || v.scripts?.blueprintId || v.scriptId?.slice(0, 10) + '…'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-white/35">{v.scripts?.language?.toUpperCase()}</span>
                      {v.sectionLabel && (
                        <span style={{ fontSize: 9, background: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>
                          {v.sectionLabel}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <ProviderBadge provider={v.provider ?? 'elevenlabs'} />
                      <span className="text-[11px] text-white/40">{v.voiceModel}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {v.status === 'completed' && v.fileUrl && <AudioPlayer url={v.fileUrl} />}
                  </td>
                  <td className="px-5 py-3 text-white/60 text-xs tabular-nums">{v.duration}</td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3 text-white/35 text-xs tabular-nums">{timeAgo(v.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {v.fileUrl && (
                        <a href={v.fileUrl} download
                          className="p-1.5 rounded-lg hover:bg-[#0F0F16]/[0.05] text-white/35 hover:text-violet-400 transition-colors block">
                          <Download size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteVoiceovers([v.id])}
                        className="p-1.5 text-white/20 hover:text-[#FF3366] hover:bg-[#FF3366]/8 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir narração"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
