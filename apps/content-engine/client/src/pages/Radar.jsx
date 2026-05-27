import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Video, Clapperboard, DollarSign, TrendingUp,
  Target, Zap, Users, ChevronDown, ChevronUp, Play,
  RefreshCw, AlertTriangle, Radar, ChevronLeft, ChevronRight,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'

// ── Saturation badge ─────────────────────────────────────────────────────────
function SatBadge({ sat }) {
  const styles = {
    baixa: { bg: 'rgba(0,255,185,0.10)', color: '#00FFB9', border: '1px solid rgba(0,255,185,0.25)' },
    média: { bg: 'rgba(255,184,0,0.10)',  color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)' },
    alta:  { bg: 'rgba(255,51,102,0.10)', color: '#FF3366', border: '1px solid rgba(255,51,102,0.25)' },
  }
  const s = styles[sat?.toLowerCase()] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: s.bg, color: s.color, border: s.border, textTransform: 'capitalize' }}>
      {sat}
    </span>
  )
}

// ── Ticket type badge ────────────────────────────────────────────────────────
function TicketBadge({ type }) {
  const styles = {
    'baixo ticket impulso':     { bg: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)' },
    'médio ticket considerado': { bg: 'rgba(255,184,0,0.10)',  color: '#FFB800', border: '1px solid rgba(255,184,0,0.22)'  },
    'alto ticket considerado':  { bg: 'rgba(255,107,43,0.10)', color: '#FF6B2B', border: '1px solid rgba(255,107,43,0.22)' },
  }
  const s = styles[type?.toLowerCase()] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.08)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: s.bg, color: s.color, border: s.border }}>
      {type}
    </span>
  )
}

