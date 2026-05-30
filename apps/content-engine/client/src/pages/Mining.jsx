import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Play, RefreshCw, ShoppingBag, AlertTriangle, CheckCircle2,
  ExternalLink, Link2, Check, X, Pencil, Search, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, Users, DollarSign, Target, Zap, Video, Clapperboard,
  Trash2, BarChart2, Star, Truck, Award, Filter, SlidersHorizontal, Tag,
  Package, Flame, Trophy, ArrowUpRight, ChevronRight, XCircle, BookOpen, Layers,
  LayoutGrid, List, Database, Loader2, FolderOpen, Tag as TagIcon, Save, FolderPlus,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'
import { AILoadingOverlay, friendlyError } from './Scripts.jsx'

const MINING_STEPS = [
  { icon: '🛒', label: 'Acessando marketplaces…' },
  { icon: '📊', label: 'Analisando tendências de busca…' },
  { icon: '⭐', label: 'Filtrando por avaliações e reviews…' },
  { icon: '💰', label: 'Calculando potencial de comissão…' },
  { icon: '🎯', label: 'Selecionando os melhores produtos…' },
]

// ── Niche presets ─────────────────────────────────────────────────────────────
const NICHES = [
  { id: 'all',         label: 'Todos',       keywords: [] },
  { id: 'eletronicos', label: '⚡ Eletrônicos', keywords: ['fone', 'headphone', 'smartphone', 'tablet', 'carregador', 'cabo', 'câmera', 'notebook', 'teclado', 'mouse'] },
  { id: 'games',       label: '🎮 Games',     keywords: ['jogo', 'game', 'controle', 'console', 'playstation', 'xbox', 'nintendo', 'gamer', 'headset'] },
  { id: 'fitness',     label: '💪 Fitness',   keywords: ['musculação', 'academia', 'proteína', 'whey', 'suplemento', 'haltere', 'esteira', 'bike', 'yoga'] },
  { id: 'casa',        label: '🏠 Casa',      keywords: ['cozinha', 'sala', 'decoração', 'organização', 'limpeza', 'cafeteira', 'aspirador', 'ventilador', 'ar'] },
  { id: 'beleza',      label: '💄 Beleza',    keywords: ['cabelo', 'skin care', 'maquiagem', 'perfume', 'cuidado', 'hidratante', 'secador', 'escova'] },
  { id: 'pets',        label: '🐾 Pets',      keywords: ['cachorro', 'gato', 'pet', 'ração', 'brinquedo animal', 'coleira', 'cama pet'] },
  { id: 'informatica', label: '💻 Informática', keywords: ['monitor', 'ssd', 'memoria ram', 'placa de vídeo', 'processador', 'impressora', 'webcam'] },
  { id: 'som',         label: '🔊 Áudio',     keywords: ['caixa de som', 'speaker', 'soundbar', 'subwoofer', 'amplificador', 'microfone'] },
]

const SORT_OPTIONS = [
  { id: 'score',      label: '🏆 Maior Score' },
  { id: 'sold',       label: '🔥 Mais Vendidos' },
  { id: 'price_asc',  label: '💰 Menor Preço' },
  { id: 'price_desc', label: '💎 Maior Preço' },
  { id: 'rating',     label: '⭐ Melhor Avaliação' },
]

