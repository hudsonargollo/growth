import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText, Plus, Trash2, ChevronUp, ChevronDown,
  Pencil, RefreshCw, Copy, Check, X,
  Loader2, BookTemplate, Package, Clock,
  Layers, ChevronDown as ChevronDownIcon, Zap,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'

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
    const dotsInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    const stepInterval = setInterval(() => setCurrentStep(s => (s + 1) % steps.length), 2200)
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

      <div className="relative flex flex-col items-center gap-8 px-12 py-10 rounded-3xl max-w-sm w-full mx-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
        <div className="text-center space-y-1">
          <h2 className="text-white font-bold text-xl tracking-tight">{title}</h2>
          <p className="text-white/40 text-xs">Powered by IA · aguarde alguns segundos</p>
        </div>
        <div key={currentStep} className="ai-step-in flex items-center gap-3 px-4 py-3 rounded-xl w-full"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-xl shrink-0">{steps[currentStep].icon}</span>
          <span className="text-sm text-white/60">{steps[currentStep].label}<span className="text-violet-400">{dots}</span></span>
        </div>
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

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_TYPES = [
  { value: 'intro',      label: 'Abertura',    color: 'rgba(139,92,246,0.15)',  text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  { value: 'product',    label: 'Produto',     color: 'rgba(99,102,241,0.12)',  text: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  { value: 'comparison', label: 'Comparação',  color: 'rgba(0,212,255,0.10)',   text: '#00D4FF', border: 'rgba(0,212,255,0.25)' },
  { value: 'pros_cons',  label: 'Prós/Contras',color: 'rgba(255,184,0,0.10)',   text: '#FFB800', border: 'rgba(255,184,0,0.25)' },
  { value: 'demo',       label: 'Demo',        color: 'rgba(255,107,43,0.10)',  text: '#FF6B2B', border: 'rgba(255,107,43,0.25)' },
  { value: 'verdict',    label: 'Veredicto',   color: 'rgba(0,255,185,0.10)',   text: '#00FFB9', border: 'rgba(0,255,185,0.25)' },
  { value: 'cta',        label: 'CTA',         color: 'rgba(255,51,102,0.10)',  text: '#FF3366', border: 'rgba(255,51,102,0.25)' },
]

const getSectionStyle = (type) =>
  SECTION_TYPES.find(t => t.value === type) ?? { color: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' }

const typeLabel = (type) =>
  SECTION_TYPES.find(t => t.value === type)?.label ?? type

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Blueprint Editor ──────────────────────────────────────────────────────────

function SectionRow({ section, index, total, onChange, onRemove, onMove }) {
  const style       = getSectionStyle(section.type)
  const [open, setOpen] = useState(false)
  const taRef       = useRef(null)

  // auto-resize textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = taRef.current.scrollHeight + 'px'
    }
  }, [section.instructions, open])

  const hasPrompt = (section.instructions ?? '').trim().length > 0

  return (
    <div className="flex items-start gap-2 group">
      {/* reorder arrows */}
      <div className="flex flex-col gap-0.5 pt-2.5 shrink-0">
        <button onClick={() => onMove(index, -1)} disabled={index === 0}
          className="p-0.5 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
          <ChevronUp size={12} />
        </button>
        <button onClick={() => onMove(index, 1)} disabled={index === total - 1}
          className="p-0.5 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
          <ChevronDown size={12} />
        </button>
      </div>

      <div className="flex-1 min-w-0 rounded-lg overflow-hidden"
        style={{ border: `1px solid ${style.border}`, background: style.color }}>

        {/* ── top row: type · label · duration ── */}
        <div className="flex items-center gap-2 px-3 py-2">
          <select
            value={section.type}
            onChange={(e) => onChange(index, { ...section, type: e.target.value })}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full cursor-pointer focus:outline-none"
            style={{ background: 'rgba(0,0,0,0.3)', color: style.text, border: `1px solid ${style.border}` }}
          >
            {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="text"
            value={section.label}
            onChange={(e) => onChange(index, { ...section, label: e.target.value })}
            className="flex-1 min-w-0 text-xs font-semibold text-white/75 border-0 focus:outline-none bg-transparent"
            placeholder="Nome da seção"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Clock size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="number"
              value={section.duration}
              onChange={(e) => onChange(index, { ...section, duration: parseInt(e.target.value) || 60 })}
              className="w-10 text-center text-[11px] text-white/50 focus:outline-none bg-transparent border-0"
              min={10} max={600}
            />
            <span className="text-[10px] text-white/30">s</span>
          </div>
        </div>

        {/* ── prompt toggle row ── */}
        <div className="border-t mx-0" style={{ borderColor: `${style.border}55` }}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: hasPrompt ? style.text : 'rgba(255,255,255,0.22)' }}>
              {hasPrompt ? '✦ Prompt' : '+ Prompt da seção'}
            </span>
            {hasPrompt && (
              <span className="text-[9px] text-white/25 flex-1 truncate">
                {section.instructions.slice(0, 60)}{section.instructions.length > 60 ? '…' : ''}
              </span>
            )}
            <ChevronDown size={11}
              style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0,
                transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
          </button>

          {open && (
            <div className="px-3 pb-3">
              <textarea
                ref={taRef}
                value={section.instructions ?? ''}
                onChange={(e) => onChange(index, { ...section, instructions: e.target.value })}
                placeholder={`Escreva o prompt completo para a IA gerar esta seção.\n\nEx: Revele um fato surpreendente sobre o produto #1 na primeira frase...`}
                rows={3}
                className="w-full text-[11.5px] text-white/70 focus:outline-none bg-transparent border-0 resize-none leading-relaxed placeholder:text-white/20"
                style={{ minHeight: 56 }}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-white/20">
                  {(section.instructions ?? '').trim().split(/\s+/).filter(Boolean).length} palavras
                </span>
                {hasPrompt && (
                  <button
                    type="button"
                    onClick={() => onChange(index, { ...section, instructions: '' })}
                    className="text-[10px] text-white/20 hover:text-[#FF3366] transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => onRemove(index)}
        className="mt-2 p-1 text-white/20 hover:text-[#FF3366] transition-colors opacity-0 group-hover:opacity-100 shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

function BlueprintEditor({ blueprint, onChange }) {
  const sections      = blueprint.sections ?? []
  const totalDuration = sections.reduce((s, sec) => s + (sec.duration ?? 60), 0)

  function updateSection(idx, updated) {
    const next = [...sections]; next[idx] = updated
    onChange({ ...blueprint, sections: next })
  }
  function removeSection(idx) {
    onChange({ ...blueprint, sections: sections.filter((_, i) => i !== idx) })
  }
  function moveSection(idx, dir) {
    const next = [...sections]; const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange({ ...blueprint, sections: next })
  }
  function addSection(type = 'product') {
    const count = sections.filter(s => s.type === type).length
    onChange({
      ...blueprint,
      sections: [...sections, { id: uid(), type, label: `${typeLabel(type)} #${count + 1}`, duration: 90, instructions: '' }],
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input type="text" value={blueprint.name}
            onChange={(e) => onChange({ ...blueprint, name: e.target.value })}
            className="font-semibold text-white/80 text-sm border-0 focus:outline-none bg-transparent w-full"
            placeholder="Nome do blueprint" />
          <input type="text" value={blueprint.description}
            onChange={(e) => onChange({ ...blueprint, description: e.target.value })}
            className="text-[11px] text-white/30 border-0 focus:outline-none bg-transparent w-full mt-0.5"
            placeholder="Descrição (opcional)" />
        </div>
        <span className="text-[10px] text-white/30 whitespace-nowrap shrink-0">
          ~{Math.round(totalDuration / 60)} min · {sections.length} seções
        </span>
      </div>

      <div className="space-y-1.5">
        {sections.map((sec, i) => (
          <SectionRow key={sec.id ?? i} section={sec} index={i} total={sections.length}
            onChange={updateSection} onRemove={removeSection} onMove={moveSection} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {SECTION_TYPES.map(t => (
          <button key={t.value} onClick={() => addSection(t.value)}
            className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 border border-dashed border-white/[0.08] hover:border-white/20 px-2 py-1 rounded-lg transition-colors">
            <Plus size={10} />{t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Product Picker ────────────────────────────────────────────────────────────

function ProductPicker({ selected, onToggle, maxSelect }) {
  const { data } = useApi('/mining/catalog')
  const products  = data?.products ?? []
  const [search, setSearch] = useState('')

  const filtered = products.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
  const atLimit  = maxSelect != null && selected.length >= maxSelect

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {maxSelect ? (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${
              atLimit ? 'bg-[#CCFF00]/15 text-[#CCFF00]' : 'bg-white/[0.05] text-white/40'
            }`}>
              {selected.length}/{maxSelect}
            </span>
          ) : (
            <span className="text-xs text-white/35">{selected.length} selecionado{selected.length !== 1 ? 's' : ''}</span>
          )}
          {atLimit && <span className="text-[10px] text-[#CCFF00] font-semibold">✓ Completo</span>}
        </div>
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto…"
          className="border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#8B5CF6]/50 w-36 bg-transparent text-white/70"
        />
      </div>

      {maxSelect && (
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.round((selected.length / maxSelect) * 100)}%`,
              background: atLimit ? 'linear-gradient(90deg,#8B5CF6,#CCFF00)' : '#8B5CF6',
            }} />
        </div>
      )}

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <div className="text-center text-xs text-white/30 py-6 rounded-xl border border-dashed border-white/[0.07]">
            {products.length === 0 ? 'Execute uma mineração primeiro para ver produtos' : 'Nenhum produto encontrado'}
          </div>
        )}
        {filtered.map(p => {
          const active   = selected.includes(p.id)
          const disabled = !active && atLimit
          return (
            <button key={p.id} onClick={() => !disabled && onToggle(p.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                active
                  ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/[0.10]'
                  : disabled
                    ? 'border-white/[0.05] opacity-35 cursor-not-allowed'
                    : 'border-white/[0.07] hover:border-white/15 hover:bg-white/[0.03]'
              }`}
              style={{ background: active ? 'rgba(139,92,246,0.08)' : undefined }}
            >
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                : <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Package size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/75 truncate leading-tight">{p.title}</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {p.price ? `R$${Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  {p.rating ? ` · ${p.rating}★` : ''}
                </p>
              </div>
              {active && (
                <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: '#8B5CF6' }}>
                  <Check size={9} style={{ color: '#fff' }} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section Card (viewer) ─────────────────────────────────────────────────────

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function SectionCard({ section, index, total, scriptId, onUpdate }) {
  const [open, setOpen]             = useState(true)
  const [editing, setEditing]       = useState(false)
  const [content, setContent]       = useState(section.content ?? '')
  const [regen, setRegen]           = useState(false)
  const [regenInstr, setRegenInstr] = useState('')
  const [showRegen, setShowRegen]   = useState(false)
  const [copied, setCopied]         = useState(false)
  const [saving, setSaving]         = useState(false)
  const textareaRef                 = useRef(null)
  const sty = getSectionStyle(section.type)
  const text = section.content ?? content
  const wc   = wordCount(text)

  // auto-resize textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing, content])

  async function handleRegenerate() {
    setRegen(true)
    try {
      const res  = await fetch(`/api/scripts/${scriptId}/sections/${index}/regenerate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: regenInstr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const updated = data.sections?.[index]
      if (updated) { setContent(updated.content ?? ''); onUpdate(data) }
      setShowRegen(false); setRegenInstr('')
    } catch (e) { alert(e.message) } finally { setRegen(false) }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex: index, content }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEditing(false)
    } catch { setEditing(false) } finally { setSaving(false) }
  }

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden transition-all"
      style={{
        borderRadius: 14,
        border: `1px solid ${open ? sty.border : 'rgba(255,255,255,0.05)'}`,
        background: open ? `${sty.color}` : 'rgba(255,255,255,0.015)',
      }}>

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: sty.text, opacity: open ? 0.7 : 0.25 }} />

      {/* Header */}
      <div className="flex items-center gap-3 pl-5 pr-3 py-3 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}>

        {/* Index badge */}
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
          style={{ background: open ? sty.text : 'rgba(255,255,255,0.08)', color: open ? '#07070B' : 'rgba(255,255,255,0.3)' }}>
          {index + 1}
        </span>

        {/* Type tag */}
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(0,0,0,0.30)', color: sty.text, border: `1px solid ${sty.border}` }}>
          {typeLabel(section.type)}
        </span>

        {/* Label */}
        <span className="text-sm font-semibold text-white/80 flex-1 truncate">{section.label}</span>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
          {wc > 0 && (
            <span className="text-[10px] text-white/25 hidden sm:block">{wc} palavras</span>
          )}
          {/* Action buttons */}
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button onClick={handleCopy} title="Copiar"
              className="p-1.5 rounded-lg transition-colors text-white/25 hover:text-white/60 hover:bg-white/[0.05]">
              {copied ? <Check size={12} style={{ color: '#00FFB9' }} /> : <Copy size={12} />}
            </button>
            <button
              onClick={() => { setShowRegen(v => !v); setEditing(false); setOpen(true) }}
              title="Regenerar com IA"
              className={`p-1.5 rounded-lg transition-colors ${showRegen ? 'text-violet-400 bg-violet-500/[0.12]' : 'text-white/25 hover:text-violet-400 hover:bg-violet-500/[0.08]'}`}>
              {regen ? <Loader2 size={12} className="animate-spin text-violet-400" /> : <RefreshCw size={12} />}
            </button>
            <button
              onClick={() => { setEditing(e => !e); setShowRegen(false); setOpen(true) }}
              title="Editar"
              className={`p-1.5 rounded-lg transition-colors ${editing ? 'text-[#CCFF00] bg-[#CCFF00]/[0.10]' : 'text-white/25 hover:text-[#CCFF00] hover:bg-[#CCFF00]/[0.06]'}`}>
              <Pencil size={12} />
            </button>
          </div>
          <ChevronDownIcon size={13} className="transition-transform text-white/20"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
      </div>

      {/* Regen panel */}
      {showRegen && (
        <div className="pl-5 pr-3 pb-3 space-y-2">
          <div className="flex gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-wide">Instruções para IA (opcional)</p>
              <input
                type="text" value={regenInstr}
                onChange={e => setRegenInstr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !regen && handleRegenerate()}
                placeholder="ex: mais energia, adicionar dados, reduzir para 30s…"
                className="w-full text-xs bg-transparent border-0 focus:outline-none text-white/60 placeholder-white/25"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button onClick={handleRegenerate} disabled={regen}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap"
                style={{ background: regen ? 'rgba(139,92,246,0.4)' : '#8B5CF6', color: '#fff' }}>
                {regen ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {regen ? 'Gerando…' : 'Regerar'}
              </button>
              <button onClick={() => setShowRegen(false)}
                className="text-[10px] text-white/25 hover:text-white/50 text-center transition-colors">
                Cancelar
              </button>
            </div>
          </div>
          {regen && (
            <div className="flex items-center gap-2 text-xs text-violet-400/60 px-1">
              <Loader2 size={11} className="animate-spin" />
              Reescrevendo seção com IA…
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {open && !showRegen && (
        <div className="pl-5 pr-4 pb-4"
          style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          {editing ? (
            <div className="pt-3 space-y-2.5">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => {
                  setContent(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                className="w-full text-sm text-white/70 font-mono border border-white/[0.10] rounded-xl p-4 focus:outline-none resize-none leading-7 transition-colors"
                style={{ background: 'rgba(0,0,0,0.25)', minHeight: 160, borderColor: 'rgba(204,255,0,0.20)' }}
                placeholder="Conteúdo da seção…"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/25">{wordCount(content)} palavras</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(false); setContent(section.content ?? '') }}
                    className="text-xs text-white/35 hover:text-white/60 px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors">
                    Descartar
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: '#CCFF00', color: '#07070B' }}>
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-3">
              {text ? (
                <p className="text-sm text-white/65 whitespace-pre-wrap leading-7">{text}</p>
              ) : (
                <div className="flex items-center gap-3 py-4 px-3 rounded-xl"
                  style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <RefreshCw size={14} style={{ color: 'rgba(255,255,255,0.20)' }} />
                  <p className="text-xs text-white/25 italic">
                    Seção vazia — clique em <span style={{ color: sty.text }}>↻ Regenerar</span> para gerar com IA
                  </p>
                </div>
              )}
            </div>
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
  const [draft, setDraft]     = useState(display)
  const [saving, setSaving]   = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  async function handleSave() {
    const title = draft.trim() || display
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) onRenamed?.(title)
    } catch {}
    setSaving(false); setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="font-semibold text-white/80 text-sm border-b-2 border-[#8B5CF6]/60 focus:outline-none bg-transparent min-w-0 flex-1" />
        <button onClick={handleSave} disabled={saving} className="p-1 text-[#00FFB9] shrink-0">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-white/30 hover:text-white/60 shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => { setDraft(display); setEditing(true) }}
      className="group flex items-center gap-1.5 text-left min-w-0" title="Clique para renomear">
      <span className="font-semibold text-white/80 truncate text-sm">{display}</span>
      <Pencil size={10} className="text-white/20 group-hover:text-violet-400 shrink-0 transition-colors" />
    </button>
  )
}

// ── Script Viewer ─────────────────────────────────────────────────────────────

function ScriptViewer({ script, onUpdate, onClose }) {
  const sections = script.sections ?? []
  const [copyAll, setCopyAll]   = useState(false)
  const [rawMode, setRawMode]   = useState(false)
  const [rawText, setRawText]   = useState('')
  const [rawSaving, setRawSaving] = useState(false)
  const [title, setTitle]       = useState(script.title || script.blueprintId || '')

  const fullText = sections.length > 0
    ? sections.map(s => `[${s.label.toUpperCase()}]\n${s.content ?? ''}`).join('\n\n')
    : (script.text ?? '')
  const totalWords = wordCount(fullText)

  function handleCopyAll() {
    navigator.clipboard.writeText(fullText)
    setCopyAll(true); setTimeout(() => setCopyAll(false), 2500)
  }

  async function handleSaveRaw() {
    setRawSaving(true)
    try {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const updated = await res.json()
      onUpdate?.({ ...script, ...updated, text: rawText }); setRawMode(false)
    } catch (e) { alert(e.message) } finally { setRawSaving(false) }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.04)' }}>

      {/* Viewer header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <InlineTitle scriptId={script.id} initialTitle={title} blueprintId={script.blueprintId}
            onRenamed={t => { setTitle(t); onUpdate?.({ ...script, title: t }) }} />
          <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1.5">
            <span>{sections.length} seções</span>
            {totalWords > 0 && <><span>·</span><span>{totalWords} palavras</span></>}
            <span>·</span><span>{script.language?.toUpperCase()}</span>
            <span>·</span><span>{timeAgo(script.createdAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={rawMode ? () => setRawMode(false) : () => { setRawText(fullText); setRawMode(true) }}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
              rawMode ? 'bg-violet-600 text-white border-violet-600' : 'text-white/40 hover:text-white/70 border-white/[0.08]'
            }`}>
            <Pencil size={11} />{rawMode ? 'Seções' : 'Editar tudo'}
          </button>
          <button onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/[0.08] px-2.5 py-1.5 rounded-lg transition-colors">
            {copyAll ? <Check size={11} style={{ color: '#00FFB9' }} /> : <Copy size={11} />}
            {copyAll ? 'Copiado!' : 'Copiar tudo'}
          </button>
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 text-white/20 hover:text-white/60 rounded-lg hover:bg-white/[0.05] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-2.5">
        {rawMode ? (
          <div className="space-y-2">
            <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={20}
              className="w-full text-sm text-white/65 font-mono border border-white/[0.10] rounded-xl p-4 focus:outline-none focus:border-violet-500/40 bg-[#0A0A10] resize-y leading-relaxed" />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setRawMode(false)}
                className="text-xs text-white/40 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:text-white/60 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveRaw} disabled={rawSaving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#8B5CF6', color: '#fff' }}>
                {rawSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Salvar alterações
              </button>
            </div>
          </div>
        ) : sections.length > 0 ? (
          sections.map((sec, i) => (
            <SectionCard key={sec.id ?? i} section={sec} index={i} total={sections.length} scriptId={script.id} onUpdate={onUpdate} />
          ))
        ) : (
          <pre className="text-xs text-white/65 whitespace-pre-wrap font-mono rounded-xl p-4 max-h-96 overflow-auto"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {script.text}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── Script History Card ───────────────────────────────────────────────────────

function ScriptHistoryCard({ script, isSelected, onSelect, onRenamed, checked, onCheck, onDelete, onGenerateShorts, generatingShorts }) {
  const sections = script.sections ?? []
  const isLongform = (script.videoType ?? 'longform') === 'longform'
  const isShort    = script.videoType === 'short'
  const hasProducts = sections.some(s => s.type === 'product')
  const isGenerating = generatingShorts === script.id

  return (
    <div className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
      isSelected
        ? 'border-[#8B5CF6]/40 bg-[#8B5CF6]/[0.07]'
        : checked
          ? 'border-[#FF3366]/20 bg-[#FF3366]/[0.04]'
          : 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]'
    }`}>
      {/* Checkbox */}
      <div onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={() => onCheck(script.id)}
          className="w-3.5 h-3.5 rounded cursor-pointer accent-violet-500" />
      </div>

      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        isSelected ? 'bg-[#8B5CF6]/20' : 'bg-white/[0.04]'
      }`} onClick={() => onSelect(script)}>
        <FileText size={14} style={{ color: isSelected ? '#a78bfa' : 'rgba(255,255,255,0.30)' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0" onClick={() => onSelect(script)}>
        <div onClick={e => e.stopPropagation()}>
          <InlineTitle scriptId={script.id} initialTitle={script.title} blueprintId={script.blueprintId}
            onRenamed={(t) => onRenamed?.(script.id, t)} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Video type badge */}
          {isShort ? (
            <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, padding: '1px 5px', fontWeight: 600, letterSpacing: '0.03em' }}>
              ⚡ SHORT
            </span>
          ) : (
            <span style={{ fontSize: 9, background: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.20)', borderRadius: 4, padding: '1px 5px', fontWeight: 600, letterSpacing: '0.03em' }}>
              📹 LONGO
            </span>
          )}
          <span className="text-[10px] text-white/30">
            {sections.length > 0 ? `${sections.length} seções` : 'roteiro completo'}
          </span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/30 uppercase">{script.language}</span>
          {script.confidence && (
            <>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px] font-semibold text-violet-400/70">{script.confidence}%</span>
            </>
          )}
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/25">{timeAgo(script.createdAt)}</span>
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0" onClick={e => e.stopPropagation()}>
        {/* Gerar Shorts — only for longform scripts that have product sections */}
        {isLongform && hasProducts && onGenerateShorts && (
          <button
            onClick={() => onGenerateShorts(script.id)}
            disabled={isGenerating}
            title="Gerar roteiros curtos a partir deste roteiro"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.20)' }}
          >
            {isGenerating ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Zap size={10} />
            )}
            {isGenerating ? 'Gerando…' : 'Shorts'}
          </button>
        )}

        {/* Delete */}
        <button onClick={() => onDelete([script.id])}
          className="p-1.5 text-white/15 hover:text-[#FF3366] hover:bg-[#FF3366]/[0.08] rounded-lg transition-all">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PRODUCT_LIMITS = {
  'top-5-custo-beneficio': 5,
  'comparacao-1x1':        2,
  'review-detalhado':      1,
}

const STANDARD_TYPES = [
  {
    id: 'top-5-custo-beneficio', name: 'Top 5 Custo-Benefício', icon: '🏆',
    desc: '5 produtos ranqueados do pior ao melhor',
    sections: [
      { id: uid(), type: 'intro',   label: 'Abertura',                    duration: 60,  instructions: 'NÃO abra com pergunta. Revele algo surpreendente do produto #1 na primeira frase (preço baixo, volume de avaliações, resultado inesperado) para criar curiosidade imediata. Exemplo de estrutura: "[Fato chocante sobre o #1]. Mas antes de revelar qual é, deixa eu te mostrar os que parecem bons e têm um problema que quase ninguém percebe." Nunca use "Você sabia que…" ou "Você quer…".' },
      { id: uid(), type: 'product', label: 'Critérios de Seleção',        duration: 45,  instructions: 'Em 2–3 frases, explique os critérios: preço, avaliações reais de compradores, durabilidade e custo-benefício. Termine com: "Vou do pior para o melhor — fica até o final pra não errar na compra."' },
      { id: uid(), type: 'product', label: 'Produto #5',                  duration: 90,  instructions: 'ESTRUTURA OBRIGATÓRIA: (1) Nome exato do produto, (2) preço atual, (3) número de avaliações e nota, (4) único ponto positivo real, (5) defeito honesto que justifica a posição #5. TERMINE com gancho de retenção: "No #4, já dá um salto de qualidade — mas o que vem depois vai te surpreender ainda mais."' },
      { id: uid(), type: 'product', label: 'Produto #4',                  duration: 90,  instructions: 'ESTRUTURA OBRIGATÓRIA: (1) Nome exato, (2) preço, (3) avaliações/nota, (4) melhoria clara em relação ao #5, (5) defeito que impediu de subir mais. TERMINE com: "O #3 já entra em outra categoria — calma que está chegando."' },
      { id: uid(), type: 'product', label: 'Produto #3',                  duration: 120, instructions: 'ESTRUTURA OBRIGATÓRIA: (1) Nome exato, (2) preço, (3) avaliações/nota, (4) dois pontos positivos concretos, (5) um ponto negativo honesto. Este produto deve parecer uma boa opção — mas deixe claro que os dois próximos são claramente superiores. TERMINE com: "Mas o #2 muda o jogo no quesito [mencione o critério mais importante]."' },
      { id: uid(), type: 'product', label: 'Produto #2',                  duration: 120, instructions: 'ESTRUTURA OBRIGATÓRIA: (1) Nome exato, (2) preço, (3) avaliações/nota, (4) por que quase ganhou — qualidade percebida, materiais, funcionalidade, (5) o único detalhe que fez o #1 vencer. Crie tensão máxima aqui: o espectador deve estar curioso sobre o #1. TERMINE com: "E agora, o campeão absoluto desta lista…"' },
      { id: uid(), type: 'product', label: 'Produto #1 — Melhor Escolha', duration: 150, instructions: 'ESTRUTURA OBRIGATÓRIA: (1) Nome exato do produto — revele como se fosse o grande final, (2) preço (enquadre como surpresa positiva se for acessível), (3) avaliações/nota total, (4) por que é o melhor: dois ou três argumentos concretos baseados em dados reais, (5) para quem ele é perfeito. Tom de veredicto definitivo. NUNCA mencione nome de loja ou vendedor — use apenas "link na descrição".' },
      { id: uid(), type: 'cta',     label: 'CTA Final',                   duration: 45,  instructions: 'REGRA ABSOLUTA: NUNCA mencione nome de loja, vendedor ou marketplace. Sempre "link na descrição" ou "primeiro link na bio". Faça uma pergunta que estimule comentários (ex: "Qual desses você escolheria?"). Peça like e inscrição de forma leve e conversacional — nunca imperativo.' },
    ],
  },
  {
    id: 'comparacao-1x1', name: 'Comparação 1x1', icon: '⚔️',
    desc: 'Dois produtos frente a frente com veredicto',
    sections: [
      { id: uid(), type: 'intro',      label: 'Abertura',               duration: 60,  instructions: 'Abra revelando a DIFERENÇA DE PREÇO entre os dois produtos para criar tensão imediata. Exemplo: "Um custa R$X, o outro R$Y. Mas qual entrega mais valor? Testei os dois e o resultado vai te surpreender." NÃO faça pergunta genérica tipo "Qual você escolheria?" — salve isso para o CTA.' },
      { id: uid(), type: 'product',    label: 'Apresentação dos Dois',  duration: 90,  instructions: 'Apresente cada produto com: nome exato, preço atual, número de avaliações e nota. Posicione cada um no mercado (premium vs custo-benefício, nacional vs importado, etc.). Crie expectativa sobre qual vai ganhar.' },
      { id: uid(), type: 'comparison', label: 'Design e Construção',    duration: 90,  instructions: 'Compare materiais, acabamento e durabilidade com dados concretos. Declare um vencedor neste quesito e explique brevemente o porquê. Não fique em cima do muro.' },
      { id: uid(), type: 'comparison', label: 'Performance e Recursos', duration: 120, instructions: 'Compare funcionalidades e resultados práticos com exemplos reais. Declare um vencedor neste quesito. Se o mesmo produto ganhou nos dois quesitos até aqui, crie suspense sobre o custo-benefício.' },
      { id: uid(), type: 'pros_cons',  label: 'Custo-Benefício',        duration: 90,  instructions: 'Compare preço vs valor entregue. Calcule ou estime o custo por uso/durabilidade. Este quesito costuma virar o jogo — use-o para criar suspense antes do veredicto.' },
      { id: uid(), type: 'verdict',    label: 'Veredicto Final',        duration: 75,  instructions: 'Declare o vencedor absoluto sem rodeios e explique em uma frase por quê. Depois, defina para quem cada produto é ideal (perfil de comprador diferente). NUNCA mencione nome de loja — use "link na descrição".' },
      { id: uid(), type: 'cta',        label: 'CTA Final',              duration: 45,  instructions: 'REGRA ABSOLUTA: NUNCA mencione nome de loja ou vendedor. Use apenas "link na descrição" ou "primeiro link na bio". Pergunte qual dos dois o espectador escolheria — isso gera comentários. Like e inscrição de forma leve.' },
    ],
  },
  {
    id: 'review-detalhado', name: 'Review Detalhado', icon: '🔍',
    desc: 'Análise aprofundada de um único produto',
    sections: [
      { id: uid(), type: 'intro',     label: 'Abertura',                 duration: 60,  instructions: 'Abra com o fato mais surpreendente do produto — preço vs qualidade inesperada, volume absurdo de avaliações positivas, ou uma dor muito específica que ele resolve. NÃO comece com pergunta. NÃO comece com "Hoje vou falar sobre…". Crie uma razão imediata para continuar assistindo.' },
      { id: uid(), type: 'product',   label: 'Visão Geral',              duration: 90,  instructions: 'Nome exato do produto, preço atual, avaliações/nota. Posicione no mercado: para quem é, qual problema resolve, como se compara ao padrão da categoria em preço e qualidade.' },
      { id: uid(), type: 'product',   label: 'Unboxing e Design',        duration: 90,  instructions: 'O que vem na caixa, qualidade dos materiais, acabamento, ergonomia. Seja específico — cite medidas, materiais, cores se relevante. Primeira impressão honesta, pontos positivos e o que poderia ser melhor.' },
      { id: uid(), type: 'demo',      label: 'Funcionalidades e Testes', duration: 150, instructions: 'Teste cada função principal com resultado concreto. Use números e comparações quando possível (ex: "carregou em X minutos", "suportou X kg"). Seja honesto sobre limitações — credibilidade é mais valiosa que vender.' },
      { id: uid(), type: 'pros_cons', label: 'Prós e Contras',           duration: 90,  instructions: 'Lista objetiva: 3–4 pontos positivos reais e 1–2 pontos negativos honestos. Os contras devem ser reais, não inventados — isso aumenta a credibilidade. Contextualize: o ponto negativo importa para o perfil de comprador deste produto?' },
      { id: uid(), type: 'verdict',   label: 'Para Quem Vale a Pena?',   duration: 60,  instructions: 'Veredicto direto: vale ou não vale o preço? Defina o perfil exato de quem deve comprar e quem deve evitar. Se houver alternativa mais barata ou mais cara que faça mais sentido para um perfil específico, mencione. NUNCA cite nome de loja — use "link na descrição".' },
      { id: uid(), type: 'cta',       label: 'CTA Final',                duration: 45,  instructions: 'REGRA ABSOLUTA: NUNCA mencione nome de loja ou vendedor. Use apenas "link na descrição" ou "primeiro link na bio". Faça uma pergunta que gere comentários (ex: "Você já usou algo assim?"). Like e inscrição de forma conversacional.' },
    ],
  },
]

const DEFAULT_BLUEPRINT = { id: null, ...STANDARD_TYPES[0] }

export default function Scripts() {
  const { data: scriptsData, refetch } = useApi('/scripts')
  const scripts = scriptsData?.scripts ?? []

  const { data: bpData, refetch: refetchBp } = useApi('/blueprints')
  const dbBlueprints = bpData?.blueprints ?? []

  const [selectedScript,   setSelected]      = useState(null)
  const [activeTypeId,     setActiveTypeId]   = useState(STANDARD_TYPES[0].id)
  const [blueprint,        setBlueprint]      = useState(DEFAULT_BLUEPRINT)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [language,         setLanguage]       = useState('pt')
  const [generating,       setGenerating]     = useState(false)
  const [savingBp,         setSavingBp]       = useState(false)
  const [error,            setError]          = useState(null)
  const [activeDbBp,       setActiveDbBp]     = useState(null)
  const [checkedIds,       setCheckedIds]     = useState([])
  const [deleting,         setDeleting]       = useState(false)
  const [showBlueprintEditor, setShowBlueprintEditor] = useState(false)
  const [activeTab,        setActiveTab]      = useState('wizard')  // 'wizard' | 'blueprints' | 'scripts'
  const [wizardStep,       setWizardStep]     = useState('format')  // 'format' | 'review' | 'products'
  const [editingBp,        setEditingBp]      = useState(null)      // blueprint being edited in blueprints tab
  const [wizardProjectId,  setWizardProjectId] = useState('')       // project assignment in wizard
  const [videoType,        setVideoType]      = useState('longform') // 'longform' | 'short'
  const [generatingShorts, setGeneratingShorts] = useState(null)    // scriptId being processed

  // Projects list for wizard assignment
  const { data: projectsData } = useApi('/projects')
  const projectsList = projectsData?.projects ?? []

  const productLimit = activeTypeId ? (PRODUCT_LIMITS[activeTypeId] ?? null) : null
  const canGenerate  = productLimit == null ? true : selectedProducts.length === productLimit

  function selectType(typeId) {
    const t = STANDARD_TYPES.find(t => t.id === typeId)
    if (!t) return
    setActiveTypeId(typeId); setActiveDbBp(null); setSelectedProducts([])
    setBlueprint({ id: null, name: t.name, desc: t.desc, sections: t.sections.map(s => ({ ...s, id: uid() })) })
    setWizardStep('format')
  }

  function toggleProduct(id) {
    setSelectedProducts(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id)
      if (productLimit != null && prev.length >= productLimit) return prev
      return [...prev, id]
    })
  }

  async function handleGenerate() {
    setGenerating(true); setError(null)
    try {
      const body = {
        blueprintData: blueprint,
        productIds: selectedProducts,
        language,
        videoType: videoType ?? 'longform',
        ...(wizardProjectId ? { projectId: wizardProjectId } : {}),
      }
      const res  = await fetch('/api/scripts/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch(); setSelected(data); setActiveTab('scripts')
    } catch (e) {
      console.error('[scripts]', e.message); setError(friendlyError(e.message))
    } finally { setGenerating(false) }
  }

  async function handleGenerateShorts(scriptId) {
    setGeneratingShorts(scriptId); setError(null)
    try {
      const res  = await fetch(`/api/scripts/${scriptId}/generate-shorts`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch()
      // Select first generated short to preview it
      if (data.shorts?.length) setSelected(data.shorts[0])
    } catch (e) {
      setError(friendlyError(e.message))
    } finally { setGeneratingShorts(null) }
  }

  async function handleSaveBlueprint() {
    setSavingBp(true)
    try {
      const method = blueprint.id ? 'PUT' : 'POST'
      const url    = blueprint.id ? `/api/blueprints/${blueprint.id}` : '/api/blueprints'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(blueprint) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setBlueprint(data); setActiveDbBp(data.id); await refetchBp()
    } catch (e) {
      setError(friendlyError(e.message))
    } finally { setSavingBp(false) }
  }

  async function handleDeleteBlueprint(id) {
    if (!confirm('Excluir este blueprint?')) return
    await fetch(`/api/blueprints/${id}`, { method: 'DELETE' }); await refetchBp()
    if (activeDbBp === id) { setBlueprint(DEFAULT_BLUEPRINT); setActiveDbBp(null) }
  }

  async function saveEditingBp() {
    if (!editingBp) return
    setSavingBp(true)
    try {
      const method = editingBp.id ? 'PUT' : 'POST'
      const url    = editingBp.id ? `/api/blueprints/${editingBp.id}` : '/api/blueprints'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingBp) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setEditingBp(null); await refetchBp()
    } catch (e) {
      setError(friendlyError(e.message))
    } finally { setSavingBp(false) }
  }

  function handleScriptUpdate(updated) { setSelected(updated); refetch() }
  function handleScriptRenamed(scriptId, newTitle) {
    refetch()
    if (selectedScript?.id === scriptId) setSelected(s => s ? { ...s, title: newTitle } : s)
  }

  function toggleCheck(id) {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleCheckAll() {
    setCheckedIds(prev => prev.length === scripts.length ? [] : scripts.map(s => s.id))
  }

  async function handleDelete(ids, all = false) {
    const label = all
      ? `Excluir TODOS os ${scripts.length} roteiros?`
      : ids.length === 1 ? 'Excluir este roteiro?' : `Excluir ${ids.length} roteiros selecionados?`
    if (!confirm(label)) return
    setDeleting(true)
    try {
      const url  = all || ids.length > 1 ? '/api/scripts' : `/api/scripts/${ids[0]}`
      const body = all ? { all: true } : ids.length > 1 ? { ids } : undefined
      const res  = await fetch(url, {
        method: 'DELETE',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Erro ao excluir') }
      if (selectedScript && (all || ids.includes(selectedScript.id))) setSelected(null)
      setCheckedIds([]); await refetch()
    } catch (e) { setError(friendlyError(e.message)) } finally { setDeleting(false) }
  }



  return (
    <div className="animate-fade-up">
      <AILoadingOverlay show={generating} title="Gerando Roteiro" />

      <PageHeader
        overline="Pipeline"
        title="Roteiros"
        description="Crie roteiros com IA e edite seção por seção"
      />

      {/* ── Single flat tab bar ── */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'wizard',     label: 'Criar Roteiro', icon: <Zap size={13} /> },
          { id: 'blueprints', label: 'Blueprints',    icon: <BookTemplate size={13} />, badge: dbBlueprints.length || null },
          { id: 'scripts',    label: 'Roteiros',      icon: <FileText size={13} />,     badge: scripts.length || null },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color:      activeTab === tab.id ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.35)',
              boxShadow:  activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
            }}>
            {tab.icon}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.id ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.06)',
                  color:      activeTab === tab.id ? '#a78bfa' : 'rgba(255,255,255,0.28)',
                }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.20)', color: '#FF3366' }}>
          <span className="text-base">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ══ TAB: Blueprints + Wizard (no extra wrapper, direct checks) ══════════ */}

      {/* ══ TAB: Blueprints ══════════════════════════════════════════════════════ */}
      {activeTab === 'blueprints' && (
            editingBp === null ? (
              <div className="space-y-3">
                {dbBlueprints.length === 0 ? (
                  <div className="rounded-2xl py-14 flex flex-col items-center gap-3 text-center"
                    style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <BookTemplate size={28} style={{ color: 'rgba(255,255,255,0.12)' }} />
                    <p className="text-sm text-white/30">Nenhum blueprint salvo ainda</p>
                    <p className="text-xs text-white/20 max-w-xs">Crie blueprints personalizados para reutilizar estruturas e prompts nos seus roteiros.</p>
                    <button
                      onClick={() => setEditingBp({ id: null, name: '', description: '', sections: STANDARD_TYPES[0].sections.map(s => ({ ...s, id: uid() })) })}
                      className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                      style={{ border: '1px solid rgba(139,92,246,0.30)', color: '#a78bfa' }}>
                      <Plus size={12} /> Criar primeiro blueprint
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {dbBlueprints.map(bp => (
                        <div key={bp.id} className="rounded-2xl p-4 group transition-colors"
                          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(139,92,246,0.12)' }}>
                              <Layers size={14} style={{ color: '#8B5CF6' }} />
                            </div>
                            <button onClick={() => handleDeleteBlueprint(bp.id)}
                              className="p-1.5 text-white/15 hover:text-[#FF3366] rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-white/75 mb-0.5 leading-tight">{bp.name || 'Sem nome'}</p>
                          <p className="text-[11px] text-white/30 mb-3">
                            {bp.sections?.length ?? 0} seções · ~{Math.round((bp.sections?.reduce((a, s) => a + (s.duration ?? 60), 0) ?? 0) / 60)} min
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingBp({ ...bp })}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border border-white/[0.09] text-white/50 hover:text-white/75 hover:border-white/20 transition-colors">
                              <Pencil size={10} /> Editar
                            </button>
                            <button
                              onClick={() => { setBlueprint(bp); setActiveDbBp(bp.id); setActiveTypeId(null); setActiveTab('wizard'); setWizardStep('products') }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)' }}>
                              <Zap size={10} /> Usar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingBp({ id: null, name: '', description: '', sections: STANDARD_TYPES[0].sections.map(s => ({ ...s, id: uid() })) })}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold border border-dashed border-white/[0.09] text-white/30 hover:text-white/55 hover:border-white/20 transition-colors">
                      <Plus size={12} /> Novo Blueprint
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Blueprint editor panel */
              <div className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(139,92,246,0.20)', background: 'rgba(139,92,246,0.03)' }}>
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(139,92,246,0.12)' }}>
                    <Layers size={14} style={{ color: '#8B5CF6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text" value={editingBp.name}
                      onChange={e => setEditingBp(b => ({ ...b, name: e.target.value }))}
                      className="text-base font-bold text-white/85 bg-transparent border-0 border-b border-white/[0.09] focus:outline-none focus:border-violet-500/40 w-full pb-1 transition-colors"
                      placeholder="Nome do blueprint…" />
                    <input
                      type="text" value={editingBp.description ?? ''}
                      onChange={e => setEditingBp(b => ({ ...b, description: e.target.value }))}
                      className="text-xs text-white/30 bg-transparent border-0 focus:outline-none w-full mt-1.5"
                      placeholder="Descrição (opcional)" />
                  </div>
                </div>
                <div className="p-5">
                  <BlueprintEditor blueprint={editingBp} onChange={setEditingBp} />
                </div>
                <div className="px-5 pb-5 flex items-center gap-2.5 border-t border-white/[0.04] pt-4">
                  <button onClick={() => setEditingBp(null)}
                    className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 px-3 py-2 rounded-xl border border-white/[0.08] transition-colors">
                    <X size={11} /> Cancelar
                  </button>
                  <button onClick={saveEditingBp} disabled={savingBp}
                    className="flex items-center gap-2 text-xs font-bold px-5 py-2 rounded-xl ml-auto transition-colors"
                    style={{ background: '#8B5CF6', color: '#fff' }}>
                    {savingBp ? <Loader2 size={11} className="animate-spin" /> : <BookTemplate size={11} />}
                    {editingBp.id ? 'Salvar alterações' : 'Criar blueprint'}
                  </button>
                </div>
              </div>
            )
          )}

      {/* ══ TAB: Wizard ══════════════════════════════════════════════════════════ */}
      {activeTab === 'wizard' && (
            <div className="grid grid-cols-5 gap-6">

              {/* Left: vertical step tracker */}
              <div className="col-span-2">
                {/* Progress header */}
                <div className="mb-5 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/20 mb-1">Progresso</p>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: wizardStep === 'format' ? '15%' : wizardStep === 'review' ? '55%' : '100%',
                        background: 'linear-gradient(90deg, #8B5CF6, #CCFF00)',
                      }} />
                  </div>
                </div>

                {/* Steps */}
                {[
                  {
                    n: 1, key: 'format', label: 'Formato do Vídeo',
                    hint: 'Escolha o estilo do vídeo',
                    done:   wizardStep !== 'format',
                    active: wizardStep === 'format',
                    sublabel: wizardStep !== 'format' && activeTypeId
                      ? `${STANDARD_TYPES.find(t => t.id === activeTypeId)?.icon} ${STANDARD_TYPES.find(t => t.id === activeTypeId)?.name}`
                      : null,
                  },
                  {
                    n: 2, key: 'review', label: 'Blueprint',
                    hint: 'Estrutura e prompts por seção',
                    optional: true,
                    done:   wizardStep === 'products',
                    active: wizardStep === 'review',
                    sublabel: (wizardStep === 'products' || wizardStep === 'review') && blueprint.name
                      ? blueprint.name
                      : null,
                  },
                  {
                    n: 3, key: 'products', label: 'Produtos & Geração',
                    hint: 'Selecione produtos e gere o roteiro',
                    done:   false,
                    active: wizardStep === 'products',
                    sublabel: wizardStep === 'products' && selectedProducts.length > 0
                      ? `${selectedProducts.length} produto${selectedProducts.length !== 1 ? 's' : ''} selecionado${selectedProducts.length !== 1 ? 's' : ''}`
                      : null,
                  },
                ].map((step, i) => (
                  <div key={step.key} className="flex items-stretch gap-4">
                    {/* Track column */}
                    <div className="flex flex-col items-center shrink-0" style={{ width: 32 }}>
                      {/* Circle */}
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
                      {/* Connector */}
                      {i < 2 && (
                        <div className="w-0.5 flex-1 mt-2 mb-0 min-h-[52px] rounded-full transition-all duration-300"
                          style={{
                            background: step.done
                              ? 'linear-gradient(180deg,rgba(139,92,246,0.55),rgba(139,92,246,0.20))'
                              : 'rgba(255,255,255,0.05)',
                          }} />
                      )}
                    </div>

                    {/* Label column */}
                    <div className="pt-0.5 pb-8 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            if (step.key === 'format') setWizardStep('format')
                            else if (step.key === 'review' && wizardStep !== 'format') setWizardStep('review')
                          }}
                          disabled={step.key === 'products' || (step.key === 'review' && wizardStep === 'format')}
                          className="text-[13px] font-bold transition-colors disabled:cursor-default leading-tight"
                          style={{
                            color: step.active ? 'rgba(255,255,255,0.92)'
                                 : step.done    ? '#a78bfa'
                                 :                'rgba(255,255,255,0.22)',
                          }}>
                          {step.label}
                        </button>
                        {step.optional && (
                          <span className="text-[9px] text-white/20 border border-white/[0.09] rounded-full px-1.5 py-px tracking-wide">
                            opcional
                          </span>
                        )}
                      </div>
                      {/* Step hint — shown when pending or active (no sublabel) */}
                      {!step.sublabel && !step.done && (
                        <p className="text-[11px] mt-0.5 leading-tight"
                          style={{ color: step.active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)' }}>
                          {step.hint}
                        </p>
                      )}
                      {/* Sublabel — shows selected value when step is done/active */}
                      {step.sublabel && (
                        <p className="text-[11px] mt-0.5 truncate font-medium"
                          style={{ color: step.active ? '#CCFF00' : '#a78bfa' }}>
                          {step.sublabel}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Help card at bottom */}
                <div className="mt-2 rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[11px] text-white/35 leading-relaxed">
                    {wizardStep === 'format' && 'Selecione o formato que define quantos produtos e a estrutura narrativa do vídeo.'}
                    {wizardStep === 'review' && 'O blueprint controla os prompts de cada seção. Personalize ou use o padrão do formato.'}
                    {wizardStep === 'products' && 'Pesquise e selecione os produtos que aparecerão no vídeo. A IA irá gerar o roteiro completo.'}
                  </p>
                </div>
              </div>

              {/* Right: step content */}
              <div className="col-span-3 space-y-3">

                {/* ──── STEP 1: Format selection ──── */}
                {wizardStep === 'format' && (
                  <>
                    <div className="rounded-2xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="px-4 py-3 border-b border-white/[0.05]">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Selecione o Formato</span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {STANDARD_TYPES.map(t => {
                          const isActive = activeTypeId === t.id && !activeDbBp
                          const limit    = PRODUCT_LIMITS[t.id]
                          return (
                            <button key={t.id} onClick={() => selectType(t.id)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                              style={{
                                borderColor: isActive ? '#CCFF00' : 'rgba(255,255,255,0.06)',
                                background:  isActive ? 'rgba(204,255,0,0.05)' : 'transparent',
                              }}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                                style={{ background: isActive ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.04)' }}>
                                {t.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-white/80 truncate">{t.name}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                    style={{
                                      background: isActive ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.05)',
                                      color:      isActive ? '#CCFF00' : 'rgba(255,255,255,0.30)',
                                    }}>
                                    {limit} {limit === 1 ? 'produto' : 'produtos'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-white/30 mt-0.5 leading-tight">{t.desc}</p>
                              </div>
                              {isActive && (
                                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                                  style={{ background: '#CCFF00' }}>
                                  <Check size={9} style={{ color: '#07070B' }} />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Blueprint review prompt — shown after a format is selected */}
                    {activeTypeId && (
                      <div className="rounded-2xl p-4 space-y-3"
                        style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(139,92,246,0.12)' }}>
                            <Layers size={14} style={{ color: '#8B5CF6' }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white/75">Revisar blueprint antes de continuar?</p>
                            <p className="text-[11px] text-white/35 mt-0.5 leading-snug">
                              O blueprint define a estrutura e os prompts de cada seção. Você pode personalizar ou seguir com o padrão do formato.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setWizardStep('review')}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-violet-500/[0.08]"
                            style={{ borderColor: 'rgba(139,92,246,0.30)', color: '#a78bfa' }}>
                            Sim, revisar blueprint
                          </button>
                          <button onClick={() => setWizardStep('products')}
                            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: '#CCFF00', color: '#07070B' }}>
                            Continuar para produtos →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ──── STEP 2: Blueprint review ──── */}
                {wizardStep === 'review' && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid rgba(139,92,246,0.20)', background: 'rgba(139,92,246,0.03)' }}>
                    {/* Header: editable title */}
                    <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers size={12} style={{ color: '#8B5CF6' }} />
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Blueprint Ativo</span>
                        {activeDbBp && (
                          <span className="text-[9px] text-violet-400/60 border border-violet-500/20 rounded px-1.5 py-px">salvo</span>
                        )}
                      </div>
                      <input
                        type="text" value={blueprint.name ?? ''}
                        onChange={e => setBlueprint(b => ({ ...b, name: e.target.value }))}
                        className="text-lg font-bold text-white/85 bg-transparent border-0 border-b border-white/[0.09] focus:outline-none focus:border-violet-500/40 w-full pb-1.5 transition-colors"
                        placeholder="Nome do blueprint…" />
                      <input
                        type="text" value={blueprint.description ?? ''}
                        onChange={e => setBlueprint(b => ({ ...b, description: e.target.value }))}
                        className="text-xs text-white/30 bg-transparent border-0 focus:outline-none w-full"
                        placeholder="Descrição (opcional)" />
                    </div>

                    {/* Quick-switch saved blueprint */}
                    {dbBlueprints.length > 0 && (
                      <div className="px-5 py-3 border-b border-white/[0.04]">
                        <select value={activeDbBp ?? ''}
                          onChange={e => {
                            const bp = dbBlueprints.find(b => b.id === e.target.value)
                            if (bp) { setBlueprint(bp); setActiveDbBp(bp.id); setActiveTypeId(null) }
                            else selectType(activeTypeId ?? STANDARD_TYPES[0].id)
                          }}
                          className="w-full text-xs border border-white/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/40 text-white/50 bg-transparent">
                          <option value="">Padrão (baseado no formato)</option>
                          {dbBlueprints.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="px-5 py-4">
                      <BlueprintEditor blueprint={blueprint} onChange={setBlueprint} />
                    </div>

                    {/* Actions */}
                    <div className="px-5 pb-5 flex items-center gap-2 border-t border-white/[0.04] pt-4">
                      <button onClick={() => setWizardStep('format')}
                        className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 px-3 py-2 rounded-xl border border-white/[0.08] transition-colors">
                        ← Voltar
                      </button>
                      <button onClick={handleSaveBlueprint} disabled={savingBp}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition-colors hover:bg-violet-500/[0.08]"
                        style={{ borderColor: 'rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                        {savingBp ? <Loader2 size={11} className="animate-spin" /> : <BookTemplate size={11} />}
                        Salvar blueprint
                      </button>
                      <button onClick={() => setWizardStep('products')}
                        className="flex items-center gap-2 text-xs font-bold px-5 py-2 rounded-xl ml-auto transition-all"
                        style={{ background: '#CCFF00', color: '#07070B' }}>
                        <Zap size={12} /> Continuar →
                      </button>
                    </div>
                  </div>
                )}

                {/* ──── STEP 3: Products & generate ──── */}
                {wizardStep === 'products' && (
                  <div className="space-y-3">
                    {/* Breadcrumb back-links */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setWizardStep('format')}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors">
                        ← Mudar formato
                      </button>
                      {blueprint.name && (
                        <>
                          <span className="text-white/15 text-xs">·</span>
                          <button onClick={() => setWizardStep('review')}
                            className="flex items-center gap-1 text-xs text-violet-400/50 hover:text-violet-400 transition-colors">
                            <Layers size={10} /> {blueprint.name}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Products */}
                    <div className="rounded-2xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2.5">
                        <Package size={13} style={{ color: 'rgba(255,255,255,0.30)' }} />
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wide">Produtos</span>
                        {productLimit && (
                          <span className="ml-auto text-[10px] text-white/30">
                            Selecione exatamente {productLimit}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <ProductPicker selected={selectedProducts} onToggle={toggleProduct} maxSelect={productLimit} />
                      </div>
                    </div>

                    {/* Language + Project + Generate */}
                    <div className="rounded-2xl p-4 space-y-3"
                      style={{
                        border:     canGenerate ? '1px solid rgba(204,255,0,0.20)' : '1px solid rgba(255,255,255,0.07)',
                        background: canGenerate ? 'rgba(204,255,0,0.04)'           : 'rgba(255,255,255,0.02)',
                      }}>
                      {/* Video type toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/35 font-bold uppercase tracking-widest flex-1">Tipo de Vídeo</span>
                        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {[
                            { v: 'longform', l: '📹 Longo' },
                            { v: 'short',    l: '⚡ Short' },
                          ].map(vt => (
                            <button key={vt.v} onClick={() => setVideoType(vt.v)}
                              className="px-2.5 py-1 rounded-md text-xs font-bold transition-all"
                              style={{
                                background:  videoType === vt.v ? 'rgba(139,92,246,0.25)' : 'transparent',
                                border:      videoType === vt.v ? '1px solid rgba(139,92,246,0.40)' : '1px solid transparent',
                                color:       videoType === vt.v ? '#a78bfa'                : 'rgba(255,255,255,0.35)',
                              }}>
                              {vt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/35 font-bold uppercase tracking-widest flex-1">Idioma do Roteiro</span>
                        <div className="flex gap-1.5">
                          {[{ v: 'pt', l: 'PT' }, { v: 'en', l: 'EN' }, { v: 'es', l: 'ES' }].map(lang => (
                            <button key={lang.v} onClick={() => setLanguage(lang.v)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                              style={{
                                background:  language === lang.v ? '#8B5CF6' : 'transparent',
                                borderColor: language === lang.v ? '#8B5CF6' : 'rgba(255,255,255,0.08)',
                                color:       language === lang.v ? '#fff'    : 'rgba(255,255,255,0.35)',
                              }}>
                              {lang.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Project assignment */}
                      {projectsList.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/35 font-bold uppercase tracking-widest flex-1">Projeto</span>
                          <select value={wizardProjectId} onChange={e => setWizardProjectId(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 flex-1 max-w-[180px]"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}>
                            <option value="">— Nenhum —</option>
                            {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}

                      {!canGenerate && productLimit != null && (
                        <p className="text-[11px] text-white/35 leading-snug">
                          Selecione {productLimit - selectedProducts.length} produto{productLimit - selectedProducts.length !== 1 ? 's' : ''} restante{productLimit - selectedProducts.length !== 1 ? 's' : ''} para continuar.
                        </p>
                      )}

                      <button
                        onClick={handleGenerate}
                        disabled={generating || !canGenerate}
                        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                          background: canGenerate ? '#CCFF00' : 'rgba(255,255,255,0.06)',
                          color:      canGenerate ? '#07070B' : 'rgba(255,255,255,0.20)',
                          cursor:     canGenerate ? 'pointer' : 'not-allowed',
                          boxShadow:  canGenerate ? '0 0 24px rgba(204,255,0,0.20)' : 'none',
                        }}>
                        {generating
                          ? <><Loader2 size={16} className="animate-spin" /> Gerando…</>
                          : <><Zap size={16} /> Gerar Roteiro com IA</>
                        }
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

      {/* ══ TAB: Scripts ═════════════════════════════════════════════════════════ */}
      {activeTab === 'scripts' && (
        <div className="grid grid-cols-5 gap-6">

          {/* Left: list */}
          <div className="col-span-2">
            <div className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>

              {/* Toolbar */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05] min-h-[50px]">
                {checkedIds.length > 0 ? (
                  <>
                    <input type="checkbox"
                      checked={checkedIds.length === scripts.length}
                      ref={el => { if (el) el.indeterminate = checkedIds.length > 0 && checkedIds.length < scripts.length }}
                      onChange={toggleCheckAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer accent-violet-500" />
                    <span className="text-xs font-semibold text-white/50">
                      {checkedIds.length} de {scripts.length}
                    </span>
                    <button onClick={() => handleDelete(checkedIds)} disabled={deleting}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                      style={{ background: 'rgba(255,51,102,0.10)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.18)' }}>
                      {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Excluir
                    </button>
                    <button onClick={() => setCheckedIds([])} className="ml-auto text-xs text-white/25 hover:text-white/50">
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    {scripts.length > 0 && (
                      <input type="checkbox" checked={false} onChange={toggleCheckAll}
                        className="w-3.5 h-3.5 rounded cursor-pointer accent-violet-500" />
                    )}
                    <span className="text-xs text-white/40">
                      {scripts.length} roteiro{scripts.length !== 1 ? 's' : ''}
                    </span>
                    {scripts.length > 1 && (
                      <button onClick={() => handleDelete([], true)} disabled={deleting}
                        className="ml-auto flex items-center gap-1.5 text-[11px] text-white/20 hover:text-[#FF3366] px-2 py-1 rounded-lg hover:bg-[#FF3366]/[0.06] border border-transparent hover:border-[#FF3366]/12 transition-all">
                        <Trash2 size={10} /> Limpar tudo
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Cards */}
              <div className="p-3 space-y-1.5">
                {scripts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <FileText size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <p className="text-sm text-white/25">Nenhum roteiro gerado ainda</p>
                    <button onClick={() => setActiveTab('wizard')}
                      className="text-xs text-violet-400/60 hover:text-violet-400 transition-colors">
                      ← Criar primeiro roteiro
                    </button>
                  </div>
                ) : (
                  scripts.map(s => (
                    <ScriptHistoryCard
                      key={s.id}
                      script={s}
                      isSelected={selectedScript?.id === s.id}
                      onSelect={script => setSelected(prev => prev?.id === script.id ? null : script)}
                      onRenamed={handleScriptRenamed}
                      checked={checkedIds.includes(s.id)}
                      onCheck={toggleCheck}
                      onDelete={handleDelete}
                      onGenerateShorts={handleGenerateShorts}
                      generatingShorts={generatingShorts}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: viewer */}
          <div className="col-span-3">
            {selectedScript ? (
              <ScriptViewer
                script={selectedScript}
                onUpdate={handleScriptUpdate}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4 rounded-2xl"
                style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <FileText size={20} style={{ color: 'rgba(139,92,246,0.60)' }} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-white/30">Selecione um roteiro</p>
                  <p className="text-xs text-white/20">Clique em qualquer roteiro da lista para visualizá-lo aqui.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