// ── Score bar row ─────────────────────────────────────────────────────────────
function ScoreBar({ label, icon: Icon, value, accent }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(255,255,255,0.35)' }}>
          <Icon size={10} /> {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: "'JetBrains Mono',monospace" }}>{value}/10</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${value * 10}%`, background: accent, transition: 'width 0.6s cubic-bezier(0.19,1,0.22,1)' }} />
      </div>
    </div>
  )
}

// ── Product image strip (lazy-fetched) ────────────────────────────────────────
function ProductStrip({ category }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const stripRef              = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/mining/thumbnails?q=${encodeURIComponent(category)}&limit=8`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setItems(d.items ?? []); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category])

  function scroll(dir) {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            width: 80, height: 80, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      {/* Left arrow */}
      <button onClick={() => scroll(-1)} style={{
        position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(7,7,11,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
      }}><ChevronLeft size={12} /></button>

      {/* Strip */}
      <div ref={stripRef} style={{
        display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
        padding: '2px 4px', scrollSnapType: 'x mandatory',
      }}>
        {items.map(item => (
          <a key={item.id} href={item.permalink} target="_blank" rel="noopener noreferrer"
            title={item.title}
            style={{
              flexShrink: 0, width: 80, height: 80, borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.07)', display: 'block',
              background: 'rgba(255,255,255,0.04)', scrollSnapAlign: 'start',
              transition: 'transform 150ms, border-color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.borderColor = 'rgba(204,255,0,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </a>
        ))}
      </div>

      {/* Right arrow */}
      <button onClick={() => scroll(1)} style={{
        position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 24, height: 24, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(7,7,11,0.90)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
      }}><ChevronRight size={12} /></button>
    </div>
  )
}

// ── Niche card (unified long + short form) ────────────────────────────────────
function NicheCard({ niche, isShort, onMine }) {
  const [expanded, setExpanded] = useState(false)

  const scores     = niche.scores ?? {}
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  // Pick 4 score keys based on format
  const scoreDefs = isShort
    ? [
        { key: 'earningPotential', label: '$ Comissão', icon: DollarSign, accent: '#00FFB9' },
        { key: 'viralPotential',   label: '↗ Viral',    icon: TrendingUp, accent: '#CCFF00' },
        { key: 'beginnerFriendly', label: '⚡ Fácil',   icon: Zap,        accent: '#a78bfa' },
        { key: 'evergreen',        label: '◉ Perene',   icon: Target,     accent: '#60a5fa' },
      ]
    : [
        { key: 'earningPotential', label: '$ Comissão',  icon: DollarSign, accent: '#00FFB9' },
        { key: 'retention',        label: '↗ Retenção',  icon: TrendingUp, accent: '#CCFF00' },
        { key: 'researchability',  label: '◎ Pesquisa',  icon: Target,     accent: '#a78bfa' },
        { key: 'evergreen',        label: '◉ Perenidade',icon: Zap,        accent: '#60a5fa' },
      ]

  const expandDetails = isShort
    ? [
        { icon: Clapperboard, label: 'Melhor estilo de vídeo',       value: niche.bestVideoStyle },
        { icon: Video,        label: 'Ângulo mais fácil',             value: niche.easiestContentAngle },
        { icon: Users,        label: 'Público-alvo',                  value: niche.targetAudience },
        { icon: Zap,          label: 'Por que funciona no short-form',value: niche.whyItFitsShortForm },
      ]
    : [
        { icon: Users,  label: 'Público-alvo',           value: niche.targetAudience },
        { icon: Target, label: 'Ângulo da review',        value: niche.reviewAngle },
        { icon: Zap,    label: 'Por que encaixa no canal',value: niche.whyItFits },
      ]

  const accentColor = isShort ? '#FF3366' : '#8B5CF6'

  return (
    <div style={{
      background: 'rgba(15,15,22,0.75)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Rank circle */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${accentColor}22`, border: `1px solid ${accentColor}55`,
              fontSize: 12, fontWeight: 900, color: accentColor,
            }}>{niche.rank}</div>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.90)', lineHeight: 1.25, margin: 0 }}>
              {niche.category}
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <SatBadge sat={niche.saturation} />
            <span style={{
              fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 100,
              background: 'rgba(204,255,0,0.10)', border: '1px solid rgba(204,255,0,0.28)',
              color: '#CCFF00', fontFamily: "'JetBrains Mono',monospace",
            }}>{totalScore} pts</span>
          </div>
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
            background: 'rgba(0,255,185,0.10)', border: '1px solid rgba(0,255,185,0.22)', color: '#00FFB9',
          }}>
            <DollarSign size={10} /> {niche.commissionRange}
          </span>
          {niche.ticketType  && <TicketBadge type={niche.ticketType} />}
          {niche.salesType   && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', padding: '3px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>{niche.salesType}</span>}
        </div>
      </div>

      {/* ── Product image strip ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 16px' }}>
        <ProductStrip category={niche.category} />
      </div>

      {/* ── Score bars ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
        {scoreDefs.map(({ key, label, icon, accent }) => (
          <ScoreBar key={key} label={label} icon={icon} value={scores[key] ?? 0} accent={accent} />
        ))}
      </div>

      {/* ── Hook ─────────────────────────────────────────────────────────────── */}
      <div style={{ margin: '0 20px 16px', padding: '12px 14px', borderRadius: 12, background: `${accentColor}0D`, border: `1px solid ${accentColor}33` }}>
        <p style={{ fontSize: 9, fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          ⚡ Gancho — Primeiros 3 Segundos
        </p>
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.70)', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
          "{niche.hook}"
        </p>
      </div>

      {/* ── Expand toggle ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px' }}>
        <button onClick={() => setExpanded(e => !e)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, color: '#8B5CF6',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12,
        }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ocultar detalhes' : 'Ver análise completa'}
        </button>

        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {expandDetails.filter(d => d.value).map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  <Icon size={10} /> {label}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, margin: 0 }}>{value}</p>
              </div>
            ))}
            {niche.seoTitle && (
              <p style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.28)', paddingLeft: 4 }}>
                SEO: "{niche.seoTitle}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Mine CTA ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px 20px', marginTop: 'auto' }}>
        <button
          onClick={() => onMine(niche)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            fontSize: 13, fontWeight: 800, padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
            border: 'none', background: '#CCFF00', color: '#07070B',
            transition: 'box-shadow 180ms, background 180ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#d4f500'; e.currentTarget.style.boxShadow = '0 0 22px rgba(204,255,0,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#CCFF00'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <Play size={13} /> Minerar produtos desta categoria
        </button>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function AnalysisSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 16 }}>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', animation: 'spin 1s linear infinite',
          background: 'conic-gradient(from 0deg, #8B5CF6 0deg, #CCFF00 120deg, transparent 120deg)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)',
          mask:       'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)',
        }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: 0 }}>Escaneando o mercado brasileiro…</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>Isso leva alguns segundos</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RadarDeNichos() {
  const navigate = useNavigate()

  const [format,  setFormat]  = useState('longform')
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const report  = reports[format] ?? null
  const isShort = format === 'shortform'

  async function handleGenerate() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/mining/niches/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar recomendações')
      setReports(prev => ({ ...prev, [format]: data }))
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  function handleMine(niche) {
    navigate('/mining', { state: { autoCategory: niche.category } })
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Pipeline"
        title="Radar de Nichos"
        description="IA analisa o mercado BR e aponta os nichos com maior potencial de monetização e viralidade"
        action={
          report ? (
            <button onClick={handleGenerate} disabled={loading}
              className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          ) : null
        }
      />

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, borderRadius: 12, padding: '10px 14px', marginBottom: 24, color: '#FF3366', background: 'rgba(255,51,102,0.07)', border: '1px solid rgba(255,51,102,0.28)' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Format toggle ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 16, width: 'fit-content', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'longform',  label: 'Vídeos Longos', icon: <Video size={13} /> },
          { id: 'shortform', label: 'Vídeos Curtos',  icon: <Clapperboard size={13} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFormat(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              transition: 'all 180ms',
              background: format === tab.id
                ? (tab.id === 'shortform' ? 'rgba(255,51,102,0.14)' : 'rgba(255,255,255,0.09)')
                : 'transparent',
              color: format === tab.id
                ? (tab.id === 'shortform' ? '#FF3366' : 'rgba(255,255,255,0.90)')
                : 'rgba(255,255,255,0.35)',
              boxShadow: format === tab.id ? '0 1px 6px rgba(0,0,0,0.35)' : 'none',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────────── */}
      {!report && !loading && (
        <div className="card p-8">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isShort ? 'rgba(255,51,102,0.10)' : 'rgba(139,92,246,0.10)',
              border:     isShort ? '1px solid rgba(255,51,102,0.22)' : '1px solid rgba(139,92,246,0.22)',
            }}>
              {isShort
                ? <Clapperboard size={30} style={{ color: '#FF3366' }} />
                : <Radar        size={30} style={{ color: '#8B5CF6' }} />}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.88)', marginBottom: 8 }}>
                {isShort ? 'Descubra nichos virais para Shorts e Reels' : 'Descubra os nichos com maior potencial de monetização'}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6 }}>
                {isShort
                  ? 'A IA analisa tendências, potencial viral, facilidade de produção e comissão de afiliado.'
                  : 'A IA analisa o mercado brasileiro e aponta nichos com maior comissão, retenção e oportunidade evergreen.'}
              </p>
            </div>
            <button onClick={handleGenerate} disabled={loading} className="btn-primary px-8 py-3">
              <Sparkles size={15} /> Gerar Recomendações
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────────────── */}
      {loading && <div className="card"><AnalysisSpinner /></div>}

      {/* ── Results ────────────────────────────────────────────────────────────── */}
      {report && !loading && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
              {(report.niches ?? []).length} nichos encontrados
            </span>
            <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {(report.niches ?? []).map(niche => (
              <NicheCard key={niche.rank} niche={niche} isShort={isShort} onMine={handleMine} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