const LISTING_COLORS = {
  gold_pro:      { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Gold Pro' },
  gold_special:  { bg: 'bg-yellow-50',  text: 'text-yellow-700', label: 'Gold Especial' },
  gold:          { bg: 'bg-[#FFB800]/8',   text: 'text-[#FFB800]',  label: 'Gold' },
  silver:        { bg: 'bg-[#0F0F16]/[0.05]',   text: 'text-white/60',   label: 'Silver' },
}

const SELLER_LEVEL_COLORS = {
  '5_green':  'text-green-600',
  '4_light_green': 'text-green-500',
  '3_yellow': 'text-yellow-600',
  '2_orange': 'text-orange-500',
  '1_red':    'text-[#FF3366]',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(price, currency = 'BRL') {
  if (!price) return '—'
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(price)
  } catch {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
  }
}

function fmtNumber(n) {
  if (!n || n === 0) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function scoreColor(score) {
  if (score >= 80) return { bg: 'rgba(0,255,185,0.15)',   border: 'rgba(0,255,185,0.35)',   color: '#00FFB9' }
  if (score >= 60) return { bg: 'rgba(139,92,246,0.18)',  border: 'rgba(139,92,246,0.35)',  color: '#a78bfa' }
  if (score >= 40) return { bg: 'rgba(255,184,0,0.15)',   border: 'rgba(255,184,0,0.35)',   color: '#FFB800' }
  return              { bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)',  color: 'rgba(255,255,255,0.45)' }
}

function discountPct(original, current) {
  if (!original || !current || original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}

// ── Affiliate link inline editor ──────────────────────────────────────────────
function AffiliateLinkEditor({ productId, label, placeholder, initialValue, color, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(initialValue ?? '')
  const [saved,   setSaved]   = useState(false)
  const inputRef              = useRef(null)

  useEffect(() => { setDraft(initialValue ?? '') }, [initialValue])
  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.focus())
  }, [editing])

  async function handleSave() {
    await onSave(productId, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 ${color}`}>{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input ref={inputRef} type="text" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            placeholder={placeholder} autoComplete="off"
            className="input flex-1 min-w-0 text-xs py-1 font-mono" />
          <button onMouseDown={e => e.preventDefault()} onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0"><Check size={11} /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => setEditing(false)}
            className="p-1 text-white/35 hover:bg-[#0F0F16]/[0.05] rounded shrink-0"><X size={11} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {initialValue ? (
            <a href={initialValue} target="_blank" rel="noreferrer"
              className="text-xs text-violet-400 hover:underline font-mono truncate flex-1 flex items-center gap-1">
              {initialValue} <ExternalLink size={9} className="shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-white/25 flex-1">—</span>
          )}
          {saved
            ? <Check size={11} className="text-green-500 shrink-0" />
            : <button onMouseDown={e => e.preventDefault()} onClick={() => setEditing(true)}
                className="p-0.5 rounded hover:bg-[#0F0F16]/[0.05] text-white/25 hover:text-white/40 shrink-0">
                <Pencil size={10} />
              </button>
          }
        </div>
      )}
    </div>
  )
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, blogBonus }) {
  const c = scoreColor(score)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 100,
      fontSize: 11, fontWeight: 800,
      fontFamily: "'JetBrains Mono', monospace",
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}
      title={blogBonus > 0 ? `Plataforma: ${score - blogBonus} + Blog: +${blogBonus}` : undefined}>
      <Trophy size={9} /> {score}
      {blogBonus > 0 && <span style={{ fontSize: 9, opacity: 0.75 }}>+{blogBonus}</span>}
    </span>
  )
}

// ── Competition level badge ───────────────────────────────────────────────────
const COMPETITION_META = {
  low:    { label: 'Baixa Concorrência', color: 'bg-[#00FFB9]/12 text-[#00FFB9]',  desc: 'Nicho com poucos concorrentes — boa oportunidade' },
  medium: { label: 'Concorrência Média', color: 'bg-yellow-100 text-yellow-700', desc: 'Mercado moderado' },
  high:   { label: 'Alta Concorrência',  color: 'bg-red-100 text-[#FF3366]',      desc: 'Mercado saturado — diferenciação necessária' },
}

// ── Circular SVG progress ring ────────────────────────────────────────────────
// Uses the r=15.9155 trick so circumference === 100 exactly.
function CircleProgress({ pct = 0, size = 44, strokeWidth = 3.5, color = '#C1FF2F', label, value }) {
  const r = 15.9155
  const circumference = 100
  const offset = circumference - Math.min(Math.max(pct, 0), 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="18" cy="18" r={r} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
          {/* Progress */}
          <circle cx="18" cy="18" r={r} fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: size < 44 ? 8 : 10,
            fontWeight: 800,
            color,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}>{value}</span>
        </div>
      </div>
      {label && (
        <span style={{
          fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'rgba(255,255,255,0.30)',
        }}>{label}</span>
      )}
    </div>
  )
}

// ── Product card (grid) ───────────────────────────────────────────────────────
function ProductCard({ product, onOpen, onMine }) {
  const soldQty         = product.soldQuantity ?? product.reviews ?? 0
  const discount        = discountPct(product.originalPrice, product.price)
  const listing         = LISTING_COLORS[product.listingType ?? product.listingTypeId]
  const hasFreeShipping = product.freeShipping
  const blogCount       = product.blogReviews?.length ?? 0
  const trustedCount    = product.blogReviews?.filter(r => r?.trusted)?.length ?? 0
  const blogBonus       = product.blogReviewScore ?? 0

  return (
    <div
      onClick={() => onOpen(product)}
      className="bg-[#0F0F16] border border-white/[0.08] rounded-xl overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      {/* Image */}
      <div className="relative h-40 bg-[#0F0F16]/[0.03] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt=""
            className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform" />
        ) : (
          <ShoppingBag size={32} className="text-white/20" />
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-[#FF3366]/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        <div className="absolute top-2 right-2">
          <ScoreBadge score={product.score ?? 0} blogBonus={blogBonus} />
        </div>
        {listing && (
          <span className={`absolute bottom-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${listing.bg} ${listing.text}`}>
            {listing.label}
          </span>
        )}
        {blogCount > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            <BookOpen size={8} /> {blogCount}
            {trustedCount > 0 && <span className="text-purple-200">★</span>}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <p className="text-xs font-medium text-white/80 line-clamp-2 leading-snug">{product.title}</p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#C1FF2F', letterSpacing: '-0.02em' }}>
            {fmtPrice(product.price)}
          </span>
          {discount > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', textDecoration: 'line-through' }}>
              {fmtPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Visual metric rings */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '8px 4px 4px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Score ring */}
          <CircleProgress
            pct={product.score ?? 0}
            value={product.score ?? 0}
            label="Score"
            color={
              (product.score ?? 0) >= 80 ? '#00FFB9' :
              (product.score ?? 0) >= 60 ? '#C1FF2F' :
              (product.score ?? 0) >= 40 ? '#FFB800' :
              'rgba(255,255,255,0.35)'
            }
          />
          {/* Rating ring (0-5 → 0-100%) */}
          <CircleProgress
            pct={(product.rating ?? 0) / 5 * 100}
            value={product.rating > 0 ? product.rating.toFixed(1) : '—'}
            label="Nota"
            color="#FFB800"
          />
          {/* Demand ring: soldQty normalized (cap at 5000) */}
          <CircleProgress
            pct={Math.min((product.soldQuantity ?? product.reviews ?? 0) / 5000 * 100, 100)}
            value={fmtNumber(product.soldQuantity ?? product.reviews ?? 0)}
            label="Vendas"
            color="#818cf8"
          />
        </div>

        {/* Marketplace pill + "Minerar" CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 2 }}>
          <MpPill marketplace={product.marketplace} />
          <button
            onClick={e => { e.stopPropagation(); onMine?.(product) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 8,
              background: 'rgba(193,255,47,0.12)',
              border: '1px solid rgba(193,255,47,0.28)',
              color: '#C1FF2F',
              fontSize: 10, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C1FF2F'; e.currentTarget.style.color = '#07070B'; e.currentTarget.style.boxShadow = '0 0 14px rgba(193,255,47,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(193,255,47,0.12)'; e.currentTarget.style.color = '#C1FF2F'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <Zap size={9} strokeWidth={2.5} /> Minerar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Product drawer ─────────────────────────────────────────────────────────────
function ProductDrawer({ product, onClose, onSaveAffiliateLink, onDelete, affiliateOverrides }) {
  const [generatingLinks, setGeneratingLinks] = useState(false)
  const [linksGenerated,  setLinksGenerated]  = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleGenerateLinks() {
    setGeneratingLinks(true); setLinksGenerated(false)
    try {
      const res  = await fetch(`/api/products/${product.id}/affiliate-links`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar links')
      if (data.amazonAffiliateLink) onSaveAffiliateLink(product.id, 'amazonAffiliateLink', data.amazonAffiliateLink)
      if (data.mlAffiliateLink)     onSaveAffiliateLink(product.id, 'mlAffiliateLink',     data.mlAffiliateLink)
      if (data.affiliateLink)       onSaveAffiliateLink(product.id, 'affiliateLink',        data.affiliateLink)
      setLinksGenerated(true); setTimeout(() => setLinksGenerated(false), 3000)
    } catch (e) { alert(e.message) } finally { setGeneratingLinks(false) }
  }

  if (!product) return null

  const soldQty       = product.soldQuantity ?? product.reviews ?? 0
  const discount      = discountPct(product.originalPrice, product.price)
  const listing       = LISTING_COLORS[product.listingType ?? product.listingTypeId]
  const overrides     = affiliateOverrides[product.id] ?? {}
  const blogReviews   = Array.isArray(product.blogReviews) ? product.blogReviews : []
  const blogBonus     = product.blogReviewScore ?? 0
  const platformScore = (product.score ?? 0) - blogBonus
  const totalScore    = product.score ?? 0
  const affiliateLink = overrides.affiliateLink ?? product.affiliateLink ?? ''
  const productUrl    = product.productUrl ?? ''
  const primaryLink   = affiliateLink || productUrl

  const mpLabel = product.marketplace === 'amazon' ? 'Amazon'
    : product.marketplace === 'mercadolivre' ? 'Mercado Livre'
    : product.marketplace?.replace(/_/g, ' ') ?? ''

  const mpColor = product.marketplace === 'amazon' ? '#FF9900'
    : product.marketplace === 'mercadolivre' ? '#FFE600'
    : 'rgba(255,255,255,0.3)'

  const drawer = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, height: '100%',
        width: '100%', maxWidth: 440,
        background: '#0F0F16',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <X size={15} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: mpColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500, truncate: true }}>{mpLabel}</span>
          </div>
          {primaryLink && (
            <a href={primaryLink} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'rgba(0,255,185,0.10)', color: '#00FFB9', border: '1px solid rgba(0,255,185,0.20)', textDecoration: 'none' }}>
              Ver produto <ExternalLink size={10} />
            </a>
          )}
          <button onClick={() => { onDelete(product.id); onClose() }}
            style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,102,0.10)'; e.currentTarget.style.color = '#FF3366' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}>
            <Trash2 size={13} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>

          {/* ── Hero ── */}
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.imageUrl
                  ? <img src={product.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                  : <ShoppingBag size={22} color="rgba(255,255,255,0.18)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)', lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {product.title}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                  <ScoreBadge score={totalScore} blogBonus={blogBonus} />
                  {listing && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999 }}
                      className={`${listing.bg} ${listing.text}`}>{listing.label}</span>
                  )}
                  {blogBonus > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'rgba(168,85,247,0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <BookOpen size={9} /> +{blogBonus} blog
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>{fmtPrice(product.price)}</span>
                  {discount > 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', textDecoration: 'line-through' }}>{fmtPrice(product.originalPrice)}</span>}
                </div>
                {discount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00FFB9', background: 'rgba(0,255,185,0.12)', padding: '2px 8px', borderRadius: 999 }}>{discount}% off</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Métricas ── */}
          <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <BarChart2 size={11} /> Métricas de Mercado
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: Flame,   label: 'Vendas',      value: soldQty > 0 ? soldQty.toLocaleString('pt-BR') : '—',     color: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
                { icon: Star,    label: 'Avaliação',   value: product.rating > 0 ? `${product.rating} ★` : '—',         color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
                { icon: Truck,   label: 'Frete',       value: product.freeShipping ? 'Grátis ✓' : 'Cobrado',             color: product.freeShipping ? '#4ade80' : 'rgba(255,255,255,0.30)', bg: product.freeShipping ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)' },
                { icon: Package, label: 'Logística',   value: product.fulfillment ? 'Full ✓' : 'Vendedor',               color: product.fulfillment  ? '#818cf8' : 'rgba(255,255,255,0.30)', bg: product.fulfillment  ? 'rgba(129,140,248,0.10)' : 'rgba(255,255,255,0.04)' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <Icon size={10} color={color} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{value}</span>
                </div>
              ))}
            </div>
            {product.sellerLevel && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                <Award size={11} color="rgba(255,255,255,0.30)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>Vendedor</span>
                <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 'auto' }} className={SELLER_LEVEL_COLORS[product.sellerLevel] ?? 'text-white/60'}>
                  {product.sellerLevel?.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          {/* ── Score breakdown ── */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trophy size={11} /> Como o Score foi calculado
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.60)', fontWeight: 500 }}>📦 Dados da plataforma</span>
                  <span style={{ fontWeight: 700, color: '#a78bfa' }}>{platformScore}<span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 400 }}>/100</span></span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 999, width: `${Math.min(100, platformScore)}%`, transition: 'width 0.6s ease' }} />
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>Vendas, tipo de anúncio e reputação do vendedor</p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.60)', fontWeight: 500 }}>📰 Reviews editoriais</span>
                  <span style={{ fontWeight: 700, color: blogBonus > 0 ? '#c084fc' : 'rgba(255,255,255,0.30)' }}>+{blogBonus}<span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 400 }}>/15</span></span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#9333ea,#c084fc)', borderRadius: 999, width: `${Math.min(100, (blogBonus / 15) * 100)}%`, transition: 'width 0.6s ease' }} />
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>
                  {blogReviews.length === 0
                    ? 'Nenhuma review encontrada em blogs especializados'
                    : `${blogReviews.length} review${blogReviews.length > 1 ? 's' : ''} — ${blogReviews.filter(r => r.trusted).length} de fontes confiáveis`}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>Score final</span>
                <span style={{ fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 8 }} className={scoreColor(totalScore)}>{totalScore} pts</span>
              </div>
            </div>
          </div>

          {/* ── Blog reviews ── */}
          {blogReviews.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={11} /> O que a mídia fala
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blogReviews.map((r, i) => (
                  <a key={i} href={r.link} target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', transition: 'border-color 0.2s, background 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {r.trusted && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'rgba(168,85,247,0.20)', color: '#c084fc' }}>✓ confiável</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.source}</span>
                      <ExternalLink size={9} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.snippet}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Links de Afiliado ── */}
          <div style={{ padding: '16px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Link2 size={11} /> Links de Afiliado
              </p>
              <button
                onClick={handleGenerateLinks}
                disabled={generatingLinks || !product.productUrl}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600,
                  padding: '5px 10px', borderRadius: 8, border: `1px solid ${linksGenerated ? 'rgba(0,255,185,0.30)' : 'rgba(255,255,255,0.10)'}`,
                  color: linksGenerated ? '#00FFB9' : generatingLinks ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.50)',
                  background: linksGenerated ? 'rgba(0,255,185,0.06)' : 'transparent',
                  cursor: generatingLinks || !product.productUrl ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}>
                {generatingLinks
                  ? <><Loader2 size={9} className="animate-spin" /> Gerando…</>
                  : linksGenerated
                    ? <><Check size={9} /> Gerado!</>
                    : <><RefreshCw size={9} /> Gerar links</>
                }
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AffiliateLinkEditor productId={product.id} label="Amazon"
                placeholder="https://amzn.to/xxxxxxx"
                initialValue={overrides.amazonAffiliateLink ?? product.amazonAffiliateLink ?? ''}
                color="text-orange-400"
                onSave={(id, val) => onSaveAffiliateLink(id, 'amazonAffiliateLink', val)} />
              <AffiliateLinkEditor productId={product.id} label="Mercado Livre"
                placeholder="https://mercadolivre.com/sec/xxxxxxx"
                initialValue={overrides.mlAffiliateLink ?? product.mlAffiliateLink ?? ''}
                color="text-yellow-400"
                onSave={(id, val) => onSaveAffiliateLink(id, 'mlAffiliateLink', val)} />
              <AffiliateLinkEditor productId={product.id} label="Link geral"
                placeholder="https://..."
                initialValue={affiliateLink}
                color="text-violet-400"
                onSave={(id, val) => onSaveAffiliateLink(id, 'affiliateLink', val)} />
              {productUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.22)', width: 56, flexShrink: 0 }}>Original</span>
                  <a href={productUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.30)'}>
                    {productUrl.length > 42 ? productUrl.slice(0, 42) + '…' : productUrl}
                    <ExternalLink size={9} style={{ flexShrink: 0 }} />
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )

  return createPortal(drawer, document.body)
}

// ── Mine modal ────────────────────────────────────────────────────────────────
function MineModal({ open, onClose, onRun, loading, defaultMarketplace }) {
  const [marketplace, setMarketplace] = useState(defaultMarketplace ?? 'mercadolivre_direct')
  const [siteFilter,  setSiteFilter]  = useState('ml_amazon')
  const [category,    setCategory]    = useState('')
  const [sortBy,      setSortBy]      = useState('sold_quantity_desc')

  // Sync when parent resolves the config default
  useEffect(() => {
    if (defaultMarketplace) setMarketplace(defaultMarketplace)
  }, [defaultMarketplace])

  if (!open) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!category.trim()) return
    onRun({ marketplace, siteFilter, category: category.trim(), sortBy })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: '#16161F',
          border: '1px solid rgba(193,255,47,0.18)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 40px rgba(193,255,47,0.06)',
        }}>
        {/* Lime top accent bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #C1FF2F 0%, rgba(0,255,185,0.60) 60%, transparent 100%)' }} />
        <div className="px-6 py-5 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag size={16} style={{ color: '#C1FF2F' }} /> Nova Sessão de Mineração
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.70)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Marketplace</label>
            <select value={marketplace} onChange={e => setMarketplace(e.target.value)}
              className="input">
              <option value="mercadolivre_direct">🏆 Mercado Livre Direto (melhor dados)</option>
              <option value="google_shopping">Google Shopping</option>
              <option value="amazon">Amazon (SerpAPI)</option>
              <option value="both">Google: ML + Amazon</option>
            </select>
          </div>

          {marketplace === 'mercadolivre_direct' && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Ordenação</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="input">
                <option value="sold_quantity_desc">🔥 Mais Vendidos</option>
                <option value="relevance">Relevância</option>
                <option value="price_asc">💰 Menor Preço</option>
                <option value="price_desc">💎 Maior Preço</option>
              </select>
            </div>
          )}

          {marketplace === 'google_shopping' && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Filtro de sites</label>
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
                className="input">
                <option value="ml_amazon">ML + Amazon</option>
                <option value="mercadolivre">Só Mercado Livre</option>
                <option value="amazon">Só Amazon</option>
                <option value="all">Todos os sites</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Produto / Categoria</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="Ex: fone de ouvido, tênis running, air fryer…"
              className="input"
              autoFocus />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !category.trim()}
              className="btn-primary flex-1 justify-center">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {loading ? 'Minerando…' : 'Iniciar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Niche cards (kept for intelligence section) ───────────────────────────────
const satColors = {
  baixa: 'bg-[#00FFB9]/12 text-[#00FFB9]',
  média: 'bg-yellow-100 text-yellow-700',
  alta:  'bg-red-100 text-[#FF3366]',
}

function NicheCard({ niche, onMine }) {
  const [expanded, setExpanded] = useState(false)
  const totalScore = Object.values(niche.scores ?? {}).reduce((a, b) => a + b, 0)
  return (
    <div className="bg-[#0F0F16] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{niche.rank}</span>
            <h4 className="font-semibold text-white/80 text-sm leading-tight">{niche.category}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${satColors[niche.saturation] ?? 'bg-[#0F0F16]/[0.05] text-white/60'}`}>{niche.saturation}</span>
            <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">{totalScore} pts</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { key: 'earningPotential', label: 'Comissão', icon: DollarSign },
            { key: 'retention', label: 'Retenção', icon: TrendingUp },
            { key: 'researchability', label: 'Pesquisa', icon: Target },
            { key: 'evergreen', label: 'Perenidade', icon: Zap },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Icon size={9} className="text-white/35" />
                <span className="text-[9px] text-white/35 uppercase tracking-wide">{label}</span>
              </div>
              <div className="h-1.5 bg-[#0F0F16]/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-violet-500/100 rounded-full" style={{ width: `${(niche.scores?.[key] ?? 0) * 10}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-white/60">{niche.scores?.[key]}/10</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 italic mb-3 line-clamp-1">"{niche.seoTitle}"</p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-[#00FFB9] bg-[#00FFB9]/8 px-2 py-0.5 rounded-full font-medium">
            <DollarSign size={10} /> {niche.commissionRange}
          </span>
          <span className="text-xs text-white/40 bg-[#0F0F16]/[0.03] px-2 py-0.5 rounded-full">{niche.salesType}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-violet-400 hover:text-violet-400 flex items-center gap-1 mb-3">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Menos detalhes' : 'Ver análise completa'}
        </button>
        {expanded && (
          <div className="space-y-3 mb-3 text-xs text-white/60">
            <div><p className="font-semibold text-white/70 flex items-center gap-1 mb-0.5"><Users size={11} /> Público-alvo</p><p>{niche.targetAudience}</p></div>
            <div><p className="font-semibold text-white/70 flex items-center gap-1 mb-0.5"><Target size={11} /> Ângulo da review</p><p>{niche.reviewAngle}</p></div>
            <div><p className="font-semibold text-white/70 flex items-center gap-1 mb-0.5"><Zap size={11} /> Por que encaixa no canal</p><p>{niche.whyItFits}</p></div>
            <div style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 10, padding: '10px 12px' }}>
              <p className="font-semibold mb-1" style={{ color: '#a78bfa' }}>🎣 Gancho de abertura</p>
              <p className="italic" style={{ color: 'rgba(255,255,255,0.60)' }}>"{niche.hook}"</p>
            </div>
          </div>
        )}
        <button onClick={() => onMine(niche)}
          className="btn-primary w-full justify-center text-xs">
          <Play size={12} /> Minerar produtos desta categoria
        </button>
      </div>
    </div>
  )
}

function ShortNicheCard({ niche, onMine }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered]   = useState(false)
  const totalScore = Object.values(niche.scores ?? {}).reduce((a, b) => a + b, 0)

  // ticket type pill — inline styles to avoid purge
  const ticketStyle = {
    'baixo ticket impulso':    { background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' },
    'médio ticket considerado':{ background: 'rgba(255,184,0,0.12)',  color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)'  },
    'alto ticket considerado': { background: 'rgba(255,107,43,0.12)', color: '#FF6B2B', border: '1px solid rgba(255,107,43,0.25)' },
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: 'rgba(15,15,22,0.72)',
      border: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,51,102,0.18)', border: '1px solid rgba(255,51,102,0.40)',
              color: '#FF3366', fontSize: 11, fontWeight: 800,
            }}>{niche.rank}</span>
            <h4 className="font-semibold text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>{niche.category}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${satColors[niche.saturation] ?? ''}`}
              style={!satColors[niche.saturation] ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' } : {}}
            >{niche.saturation}</span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100,
              background: 'rgba(204,255,0,0.12)', border: '1px solid rgba(204,255,0,0.28)', color: '#CCFF00',
              fontFamily: "'JetBrains Mono', monospace",
            }}>{totalScore} pts</span>
          </div>
        </div>

        {/* Score bars */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { key: 'earningPotential', label: 'Comissão', icon: DollarSign },
            { key: 'viralPotential',   label: 'Viral',    icon: TrendingUp },
            { key: 'beginnerFriendly', label: 'Fácil',    icon: Zap },
            { key: 'evergreen',        label: 'Perene',   icon: Target },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Icon size={9} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${(niche.scores?.[key] ?? 0) * 10}%`,
                  background: 'linear-gradient(90deg, #8B5CF6, #CCFF00)',
                }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: "'JetBrains Mono', monospace" }}>
                {niche.scores?.[key]}/10
              </span>
            </div>
          ))}
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 100,
            background: 'rgba(0,255,185,0.10)', border: '1px solid rgba(0,255,185,0.22)', color: '#00FFB9',
          }}>
            <DollarSign size={10} /> {niche.commissionRange}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
            ...(ticketStyle[niche.ticketType] ?? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.10)' }),
          }}>{niche.ticketType}</span>
        </div>

        {/* Hook box */}
        <div style={{
          background: 'rgba(255,51,102,0.07)', border: '1px solid rgba(255,51,102,0.20)',
          borderRadius: 10, padding: '10px 12px', marginBottom: 12,
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: '#FF3366', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            ⚡ Gancho — primeiros 3 segundos
          </p>
          <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>"{niche.hook}"</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ fontSize: 12, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Menos detalhes' : 'Ver análise completa'}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            <div><p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Clapperboard size={11} /> Melhor estilo de vídeo</p><p>{niche.bestVideoStyle}</p></div>
            <div><p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Video size={11} /> Ângulo mais fácil</p><p>{niche.easiestContentAngle}</p></div>
            <div><p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Users size={11} /> Público-alvo</p><p>{niche.targetAudience}</p></div>
            <div><p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.70)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><Zap size={11} /> Por que funciona no short-form</p><p>{niche.whyItFitsShortForm}</p></div>
          </div>
        )}

        {/* Mine button */}
        <button
          onClick={() => onMine(niche)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
            border: 'none', transition: 'background 200ms ease, box-shadow 200ms ease',
            background: hovered ? '#d4f500' : '#CCFF00',
            color: '#07070B',
            boxShadow: hovered ? '0 0 20px rgba(204,255,0,0.35)' : 'none',
          }}
        >
          <Play size={12} /> Minerar produtos desta categoria
        </button>
      </div>
    </div>
  )
}

// ── Top Products Slider ───────────────────────────────────────────────────────
const RANK_STYLES = [
  { badge: '#FFB800', badgeBg: 'rgba(255,184,0,0.18)', label: '🥇' },
  { badge: 'rgba(255,255,255,0.70)', badgeBg: 'rgba(255,255,255,0.10)', label: '🥈' },
  { badge: '#FF6B2B', badgeBg: 'rgba(255,107,43,0.18)', label: '🥉' },
  { badge: 'rgba(255,255,255,0.35)', badgeBg: 'rgba(255,255,255,0.06)', label: '4' },
  { badge: 'rgba(255,255,255,0.35)', badgeBg: 'rgba(255,255,255,0.06)', label: '5' },
]

// Resolve the best affiliate link and its marketplace label for a product
function resolveAffiliateLink(p) {
  // Prefer the link that matches the product's own marketplace
  if (p.marketplace === 'amazon' && p.amazonAffiliateLink)
    return { href: p.amazonAffiliateLink, label: 'Amazon' }
  if ((p.marketplace === 'mercadolivre' || p.marketplace === 'mercadolivre_direct') && p.mlAffiliateLink)
    return { href: p.mlAffiliateLink, label: 'Mercado Livre' }
  // Fall back to whichever is set
  if (p.mlAffiliateLink)      return { href: p.mlAffiliateLink,      label: 'Mercado Livre' }
  if (p.amazonAffiliateLink)  return { href: p.amazonAffiliateLink,  label: 'Amazon' }
  if (p.affiliateLink)        return { href: p.affiliateLink,        label: 'Link afiliado' }
  return null
}

const CARD_WIDTH   = 220  // px per card
const CARD_GAP     = 12   // px gap
const VISIBLE      = 3    // cards visible at once

function TopProductsSlider({ products, onSelect }) {
  const [offset, setOffset] = useState(0)   // index of first visible card
  const total   = products.length
  const maxOff  = Math.max(0, total - VISIBLE)

  const prev = () => setOffset(o => Math.max(0, o - 1))
  const next = () => setOffset(o => Math.min(maxOff, o + 1))

  const fmtPrice = (p) => {
    if (!p.price) return null
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.currency || 'BRL', maximumFractionDigits: 0 }).format(p.price) }
    catch { return `R$ ${p.price}` }
  }

  return (
    <div className="mb-6" style={{ background: 'rgba(15,15,22,0.80)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Trophy size={13} style={{ color: '#FFB800' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.70)', letterSpacing: '0.02em' }}>
            Top {total} Produtos por Score
          </span>
        </div>
        {/* Prev / Next */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={prev} disabled={offset === 0}
            style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.60)' }}>
            <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button onClick={next} disabled={offset >= maxOff}
            style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', cursor: offset >= maxOff ? 'not-allowed' : 'pointer', opacity: offset >= maxOff ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.60)' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Sliding track — clips to show VISIBLE cards */}
      <div style={{ overflow: 'hidden', padding: '14px 16px' }}>
        <div style={{
          display: 'flex', gap: CARD_GAP,
          transform: `translateX(-${offset * (CARD_WIDTH + CARD_GAP)}px)`,
          transition: 'transform 300ms ease',
        }}>
          {products.map((p, i) => {
            const rank      = RANK_STYLES[i] ?? RANK_STYLES[4]
            const price     = fmtPrice(p)
            const affLink   = resolveAffiliateLink(p)
            const isVisible = i >= offset && i < offset + VISIBLE

            return (
              <div key={p.id ?? i} style={{
                width: CARD_WIDTH, flexShrink: 0, borderRadius: 12, overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isVisible ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex', flexDirection: 'column',
                opacity: isVisible ? 1 : 0.4,
                transition: 'opacity 300ms ease',
              }}>

                {/* Image */}
                <div style={{ position: 'relative', height: 140, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: 7, left: 7, width: 22, height: 22, borderRadius: '50%', background: rank.badgeBg, border: `2px solid ${rank.badge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 12 : 10, fontWeight: 800, color: rank.badge }}>
                    {i < 3 ? rank.label : i + 1}
                  </div>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 6 }} />
                    : <Package size={32} style={{ color: 'rgba(255,255,255,0.12)' }} />
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Marketplace chip */}
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', padding: '2px 6px', borderRadius: 100, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.22)', color: '#a78bfa', alignSelf: 'flex-start' }}>
                    {p.marketplace === 'mercadolivre' || p.marketplace === 'mercadolivre_direct' ? 'Mercado Livre'
                      : p.marketplace === 'amazon' ? 'Amazon'
                      : p.marketplace ?? '—'}
                  </span>

                  {/* Title */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                    {p.title}
                  </p>

                  {/* Price + rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {price && <span style={{ fontSize: 14, fontWeight: 800, color: '#CCFF00' }}>{price}</span>}
                    {(p.rating ?? 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#FFB800' }}>
                        <Star size={10} fill="#FFB800" /> {Number(p.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Score bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(p.score ?? 0, 100)}%`, height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #8B5CF6, #CCFF00)' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#CCFF00', width: 22, textAlign: 'right', flexShrink: 0 }}>{p.score ?? 0}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button onClick={() => onSelect(p)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.28)', color: '#a78bfa', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Layers size={10} /> Detalhes
                    </button>
                    {affLink && (
                      <a href={affLink.href} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: 'rgba(204,255,0,0.10)', border: '1px solid rgba(204,255,0,0.22)', color: '#CCFF00', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                        <ExternalLink size={10} /> {affLink.label}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Marketplace pill — color-coded per platform ───────────────────────────────
const MP_STYLES = {
  mercadolivre:        { bg: 'rgba(255,184,0,0.14)',  border: 'rgba(255,184,0,0.35)',  color: '#FFB800',  label: '🟡 Mercado Livre' },
  mercadolivre_direct: { bg: 'rgba(255,184,0,0.14)',  border: 'rgba(255,184,0,0.35)',  color: '#FFB800',  label: '🟡 ML Direto' },
  amazon:              { bg: 'rgba(255,107,43,0.14)', border: 'rgba(255,107,43,0.35)', color: '#FF6B2B',  label: '🟠 Amazon' },
  google_shopping:     { bg: 'rgba(66,133,244,0.14)', border: 'rgba(66,133,244,0.35)', color: '#4285F4',  label: '🔵 Google Shopping' },
}
function MpPill({ marketplace }) {
  const s = MP_STYLES[marketplace] ?? { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.28)', color: '#a78bfa', label: marketplace?.replace(/_/g, ' ') ?? '—' }
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
      fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// ── SessionGroup — collapsible section of products from one mining run ────────
function SessionGroup({ session, products, onOpen, onMine, defaultOpen, onRename, onDelete }) {
  const [open,       setOpen]       = useState(defaultOpen ?? true)
  const [renaming,   setRenaming]   = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [nameDraft,  setNameDraft]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (renaming) {
      setNameDraft(session?.name ?? session?.category ?? '')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [renaming])

  async function handleSaveName(e) {
    e?.stopPropagation()
    if (!session?.id || !nameDraft.trim()) { setRenaming(false); return }
    setSaving(true)
    try {
      await fetch(`/api/mining/sessions/${session.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() }),
      })
      onRename?.()
    } finally { setSaving(false); setRenaming(false) }
  }

  async function handleDelete(e) {
    e.stopPropagation()
    if (!session?.id) return
    if (!window.confirm(`Apagar a sessão "${displayName}" e seus ${products.length} produto(s)? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/mining/sessions/${session.id}`, { method: 'DELETE' })
      onDelete?.(session.id)
    } finally { setDeleting(false) }
  }

  const displayName = session?.name || session?.category || 'Sessão sem nome'

  return (
    <div className="mb-3 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,15,22,0.60)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-white/[0.015] transition-colors">
        {/* Collapse toggle */}
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <Database size={13} style={{ color: '#8B5CF6', flexShrink: 0 }} />
          {renaming ? null : (
            <span className="font-semibold text-sm truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {displayName}
            </span>
          )}
        </button>

        {/* Inline rename input */}
        {renaming && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <input ref={inputRef} type="text" value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setRenaming(false) }}
              placeholder="Nome da sessão…"
              className="input flex-1 min-w-0 text-xs py-1"
              autoComplete="off" />
            <button onClick={handleSaveName} disabled={saving}
              className="p-1 rounded text-[#00FFB9] hover:bg-[#00FFB9]/10 disabled:opacity-40">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
            <button onClick={() => setRenaming(false)}
              className="p-1 rounded text-white/35 hover:bg-white/5">
              <X size={11} />
            </button>
          </div>
        )}

        {/* Badges row */}
        {!renaming && (
          <>
            {session?.marketplace && <MpPill marketplace={session.marketplace} />}
            {session?.createdAt && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', whiteSpace: 'nowrap' }}>
                {timeAgo(session.createdAt)}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.50)', whiteSpace: 'nowrap',
              fontFamily: "'JetBrains Mono', monospace" }}>
              {products.length} produto{products.length !== 1 ? 's' : ''}
            </span>
            {session?.status === 'failed' && <AlertTriangle size={12} style={{ color: '#FF3366', flexShrink: 0 }} />}
          </>
        )}

        {/* Rename + Delete buttons */}
        {!renaming && session?.id && (
          <>
            <button onClick={() => setRenaming(true)} title="Renomear sessão"
              className="p-1 rounded hover:bg-white/5 text-white/25 hover:text-white/55 transition-colors shrink-0">
              <Pencil size={11} />
            </button>
            <button onClick={handleDelete} disabled={deleting} title="Apagar sessão"
              className="p-1 rounded transition-colors shrink-0 disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.20)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,102,0.12)'; e.currentTarget.style.color = '#FF3366' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.20)' }}>
              {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          </>
        )}

        {/* Chevron */}
        <button onClick={() => setOpen(o => !o)} className="shrink-0 text-white/30 hover:text-white/55">
          <ChevronDown size={14} className="transition-transform"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        </button>
      </div>

      {/* Product grid */}
      {open && (
        <div className="border-t px-4 pt-4 pb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onMine={onMine} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Mining() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const { data: sessionsData, refetch: refetchSessions } = useApi('/mining/sessions')
  const { data: statsData, refetch: refetchStats } = useApi('/mining/catalog/stats')
  const { data: trendsData } = useApi('/mining/trends')
  const sessions = sessionsData?.sessions ?? []
  const catalogStats = statsData ?? {}
  const trendingKeywords = (trendsData?.trends ?? []).map(t => t?.keyword ?? t).filter(Boolean)

  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [viewMode,           setViewMode]          = useState('grouped') // 'grouped' | 'flat'
  const [search,             setSearch]            = useState('')
  const [nicheFilter,        setNicheFilter]       = useState('all')
  const [sortBy,             setSortBy]            = useState('score')
  const [mpFilter,           setMpFilter]          = useState('all')
  const [running,            setRunning]            = useState(false)
  const [error,              setError]              = useState(null)
  const [lastResult,         setLastResult]         = useState(null)
  const [affiliateOverrides, setAffiliateOverrides] = useState({})
  const [mineModalOpen,      setMineModalOpen]      = useState(false)
  const [drawerProduct,      setDrawerProduct]      = useState(null)
  const [miningConfig,       setMiningConfig]       = useState(null)

  // Fetch mining config (marketplace selection) on mount
  useEffect(() => {
    fetch('/api/mining/config').then(r => r.json()).then(setMiningConfig).catch(() => {})
  }, [])

  // Session naming — shown after a successful mining run
  const [nameModalOpen,      setNameModalOpen]      = useState(false)
  const [nameModalSessionId, setNameModalSessionId] = useState(null)
  const [nameModalDraft,     setNameModalDraft]     = useState('')
  const [nameSaving,         setNameSaving]         = useState(false)
  const [nameProjectId,      setNameProjectId]      = useState('')


  // Projects list for session assignment modal
  const { data: projectsData, refetch: refetchProjects } = useApi('/projects')
  const projects = projectsData?.projects ?? []

  // Always fetch full catalog — products now include sessionId for grouping
  const { data: catalogData, loading: catalogLoading, refetch: refetchCatalog } = useApi('/mining/catalog')
  const rawProducts = catalogData?.products ?? []

  // Filtered & sorted products
  const products = useMemo(() => {
    let list = rawProducts.map(p => affiliateOverrides[p.id] ? { ...p, ...affiliateOverrides[p.id] } : p)

    // search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title?.toLowerCase().includes(q))
    }

    // marketplace filter
    if (mpFilter !== 'all') {
      list = list.filter(p => p.marketplace === mpFilter)
    }

    // niche keyword filter
    if (nicheFilter !== 'all') {
      const niche = NICHES.find(n => n.id === nicheFilter)
      if (niche?.keywords?.length) {
        list = list.filter(p => {
          const title = (p.title ?? '').toLowerCase()
          return niche.keywords.some(kw => title.includes(kw.toLowerCase()))
        })
      }
    }

    // sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'score')      return (b.score ?? 0) - (a.score ?? 0)
      if (sortBy === 'sold')       return ((b.soldQuantity ?? b.reviews) ?? 0) - ((a.soldQuantity ?? a.reviews) ?? 0)
      if (sortBy === 'price_asc')  return (a.price ?? 0) - (b.price ?? 0)
      if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0)
      if (sortBy === 'rating')     return (b.rating ?? 0) - (a.rating ?? 0)
      return 0
    })

    return list
  }, [rawProducts, search, mpFilter, nicheFilter, sortBy, affiliateOverrides])

  // Group filtered products by sessionId for the 'grouped' view
  const groupedProducts = useMemo(() => {
    const map = new Map()  // sessionId → product[]
    for (const p of products) {
      const key = p.sessionId ?? '__ungrouped'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(p)
    }
    // Sort groups: most-recent session first, ungrouped last
    return [...map.entries()].sort(([aKey], [bKey]) => {
      if (aKey === '__ungrouped') return 1
      if (bKey === '__ungrouped') return -1
      const aSession = sessions.find(s => s.id === aKey)
      const bSession = sessions.find(s => s.id === bKey)
      return new Date(bSession?.createdAt ?? 0) - new Date(aSession?.createdAt ?? 0)
    })
  }, [products, sessions])

  const marketplaces = useMemo(() => [...new Set(rawProducts.map(p => p.marketplace).filter(Boolean))], [rawProducts])
  const needsSetup = error?.includes('SERPAPI_KEY') || error?.includes('serpapi')

  // Auto-trigger a mining run when navigated from Radar de Nichos
  useEffect(() => {
    const autoCategory = location.state?.autoCategory
    if (!autoCategory) return
    // Clear the state so a page refresh doesn't re-trigger
    window.history.replaceState({}, '')
    handleRun({ marketplace: 'mercadolivre_direct', siteFilter: 'ml_amazon', category: autoCategory, sortBy: 'sold_quantity_desc' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRun({ marketplace, siteFilter, category, sortBy: runSortBy }) {
    setRunning(true); setError(null); setLastResult(null); setMineModalOpen(false)
    try {
      let result

      if (marketplace === 'mercadolivre_direct') {
        // ── Browser-side ML fetch (bypasses Cloudflare IP block) ──────────────
        const tokenRes = await fetch('/api/ml/oauth/token')
        const { token } = await tokenRes.json()

        if (!token) throw new Error('Conta Mercado Livre não conectada. Vá em Configurações → Mercado Livre — OAuth e clique em Conectar.')

        const sortMap = {
          best_sellers:     'sold_quantity_desc',
          price_asc:        'price_asc',
          price_desc:       'price_desc',
          relevance:        'relevance',
          sold_quantity_desc: 'sold_quantity_desc',
        }
        const mlSort = sortMap[runSortBy] ?? 'relevance'
        const params = new URLSearchParams({ q: category, limit: '20', sort: mlSort })

        const mlRes = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })

        if (!mlRes.ok) {
          const err = await mlRes.json().catch(() => ({}))
          // Token expired — fall through to worker (will use SerpAPI fallback)
          if (mlRes.status === 401) {
            console.warn('[mining] ML token expired, falling back to worker')
            result = await apiPost('/mining/run', { marketplace, category, siteFilter, sortBy: runSortBy })
          } else {
            throw new Error(`Mercado Livre retornou ${mlRes.status}: ${err.message ?? 'erro desconhecido'}`)
          }
        } else {
          const mlData = await mlRes.json()
          const results = mlData.results ?? []

          if (results.length === 0) {
            // No results from ML — fall back to worker SerpAPI path
            console.warn('[mining] ML returned 0 results, falling back to worker')
            result = await apiPost('/mining/run', { marketplace, category, siteFilter, sortBy: runSortBy })
          } else {
            // Send raw results to worker to score + save
            result = await apiPost('/mining/ingest', { category, sortBy: runSortBy, results })
          }
        }
      } else {
        result = await apiPost('/mining/run', { marketplace, category, siteFilter, sortBy: runSortBy })
      }

      setLastResult({ count: result.count, warnings: result.warnings, competitionLevel: result.competitionLevel, listingTotal: result.listingTotal })
      await Promise.all([refetchCatalog(), refetchSessions(), refetchStats()])
      if (result.sessionId && result.count > 0) {
        setNameModalSessionId(result.sessionId)
        setNameModalDraft(category ?? '')
        setNameProjectId('')
        setNameModalOpen(true)
      }
    } catch (e) { console.error("[mining]", e.message); setError(friendlyError(e.message)) }
    finally { setRunning(false) }
  }

  async function handleSaveSessionName() {
    if (!nameModalSessionId) { setNameModalOpen(false); return }
    setNameSaving(true)
    try {
      // Always send the name (even if unchanged) so the session is never left unnamed
      const body = { name: nameModalDraft.trim() || (sessions.find(s => s.id === nameModalSessionId)?.category ?? 'Sessão') }
      if (nameProjectId) body.projectId = nameProjectId
      const res = await fetch(`/api/mining/sessions/${nameModalSessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        console.error('[mining] session rename failed:', d.error ?? res.statusText)
      }
      await refetchSessions()
    } catch (e) {
      console.error('[mining] handleSaveSessionName error:', e.message)
    } finally {
      setNameSaving(false); setNameModalOpen(false)
    }
  }


  async function handleDeleteSession(sessionId) {
    if (selectedSessionId === sessionId) setSelectedSessionId(null)
    await Promise.all([refetchSessions(), refetchCatalog(), refetchStats()])
  }

  async function handleClearSessions() {
    if (!window.confirm('Apagar todo o histórico de sessões?')) return
    await fetch('/api/mining/sessions', { method: 'DELETE' })
    setSelectedSessionId(null)
    refetchSessions()
  }

  async function handleDeleteProduct(productId) {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    refetchCatalog()
  }

  async function handleClearAll() {
    if (!window.confirm('Apagar todos os produtos do catálogo? Esta ação não pode ser desfeita.')) return
    await fetch('/api/products/all', { method: 'DELETE' })
    await Promise.all([refetchCatalog(), refetchStats()])
  }

  async function handleSaveAffiliateLink(productId, field, value) {
    setAffiliateOverrides(prev => ({ ...prev, [productId]: { ...(prev[productId] ?? {}), [field]: value } }))
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } catch (e) { console.error('[affiliate] save failed', e) }
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId)
  const topProducts = useMemo(() => [...rawProducts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5), [rawProducts])

  return (
    <div className="animate-fade-up">
      <AILoadingOverlay show={running} steps={MINING_STEPS} title="Minerando Produtos" />
      <PageHeader
        overline="Pipeline"
        title="Mineração de Produtos"
        description="Dashboard de produtos com analytics e filtros de nicho"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setMineModalOpen(true)} disabled={running}
              className="btn-primary">
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Minerando…' : 'Nova Mineração'}
            </button>
          </div>
        }
      />

      {/* ── Result / Error banners ─────────────────────────────────────────── */}
      {lastResult && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-semibold">{lastResult.count} produtos salvos no catálogo</p>
              {lastResult.competitionLevel && (() => {
                const meta = COMPETITION_META[lastResult.competitionLevel]
                return meta ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.color}`}>
                    <Layers size={9} /> {meta.label}
                    {lastResult.listingTotal > 0 && <span className="font-normal opacity-70">({lastResult.listingTotal.toLocaleString()} listings)</span>}
                  </span>
                ) : null
              })()}
            </div>
            {lastResult.warnings?.map((w, i) => <p key={i} className="text-green-600 text-xs mt-0.5">⚠ {w}</p>)}
          </div>
        </div>
      )}

      {error && !needsSetup && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-[#FF3366]/8 border border-red-200 text-[#FF3366] text-sm rounded-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
        </div>
      )}

      {needsSetup && (
        <div className="mb-6 border border-amber-200 bg-[#FFB800]/8 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-[#FFB800] shrink-0" />
            <p className="font-bold text-[#FFB800] text-sm">Configure o SerpAPI para Google Shopping / Amazon</p>
          </div>
          <p className="text-[#FFB800] text-xs">Para ML Direto não é necessário — use "Mercado Livre Direto" na nova mineração.</p>
        </div>
      )}


      {/* ── Stats dashboard ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total de Produtos"  value={(catalogStats.total ?? rawProducts.length).toLocaleString()}
          sub="no catálogo" icon={ShoppingBag} color="indigo" />
        <StatCard label="Melhor Score"        value={catalogStats.bestScore ?? (topProducts[0]?.score ?? 0)}
          sub="produto top" icon={Trophy} color="yellow" />
        <StatCard label="Preço Médio"         value={catalogStats.avgPrice ? fmtPrice(catalogStats.avgPrice) : '—'}
          sub="média do catálogo" icon={DollarSign} color="green" />
        <StatCard label="Total Vendidos"      value={catalogStats.totalSold ? fmtNumber(catalogStats.totalSold) : '0'}
          sub="unidades ML confirmadas" icon={Flame} color="orange" />
      </div>

      {/* ── Trending keywords ──────────────────────────────────────────────── */}
      {trendingKeywords.length > 0 && (
        <div className="mb-6 rounded-xl px-5 py-4" style={{
          background: 'rgba(15,15,22,0.72)',
          border: '1px solid rgba(255,184,0,0.18)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} style={{ color: '#FFB800' }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              color: '#FFB800',
            }}>Tendências no Mercado Livre agora</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.slice(0, 20).map((kw, i) => (
              <button key={i}
                onClick={() => handleRun({ marketplace: 'mercadolivre_direct', siteFilter: 'ml_amazon', category: kw, sortBy: 'sold_quantity_desc' })}
                disabled={running}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all font-medium disabled:opacity-40"
                style={{
                  background: 'rgba(255,184,0,0.08)',
                  border: '1px solid rgba(255,184,0,0.22)',
                  color: 'rgba(255,255,255,0.70)',
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,184,0,0.18)'
                  e.currentTarget.style.borderColor = 'rgba(255,184,0,0.50)'
                  e.currentTarget.style.color = '#FFB800'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,184,0,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,184,0,0.22)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.70)'
                }}
              >
                <Flame size={10} style={{ color: '#FFB800', flexShrink: 0 }} />
                {kw}
                <ArrowUpRight size={10} style={{ flexShrink: 0, opacity: 0.5 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Top 5 best scored — card slider ───────────────────────────────── */}
      {topProducts.length > 0 && <TopProductsSlider products={topProducts} onSelect={setDrawerProduct} />}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="bg-[#0F0F16] border border-white/[0.08] rounded-xl px-5 py-4 mb-4">
        {/* Niche presets */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={13} className="text-white/35 shrink-0" />
          {NICHES.map(n => (
            <button key={n.id} onClick={() => setNicheFilter(n.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${nicheFilter === n.id ? 'text-[#07070B] font-bold' : 'text-white/55 hover:text-white/80'}`} style={nicheFilter === n.id ? {background:'#CCFF00',boxShadow:'0 0 14px rgba(204,255,0,0.25)'} : {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Search + marketplace + sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto…"
              className="input pl-9" />
          </div>

          {/* Marketplace filter — chips when ≤3, dropdown when more */}
          {marketplaces.length === 1 && null}
          {marketplaces.length > 1 && marketplaces.length <= 3 && (
            <div className="flex gap-1">
              <button onClick={() => setMpFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mpFilter === 'all' ? 'text-[#07070B] font-bold' : 'text-white/55 hover:text-white/80'}`}
                style={mpFilter === 'all' ? {background:'#CCFF00'} : {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                Todos
              </button>
              {marketplaces.map(mp => (
                <button key={mp} onClick={() => setMpFilter(mp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${mpFilter === mp ? 'text-[#07070B] font-bold' : 'text-white/55 hover:text-white/80'}`}
                  style={mpFilter === mp ? {background:'#CCFF00'} : {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {mp.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
          {marketplaces.length > 3 && (
            <select
              value={mpFilter}
              onChange={e => setMpFilter(e.target.value)}
              className="input text-xs py-1.5 min-w-[160px]"
              style={{ backgroundImage: 'none' }}
            >
              <option value="all">🛒 Todas as lojas ({marketplaces.length})</option>
              {marketplaces.map(mp => (
                <option key={mp} value={mp}>
                  {mp === 'mercadolivre' || mp === 'mercadolivre_direct' ? '🟡 Mercado Livre'
                   : mp === 'amazon' ? '🟠 Amazon'
                   : `🏪 ${mp.replace(/_/g, ' ')}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal size={13} className="text-white/35" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-xs py-1.5">
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {(search || mpFilter !== 'all' || nicheFilter !== 'all') && (
            <span className="text-xs text-white/35">
              {products.length} de {rawProducts.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Catalog header — title, view toggle, clear ────────────────────── */}
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-bold text-white/80 flex-1">
          Catálogo de Produtos
          {products.length > 0 && (
            <span className="ml-2 text-white/35 font-normal">
              {products.length} produto{products.length !== 1 ? 's' : ''}
              {products.length < rawProducts.length && ` de ${rawProducts.length}`}
            </span>
          )}
        </h3>

        {/* View mode toggle */}
        {rawProducts.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => setViewMode('grouped')}
              title="Por sessão"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
              style={viewMode === 'grouped'
                ? { background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }
                : { border: '1px solid transparent', color: 'rgba(255,255,255,0.35)' }}>
              <Database size={11} /> Por sessão
            </button>
            <button
              onClick={() => setViewMode('flat')}
              title="Grade plana"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
              style={viewMode === 'flat'
                ? { background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }
                : { border: '1px solid transparent', color: 'rgba(255,255,255,0.35)' }}>
              <LayoutGrid size={11} /> Grade
            </button>
          </div>
        )}

        {rawProducts.length > 0 && (
          <button onClick={handleClearAll} className="btn-danger">
            <Trash2 size={11} /> Limpar
          </button>
        )}
      </div>

      {/* ── Catalog body ──────────────────────────────────────────────────── */}
      {catalogLoading ? (
        <div className="py-16 text-center text-white/35">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-violet-400" />
          <p className="text-sm">Carregando produtos…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-white/35 bg-[#0F0F16] border border-white/[0.08] rounded-xl">
          <ShoppingBag size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm font-medium text-white/40 mb-1">
            {rawProducts.length === 0 ? 'Nenhum produto ainda' : 'Nenhum produto corresponde ao filtro'}
          </p>
          {rawProducts.length === 0 && (
            <p className="text-xs text-white/35 mb-4">Clique em "Nova Mineração" ou use um trending acima</p>
          )}
          {rawProducts.length === 0 && (
            <button onClick={() => setMineModalOpen(true)} className="btn-primary">
              <Play size={14} /> Iniciar primeira mineração
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* ── Grouped by session ── */
        <div>
          {groupedProducts.map(([sessionId, sessionProds], idx) => (
            <SessionGroup
              key={sessionId}
              session={sessions.find(s => s.id === sessionId) ?? null}
              products={sessionProds}
              onOpen={setDrawerProduct}
              onMine={p => navigate('/wizard', { state: { autoTopic: p.title ?? '' } })}
              defaultOpen={idx === 0}
              onRename={refetchSessions}
              onDelete={handleDeleteSession}
            />
          ))}
        </div>
      ) : (
        /* ── Flat grid ── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <ProductCard
              key={p.id} product={p} onOpen={setDrawerProduct}
              onMine={p => navigate('/wizard', { state: { autoTopic: p.title ?? '' } })}
            />
          ))}
        </div>
      )}

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      {drawerProduct && (
        <ProductDrawer
          product={drawerProduct}
          onClose={() => setDrawerProduct(null)}
          onSaveAffiliateLink={handleSaveAffiliateLink}
          onDelete={handleDeleteProduct}
          affiliateOverrides={affiliateOverrides}
        />
      )}

      {/* ── Mine modal ────────────────────────────────────────────────────── */}
      <MineModal
        open={mineModalOpen}
        onClose={() => setMineModalOpen(false)}
        onRun={handleRun}
        loading={running}
        defaultMarketplace="mercadolivre_direct"
      />

      {/* ── Session naming modal ───────────────────────────────────────────── */}
      {nameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
          <div className="absolute inset-0" onClick={() => setNameModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: '#16161F',
              border: '1px solid rgba(0,255,185,0.20)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.70), 0 0 40px rgba(0,255,185,0.06)',
            }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #00FFB9 0%, rgba(193,255,47,0.50) 60%, transparent 100%)' }} />
          <div className="p-6">

            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,255,185,0.12)', border: '1px solid rgba(0,255,185,0.28)' }}>
                <Save size={18} style={{ color: '#00FFB9' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.90)' }}>Nomear sessão</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {lastResult?.count} produto{lastResult?.count !== 1 ? 's' : ''} salvos
                </p>
              </div>
              <button onClick={() => setNameModalOpen(false)}
                className="ml-auto p-1 rounded-lg text-white/35 hover:text-white/60 hover:bg-white/5">
                <X size={14} />
              </button>
            </div>

            {/* Session name input */}
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Nome da sessão
            </label>
            <input
              type="text"
              value={nameModalDraft}
              onChange={e => setNameModalDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveSessionName() }}
              placeholder="Ex: Power Banks Mai 26, Fones Bluetooth…"
              className="input w-full mb-4"
              autoFocus
            />

            {/* Project assignment */}
            {projects.length > 0 && (
              <>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Adicionar a projeto <span style={{ color: 'rgba(255,255,255,0.28)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <select
                  value={nameProjectId}
                  onChange={e => setNameProjectId(e.target.value)}
                  className="input w-full mb-5"
                >
                  <option value="">— Nenhum projeto —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setNameModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.50)' }}>
                Pular
              </button>
              <button onClick={handleSaveSessionName} disabled={nameSaving}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#00FFB9', color: '#07070B' }}>
                {nameSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Salvar nome'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
