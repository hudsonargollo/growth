import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FolderOpen, Plus, Pencil, Trash2, Check, X, ChevronRight,
  Database, FileText, Mic, RefreshCw, AlertTriangle, Loader2,
  Calendar, BarChart2, FolderPlus, Zap, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Video,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'
import { friendlyError } from './Scripts.jsx'

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onOpen }) {
  const sessionCount = project._sessionCount ?? 0
  const scriptCount  = project._scriptCount  ?? 0

  return (
    <div
      onClick={() => onOpen(project)}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all"
      style={{
        background: 'rgba(15,15,22,0.70)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.40)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Color bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #8B5CF6, #00FFB9)' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.28)' }}>
            <FolderOpen size={16} style={{ color: '#8B5CF6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: 'rgba(255,255,255,0.90)' }}>
              {project.name}
            </p>
            {project.description && (
              <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {project.description}
              </p>
            )}
          </div>
          {/* Action buttons — stop propagation so card click doesn't fire */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onEdit(project) }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}>
              <Pencil size={12} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(project) }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,102,0.10)'; e.currentTarget.style.color = '#FF3366' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.18)' }}>
            <Database size={11} style={{ color: '#FFB800' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFB800', fontFamily: "'JetBrains Mono', monospace" }}>
              {sessionCount}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>sessões</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
            <FileText size={11} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace" }}>
              {scriptCount}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>roteiros</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} />
            {timeAgo(project.createdAt)}
          </span>
          <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.25)' }}
            className="group-hover:text-violet-400 transition-colors" />
        </div>
      </div>
    </div>
  )
}

