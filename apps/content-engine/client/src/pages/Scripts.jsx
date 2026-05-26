import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Wand2, FileText, Plus, Trash2, ChevronUp, ChevronDown,
  Pencil, RefreshCw, Copy, Check, GripVertical, X,
  Loader2, BookTemplate, Package, Eye, EyeOff, Clock,
  ChevronRight, Layers, Sparkles, Brain, Mic, Zap,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

// ── Friendly error messages ───────────────────────────────────────────────────

export function friendlyError(raw = '') {
  const r = raw.toLowerCase()
  if (r.includes('quota_exceeded') || r.includes('quota exceeded') || r.includes('credits are required'))
    return 'Créditos insuficientes no ElevenLabs. Adicione créditos em elevenlabs.io ou troque para OpenAI TTS.'
  if (r.includes('invalid_api_key') || r.includes('invalid api key') || r.includes('unauthorized') || r.includes('401'))
    return 'Chave de API inválida ou expirada. Verifique em Configurações.'
  if (r.includes('rate_limit') || r.includes('rate limit') || r.includes('429'))
    return 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.'
  if (r.includes('openai_api_key') || r.includes('openai api key'))
    return 'Chave OpenAI não configurada. Adicione em Configurações → API Keys.'
  if (r.includes('elevenlabs_api_key') || r.includes('elevenlabs api key'))
    return 'Chave ElevenLabs não configurada. Adicione em Configurações → API Keys.'
  if (r.includes('network') || r.includes('fetch') || r.includes('failed to fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  if (r.includes('timeout') || r.includes('timed out'))
    return 'A requisição demorou demais. Tente novamente em instantes.'
  if (r.includes('roteiro não encontrado') || r.includes('script not found') || r === 'not found')
    return 'Roteiro não encontrado. Selecione outro roteiro e tente novamente.'
  if (r.includes('supabase') || r.includes('database') || r.includes('db error'))
    return 'Erro ao salvar no banco de dados. Tente novamente.'
  // fallback: strip JSON noise, show first sentence only
  const clean = raw.replace(/\{.*?\}/gs, '').replace(/["']/g, '').trim()
  return clean.split('.')[0].slice(0, 120) || 'Algo deu errado. Tente novamente.'
}

// ── AI Processing Overlay ─────────────────────────────────────────────────────

const SCRIPT_STEPS = [
  { icon: '🔍', label: 'Analisando produtos e mercado…' },
  { icon: '🧠', label: 'Estruturando o roteiro com IA…' },
  { icon: '✍️', label: 'Escrevendo seções e hooks…' },
  { icon: '🎯', label: 'Refinando CTAs e gatilhos…' },
  { icon: '✨', label: 'Finalizando e revisando…' },
]

export function AILoadingOverlay({ show, steps = SCRIPT_STEPS, title = 'Gerando Roteiro' }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [dots, setDots]               = useState('')
  const [particles, setParticles]     = useState([])

  useEffect(() => {
    if (!show) { setCurrentStep(0); return }
    // Animate dots
    const dotsInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    // Cycle steps
    const stepInterval = setInterval(() => setCurrentStep(s => (s + 1) % steps.length), 2200)
    // Generate floating particles once
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 3,
    })))
    return () => { clearInterval(dotsInterval); clearInterval(stepInterval) }
  }, [show, steps.length])

  if (!show) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(9, 9, 11, 0.88)', backdropFilter: 'blur(12px)' }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.6; }
          50%  { transform: translateY(-30px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(70px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barFill {
          0%   { width: 5%; }
          100% { width: 85%; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ai-particle  { animation: floatUp var(--dur) var(--delay) ease-in infinite; }
        .ai-step-in   { animation: stepIn 0.4s ease both; }
        .ai-bar       { animation: barFill 12s ease-out forwards; }
        .ai-shimmer   {
          background: linear-gradient(90deg, #8B5CF6 0%, #CCFF00 40%, #8B5CF6 80%);
          background-size: 200% auto;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div key={p.id} className="ai-particle absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              '--dur': `${p.duration}s`, '--delay': `${p.delay}s`,
              background: p.id % 3 === 0 ? '#6366f1' : p.id % 3 === 1 ? '#a78bfa' : '#34d399',
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative flex flex-col items-center gap-8 px-12 py-10 rounded-3xl max-w-sm w-full mx-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Pulsing rings + icon */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute w-24 h-24 rounded-full border border-violet-500/30"
            style={{ animation: 'pulseRing 2s ease-out infinite' }} />
          <div className="absolute w-24 h-24 rounded-full border border-violet-500/20"
            style={{ animation: 'pulseRing 2s ease-out 0.6s infinite' }} />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: '#CCFF00', boxShadow: '0 0 40px rgba(204,255,0,0.35)' }}>
            🤖
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-white font-bold text-xl tracking-tight">{title}</h2>
          <p className="text-white/40 text-xs">Powered by IA · aguarde alguns segundos</p>
        </div>

        {/* Step indicator */}
        <div key={currentStep} className="ai-step-in flex items-center gap-3 px-4 py-3 rounded-xl w-full"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-xl shrink-0">{steps[currentStep].icon}</span>
          <span className="text-sm text-white/20">{steps[currentStep].label}<span className="text-violet-400">{dots}</span></span>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="ai-bar h-full rounded-full ai-shimmer" />
          </div>
          <div className="flex justify-between text-[10px] text-white/60">
            {steps.map((s, i) => (
              <span key={i} className={`transition-colors duration-500 ${i <= currentStep ? 'text-violet-400' : ''}`}>●</span>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

const SECTION_TYPES = [
  { value: 'intro',      label: 'Abertura',     color: 'bg-violet-500/15 text-violet-400 border-violet-200' },
  { value: 'product',    label: 'Produto',       color: 'bg-violet-500/12 text-violet-400 border-blue-200' },
  { value: 'comparison', label: 'Comparação',    color: 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20' },
  { value: 'pros_cons',  label: 'Prós/Contras',  color: 'bg-[#FFB800]/12 text-[#FFB800] border-[#FFB800]/20' },
  { value: 'demo',       label: 'Demo',          color: 'bg-[#FF6B2B]/12 text-[#FF6B2B] border-[#FF6B2B]/20' },
  { value: 'verdict',    label: 'Veredicto',     color: 'bg-[#00FFB9]/12 text-[#00FFB9] border-[#00FFB9]/20' },
  { value: 'cta',        label: 'CTA',           color: 'bg-[#FF3366]/12 text-[#FF3366] border-[#FF3366]/20' },
]

const typeColor = (type) =>
  SECTION_TYPES.find((t) => t.value === type)?.color ?? 'bg-[#0F0F16]/[0.05] text-white/60 border-white/[0.08]'

const typeLabel = (type) =>
  SECTION_TYPES.find((t) => t.value === type)?.label ?? type

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Blueprint Editor ──────────────────────────────────────────────────────────

function SectionRow({ section, index, total, onChange, onRemove, onMove }) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex flex-col gap-0.5 pt-2.5">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="p-0.5 text-white/25 hover:text-white/60 disabled:opacity-20"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="p-0.5 text-white/25 hover:text-white/60 disabled:opacity-20"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex-1 border border-white/[0.08] rounded-lg p-3 bg-[#0F0F16] space-y-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={section.type}
            onChange={(e) => onChange(index, { ...section, type: e.target.value })}
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${typeColor(section.type)}`}
            style={{ background: 'transparent' }}
          >
            {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="text"
            value={section.label}
            onChange={(e) => onChange(index, { ...section, label: e.target.value })}
            className="flex-1 min-w-0 text-sm font-medium text-white/80 border-0 focus:outline-none bg-transparent truncate"
            placeholder="Nome da seção"
          />
          <div className="flex items-center gap-1 text-xs text-white/35 shrink-0">
            <Clock size={11} />
            <input
              type="number"
              value={section.duration}
              onChange={(e) => onChange(index, { ...section, duration: parseInt(e.target.value) || 60 })}
              className="w-12 text-center border border-white/[0.08] rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              min={10}
              max={600}
            />
            <span>s</span>
          </div>
        </div>
        <input
          type="text"
          value={section.instructions}
          onChange={(e) => onChange(index, { ...section, instructions: e.target.value })}
          className="w-full text-xs text-white/40 border-0 focus:outline-none bg-transparent"
          placeholder="Instruções específicas para a IA nesta seção (opcional)"
        />
      </div>

      <button
        onClick={() => onRemove(index)}
        className="mt-2.5 p-1 text-white/25 hover:text-[#FF3366] transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function BlueprintEditor({ blueprint, onChange }) {
  const sections = blueprint.sections ?? []
  const totalDuration = sections.reduce((s, sec) => s + (sec.duration ?? 60), 0)

  function updateSection(idx, updated) {
    const next = [...sections]
    next[idx] = updated
    onChange({ ...blueprint, sections: next })
  }

  function removeSection(idx) {
    onChange({ ...blueprint, sections: sections.filter((_, i) => i !== idx) })
  }

  function moveSection(idx, dir) {
    const next = [...sections]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange({ ...blueprint, sections: next })
  }

  function addSection(type = 'product') {
    const count = sections.filter((s) => s.type === type).length
    onChange({
      ...blueprint,
      sections: [
        ...sections,
        { id: uid(), type, label: `${typeLabel(type)} #${count + 1}`, duration: 90, instructions: '' },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <input
            type="text"
            value={blueprint.name}
            onChange={(e) => onChange({ ...blueprint, name: e.target.value })}
            className="font-semibold text-white/80 text-base border-0 focus:outline-none bg-transparent w-full"
            placeholder="Nome do blueprint"
          />
          <input
            type="text"
            value={blueprint.description}
            onChange={(e) => onChange({ ...blueprint, description: e.target.value })}
            className="text-xs text-white/35 border-0 focus:outline-none bg-transparent w-full"
            placeholder="Descrição (opcional)"
          />
        </div>
        <div className="text-xs text-white/35 whitespace-nowrap">
          <Clock size={11} className="inline mr-1" />
          ~{Math.round(totalDuration / 60)} min · {sections.length} seções
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((sec, i) => (
          <SectionRow
            key={sec.id ?? i}
            section={sec}
            index={i}
            total={sections.length}
            onChange={updateSection}
            onRemove={removeSection}
            onMove={moveSection}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => addSection(t.value)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-violet-400 border border-dashed border-white/[0.08] hover:border-indigo-300 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus size={11} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Product Picker ─────────────────────────────────────────────────────────────

function ProductPicker({ selected, onToggle, maxSelect }) {
  const { data } = useApi('/mining/catalog')
  const products = data?.products ?? []
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  )

  const atLimit  = maxSelect != null && selected.length >= maxSelect
  const progress = maxSelect ? Math.round((selected.length / maxSelect) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {maxSelect ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              atLimit
                ? 'bg-indigo-600 text-white'
                : 'bg-[#0F0F16]/[0.05] text-white/60'
            }`}>
              {selected.length}/{maxSelect}
            </span>
          ) : (
            <span className="text-xs text-white/40">
              {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
            </span>
          )}
          {atLimit && (
            <span className="text-[10px] text-violet-400 font-medium">
              ✓ Seleção completa
            </span>
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
        />
      </div>

      {/* Progress bar (only when maxSelect is defined) */}
      {maxSelect && (
        <div className="h-1 w-full rounded-full bg-[#0F0F16]/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: atLimit
                ? 'linear-gradient(90deg, #8B5CF6, #CCFF00)'
                : '#c7d2fe',
            }}
          />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-xs text-white/35 py-6">
            {products.length === 0
              ? 'Nenhum produto no catálogo — execute uma mineração primeiro'
              : 'Nenhum produto encontrado'}
          </div>
        )}
        {filtered.map((p) => {
          const active   = selected.includes(p.id)
          const disabled = !active && atLimit
          return (
            <button
              key={p.id}
              onClick={() => !disabled && onToggle(p.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                active
                  ? 'border-indigo-500 bg-violet-500/10'
                  : disabled
                    ? 'border-gray-100 bg-[#0F0F16]/[0.03] opacity-40 cursor-not-allowed'
                    : 'border-white/[0.08] hover:border-indigo-200 bg-[#0F0F16]'
              }`}
            >
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                : <div className="w-8 h-8 rounded bg-[#0F0F16]/[0.05] shrink-0 flex items-center justify-center">
                    <Package size={14} className="text-white/25" />
                  </div>
              }
              <div className="overflow-hidden flex-1">
                <p className="font-medium text-white/70 truncate leading-tight">{p.title}</p>
                <p className="text-white/35">
                  {p.price ? `R$${Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  {p.rating ? ` · ${p.rating}★` : ''}
                </p>
              </div>
              {active && <Check size={12} className="ml-auto text-violet-400 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section Viewer Card ───────────────────────────────────────────────────────

function SectionCard({ section, index, scriptId, onUpdate }) {
  const [open, setOpen]           = useState(true)
  const [editing, setEditing]     = useState(false)
  const [content, setContent]     = useState(section.content ?? '')
  const [regen, setRegen]         = useState(false)
  const [regenInstr, setRegenInstr] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [saving, setSaving]       = useState(false)

  async function handleRegenerate() {
    setRegen(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/sections/${index}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: regenInstr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const updatedSection = data.sections?.[index]
      if (updatedSection) {
        setContent(updatedSection.content ?? '')
        onUpdate(data)
      }
      setShowRegenInput(false)
      setRegenInstr('')
    } catch (e) {
      alert(e.message)
    } finally {
      setRegen(false)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex: index, content }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEditing(false)
    } catch {
      // If PATCH not supported, just update local state
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(section.content ?? content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? 'border-white/[0.08]' : 'border-gray-100'}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-[#0F0F16] hover:bg-violet-500/10/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColor(section.type)}`}>
          {typeLabel(section.type)}
        </span>
        <span className="font-medium text-white/80 text-sm flex-1">{section.label}</span>
        {section.duration && (
          <span className="text-xs text-white/35 flex items-center gap-1">
            <Clock size={10} /> ~{Math.round(section.duration / 60 * 130)} palavras
          </span>
        )}
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            title="Copiar seção"
            className="p-1.5 text-white/35 hover:text-white/60 hover:bg-[#0F0F16]/[0.05] rounded transition-colors"
          >
            {copied ? <Check size={13} className="text-[#00FFB9]" /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => { setShowRegenInput((v) => !v); setOpen(true) }}
            title="Regenerar com IA"
            className="p-1.5 text-white/35 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-colors"
          >
            {regen ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
          <button
            onClick={() => { setEditing((e) => !e); setOpen(true) }}
            title="Editar manualmente"
            className={`p-1.5 rounded transition-colors ${editing ? 'text-violet-400 bg-violet-500/10' : 'text-white/35 hover:text-violet-400 hover:bg-violet-500/10'}`}
          >
            <Pencil size={13} />
          </button>
        </div>
        <ChevronDown size={14} className={`text-white/35 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Regen bar */}
      {showRegenInput && (
        <div className="px-4 pb-3 bg-violet-500/10 border-b border-indigo-100 flex gap-2">
          <input
            type="text"
            value={regenInstr}
            onChange={(e) => setRegenInstr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegenerate()}
            placeholder="Instruções para a IA (opcional)… ex: mais energia, adicionar emoji"
            className="flex-1 text-xs border border-indigo-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-[#0F0F16]"
            autoFocus
          />
          <button
            onClick={handleRegenerate}
            disabled={regen}
            className="btn-primary"
          >
            {regen ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Regerar
          </button>
          <button onClick={() => setShowRegenInput(false)} className="p-1.5 text-white/35 hover:text-white/60">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Body */}
      {open && (
        <div className="px-4 py-4 bg-[#0F0F16]/[0.03] border-t border-gray-100">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full text-sm text-white/70 font-mono border border-indigo-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-[#0F0F16] resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary py-1.5 px-3 text-xs">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {(section.content ?? content) || <span className="text-white/25 italic">Seção vazia — clique em regenerar para gerar com IA</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inline rename ─────────────────────────────────────────────────────────────

function InlineTitle({ scriptId, initialTitle, blueprintId, onRenamed }) {
  const display = initialTitle || blueprintId || 'Sem título'
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(display)
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  async function handleSave() {
    const title = draft.trim() || display
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) onRenamed?.(title)
    } catch {}
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="font-semibold text-white/80 text-sm border-b-2 border-indigo-400 focus:outline-none bg-transparent min-w-0 flex-1"
          autoFocus
        />
        <button onClick={handleSave} disabled={saving}
          className="p-1 text-[#00FFB9] hover:text-[#00FFB9] shrink-0">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-white/35 hover:text-white/60 shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setDraft(display); setEditing(true) }}
      className="group flex items-center gap-1.5 text-left min-w-0"
      title="Clique para renomear"
    >
      <span className="font-semibold text-white/80 truncate">{display}</span>
      <Pencil size={11} className="text-white/25 group-hover:text-violet-400 shrink-0 transition-colors" />
    </button>
  )
}

// ── Script Viewer ─────────────────────────────────────────────────────────────

function ScriptViewer({ script, onUpdate }) {
  const sections = script.sections ?? []
  const [copyAll,   setCopyAll]   = useState(false)
  const [rawMode,   setRawMode]   = useState(false)
  const [rawText,   setRawText]   = useState('')
  const [rawSaving, setRawSaving] = useState(false)
  const [title,     setTitle]     = useState(script.title || script.blueprintId || '')

  const fullText = sections.length > 0
    ? sections.map((s) => `[${s.label.toUpperCase()}]\n${s.content ?? ''}`).join('\n\n')
    : (script.text ?? '')

  function handleCopyAll() {
    navigator.clipboard.writeText(fullText)
    setCopyAll(true)
    setTimeout(() => setCopyAll(false), 2500)
  }

  function enterRaw() {
    setRawText(fullText)
    setRawMode(true)
  }

  async function handleSaveRaw() {
    setRawSaving(true)
    try {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const updated = await res.json()
      onUpdate?.({ ...script, ...updated, text: rawText })
      setRawMode(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setRawSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <InlineTitle
            scriptId={script.id}
            initialTitle={title}
            blueprintId={script.blueprintId}
            onRenamed={(t) => { setTitle(t); onUpdate?.({ ...script, title: t }) }}
          />
          <p className="text-xs text-white/35 mt-0.5">
            {sections.length} seções · {script.language?.toUpperCase()} · {timeAgo(script.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={rawMode ? () => setRawMode(false) : enterRaw}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              rawMode
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-white/40 hover:text-white/70 border-white/[0.08] hover:border-gray-300'
            }`}
          >
            <Pencil size={12} />
            {rawMode ? 'Seções' : 'Editar tudo'}
          </button>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copyAll ? <Check size={13} className="text-[#00FFB9]" /> : <Copy size={13} />}
            {copyAll ? 'Copiado!' : 'Copiar tudo'}
          </button>
        </div>
      </div>

      {/* Raw text editor */}
      {rawMode ? (
        <div className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={20}
            className="w-full text-sm text-white/70 font-mono border border-indigo-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-[#0F0F16] resize-y leading-relaxed"
            placeholder="Conteúdo do roteiro…"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setRawMode(false)}
              className="btn-ghost text-xs">
              Cancelar
            </button>
            <button onClick={handleSaveRaw} disabled={rawSaving}
              className="btn-primary py-1.5 text-xs">
              {rawSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Salvar alterações
            </button>
          </div>
        </div>
      ) : sections.length > 0 ? (
        sections.map((sec, i) => (
          <SectionCard
            key={sec.id ?? i}
            section={sec}
            index={i}
            scriptId={script.id}
            onUpdate={onUpdate}
          />
        ))
      ) : (
        <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#0F0F16] border border-white/[0.08] rounded-lg p-4 max-h-96 overflow-auto">
          {script.text}
        </pre>
      )}
    </div>
  )
}

// ── Script List Row ───────────────────────────────────────────────────────────

function ScriptListRow({ script, onSelect, isSelected, onRenamed }) {
  const sections = script.sections ?? []
  return (
    <tr
      className={`tr ${isSelected ? "bg-violet-500/10" : ""}`}
    >
      <td className="px-4 py-3 cursor-pointer" onClick={() => onSelect(script)}>
        <div className="max-w-xs" onClick={(e) => e.stopPropagation()}>
          <InlineTitle
            scriptId={script.id}
            initialTitle={script.title}
            blueprintId={script.blueprintId}
            onRenamed={(t) => onRenamed?.(script.id, t)}
          />
        </div>
        <div className="text-xs text-white/35 mt-0.5 flex items-center gap-1.5">
          <Layers size={10} />
          {sections.length > 0 ? `${sections.length} seções` : 'roteiro completo'}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-white/40 uppercase">{script.language}</td>
      <td className="px-4 py-3 text-xs font-semibold text-violet-400">{script.confidence}%</td>
      <td className="px-4 py-3 text-xs text-white/35">{timeAgo(script.createdAt)}</td>
      <td className="px-4 py-3">
        <ChevronRight size={14} className={`text-white/25 transition-transform ${isSelected ? 'rotate-90 text-violet-400' : ''}`} />
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── How many products each template type requires ─────────────────────────────
const PRODUCT_LIMITS = {
  'top-5-custo-beneficio': 5,
  'comparacao-1x1':        2,
  'review-detalhado':      1,
}

const STANDARD_TYPES = [
  {
    id:    'top-5-custo-beneficio',
    name:  'Top 5 Custo-Benefício',
    icon:  '🏆',
    desc:  '5 produtos ranqueados do pior ao melhor custo-benefício',
    sections: [
      { id: uid(), type: 'intro',   label: 'Abertura',                    duration: 60,  instructions: 'Hook forte com a promessa de revelar os 5 melhores produtos custo-benefício.' },
      { id: uid(), type: 'product', label: 'Critérios de Seleção',        duration: 45,  instructions: 'Explique brevemente os critérios usados para ranquear os produtos.' },
      { id: uid(), type: 'product', label: 'Produto #5',                  duration: 90,  instructions: 'Apresente o produto, preço, pontos positivos e para quem vale.' },
      { id: uid(), type: 'product', label: 'Produto #4',                  duration: 90,  instructions: 'Apresente o produto, destaque o diferencial em relação ao #5.' },
      { id: uid(), type: 'product', label: 'Produto #3',                  duration: 120, instructions: 'Análise mais detalhada, prós e contras principais.' },
      { id: uid(), type: 'product', label: 'Produto #2',                  duration: 120, instructions: 'Análise detalhada, por que quase chegou ao topo.' },
      { id: uid(), type: 'product', label: 'Produto #1 — Melhor Escolha', duration: 150, instructions: 'O campeão: análise completa, por que é o melhor custo-benefício.' },
      { id: uid(), type: 'cta',     label: 'CTA Final',                   duration: 45,  instructions: 'Convite para se inscrever, ativar notificações e acessar os links na descrição.' },
    ],
  },
  {
    id:    'comparacao-1x1',
    name:  'Comparação 1x1',
    icon:  '⚔️',
    desc:  'Dois produtos frente a frente com veredicto final',
    sections: [
      { id: uid(), type: 'intro',      label: 'Abertura',               duration: 60,  instructions: 'Hook: qual dos dois você escolheria? Crie suspense.' },
      { id: uid(), type: 'product',    label: 'Apresentação dos Dois',  duration: 90,  instructions: 'Apresente ambos os produtos, preços e posicionamento de mercado.' },
      { id: uid(), type: 'comparison', label: 'Design e Construção',    duration: 90,  instructions: 'Compare qualidade de materiais, ergonomia e acabamento.' },
      { id: uid(), type: 'comparison', label: 'Performance e Recursos', duration: 120, instructions: 'Compare funcionalidades, testes práticos e resultados.' },
      { id: uid(), type: 'pros_cons',  label: 'Custo-Benefício',        duration: 90,  instructions: 'Compare preço vs valor entregue por cada um.' },
      { id: uid(), type: 'verdict',    label: 'Veredicto Final',        duration: 75,  instructions: 'Declare o vencedor e para quem cada um é indicado.' },
      { id: uid(), type: 'cta',        label: 'CTA Final',              duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
  {
    id:    'review-detalhado',
    name:  'Review Detalhado',
    icon:  '🔍',
    desc:  'Análise aprofundada de um único produto',
    sections: [
      { id: uid(), type: 'intro',    label: 'Abertura',                 duration: 60,  instructions: 'Hook com a principal dor que o produto resolve.' },
      { id: uid(), type: 'product',  label: 'Visão Geral',              duration: 90,  instructions: 'O que é, para quem é, posicionamento de preço no mercado.' },
      { id: uid(), type: 'product',  label: 'Unboxing e Design',        duration: 90,  instructions: 'Materiais, acabamento, o que vem na caixa, primeiras impressões.' },
      { id: uid(), type: 'demo',     label: 'Funcionalidades e Testes', duration: 150, instructions: 'Teste prático de cada função principal, resultados reais.' },
      { id: uid(), type: 'pros_cons', label: 'Prós e Contras',          duration: 90,  instructions: 'Lista honesta de pontos positivos e negativos.' },
      { id: uid(), type: 'verdict',  label: 'Para Quem Vale a Pena?',   duration: 60,  instructions: 'Perfil do comprador ideal, alternativas e faixa de preço justa.' },
      { id: uid(), type: 'cta',      label: 'CTA Final',                duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
]

const DEFAULT_BLUEPRINT = {
  id: null,
  ...STANDARD_TYPES[0],
}

export default function Scripts() {
  const { data: scriptsData, refetch } = useApi('/scripts')
  const scripts = scriptsData?.scripts ?? []

  // blueprints from DB
  const { data: bpData, refetch: refetchBp } = useApi('/blueprints')
  const dbBlueprints = bpData?.blueprints ?? []

  const [view, setView]               = useState('generate')   // 'generate' | 'blueprints'
  const [selectedScript, setSelected] = useState(null)
  const [activeTypeId, setActiveTypeId] = useState(STANDARD_TYPES[0].id)
  const [blueprint, setBlueprint]     = useState(DEFAULT_BLUEPRINT)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [language, setLanguage]       = useState('pt')
  const [generating, setGenerating]   = useState(false)
  const [savingBp, setSavingBp]       = useState(false)
  const [error, setError]             = useState(null)
  const [activeDbBp, setActiveDbBp]   = useState(null)

  // Max products allowed for the active blueprint type
  const productLimit = activeTypeId ? (PRODUCT_LIMITS[activeTypeId] ?? null) : null

  function selectType(typeId) {
    const t = STANDARD_TYPES.find(t => t.id === typeId)
    if (!t) return
    setActiveTypeId(typeId)
    setActiveDbBp(null)
    setSelectedProducts([])   // clear selection when type changes
    // refresh section ids so they're unique
    setBlueprint({ id: null, name: t.name, desc: t.desc, sections: t.sections.map(s => ({ ...s, id: uid() })) })
  }

  function toggleProduct(id) {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (productLimit != null && prev.length >= productLimit) return prev  // enforce limit
      return [...prev, id]
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintData: blueprint,
          productIds:    selectedProducts,
          language,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch()
      setSelected(data)
      setView('generate')
    } catch (e) {
      console.error("[scripts]", e.message); setError(friendlyError(e.message))
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveBlueprint() {
    setSavingBp(true)
    try {
      const method = blueprint.id ? 'PUT' : 'POST'
      const url    = blueprint.id ? `/api/blueprints/${blueprint.id}` : '/api/blueprints'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blueprint),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setBlueprint(data)
      setActiveDbBp(data.id)
      await refetchBp()
    } catch (e) {
      console.error("[scripts]", e.message); setError(friendlyError(e.message))
    } finally {
      setSavingBp(false)
    }
  }

  async function handleDeleteBlueprint(id) {
    if (!confirm('Excluir este blueprint?')) return
    await fetch(`/api/blueprints/${id}`, { method: 'DELETE' })
    await refetchBp()
    if (activeDbBp === id) {
      setBlueprint(DEFAULT_BLUEPRINT)
      setActiveDbBp(null)
    }
  }

  function handleScriptUpdate(updated) {
    setSelected(updated)
    refetch()
  }

  function handleScriptRenamed(scriptId, newTitle) {
    // Optimistically update list without full refetch
    refetch()
    if (selectedScript?.id === scriptId) setSelected((s) => s ? { ...s, title: newTitle } : s)
  }

  const totalDuration = blueprint.sections?.reduce((s, sec) => s + (sec.duration ?? 60), 0) ?? 0

  // Generate is only allowed when the right number of products are selected
  const canGenerate = productLimit == null
    ? true
    : selectedProducts.length === productLimit

  return (
    <div className="animate-fade-up">
      <AILoadingOverlay show={generating} title="Gerando Roteiro" />
      <PageHeader
        overline="Pipeline"
        title="Roteiros"
        description="Crie roteiros estruturados com blueprints personalizados e edição por seção"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setView(view === 'blueprints' ? 'generate' : 'blueprints')}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                view === 'blueprints'
                  ? 'bg-[#0F0F16] text-white border-white/[0.06]'
                  : 'border-white/[0.08] text-white/60 hover:border-gray-300 bg-[#0F0F16]'
              }`}
            >
              <BookTemplate size={15} />
              Blueprints
            </button>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleGenerate}
                disabled={generating || !canGenerate}
                className="btn-primary"
                title={!canGenerate ? `Selecione ${productLimit} produto${productLimit !== 1 ? 's' : ''} para continuar` : ''}
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                {generating ? 'Gerando…' : 'Gerar Roteiro'}
              </button>
              {!canGenerate && productLimit != null && (
                <p className="text-[10px] text-[#FFB800] font-medium">
                  {selectedProducts.length}/{productLimit} produto{productLimit !== 1 ? 's' : ''} selecionado{selectedProducts.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        }
      />

      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Config panel */}
        <div className="col-span-2 space-y-4">

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {STANDARD_TYPES.map(t => (
              <button key={t.id} onClick={() => selectType(t.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  activeTypeId === t.id && !activeDbBp
                    ? 'border-indigo-500 bg-violet-500/10'
                    : 'border-white/[0.08] bg-[#0F0F16] hover:border-indigo-300'
                }`}>
                <div className="text-lg mb-1">{t.icon}</div>
                <div className="text-xs font-semibold text-white/80 leading-tight">{t.name}</div>
                <div className="text-[10px] text-white/35 mt-0.5 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Blueprint panel */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="card-title flex items-center gap-2">
                <Layers size={14} className="text-violet-400" />
                Blueprint
              </h3>
              <div className="flex gap-2 items-center">
                {dbBlueprints.length > 0 && (
                  <select
                    value={activeDbBp ?? ''}
                    onChange={(e) => {
                      const bp = dbBlueprints.find((b) => b.id === e.target.value)
                      if (bp) { setBlueprint(bp); setActiveDbBp(bp.id); setActiveTypeId(null) }
                      else { selectType(STANDARD_TYPES[0].id) }
                    }}
                    className="text-xs border border-white/[0.08] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white/60"
                  >
                    <option value="">Padrão</option>
                    {dbBlueprints.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                <button
                  onClick={handleSaveBlueprint}
                  disabled={savingBp}
                  className="text-xs text-violet-400 hover:text-violet-400 font-medium flex items-center gap-1"
                >
                  {savingBp ? <Loader2 size={11} className="animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
            <div className="p-4">
              <BlueprintEditor blueprint={blueprint} onChange={setBlueprint} />
            </div>
          </div>

          {/* Language */}
          <div className="card p-4 space-y-3">
            <h3 className="card-title">Idioma</h3>
            <div className="flex gap-2">
              {[{ v: 'pt', l: 'Português' }, { v: 'en', l: 'English' }, { v: 'es', l: 'Español' }].map((lang) => (
                <button
                  key={lang.v}
                  onClick={() => setLanguage(lang.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    language === lang.v
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-white/[0.08] text-white/60 hover:border-indigo-300'
                  }`}
                >
                  {lang.l}
                </button>
              ))}
            </div>
          </div>

          {/* Product picker */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-violet-400" />
              <h3 className="card-title">Produtos</h3>
              {productLimit && (
                <span className="ml-auto text-[10px] text-white/35 font-medium">
                  Selecione exatamente {productLimit} produto{productLimit !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ProductPicker
              selected={selectedProducts}
              onToggle={toggleProduct}
              maxSelect={productLimit}
            />
          </div>
        </div>

        {/* Right: Blueprints manager OR Script viewer + list */}
        <div className="col-span-3 space-y-4">
          {view === 'blueprints' ? (
            /* ── Blueprints panel ── */
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <BookTemplate size={15} className="text-violet-400" />
                <h3 className="card-title">Blueprints Salvos</h3>
                <span className="ml-auto text-xs text-white/35">{dbBlueprints.length} total</span>
              </div>
              {dbBlueprints.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <BookTemplate size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-sm font-medium text-white/40">Nenhum blueprint salvo ainda</p>
                  <p className="text-xs text-white/35 mt-1">Configure um blueprint e clique em <strong>Salvar</strong> para reutilizá-lo depois.</p>
                  <button onClick={() => setView('generate')} className="mt-4 text-xs text-violet-400 hover:text-violet-400 font-medium">
                    ← Voltar para Geração
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {dbBlueprints.map((bp) => (
                    <div key={bp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-violet-500/10/40 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Layers size={15} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white/80 text-sm truncate">{bp.name}</p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {bp.sections?.length ?? 0} seções
                          {bp.description ? ` · ${bp.description}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setBlueprint(bp); setActiveDbBp(bp.id); setActiveTypeId(null); setView('generate') }}
                          className="text-xs text-violet-400 hover:text-violet-400 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-violet-500/10 transition-colors"
                        >
                          Usar
                        </button>
                        <button
                          onClick={() => handleDeleteBlueprint(bp.id)}
                          className="p-1.5 text-white/25 hover:text-[#FF3366] rounded-lg hover:bg-[#FF3366]/8 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected script viewer */}
              {selectedScript && (
                <div className="card p-5 border-indigo-200">
                  <ScriptViewer script={selectedScript} onUpdate={handleScriptUpdate} />
                </div>
              )}

              {/* Scripts list */}
              <div className="card">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <FileText size={15} className="text-white/35" />
                  <h3 className="card-title">Roteiros</h3>
                  <span className="ml-auto text-xs text-white/35">{scripts.length} total</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="th">Título / Blueprint</th>
                      <th className="th">Idioma</th>
                      <th className="th">Score</th>
                      <th className="th">Criado</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scripts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-white/35 text-sm">
                          Nenhum roteiro ainda — configure o blueprint e gere o primeiro acima.
                        </td>
                      </tr>
                    ) : (
                      scripts.map((s) => (
                        <ScriptListRow
                          key={s.id}
                          script={s}
                          isSelected={selectedScript?.id === s.id}
                          onSelect={(script) => setSelected((prev) => prev?.id === script.id ? null : script)}
                          onRenamed={handleScriptRenamed}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
