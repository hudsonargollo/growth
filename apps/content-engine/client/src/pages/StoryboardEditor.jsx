import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Film, Image, RefreshCw, Play, ChevronDown, ChevronUp,
  Loader2, Check, X, AlertCircle, Package, Zap,
  Clock, Eye, LayoutPanelLeft,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi } from '../hooks/useApi.js'
import { scriptDisplayName } from '../lib/humanize.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status) {
  if (status === 'done')       return { bg: 'rgba(0,255,185,0.10)', border: 'rgba(0,255,185,0.25)', text: '#00FFB9' }
  if (status === 'generating') return { bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)', text: '#a78bfa' }
  if (status === 'error')      return { bg: 'rgba(255,51,102,0.10)', border: 'rgba(255,51,102,0.22)', text: '#FF3366' }
  return { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.30)' }
}

function StatusPill({ status, label }) {
  const c = statusColor(status)
  return (
    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label ?? status}
    </span>
  )
}

function OverallBadge({ sb }) {
  if (!sb) return null
  const map = {
    shot_list_ready:  { label: 'Shot List Pronta', color: '#a78bfa' },
    frames_generating:{ label: 'Gerando Frames…',  color: '#a78bfa' },
    frames_ready:     { label: 'Frames Prontos',   color: '#00FFB9' },
    animating:        { label: 'Animando…',         color: '#fbbf24' },
    done:             { label: 'Vídeo Pronto',      color: '#CCFF00' },
  }
  const m = map[sb.status] ?? { label: sb.status, color: 'rgba(255,255,255,0.3)' }
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: `${m.color}18`, border: `1px solid ${m.color}40`, color: m.color }}>
      {m.label}
    </span>
  )
}

// ── Scene Card ────────────────────────────────────────────────────────────────