// ── Create / edit modal ───────────────────────────────────────────────────────
function ProjectModal({ project, onClose, onSave }) {
  const [name,        setName]        = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const nameRef = useRef(null)

  useEffect(() => { requestAnimationFrame(() => nameRef.current?.focus()) }, [])

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true); setError(null)
    try {
      const method = project ? 'PATCH' : 'POST'
      const url    = project ? `/api/projects/${project.id}` : '/api/projects'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      onSave(data)
    } catch (e) { setError(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  const modal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.72), 0 0 40px rgba(193,255,47,0.06)', background: '#16161F', border: '1px solid rgba(193,255,47,0.18)' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg, #C1FF2F 0%, rgba(139,92,246,0.70) 60%, transparent 100%)' }} />
        <div style={{ padding: 24 }}>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.28)' }}>
            <FolderPlus size={18} style={{ color: '#8B5CF6' }} />
          </div>
          <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.90)' }}>
            {project ? 'Editar projeto' : 'Novo projeto'}
          </p>
          <button onClick={onClose} className="ml-auto p-1 rounded-lg text-white/35 hover:text-white/60 hover:bg-white/5">
            <X size={14} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4"
            style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.28)', color: '#FF3366' }}>
            <AlertTriangle size={12} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Nome do projeto *
          </label>
          <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Power Banks Junho, Fones Bluetooth…"
            className="input w-full mb-4" />

          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Descrição <span style={{ color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Público-alvo, nicho, tema do conteúdo…"
            rows={2}
            className="input w-full mb-5 resize-none" />

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#8B5CF6', color: '#fff' }}>
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : (project ? 'Salvar' : 'Criar projeto')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ── Pipeline step indicator ───────────────────────────────────────────────────
function PipelineStep({ done, label }) {
  return (
    <div className="flex items-center gap-1">
      {done ? (
        <CheckCircle2 size={11} style={{ color: '#00FFB9', flexShrink: 0 }} />
      ) : (
        <Circle size={11} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 10, color: done ? 'rgba(0,255,185,0.75)' : 'rgba(255,255,255,0.28)', fontWeight: done ? 600 : 400 }}>
        {label}
      </span>
    </div>
  )
}

// ── Script pipeline row (used inside drawer) ──────────────────────────────────
function ScriptPipelineRow({ script, voiceoverIds, isShort = false }) {
  const hasVoiceover = voiceoverIds.has(script.id)
  // "Entrega" = voiceover done (future: could track YouTube upload etc.)
  const delivered    = hasVoiceover

  const [expanded, setExpanded] = useState(false)
  const sections = script.sections ?? []
  const hasSections = sections.length > 0

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: isShort ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isShort ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Icon */}
        {isShort ? (
          <Zap size={12} style={{ color: '#fbbf24', flexShrink: 0 }} />
        ) : (
          <Video size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
        )}

        {/* Title + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isShort && (
              <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>
                SHORT
              </span>
            )}
            <span className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {script.title ?? 'Sem título'}
            </span>
          </div>
          {/* Pipeline steps */}
          <div className="flex items-center gap-3 mt-1">
            <PipelineStep done label="Roteiro" />
            <PipelineStep done={hasVoiceover} label="Narração" />
            <PipelineStep done={delivered} label="Entrega" />
          </div>
        </div>

        {/* Expand toggle (only if sections exist) */}
        {hasSections && (
          <button onClick={() => setExpanded(v => !v)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)', background: expanded ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {/* Expandable section list */}
      {expanded && hasSections && (
        <div className="px-3 pb-2.5 space-y-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {sections.map((sec, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: "'JetBrains Mono', monospace", minWidth: 16 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-xs truncate flex-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {sec.label ?? sec.type}
              </span>
              {sec.type === 'product' && (
                <span style={{ fontSize: 9, color: '#FFB800', background: 'rgba(255,184,0,0.10)', border: '1px solid rgba(255,184,0,0.20)', borderRadius: 3, padding: '1px 4px' }}>
                  produto
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(modal, document.body)
}

// ── Project detail drawer ─────────────────────────────────────────────────────
function ProjectDetailDrawer({ project, onClose, onUpdated }) {
  const { data: sessionsData } = useApi('/mining/sessions')
  const { data: scriptsData }  = useApi('/scripts')
  const { data: voData }       = useApi('/voiceover')

  const allSessions  = sessionsData?.sessions  ?? []
  const allScripts   = scriptsData?.scripts    ?? []
  const allVoiceovers = voData?.voiceovers     ?? []

  // Set of scriptIds that have at least one voiceover
  const voiceoverIds = new Set(allVoiceovers.map(v => v.scriptId).filter(Boolean))

  const linked = {
    sessions: allSessions.filter(s => s.projectId === project.id),
    scripts:  allScripts.filter(s => s.projectId  === project.id),
  }

  // Group scripts: longform roots first, then map shorts by parentScriptId
  const longforms = linked.scripts.filter(s => (s.videoType ?? 'longform') === 'longform')
  const shortsMap = {}
  linked.scripts
    .filter(s => s.videoType === 'short' && s.parentScriptId)
    .forEach(s => {
      if (!shortsMap[s.parentScriptId]) shortsMap[s.parentScriptId] = []
      shortsMap[s.parentScriptId].push(s)
    })
  // Sort shorts within each parent by videoIndex
  Object.values(shortsMap).forEach(arr => arr.sort((a, b) => (a.videoIndex ?? 0) - (b.videoIndex ?? 0)))

  // Orphan shorts (parent not in this project)
  const orphanShorts = linked.scripts.filter(
    s => s.videoType === 'short' && (!s.parentScriptId || !linked.scripts.find(p => p.id === s.parentScriptId))
  )

  const drawer = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', pointerEvents: 'none' }}>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', pointerEvents: 'all' }}
      />
      {/* panel */}
      <div
        style={{
          position: 'relative', zIndex: 1, marginLeft: 'auto',
          width: '100%', maxWidth: 480, height: '100%',
          display: 'flex', flexDirection: 'column',
          background: '#0F0F16', borderLeft: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.5)',
          pointerEvents: 'all',
        }}
      >

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/35 hover:text-white/60 hover:bg-white/5">
            <X size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: 'rgba(255,255,255,0.90)' }}>{project.name}</p>
            {project.description && (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{project.description}</p>
            )}
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span style={{ color: '#FFB800', fontWeight: 700 }}>{linked.sessions.length}</span>
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>sessões</span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>{linked.scripts.length}</span>
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>roteiros</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Pipeline de vídeos ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Video size={13} style={{ color: '#a78bfa' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Pipeline de vídeos
              </span>
              <span className="ml-auto text-xs font-bold" style={{ color: '#a78bfa' }}>{linked.scripts.length}</span>
            </div>

            {linked.scripts.length === 0 ? (
              <p className="text-xs py-4 text-center rounded-xl"
                style={{ color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Nenhum roteiro vinculado ainda.<br />
                Gere roteiros e selecione este projeto no wizard.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Longform scripts + their shorts */}
                {longforms.map(parent => (
                  <div key={parent.id} className="space-y-1.5">
                    <ScriptPipelineRow
                      script={parent}
                      voiceoverIds={voiceoverIds}
                      isShort={false}
                    />
                    {/* Shorts nested under this parent */}
                    {(shortsMap[parent.id] ?? []).map(short => (
                      <div key={short.id} className="ml-5">
                        <ScriptPipelineRow
                          script={short}
                          voiceoverIds={voiceoverIds}
                          isShort
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Orphan shorts (no parent in this project) */}
                {orphanShorts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: 'rgba(255,255,255,0.25)', paddingLeft: 2 }}>
                      Shorts avulsos
                    </p>
                    {orphanShorts.map(short => (
                      <ScriptPipelineRow
                        key={short.id}
                        script={short}
                        voiceoverIds={voiceoverIds}
                        isShort
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Sessões de mineração ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database size={13} style={{ color: '#FFB800' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Sessões de mineração
              </span>
              <span className="ml-auto text-xs font-bold" style={{ color: '#FFB800' }}>{linked.sessions.length}</span>
            </div>
            {linked.sessions.length === 0 ? (
              <p className="text-xs py-4 text-center rounded-xl"
                style={{ color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Nenhuma sessão vinculada.<br />
                Ao nomear uma sessão, selecione este projeto.
              </p>
            ) : (
              <div className="space-y-2">
                {linked.sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Database size={12} style={{ color: '#FFB800', flexShrink: 0 }} />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {s.name ?? s.category ?? 'Sessão sem nome'}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {timeAgo(s.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )

  return createPortal(drawer, document.body)
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Projects() {
  const { data, loading, refetch } = useApi('/projects')
  const projects = data?.projects ?? []

  const [createOpen,     setCreateOpen]     = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [detailProject,  setDetailProject]  = useState(null)
  const [error,          setError]          = useState(null)

  async function handleDelete(project) {
    if (!window.confirm(`Excluir o projeto "${project.name}"? As sessões e roteiros vinculados não serão apagados.`)) return
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      refetch()
    } catch (e) { setError(friendlyError(e.message)) }
  }

  function handleSaved() {
    setCreateOpen(false)
    setEditingProject(null)
    refetch()
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Pipeline"
        title="Projetos"
        description="Organize sessões de mineração, roteiros e narrações em projetos"
        action={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={15} /> Novo Projeto
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'rgba(255,51,102,0.07)', border: '1px solid rgba(255,51,102,0.28)', color: '#FF3366' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-violet-400" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Carregando projetos…</p>
        </div>
      ) : projects.length === 0 ? (
        /* ── Empty state ── */
        <div className="py-20 text-center rounded-2xl"
          style={{ border: '1px dashed rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.22)' }}>
            <FolderOpen size={28} style={{ color: '#8B5CF6' }} />
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: 'rgba(255,255,255,0.70)' }}>Nenhum projeto ainda</p>
          <p className="text-xs mb-6 max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Crie um projeto para organizar sessões de mineração, roteiros e narrações em um só lugar.
          </p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <FolderPlus size={14} /> Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={setEditingProject}
              onDelete={handleDelete}
              onOpen={setDetailProject}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(createOpen || editingProject) && (
        <ProjectModal
          project={editingProject ?? null}
          onClose={() => { setCreateOpen(false); setEditingProject(null) }}
          onSave={handleSaved}
        />
      )}

      {detailProject && (
        <ProjectDetailDrawer
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  )
}
