import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Wand2, Play, Pause, ChevronRight, RotateCcw, Check,
  Mic, FileText, ShoppingBag, Volume2, Sparkles, Zap,
  ChevronDown, ChevronUp, Loader2, Radio, Languages, AlertTriangle,
} from 'lucide-react'
import { useApi, apiPost } from '../hooks/useApi.js'
import LanguageFollowUp from '../components/LanguageFollowUp.jsx'
import { LANGUAGES, otherLanguages, normalizeLang } from '../lib/languages.js'

// ── Predefined blueprints (mirrors worker fallbacks) ──────────────────────────

const LONGFORM_BLUEPRINTS = [
  {
    id: 'top-5-custo-beneficio',
    name: 'Top 5 Custo-Benefício',
    description: 'Rankeia 5 produtos do melhor ao pior custo-benefício',
    format: 'longform',
    sections: [
      { type: 'intro',   label: 'Abertura',          duration: 60,  instructions: 'Hook forte com a promessa de revelar os 5 melhores produtos.' },
      { type: 'product', label: 'Produto #5',         duration: 90,  instructions: 'Apresente o produto, preço e para quem vale.' },
      { type: 'product', label: 'Produto #4',         duration: 90,  instructions: 'Destaque o diferencial em relação ao #5.' },
      { type: 'product', label: 'Produto #3',         duration: 120, instructions: 'Análise mais detalhada, prós e contras.' },
      { type: 'product', label: 'Produto #2',         duration: 120, instructions: 'Análise detalhada, por que quase chegou ao topo.' },
      { type: 'product', label: 'Produto #1 — Melhor',duration: 150, instructions: 'O campeão: análise completa, por que é o melhor.' },
      { type: 'cta',     label: 'CTA Final',          duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
  {
    id: 'comparacao-1x1',
    name: 'Comparação 1x1',
    description: 'Confronto direto entre dois produtos concorrentes',
    format: 'longform',
    sections: [
      { type: 'intro',   label: 'Abertura',         duration: 60,  instructions: 'Hook: qual dos dois você escolheria? Crie suspense.' },
      { type: 'product', label: 'Produto A',         duration: 90,  instructions: 'Apresente preço e posicionamento de mercado.' },
      { type: 'product', label: 'Produto B',         duration: 90,  instructions: 'Compare design e construção.' },
      { type: 'product', label: 'Performance',       duration: 120, instructions: 'Testes práticos e resultados lado a lado.' },
      { type: 'verdict', label: 'Veredicto Final',   duration: 75,  instructions: 'Declare o vencedor e para quem cada um é indicado.' },
      { type: 'cta',     label: 'CTA Final',         duration: 45,  instructions: 'Inscrição e links na descrição.' },
    ],
  },
  {
    id: 'review-detalhado',
    name: 'Review Detalhado',
    description: 'Análise aprofundada de um único produto',
    format: 'longform',
    sections: [
      { type: 'intro',   label: 'Abertura',         duration: 60,  instructions: 'Hook com a principal dor que o produto resolve.' },
      { type: 'product', label: 'Visão Geral',       duration: 90,  instructions: 'O que é, para quem é, preço no mercado.' },
      { type: 'product', label: 'Funcionalidades',   duration: 150, instructions: 'Teste prático de cada função, resultados reais.' },
      { type: 'product', label: 'Prós e Contras',    duration: 90,  instructions: 'Lista honesta de pontos positivos e negativos.' },
      { type: 'verdict', label: 'Veredicto',         duration: 60,  instructions: 'Para quem vale a pena e alternativas.' },
      { type: 'cta',     label: 'CTA Final',         duration: 45,  instructions: 'Inscrição e links.' },
    ],
  },
]

const SHORTFORM_BLUEPRINTS = [
  {
    id: 'short-viral-hook',
    name: 'Short Viral Hook',
    description: 'Hook forte + produto + CTA em menos de 60s',
    format: 'shortform',
    sections: [
      { type: 'intro',   label: 'Hook (3 seg)',   duration: 5,  instructions: 'Frase ou pergunta que para o scroll imediatamente.' },
      { type: 'product', label: 'Produto',         duration: 30, instructions: 'Nome, preço, benefício principal e onde comprar.' },
      { type: 'cta',     label: 'CTA',             duration: 10, instructions: 'Link na bio, salva o vídeo, comenta!' },
    ],
  },
  {
    id: 'short-top3-rapido',
    name: 'Top 3 Rápido',
    description: 'Três opções em 60-90 segundos',
    format: 'shortform',
    sections: [
      { type: 'intro',   label: 'Hook',     duration: 5,  instructions: 'Você precisa de [produto]? Separei os 3 melhores.' },
      { type: 'product', label: '3º lugar', duration: 20, instructions: 'Nome e diferencial rápido.' },
      { type: 'product', label: '2º lugar', duration: 20, instructions: 'Por que é melhor que o 3º.' },
      { type: 'product', label: '1º lugar', duration: 25, instructions: 'O melhor custo-benefício, preço e link.' },
      { type: 'cta',     label: 'CTA',      duration: 10, instructions: 'Link na bio!' },
    ],
  },
]

// ── Fallback trending topics (shown when ML trends API returns empty) ─────────

const FALLBACK_TRENDS = [
  'Cadeira Gamer', 'Fone Bluetooth', 'Monitor Gamer', 'Teclado Mecânico',
  'Headset sem fio', 'Mesa de Escritório', 'Webcam Full HD', 'SSD Externo',
  'Aspirador Robô', 'Fritadeira Air Fryer', 'Purificador de Água', 'Câmera de Segurança',
]

// ── Voice options (mirrors voiceoverService) ──────────────────────────────────

const OPENAI_VOICES = [
  { id: 'nova',    label: 'Nova',    gender: 'F', description: 'quente e natural',        provider: 'openai' },
  { id: 'shimmer', label: 'Shimmer', gender: 'F', description: 'clara e articulada',      provider: 'openai' },
  { id: 'alloy',   label: 'Alloy',   gender: 'N', description: 'equilibrada e versátil',  provider: 'openai' },
  { id: 'echo',    label: 'Echo',    gender: 'M', description: 'suave e conversacional',  provider: 'openai' },
  { id: 'onyx',    label: 'Onyx',    gender: 'M', description: 'grave e autoritativa',    provider: 'openai' },
  { id: 'fable',   label: 'Fable',   gender: 'M', description: 'expressiva e narrativa',  provider: 'openai' },
]

// ── AudioPlayer ───────────────────────────────────────────────────────────────

function AudioPlayer({ url }) {
  const audioRef              = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProg]   = useState(0)
  const [duration, setDur]    = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onEnd  = () => setPlaying(false)
    const onTime = () => setProg(el.currentTime)
    const onMeta = () => setDur(el.duration)
    el.addEventListener('ended', onEnd)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [url])

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else         { el.play().catch(() => {}); setPlaying(true) }
  }

  function seek(e) {
    const el = audioRef.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const pct = duration ? (progress / duration) * 100 : 0
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#8B5CF6', boxShadow: '0 0 16px rgba(139,92,246,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        {playing
          ? <Pause  size={13} fill="white" color="white" />
          : <Play   size={13} fill="white" color="white" />}
      </button>
      <div
        onClick={seek}
        style={{
          flex: 1, height: 6, borderRadius: 99, cursor: 'pointer',
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
        }}
      >
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg,#8B5CF6,#CCFF00)',
          transition: 'width 0.1s linear',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
        {fmt(progress)}{duration ? ` / ${fmt(duration)}` : ''}
      </span>
    </div>
  )
}