function SceneCard({ scene, index, isActive, onSelect, onGenerateFrame, onAnimate, onEditPrompt }) {
  const frameC = statusColor(scene.frame_status)
  const videoC = statusColor(scene.video_status)

  return (
    <button
      onClick={() => onSelect(index)}
      className="w-full text-left rounded-2xl overflow-hidden border transition-all"
      style={{
        borderColor: isActive ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.06)',
        background:  isActive ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.015)',
      }}
    >
      {/* Frame thumbnail strip */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%', background: 'rgba(0,0,0,0.35)' }}>
        {scene.frame_url ? (
          <img src={scene.frame_url} alt={`Cena ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            {scene.frame_status === 'generating' ? (
              <Loader2 size={18} className="animate-spin" style={{ color: '#a78bfa' }} />
            ) : (
              <Image size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
            )}
            <span className="text-[9px] text-white/20">
              {scene.frame_status === 'generating' ? 'Gerando…' : 'Sem frame'}
            </span>
          </div>
        )}

        {/* Scene index badge */}
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
          style={{ background: isActive ? '#8B5CF6' : 'rgba(0,0,0,0.70)', color: isActive ? '#fff' : 'rgba(255,255,255,0.50)' }}>
          {index + 1}
        </div>

        {/* Duration badge */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.65)' }}>
          <Clock size={8} style={{ color: 'rgba(255,255,255,0.40)' }} />
          <span className="text-[8px] text-white/40">{scene.duration_estimate}s</span>
        </div>

        {/* Video badge */}
        {scene.video_status === 'done' && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(0,255,185,0.15)', border: '1px solid rgba(0,255,185,0.30)' }}>
            <Play size={8} style={{ color: '#00FFB9' }} />
            <span className="text-[8px] font-bold" style={{ color: '#00FFB9' }}>Vídeo</span>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5 space-y-1.5">
        <p className="text-[11px] text-white/55 leading-snug line-clamp-2">{scene.dialogue_text || '—'}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={scene.frame_status}
            label={scene.frame_status === 'done' ? 'Frame Pronto' : scene.frame_status === 'generating' ? 'Gerando…' : scene.frame_status === 'error' ? 'Erro' : 'Pendente'} />
          {scene.video_status !== 'pending' && (
            <StatusPill status={scene.video_status}
              label={scene.video_status === 'done' ? 'Vídeo Pronto' : scene.video_status === 'generating' ? 'Animando…' : scene.video_status === 'error' ? 'Erro Vídeo' : scene.video_status} />
          )}
        </div>
      </div>
    </button>
  )
}

// ── Scene Detail Panel ────────────────────────────────────────────────────────

function sceneError(msg = '') {
  if (msg.toLowerCase().includes('higgsfield_api_key') || msg.toLowerCase().includes('higgsfield'))
    return { text: 'HIGGSFIELD_API_KEY não configurada.', link: true }
  return { text: msg, link: false }
}

function SceneDetail({ scene, index, scriptId, onStoryboardUpdate }) {
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [draftMcsla,    setDraftMcsla]    = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [genFrame,      setGenFrame]      = useState(false)
  const [genVideo,      setGenVideo]      = useState(false)
  const [sceneErr,      setSceneErr]      = useState(null)

  const mcsla = scene.mcsla ?? {}

  async function handleSaveMcsla() {
    setSaving(true); setSceneErr(null)
    try {
      const res = await fetch(`/api/storyboard/${scriptId}/scenes/${index}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcsla: draftMcsla }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onStoryboardUpdate(data.storyboard)
      setEditingPrompt(false)
    } catch (e) { setSceneErr(e.message) } finally { setSaving(false) }
  }

  async function handleGenerateFrame() {
    setGenFrame(true); setSceneErr(null)
    try {
      const res = await fetch(`/api/storyboard/${scriptId}/frames/${index}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onStoryboardUpdate(data.storyboard)
    } catch (e) { setSceneErr(e.message) } finally { setGenFrame(false) }
  }

  async function handleAnimate() {
    setGenVideo(true); setSceneErr(null)
    try {
      const res = await fetch(`/api/storyboard/${scriptId}/animate/${index}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onStoryboardUpdate(data.storyboard)
    } catch (e) { setSceneErr(e.message) } finally { setGenVideo(false) }
  }

  return (
    <div className="space-y-4">
      {/* Scene header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/80">Cena {index + 1}</span>
            <StatusPill status={scene.frame_status}
              label={scene.frame_status === 'done' ? 'Frame Pronto' : scene.frame_status === 'generating' ? 'Gerando Frame…' : scene.frame_status === 'error' ? 'Erro no Frame' : 'Frame Pendente'} />
            {scene.video_status !== 'pending' && (
              <StatusPill status={scene.video_status}
                label={scene.video_status === 'done' ? 'Vídeo Pronto' : scene.video_status === 'generating' ? 'Animando…' : scene.video_status === 'error' ? 'Erro Vídeo' : scene.video_status} />
            )}
          </div>
          <p className="text-[10px] text-white/25 mt-0.5">{scene.duration_estimate}s · {scene.aspect_ratio}</p>
        </div>
      </div>

      {/* Inline error */}
      {sceneErr && (() => {
        const { text, link } = sceneError(sceneErr)
        return (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-xs"
            style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.22)', color: '#FF3366' }}>
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">
              {text}
              {link && (
                <a href="/settings" className="ml-1 underline font-bold" style={{ color: '#CCFF00' }}>
                  Adicionar em Configurações →
                </a>
              )}
            </span>
            <button onClick={() => setSceneErr(null)} className="shrink-0 opacity-60 hover:opacity-100"><X size={11} /></button>
          </div>
        )
      })()}

      {/* Dialogue */}
      <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-1.5">Narração</p>
        <p className="text-sm text-white/65 leading-relaxed">{scene.dialogue_text || '—'}</p>
      </div>

      {/* Frame viewer */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#000' }}>
        {scene.frame_url ? (
          <>
            <img src={scene.frame_url} alt={`Frame cena ${index + 1}`} className="w-full object-contain" style={{ maxHeight: 280 }} />
            {scene.video_url && (
              <video src={scene.video_url} controls className="w-full" style={{ maxHeight: 280, borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {scene.frame_status === 'generating' ? (
              <>
                <Loader2 size={24} className="animate-spin" style={{ color: '#8B5CF6' }} />
                <p className="text-xs text-white/30">Gerando frame no Higgsfield…</p>
                <p className="text-[10px] text-white/15">Isso pode levar 30-90 segundos</p>
              </>
            ) : scene.frame_status === 'error' ? (
              <>
                <AlertCircle size={22} style={{ color: '#FF3366' }} />
                <p className="text-xs text-white/50">{scene.error || 'Erro na geração'}</p>
              </>
            ) : (
              <>
                <Image size={22} style={{ color: 'rgba(255,255,255,0.12)' }} />
                <p className="text-xs text-white/25">Frame ainda não gerado</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Product reference */}
      {scene.product_image_url && (
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <img src={scene.product_image_url} alt="Referência do produto"
            className="w-12 h-12 rounded-xl object-contain shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#00D4FF' }}>Referência Ativa</p>
            <p className="text-[10px] text-white/40 leading-snug">Imagem do produto injetada como referência visual no Higgsfield</p>
          </div>
        </div>
      )}

      {/* MCSLA prompt editor */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => { setEditingPrompt(v => !v); setDraftMcsla({ ...mcsla }) }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex-1">Prompt MCSLA</span>
          {editingPrompt
            ? <ChevronUp size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
            : <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
          }
        </button>
        {editingPrompt && draftMcsla && (
          <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-white/[0.04]">
            {['composition', 'subject', 'lighting', 'aesthetic'].map(field => (
              <div key={field}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1">{field}</p>
                <input
                  type="text"
                  value={draftMcsla[field] ?? ''}
                  onChange={e => setDraftMcsla(d => ({ ...d, [field]: e.target.value }))}
                  className="w-full text-xs bg-transparent border border-white/[0.09] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500/40 text-white/60 placeholder-white/20"
                  placeholder={`${field}…`}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingPrompt(false)}
                className="text-xs text-white/30 hover:text-white/55 px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveMcsla} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                style={{ background: '#8B5CF6', color: '#fff' }}>
                {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                Salvar e resetar frame
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleGenerateFrame}
          disabled={genFrame || scene.frame_status === 'generating'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: (genFrame || scene.frame_status === 'generating') ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.15)',
            border:     '1px solid rgba(139,92,246,0.30)',
            color:      '#a78bfa',
          }}>
          {(genFrame || scene.frame_status === 'generating')
            ? <><Loader2 size={14} className="animate-spin" /> Gerando Frame…</>
            : <><RefreshCw size={14} /> {scene.frame_status === 'done' ? 'Regenerar Frame' : 'Gerar Frame'}</>
          }
        </button>

        <button
          onClick={handleAnimate}
          disabled={genVideo || scene.video_status === 'generating' || scene.frame_status !== 'done'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: scene.frame_status !== 'done'
              ? 'rgba(255,255,255,0.03)'
              : genVideo || scene.video_status === 'generating'
                ? 'rgba(251,191,36,0.15)'
                : 'rgba(251,191,36,0.10)',
            border:  scene.frame_status !== 'done' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(251,191,36,0.25)',
            color:   scene.frame_status !== 'done' ? 'rgba(255,255,255,0.20)' : '#fbbf24',
            cursor:  scene.frame_status !== 'done' ? 'not-allowed' : 'pointer',
          }}>
          {(genVideo || scene.video_status === 'generating')
            ? <><Loader2 size={14} className="animate-spin" /> Animando…</>
            : <><Play size={14} /> {scene.video_status === 'done' ? 'Re-animar Cena' : 'Animar Cena'}</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StoryboardEditor() {
  const { data: scriptsData } = useApi('/scripts')
  const scripts = scriptsData?.scripts ?? []

  const [scriptId,        setScriptId]        = useState('')
  const [storyboard,      setStoryboard]       = useState(null)
  const [loadingSb,       setLoadingSb]        = useState(false)
  const [activeScene,     setActiveScene]      = useState(0)
  const [generatingShotList, setGeneratingSL]  = useState(false)
  const [generatingAll,   setGeneratingAll]    = useState(false)
  const [animatingAll,    setAnimatingAll]     = useState(false)
  const [error,           setError]            = useState(null)
  const pollRef = useRef(null)

  // Load storyboard when script changes
  async function loadStoryboard(sid) {
    if (!sid) { setStoryboard(null); return }
    setLoadingSb(true)
    try {
      const res  = await fetch(`/api/storyboard/${sid}`)
      const data = await res.json()
      setStoryboard(data.storyboard ?? null)
      setActiveScene(0)
    } catch {} finally { setLoadingSb(false) }
  }

  useEffect(() => {
    if (scriptId) loadStoryboard(scriptId)
    else setStoryboard(null)
  }, [scriptId])

  // Auto-poll when frames/videos are generating
  const needsPoll = storyboard && (storyboard.status === 'frames_generating' || storyboard.status === 'animating')

  useEffect(() => {
    if (!needsPoll || !scriptId) {
      clearInterval(pollRef.current)
      return
    }
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const endpoint = storyboard.status === 'animating' ? 'poll-videos' : 'poll-frames'
        const res = await fetch(`/api/storyboard/${scriptId}/${endpoint}`)
        const data = await res.json()
        if (data.storyboard) setStoryboard(data.storyboard)
      } catch {}
    }, 8000)
    return () => clearInterval(pollRef.current)
  }, [needsPoll, scriptId, storyboard?.status])

  // Derive selected script's product IDs from its sections or from the KV/DB
  function getProductIdsFromScript(sid) {
    // We pass empty array; the worker fetches products via script → sections context
    return []
  }

  async function handleGenerateShotList() {
    if (!scriptId) return
    setGeneratingSL(true); setError(null)
    try {
      const res  = await fetch(`/api/storyboard/${scriptId}/shot-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: getProductIdsFromScript(scriptId) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setStoryboard(data.storyboard)
      setActiveScene(0)
    } catch (e) { setError(e.message) } finally { setGeneratingSL(false) }
  }

  async function handleGenerateAllFrames() {
    if (!storyboard) return
    setGeneratingAll(true); setError(null)
    try {
      const res  = await fetch(`/api/storyboard/${scriptId}/frames`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setStoryboard(data.storyboard)
    } catch (e) { setError(e.message) } finally { setGeneratingAll(false) }
  }

  async function handleAnimateAll() {
    if (!storyboard) return
    setAnimatingAll(true); setError(null)
    try {
      const res  = await fetch(`/api/storyboard/${scriptId}/animate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setStoryboard(data.storyboard)
    } catch (e) { setError(e.message) } finally { setAnimatingAll(false) }
  }

  const scenes        = storyboard?.scenes ?? []
  const doneFrames    = scenes.filter(s => s.frame_status === 'done').length
  const pendingFrames = scenes.filter(s => s.frame_status === 'pending' || s.frame_status === 'error').length
  const doneVideos    = scenes.filter(s => s.video_status === 'done').length
  const allFramesDone = scenes.length > 0 && pendingFrames === 0 && scenes.every(s => s.frame_status !== 'generating')
  const canAnimate    = allFramesDone && doneFrames > 0

  const selectedScript = scripts.find(s => s.id === scriptId)

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Visual"
        title="Storyboard Editor"
        description="Gere frames e vídeos por cena a partir do roteiro com Higgsfield AI"
      />

      {/* Higgsfield config banner */}
      {storyboard && storyboard.scenes?.some(s => s.error?.toLowerCase().includes('higgsfield')) && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}>
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">
            <strong>HIGGSFIELD_API_KEY</strong> não configurada — geração de frames e vídeos está desativada.
          </span>
          <a href="/settings"
            className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.30)', color: '#fbbf24' }}>
            Configurar →
          </a>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.20)', color: '#FF3366' }}>
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Script selector + status bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-0 max-w-sm">
          <select
            value={scriptId}
            onChange={e => { setScriptId(e.target.value); setError(null) }}
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500/40 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: scriptId ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)' }}>
            <option value="">— Selecione um roteiro —</option>
            {scripts.map(s => (
              <option key={s.id} value={s.id}>{scriptDisplayName(s)}</option>
            ))}
          </select>
        </div>

        {storyboard && <OverallBadge sb={storyboard} />}

        {storyboard && scenes.length > 0 && (
          <span className="text-xs text-white/30">
            {scenes.length} cenas · {doneFrames}/{scenes.length} frames · {doneVideos}/{scenes.length} vídeos
          </span>
        )}

        {loadingSb && <Loader2 size={14} className="animate-spin" style={{ color: '#8B5CF6' }} />}
      </div>

      {/* No script selected */}
      {!scriptId && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl"
          style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <Film size={24} style={{ color: 'rgba(139,92,246,0.60)' }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white/30">Selecione um roteiro acima</p>
            <p className="text-xs text-white/20">O storyboard será gerado a partir das seções do roteiro</p>
          </div>
        </div>
      )}

      {/* Script selected but no storyboard yet */}
      {scriptId && !storyboard && !loadingSb && (
        <div className="flex flex-col items-center justify-center py-20 gap-5 rounded-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.15)' }}>
            <LayoutPanelLeft size={24} style={{ color: '#CCFF00' }} />
          </div>
          <div className="text-center space-y-1 max-w-xs">
            <p className="text-sm font-semibold text-white/70">Nenhum storyboard para este roteiro</p>
            <p className="text-xs text-white/30 leading-relaxed">
              Clique em "Gerar Shot List" para que a IA divida o roteiro em cenas visuais com prompts MCSLA para o Higgsfield.
            </p>
          </div>
          <button
            onClick={handleGenerateShotList}
            disabled={generatingShotList}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: '#CCFF00', color: '#07070B', boxShadow: '0 0 24px rgba(204,255,0,0.20)' }}>
            {generatingShotList
              ? <><Loader2 size={15} className="animate-spin" /> Gerando Shot List…</>
              : <><Zap size={15} /> Gerar Shot List com IA</>
            }
          </button>
        </div>
      )}

      {/* Storyboard loaded */}
      {storyboard && scenes.length > 0 && (
        <div className="space-y-4">

          {/* Global action bar */}
          <div className="flex items-center gap-2 flex-wrap p-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Progress bars */}
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/25 w-12">Frames</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${scenes.length ? Math.round((doneFrames / scenes.length) * 100) : 0}%`,
                      background: doneFrames === scenes.length ? '#00FFB9' : '#8B5CF6',
                    }} />
                </div>
                <span className="text-[10px] text-white/25">{doneFrames}/{scenes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/25 w-12">Vídeos</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${scenes.length ? Math.round((doneVideos / scenes.length) * 100) : 0}%`,
                      background: doneVideos === scenes.length ? '#CCFF00' : '#fbbf24',
                    }} />
                </div>
                <span className="text-[10px] text-white/25">{doneVideos}/{scenes.length}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Regenerate shot list */}
              <button
                onClick={handleGenerateShotList}
                disabled={generatingShotList || storyboard.status === 'frames_generating' || storyboard.status === 'animating'}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)' }}>
                {generatingShotList ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Refazer Shot List
              </button>

              {/* Generate all frames */}
              <button
                onClick={handleGenerateAllFrames}
                disabled={generatingAll || storyboard.status === 'frames_generating'}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{
                  background: storyboard.status === 'frames_generating' ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.20)',
                  border:     '1px solid rgba(139,92,246,0.30)',
                  color:      '#a78bfa',
                }}>
                {(generatingAll || storyboard.status === 'frames_generating')
                  ? <><Loader2 size={11} className="animate-spin" /> Gerando…</>
                  : <><Image size={11} /> Gerar Todos os Frames</>
                }
              </button>

              {/* Animate all */}
              <button
                onClick={handleAnimateAll}
                disabled={animatingAll || !canAnimate || storyboard.status === 'animating'}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                style={{
                  background: !canAnimate ? 'rgba(255,255,255,0.03)' : storyboard.status === 'animating' ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.12)',
                  border:     !canAnimate ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(251,191,36,0.28)',
                  color:      !canAnimate ? 'rgba(255,255,255,0.20)' : '#fbbf24',
                  cursor:     !canAnimate ? 'not-allowed' : 'pointer',
                }}>
                {(animatingAll || storyboard.status === 'animating')
                  ? <><Loader2 size={11} className="animate-spin" /> Animando…</>
                  : <><Play size={11} /> Renderizar Vídeo</>
                }
              </button>
            </div>
          </div>

          {/* Polling indicator */}
          {needsPoll && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs"
              style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <Loader2 size={12} className="animate-spin" style={{ color: '#a78bfa' }} />
              <span style={{ color: '#a78bfa' }}>
                {storyboard.status === 'frames_generating' ? 'Monitorando geração de frames…' : 'Monitorando animação de vídeo…'}
              </span>
              <span className="text-white/20 ml-auto">Atualiza a cada 8s</span>
            </div>
          )}

          {/* Split-screen: scene grid left, detail right */}
          <div className="grid grid-cols-5 gap-5">

            {/* Left: scene thumbnails grid */}
            <div className="col-span-2 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/20 mb-3 px-0.5">
                {scenes.length} Cenas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {scenes.map((scene, i) => (
                  <SceneCard
                    key={scene.scene_id ?? i}
                    scene={scene}
                    index={i}
                    isActive={activeScene === i}
                    onSelect={setActiveScene}
                    onGenerateFrame={() => {}}
                    onAnimate={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Right: scene detail */}
            <div className="col-span-3">
              {scenes[activeScene] ? (
                <div className="rounded-2xl p-5"
                  style={{ border: '1px solid rgba(139,92,246,0.20)', background: 'rgba(139,92,246,0.03)', position: 'sticky', top: 0 }}>
                  <SceneDetail
                    scene={scenes[activeScene]}
                    index={activeScene}
                    scriptId={scriptId}
                    onStoryboardUpdate={setStoryboard}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 rounded-2xl"
                  style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <p className="text-xs text-white/25">Selecione uma cena</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