// ── ExecStep progress row ─────────────────────────────────────────────────────

function ExecRow({ icon: Icon, label, status, detail }) {
  // status: 'pending' | 'running' | 'done' | 'error'
  const colors = {
    pending: { dot: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.30)' },
    running: { dot: '#8B5CF6',               text: 'rgba(255,255,255,0.80)' },
    done:    { dot: '#00FFB9',               text: 'rgba(255,255,255,0.80)' },
    error:   { dot: '#FF3366',               text: '#FF3366' },
  }
  const c = colors[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12,
      background: status === 'running' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${status === 'running' ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.05)'}`,
      transition: 'all 400ms ease',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: status === 'running' ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${status === 'running' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        {status === 'running'
          ? <Loader2 size={16} color="#8B5CF6" style={{ animation: 'spin 1s linear infinite' }} />
          : <Icon size={16} color={c.dot} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 2 }}>{label}</p>
        {detail && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{detail}</p>}
      </div>
      {status === 'done'  && <Check  size={16} color="#00FFB9" />}
      {status === 'error' && <span style={{ fontSize: 11, color: '#FF3366' }}>Erro</span>}
    </div>
  )
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function Bubble({ role, text, choices, allowCustom, onPick, picked }) {
  const [customVal, setCustomVal] = useState('')
  const isAI = role === 'ai'

  function submitCustom() {
    const v = customVal.trim()
    if (!v) return
    onPick({ label: v, value: v })
    setCustomVal('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAI ? 'flex-start' : 'flex-end', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, maxWidth: '85%', flexDirection: isAI ? 'row' : 'row-reverse' }}>
        {isAI && (
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.35)',
            fontSize: 14, marginBottom: 2,
          }}><Wand2 size={15} style={{ color: '#a78bfa' }} /></div>
        )}
        <div style={{
          padding: '10px 14px', borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isAI ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.18)',
          border: `1px solid ${isAI ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.30)'}`,
          fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'pre-wrap',
        }}>
          {text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i} style={{ color: '#CCFF00' }}>{part.slice(2, -2)}</strong>
              : part
          )}
        </div>
      </div>

      {/* Choice chips */}
      {isAI && choices && !picked && (
        <div style={{ marginLeft: 40, width: 'calc(100% - 40px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: allowCustom ? 10 : 0 }}>
            {choices.map((c) => (
              <button key={c.value} onClick={() => onPick(c)} style={{
                padding: '6px 14px', borderRadius: 100, border: '1px solid rgba(204,255,0,0.30)',
                background: 'rgba(204,255,0,0.08)', color: '#CCFF00',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,255,0,0.18)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(204,255,0,0.20)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(204,255,0,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {c.label}
                {c.sub && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.65 }}>{c.sub}</span>}
              </button>
            ))}
          </div>

          {/* Custom topic input */}
          {allowCustom && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitCustom()}
                placeholder="Ou digite seu próprio tema…"
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.80)', fontSize: 12, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={submitCustom}
                disabled={!customVal.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 100, border: 'none', cursor: customVal.trim() ? 'pointer' : 'not-allowed',
                  background: customVal.trim() ? '#CCFF00' : 'rgba(255,255,255,0.08)',
                  color: customVal.trim() ? '#07070B' : 'rgba(255,255,255,0.25)',
                  fontSize: 12, fontWeight: 700, transition: 'all 150ms ease',
                }}
              >
                Usar →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Blueprint card ────────────────────────────────────────────────────────────

function BlueprintCard({ bp, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(bp)} style={{
      padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
      background: selected ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.07)'}`,
      boxShadow: selected ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
      transition: 'all 200ms ease', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#a78bfa' : 'rgba(255,255,255,0.80)' }}>{bp.name}</span>
        {selected && <Check size={14} color="#a78bfa" />}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{bp.description}</p>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>{bp.sections?.length} seções</p>
    </button>
  )
}

// ── Voice card ────────────────────────────────────────────────────────────────

function VoiceCard({ voice, selected, onSelect }) {
  const genderColor = { F: '#FF3366', M: '#00D4FF', N: '#FFB800' }
  return (
    <button onClick={() => onSelect(voice)} style={{
      padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
      background: selected ? 'rgba(0,255,185,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? 'rgba(0,255,185,0.35)' : 'rgba(255,255,255,0.07)'}`,
      transition: 'all 200ms ease', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Mic size={13} color={selected ? '#00FFB9' : '#8B5CF6'} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#00FFB9' : 'rgba(255,255,255,0.80)' }}>{voice.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100,
          background: `${genderColor[voice.gender]}20`, color: genderColor[voice.gender], marginLeft: 'auto',
        }}>{voice.gender}</span>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{voice.description}</p>
    </button>
  )
}

// ── Script section viewer ─────────────────────────────────────────────────────

const SECTION_COLORS = {
  intro:      { bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)', color: '#a78bfa' },
  product:    { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)', color: '#818cf8' },
  comparison: { bg: 'rgba(0,212,255,0.10)',  border: 'rgba(0,212,255,0.25)',  color: '#00D4FF' },
  pros_cons:  { bg: 'rgba(255,184,0,0.10)',  border: 'rgba(255,184,0,0.25)',  color: '#FFB800' },
  demo:       { bg: 'rgba(255,107,43,0.10)', border: 'rgba(255,107,43,0.25)', color: '#FF6B2B' },
  verdict:    { bg: 'rgba(0,255,185,0.10)',  border: 'rgba(0,255,185,0.25)',  color: '#00FFB9' },
  cta:        { bg: 'rgba(255,51,102,0.10)', border: 'rgba(255,51,102,0.25)', color: '#FF3366' },
}

function ScriptSection({ section, index }) {
  const [open, setOpen] = useState(index < 2)
  const c = SECTION_COLORS[section.type] ?? SECTION_COLORS.product
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: c.bg, border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100,
          background: c.border, color: c.color, textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
        }}>{section.type}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', flex: 1 }}>{section.label}</span>
        {open ? <ChevronUp size={14} color="rgba(255,255,255,0.35)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.35)" />}
      </button>
      {open && (
        <div style={{ padding: '12px 16px', background: 'rgba(15,15,22,0.60)', fontSize: 13,
          color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, whiteSpace: 'pre-wrap',
        }}>
          {section.content || <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Sem conteúdo</span>}
        </div>
      )}
    </div>
  )
}

// ── Progress bar at top ───────────────────────────────────────────────────────

const PHASES = [
  { id: 'chat',   label: 'Tópico',    icon: Sparkles },
  { id: 'config', label: 'Blueprint', icon: FileText },
  { id: 'exec',   label: 'Geração',   icon: Zap },
  { id: 'result', label: 'Pronto!',   icon: Check },
]

function WizardProgress({ phase }) {
  const idx = PHASES.findIndex(p => p.id === phase)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {PHASES.map((p, i) => {
        const done    = i < idx
        const active  = i === idx
        const pending = i > idx
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', flex: i < PHASES.length - 1 ? 1 : 'unset' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'rgba(0,255,185,0.18)' : active ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${done ? '#00FFB9' : active ? '#8B5CF6' : 'rgba(255,255,255,0.10)'}`,
                boxShadow: active ? '0 0 20px rgba(139,92,246,0.30)' : 'none',
                transition: 'all 400ms ease',
              }}>
                {done
                  ? <Check size={15} color="#00FFB9" />
                  : <p.icon size={15} color={active ? '#a78bfa' : 'rgba(255,255,255,0.25)'} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: done ? '#00FFB9' : active ? '#a78bfa' : 'rgba(255,255,255,0.22)',
              }}>{p.label}</span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22,
                background: done ? 'linear-gradient(90deg,#00FFB9,rgba(139,92,246,0.40))' : 'rgba(255,255,255,0.07)',
                transition: 'background 400ms ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Wizard component ─────────────────────────────────────────────────────

export default function Wizard() {
  // ── data ──
  const { data: trendsData } = useApi('/mining/trends')
  const { data: savedBps }   = useApi('/blueprints')
  const trends    = trendsData?.trends ?? []
  const userBps   = (savedBps?.blueprints ?? []).map(bp => ({
    ...bp,
    description: bp.description ?? `${bp.sections?.length ?? 0} seções personalizadas`,
    format: bp.format ?? 'longform',
  }))

  // ── phase state ──
  const [phase,     setPhase]     = useState('chat')   // 'chat'|'config'|'exec'|'result'
  const [chatStep,  setChatStep]  = useState(0)        // 0=topic, 1=format, 2=done
  const [messages,  setMessages]  = useState([])
  const [picks,     setPicks]     = useState({ topic: null, format: null })

  // ── config state ──
  const [blueprint, setBlueprint] = useState(null)
  const [voice,     setVoice]     = useState(OPENAI_VOICES[0])
  const [language,  setLanguage]  = useState('pt')                     // script/voiceover language
  const [genCtx,    setGenCtx]    = useState({ catalogIds: [] })       // reused by the language follow-up
  const [wizLangDone, setWizLangDone] = useState([])                   // language codes already produced
  const [wizLangBusy, setWizLangBusy] = useState(null)                 // language code currently producing

  // ── exec state ──
  const [execStatus, setExecStatus] = useState({
    mining: 'pending', script: 'pending', voiceover: 'pending',
  })
  const [execDetail, setExecDetail] = useState({ mining: '', script: '', voiceover: '' })
  const [execError,  setExecError]  = useState(null)

  // ── result state ──
  const [result, setResult] = useState({ script: null, voiceover: null })

  const chatBottom = useRef(null)

  // ── Seed first AI message (runs once; re-runs if API trends arrive later) ──
  useEffect(() => {
    if (messages.length > 0 && chatStep > 0) return // already past topic step
    const apiChoices  = trends.map(t => ({ label: t.keyword ?? t, value: t.keyword ?? t }))
    const allChoices  = apiChoices.length > 0 ? apiChoices.slice(0, 8) : FALLBACK_TRENDS.map(t => ({ label: t, value: t }))
    const text = apiChoices.length > 0
      ? 'Olá! Vou te guiar na criação de um conteúdo completo — do produto ao áudio.\n\nEscolha um desses tópicos em alta no Mercado Livre:'
      : 'Olá! Vou te guiar na criação de um conteúdo completo — do produto ao áudio.\n\nEscolha um nicho popular ou digite o seu próprio tema:'
    setMessages([{ role: 'ai', text, choices: allChoices, allowCustom: true }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trends])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Handle user picking a chat choice ──
  function handlePick(choice) {
    const isTopicStep  = chatStep === 0
    const isFormatStep = chatStep === 1

    if (isTopicStep) {
      setPicks(p => ({ ...p, topic: choice.value }))
      setMessages(prev => [
        ...prev.map((m, i) => i === prev.length - 1 ? { ...m, choices: null } : m), // lock choices
        { role: 'user', text: choice.label },
        {
          role: 'ai',
          text: `Ótima escolha! **${choice.label}** tem alto potencial de comissão e conversão.\n\nQual formato de conteúdo prefere criar?`,
          choices: [
            { label: 'Vídeo Longo', value: 'longform', sub: '8–15 min YouTube' },
            { label: 'Short / Reels', value: 'shortform', sub: '45–90s' },
          ],
        },
      ])
      setChatStep(1)
    } else if (isFormatStep) {
      const fmt = choice.value
      setPicks(p => ({ ...p, format: fmt }))
      setMessages(prev => [
        ...prev.map((m, i) => i === prev.length - 1 ? { ...m, choices: null } : m),
        { role: 'user', text: choice.label },
        {
          role: 'ai',
          text: `Perfeito! Vou criar um ${fmt === 'longform' ? 'roteiro longo' : 'short'} sobre **${picks.topic}**.\n\nAgora escolha o blueprint e a voz para a narração — depois é só apertar e eu cuido do resto.`,
          choices: null,
        },
      ])
      setChatStep(2)
      // Small delay before transitioning so user can read the message
      setTimeout(() => setPhase('config'), 1400)
    }
  }

  // ── Exec pipeline ──
  // Build the /scripts/generate payload for a given language + product set.
  // Shared by the pipeline and the "another language" follow-up.
  function buildScriptPayload(lang, catalogIds = []) {
    const bpIsBuiltIn = LONGFORM_BLUEPRINTS.concat(SHORTFORM_BLUEPRINTS).find(b => b.id === blueprint?.id)
    return {
      language: lang,
      ...(catalogIds.length > 0 ? { catalogIds } : {}),
      ...(bpIsBuiltIn || !blueprint?.id
        ? { blueprintData: blueprint ?? buildAutoBlueprint(picks.topic, picks.format) }
        : { blueprintId: blueprint.id }),
    }
  }

  async function runPipeline() {
    setPhase('exec')
    setExecError(null)

    let sessionId, products, script, voiceover

    // ── Step 1: Mining ──
    try {
      setExecStatus(s => ({ ...s, mining: 'running' }))
      setExecDetail(d => ({ ...d, mining: `Buscando produtos de "${picks.topic}"…` }))
      const mineResult = await apiPost('/mining/run', {
        marketplace: 'google_shopping',
        category:    picks.topic,
        sortBy:      'relevance',
      })
      sessionId = mineResult.sessionId
      setExecStatus(s => ({ ...s, mining: 'done' }))
      setExecDetail(d => ({ ...d, mining: `${mineResult.count ?? '?'} produtos encontrados` }))
    } catch (e) {
      setExecStatus(s => ({ ...s, mining: 'error' }))
      setExecError(`Mineração falhou: ${e.message}`)
      return
    }

    // ── Fetch products from session ──
    let catalogIds = []
    try {
      const catalogRes = await fetch(`/api/mining/catalog?sessionId=${sessionId}`)
      const catalogData = await catalogRes.json()
      products = (catalogData.products ?? []).slice(0, 5)
      catalogIds = products.map(p => p.id).filter(Boolean)
    } catch (_) {
      // Non-fatal — script service can use recent catalog anyway
    }

    // ── Step 2: Script ──
    try {
      setExecStatus(s => ({ ...s, script: 'running' }))
      setExecDetail(d => ({ ...d, script: 'Estruturando roteiro com IA…' }))

      setGenCtx({ catalogIds })
      script = await apiPost('/scripts/generate', buildScriptPayload(language, catalogIds))
      setWizLangDone([normalizeLang(language)])
      setExecStatus(s => ({ ...s, script: 'done' }))
      setExecDetail(d => ({ ...d, script: `"${script.title ?? 'Roteiro gerado'}"` }))
    } catch (e) {
      setExecStatus(s => ({ ...s, script: 'error' }))
      setExecError(`Script falhou: ${e.message}`)
      return
    }

    // ── Step 3: Voiceover ──
    try {
      setExecStatus(s => ({ ...s, voiceover: 'running' }))
      setExecDetail(d => ({ ...d, voiceover: `Narrando com voz ${voice.label}…` }))

      voiceover = await apiPost('/voiceover/generate', {
        scriptId:   script.id,
        provider:   voice.provider ?? 'openai',
        voiceId:    voice.id,
        voiceLabel: voice.label,
      })
      setExecStatus(s => ({ ...s, voiceover: 'done' }))
      setExecDetail(d => ({ ...d, voiceover: `Duração: ${voiceover.duration ?? '—'}` }))
    } catch (e) {
      setExecStatus(s => ({ ...s, voiceover: 'error' }))
      setExecError(`Narração falhou: ${e.message}`)
      // Still show script even if voice fails
      setResult({ script, voiceover: null })
      setPhase('result')
      return
    }

    setResult({ script, voiceover })
    setTimeout(() => setPhase('result'), 600)
  }

  // Follow-up: recreate the script + narration in another language, reusing the
  // same products and voice. Opt-in — one click is one extra full generation.
  async function handleWizardLanguage(code) {
    const lang = normalizeLang(code)
    setWizLangBusy(lang); setExecError(null)
    try {
      const script = await apiPost('/scripts/generate', buildScriptPayload(lang, genCtx.catalogIds))
      let voiceover = null
      try {
        voiceover = await apiPost('/voiceover/generate', {
          scriptId:   script.id,
          provider:   voice.provider ?? 'openai',
          voiceId:    voice.id,
          voiceLabel: voice.label,
        })
      } catch { /* keep the script even if narration fails */ }
      setResult({ script, voiceover })
      setWizLangDone(prev => (prev.includes(lang) ? prev : [...prev, lang]))
    } catch (e) {
      setExecError(`Variação em ${lang.toUpperCase()} falhou: ${e.message}`)
    } finally {
      setWizLangBusy(null)
    }
  }

  // ── Auto-blueprint when user picks "on the fly" ──
  function buildAutoBlueprint(topic, format) {
    if (format === 'shortform') return {
      name: `Short: ${topic}`,
      sections: [
        { type: 'intro',   label: 'Hook',    duration: 5,  instructions: `Gancho poderoso sobre ${topic} que para o scroll.` },
        { type: 'product', label: 'Produto', duration: 30, instructions: 'Nome, preço, benefício principal e onde comprar.' },
        { type: 'cta',     label: 'CTA',     duration: 10, instructions: 'Link na bio, salva o vídeo, comenta sua dúvida!' },
      ],
    }
    return {
      name: `Review: ${topic}`,
      sections: [
        { type: 'intro',   label: 'Abertura',       duration: 60,  instructions: `Hook com a dor que ${topic} resolve.` },
        { type: 'product', label: 'Produto Destaque',duration: 120, instructions: 'Análise completa, prós, contras e preço.' },
        { type: 'product', label: 'Alternativa',     duration: 90,  instructions: 'Opção mais barata ou mais cara — compare.' },
        { type: 'verdict', label: 'Veredicto',       duration: 60,  instructions: 'Para quem cada um vale e link na descrição.' },
        { type: 'cta',     label: 'CTA',             duration: 30,  instructions: 'Inscrição, like e links.' },
      ],
    }
  }

  // ── Reset ──
  function restart() {
    setPhase('chat')
    setChatStep(0)
    setMessages([])
    setPicks({ topic: null, format: null })
    setBlueprint(null)
    setVoice(OPENAI_VOICES[0])
    setExecStatus({ mining: 'pending', script: 'pending', voiceover: 'pending' })
    setExecDetail({ mining: '', script: '', voiceover: '' })
    setExecError(null)
    setResult({ script: null, voiceover: null })
    setLanguage('pt')
    setGenCtx({ catalogIds: [] })
    setWizLangDone([])
    setWizLangBusy(null)
  }

  // ── Blueprint options for config phase ──
  const bpOptions = picks.format === 'shortform'
    ? [...SHORTFORM_BLUEPRINTS, ...userBps.filter(b => b.format === 'shortform')]
    : [...LONGFORM_BLUEPRINTS,  ...userBps.filter(b => b.format !== 'shortform')]

  const autoOption = {
    id: '__auto',
    name: 'Criar na hora (IA)',
    description: `Blueprint gerado automaticamente para "${picks.topic ?? 'o tópico escolhido'}" baseado no formato selecionado`,
    sections: [],
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-up" style={{ maxWidth: 740, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .wizard-pop { animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Pipeline</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(204,255,0,0.15)', border: '1px solid rgba(204,255,0,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wand2 size={16} color="#CCFF00" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em' }}>Wizard de Conteúdo</h1>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>Tópico trending → produtos → roteiro → narração — tudo em minutos</p>
      </div>

      {/* Progress */}
      <WizardProgress phase={phase} />

      {/* ── PHASE: CHAT ── */}
      {phase === 'chat' && (
        <div className="wizard-pop">
          <div style={{
            background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: '24px 24px 20px', backdropFilter: 'blur(16px)',
            minHeight: 360, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {messages.map((msg, i) => (
                <Bubble
                  key={i}
                  role={msg.role}
                  text={msg.text}
                  choices={i === messages.length - 1 ? msg.choices : null}
                  allowCustom={i === messages.length - 1 ? (msg.allowCustom ?? false) : false}
                  picked={chatStep > (i === 0 ? 0 : 1)}
                  onPick={handlePick}
                />
              ))}
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} color="#8B5CF6" />
                  <p style={{ fontSize: 12 }}>Carregando tópicos em alta…</p>
                </div>
              )}
              <div ref={chatBottom} />
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE: CONFIG ── */}
      {phase === 'config' && (
        <div className="wizard-pop" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Blueprint picker */}
          <div style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', marginBottom: 14 }}>
              <FileText size={11} style={{ display: 'inline', marginRight: 6 }} />Blueprint
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {bpOptions.map(bp => (
                <BlueprintCard key={bp.id} bp={bp} selected={blueprint?.id === bp.id} onSelect={setBlueprint} />
              ))}
              <BlueprintCard bp={autoOption} selected={blueprint?.id === '__auto'} onSelect={setBlueprint} />
            </div>
          </div>

          {/* Voice picker */}
          <div style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', marginBottom: 14 }}>
              <Volume2 size={11} style={{ display: 'inline', marginRight: 6 }} />Voz da narração
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {OPENAI_VOICES.map(v => (
                <VoiceCard key={v.id} voice={v} selected={voice?.id === v.id} onSelect={setVoice} />
              ))}
            </div>
          </div>

          {/* Language picker */}
          <div style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', marginBottom: 14 }}>
              <Languages size={11} style={{ display: 'inline', marginRight: 6 }} />Idioma
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {LANGUAGES.map(l => {
                const active = language === l.code
                return (
                  <button key={l.code} onClick={() => setLanguage(l.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12,
                      border: `1px solid ${active ? 'rgba(204,255,0,0.40)' : 'rgba(255,255,255,0.08)'}`,
                      background: active ? 'rgba(204,255,0,0.06)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 160ms ease',
                    }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                      background: active ? 'rgba(204,255,0,0.15)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#CCFF00' : 'rgba(255,255,255,0.55)',
                    }}>{l.chip}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{l.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={runPipeline}
            disabled={!blueprint}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: blueprint ? 'pointer' : 'not-allowed',
              background: blueprint ? '#CCFF00' : 'rgba(255,255,255,0.08)',
              color: blueprint ? '#07070B' : 'rgba(255,255,255,0.25)',
              fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: blueprint ? '0 0 28px rgba(204,255,0,0.25)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            <Zap size={16} />
            {blueprint ? 'Gerar Conteúdo Completo' : 'Escolha um blueprint para continuar'}
          </button>
        </div>
      )}

      {/* ── PHASE: EXEC ── */}
      {phase === 'exec' && (
        <div className="wizard-pop" style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 28, backdropFilter: 'blur(16px)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)', marginBottom: 6 }}>
            Gerando seu conteúdo…
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
            Sobre <strong style={{ color: '#CCFF00' }}>{picks.topic}</strong> · {picks.format === 'longform' ? 'Vídeo Longo' : 'Short/Reels'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ExecRow icon={ShoppingBag} label="Mineração de produtos" status={execStatus.mining} detail={execDetail.mining} />
            <ExecRow icon={FileText}    label="Geração de roteiro"    status={execStatus.script}   detail={execDetail.script}   />
            <ExecRow icon={Mic}         label="Narração com IA"       status={execStatus.voiceover} detail={execDetail.voiceover} />
          </div>

          {execError && (
            <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,51,102,0.10)', border: '1px solid rgba(255,51,102,0.25)', fontSize: 12, color: '#FF3366' }}>
              {execError}
              <button onClick={restart} style={{ marginLeft: 12, fontSize: 12, color: '#FF3366', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE: RESULT ── */}
      {phase === 'result' && result.script && (
        <div className="wizard-pop" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Summary card */}
          <div style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(0,255,185,0.18)', borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 4 }}>Conteúdo Pronto</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>{result.script.title ?? 'Roteiro gerado'}</h2>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 100, background: 'rgba(204,255,0,0.12)', border: '1px solid rgba(204,255,0,0.28)', color: '#CCFF00', fontWeight: 700 }}>
                  {picks.format === 'longform' ? 'Longo' : 'Short'}
                </span>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 100, background: 'rgba(0,255,185,0.10)', border: '1px solid rgba(0,255,185,0.25)', color: '#00FFB9', fontWeight: 700 }}>
                  {picks.topic}
                </span>
              </div>
            </div>

            {/* Audio player */}
            {result.voiceover?.audioUrl ? (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.20)', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Radio size={13} color="#8B5CF6" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                    Narração · {voice.label} · {result.voiceover.duration ?? '—'}
                  </span>
                </div>
                <AudioPlayer url={result.voiceover.audioUrl} />
              </div>
            ) : (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.20)', fontSize: 12, color: '#FFB800' }}>
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />Narração não gerada — verifique as configurações de API Key em Configurações.
              </div>
            )}
          </div>

          {/* Script sections */}
          <div style={{ background: 'rgba(15,15,22,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, backdropFilter: 'blur(16px)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.30)', marginBottom: 16 }}>
              <FileText size={11} style={{ display: 'inline', marginRight: 6 }} />Roteiro — {result.script.sections?.length ?? 0} seções
            </p>
            {(result.script.sections ?? []).map((s, i) => (
              <ScriptSection key={i} section={s} index={i} />
            ))}
            {(!result.script.sections?.length && result.script.text) && (
              <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
                {result.script.text}
              </pre>
            )}
          </div>

          {/* Opt-in: generate this content in another language */}
          <LanguageFollowUp
            title="Gerar este conteúdo em outro idioma?"
            subtitle="Recria o roteiro e a narração para o idioma escolhido, com os mesmos produtos e a mesma voz. Cada idioma é uma geração separada."
            currentCode={normalizeLang(language)}
            options={otherLanguages(language).map(l => l.code)}
            doneCodes={wizLangDone}
            busyCode={wizLangBusy}
            onPick={handleWizardLanguage}
          />

          {/* Restart */}
          <button
            onClick={restart}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.50)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)' }}
          >
            <RotateCcw size={14} /> Criar outro conteúdo
          </button>
        </div>
      )}
    </div>
  )
}
