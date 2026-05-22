import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Play, RefreshCw, ShoppingBag, AlertTriangle, CheckCircle2,
  ExternalLink, Link2, Check, X, Pencil, Search, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, Users, DollarSign, Target, Zap, Video, Clapperboard,
  Trash2, BarChart2, Star, Truck, Award, Filter, SlidersHorizontal, Tag,
  Package, Flame, Trophy, ArrowUpRight, ChevronRight, XCircle, BookOpen, Layers,
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
  gold:          { bg: 'bg-amber-50',   text: 'text-amber-700',  label: 'Gold' },
  silver:        { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Silver' },
}

const SELLER_LEVEL_COLORS = {
  '5_green':  'text-green-600',
  '4_light_green': 'text-green-500',
  '3_yellow': 'text-yellow-600',
  '2_orange': 'text-orange-500',
  '1_red':    'text-red-500',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(price, currency = 'BRL') {
  if (!price) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(price)
}

function fmtNumber(n) {
  if (!n || n === 0) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function scoreColor(score) {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-blue-100 text-blue-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-500'
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
            className="flex-1 min-w-0 text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-mono" />
          <button onMouseDown={e => e.preventDefault()} onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0"><Check size={11} /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => setEditing(false)}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded shrink-0"><X size={11} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {initialValue ? (
            <a href={initialValue} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-500 hover:underline font-mono truncate flex-1 flex items-center gap-1">
              {initialValue} <ExternalLink size={9} className="shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-gray-300 flex-1">—</span>
          )}
          {saved
            ? <Check size={11} className="text-green-500 shrink-0" />
            : <button onMouseDown={e => e.preventDefault()} onClick={() => setEditing(true)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 shrink-0">
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
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${scoreColor(score)}`}
      title={blogBonus > 0 ? `Plataforma: ${score - blogBonus} + Blog: +${blogBonus}` : undefined}>
      <Trophy size={9} /> {score}
      {blogBonus > 0 && <span className="text-[9px] opacity-70">+{blogBonus}</span>}
    </span>
  )
}

// ── Competition level badge ───────────────────────────────────────────────────
const COMPETITION_META = {
  low:    { label: 'Baixa Concorrência', color: 'bg-green-100 text-green-700',  desc: 'Nicho com poucos concorrentes — boa oportunidade' },
  medium: { label: 'Concorrência Média', color: 'bg-yellow-100 text-yellow-700', desc: 'Mercado moderado' },
  high:   { label: 'Alta Concorrência',  color: 'bg-red-100 text-red-600',      desc: 'Mercado saturado — diferenciação necessária' },
}

// ── Product card (grid) ───────────────────────────────────────────────────────
function ProductCard({ product, onOpen }) {
  const soldQty         = product.soldQuantity ?? product.reviews ?? 0
  const discount        = discountPct(product.originalPrice, product.price)
  const listing         = LISTING_COLORS[product.listingType ?? product.listingTypeId]
  const hasFreeShipping = product.freeShipping
  const blogCount       = product.blogReviews?.length ?? 0
  const trustedCount    = product.blogReviews?.filter(r => r.trusted)?.length ?? 0
  const blogBonus       = product.blogReviewScore ?? 0

  return (
    <div
      onClick={() => onOpen(product)}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      {/* Image */}
      <div className="relative h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt=""
            className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform" />
        ) : (
          <ShoppingBag size={32} className="text-gray-200" />
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
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
      <div className="p-3">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-2">{product.title}</p>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm font-bold text-gray-900">{fmtPrice(product.price)}</span>
          {discount > 0 && (
            <span className="text-[11px] text-gray-400 line-through">{fmtPrice(product.originalPrice)}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {soldQty > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-orange-600 font-medium">
              <Flame size={10} /> {fmtNumber(soldQty)} vendidos
            </span>
          )}
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-yellow-600">
              <Star size={9} fill="currentColor" /> {product.rating}
            </span>
          )}
          {hasFreeShipping && (
            <span className="flex items-center gap-0.5 text-[11px] text-green-600">
              <Truck size={9} /> Grátis
            </span>
          )}
          {product.fulfillment && (
            <span className="flex items-center gap-0.5 text-[11px] text-blue-600">
              <Package size={9} /> Full
            </span>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 capitalize bg-gray-50 px-1.5 py-0.5 rounded">
            {product.marketplace?.replace(/_/g, ' ')}
          </span>
          <ChevronRight size={12} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </div>
  )
}

// ── Product drawer ─────────────────────────────────────────────────────────────
function ProductDrawer({ product, onClose, onSaveAffiliateLink, onDelete, affiliateOverrides }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!product) return null

  const soldQty       = product.soldQuantity ?? product.reviews ?? 0
  const discount      = discountPct(product.originalPrice, product.price)
  const listing       = LISTING_COLORS[product.listingType ?? product.listingTypeId]
  const overrides     = affiliateOverrides[product.id] ?? {}
  const blogReviews   = product.blogReviews ?? []
  const blogBonus     = product.blogReviewScore ?? 0
  const platformScore = (product.score ?? 0) - blogBonus
  const totalScore    = product.score ?? 0
  const affiliateLink = overrides.affiliateLink ?? product.affiliateLink ?? ''
  const productUrl    = product.productUrl ?? ''
  const primaryLink   = affiliateLink || productUrl

  const mpLabel = product.marketplace === 'amazon' ? 'Amazon' : product.marketplace === 'mercadolivre' ? 'Mercado Livre' : product.marketplace?.replace(/_/g, ' ') ?? ''

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
          <span className="text-xs text-gray-400 flex-1 truncate">{mpLabel}</span>
          <button onClick={() => { onDelete(product.id); onClose() }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Hero ── */}
          <div className="p-5 pb-4">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                {product.imageUrl
                  ? <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                  : <ShoppingBag size={22} className="text-gray-200" />}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-sm font-bold text-gray-900 leading-snug mb-2 line-clamp-3">{product.title}</h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ScoreBadge score={totalScore} blogBonus={blogBonus} />
                  {listing && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${listing.bg} ${listing.text}`}>{listing.label}</span>
                  )}
                  {blogBonus > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium">
                      <BookOpen size={9} /> +{blogBonus} blog
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price row */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">{fmtPrice(product.price)}</span>
                  {discount > 0 && <span className="text-sm text-gray-400 line-through">{fmtPrice(product.originalPrice)}</span>}
                </div>
                {discount > 0 && (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">{discount}% off</span>
                )}
              </div>
              {primaryLink && (
                <a href={primaryLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shrink-0">
                  Ver produto <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {/* ── Métricas ── */}
          <div className="px-5 pb-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <BarChart2 size={11} /> Métricas de Mercado
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Flame,   label: 'Vendas confirmadas', value: soldQty > 0 ? soldQty.toLocaleString('pt-BR') : '—', color: 'text-orange-500', bg: 'bg-orange-50' },
                { icon: Star,    label: 'Avaliação média',    value: product.rating > 0 ? `${product.rating} ★` : '—',      color: 'text-yellow-500', bg: 'bg-yellow-50' },
                { icon: Truck,   label: 'Frete',              value: product.freeShipping ? 'Grátis ✓' : 'Cobrado',          color: product.freeShipping ? 'text-green-600' : 'text-gray-400', bg: product.freeShipping ? 'bg-green-50' : 'bg-gray-50' },
                { icon: Package, label: 'Logística',          value: product.fulfillment  ? 'Full (ML)' : 'Vendedor',        color: product.fulfillment  ? 'text-blue-600'  : 'text-gray-400', bg: product.fulfillment  ? 'bg-blue-50'  : 'bg-gray-50' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl px-3 py-2.5`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon size={10} className={color} />
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            {product.sellerLevel && (
              <div className="mt-2 flex items-center gap-1.5 text-xs bg-gray-50 rounded-lg px-3 py-2">
                <Award size={11} className="text-gray-400 shrink-0" />
                <span className="text-gray-500">Vendedor</span>
                <span className={`font-bold ml-auto ${SELLER_LEVEL_COLORS[product.sellerLevel] ?? 'text-gray-600'}`}>
                  {product.sellerLevel?.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          {/* ── Score ── */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Trophy size={11} /> Como o Score foi calculado
            </p>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">📦 Dados da plataforma</span>
                  <span className="font-bold text-indigo-600">{platformScore}<span className="text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, platformScore)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Baseado em vendas, tipo de anúncio e reputação do vendedor</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">📰 Reviews editoriais</span>
                  <span className={`font-bold ${blogBonus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>+{blogBonus}<span className="text-gray-400 font-normal">/15</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, (blogBonus / 15) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {blogReviews.length === 0
                    ? 'Nenhuma review encontrada em blogs especializados'
                    : `${blogReviews.length} review${blogReviews.length > 1 ? 's' : ''} encontrada${blogReviews.length > 1 ? 's' : ''} — ${blogReviews.filter(r => r.trusted).length} de fontes confiáveis`}
                </p>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-700">Score final</span>
                <span className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${scoreColor(totalScore)}`}>{totalScore} pts</span>
              </div>
            </div>
          </div>

          {/* ── Reviews ── */}
          {blogReviews.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <BookOpen size={11} /> O que a mídia fala
              </p>
              <div className="space-y-2">
                {blogReviews.map((r, i) => (
                  <a key={i} href={r.link} target="_blank" rel="noreferrer"
                    className="block bg-gray-50 hover:bg-purple-50 rounded-xl p-3 border border-transparent hover:border-purple-100 transition-all group">
                    <div className="flex items-center gap-1.5 mb-1">
                      {r.trusted && <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">✓ confiável</span>}
                      <span className="text-[10px] font-semibold text-gray-500 truncate">{r.source}</span>
                      <ExternalLink size={9} className="text-gray-300 group-hover:text-purple-500 shrink-0 ml-auto" />
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{r.snippet}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Links ── */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Link2 size={11} /> Links de Afiliado
            </p>
            <div className="space-y-2.5">
              <AffiliateLinkEditor productId={product.id} label="Amazon"
                placeholder="https://amzn.to/xxxxxxx"
                initialValue={overrides.amazonAffiliateLink ?? product.amazonAffiliateLink ?? ''}
                color="text-orange-500"
                onSave={(id, val) => onSaveAffiliateLink(id, 'amazonAffiliateLink', val)} />
              <AffiliateLinkEditor productId={product.id} label="Mercado Livre"
                placeholder="https://mercadolivre.com/sec/xxxxxxx"
                initialValue={overrides.mlAffiliateLink ?? product.mlAffiliateLink ?? ''}
                color="text-yellow-600"
                onSave={(id, val) => onSaveAffiliateLink(id, 'mlAffiliateLink', val)} />
              <AffiliateLinkEditor productId={product.id} label="Link geral"
                placeholder="https://..."
                initialValue={affiliateLink}
                color="text-indigo-500"
                onSave={(id, val) => onSaveAffiliateLink(id, 'affiliateLink', val)} />
              {productUrl && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 w-20 shrink-0">Original</span>
                  <a href={productUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-gray-400 hover:text-indigo-600 font-mono truncate flex-1 flex items-center gap-1 transition-colors">
                    {productUrl.length > 40 ? productUrl.slice(0, 40) + '…' : productUrl}
                    <ExternalLink size={9} className="shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Mine modal ────────────────────────────────────────────────────────────────
function MineModal({ open, onClose, onRun, loading }) {
  const [marketplace, setMarketplace] = useState('mercadolivre_direct')
  const [siteFilter,  setSiteFilter]  = useState('ml_amazon')
  const [category,    setCategory]    = useState('')
  const [sortBy,      setSortBy]      = useState('sold_quantity_desc')

  if (!open) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!category.trim()) return
    onRun({ marketplace, siteFilter, category: category.trim(), sortBy })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={16} className="text-indigo-600" /> Nova Sessão de Mineração
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Marketplace</label>
            <select value={marketplace} onChange={e => setMarketplace(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="mercadolivre_direct">🏆 Mercado Livre Direto (melhor dados)</option>
              <option value="google_shopping">Google Shopping</option>
              <option value="amazon">Amazon (SerpAPI)</option>
              <option value="both">Google: ML + Amazon</option>
            </select>
          </div>

          {marketplace === 'mercadolivre_direct' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Ordenação</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="sold_quantity_desc">🔥 Mais Vendidos</option>
                <option value="relevance">Relevância</option>
                <option value="price_asc">💰 Menor Preço</option>
                <option value="price_desc">💎 Maior Preço</option>
              </select>
            </div>
          )}

          {marketplace === 'google_shopping' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Filtro de sites</label>
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="ml_amazon">ML + Amazon</option>
                <option value="mercadolivre">Só Mercado Livre</option>
                <option value="amazon">Só Amazon</option>
                <option value="all">Todos os sites</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Produto / Categoria</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="Ex: fone de ouvido, tênis running, air fryer…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !category.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
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
  baixa: 'bg-green-100 text-green-700',
  média: 'bg-yellow-100 text-yellow-700',
  alta:  'bg-red-100 text-red-700',
}

function NicheCard({ niche, onMine }) {
  const [expanded, setExpanded] = useState(false)
  const totalScore = Object.values(niche.scores ?? {}).reduce((a, b) => a + b, 0)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{niche.rank}</span>
            <h4 className="font-semibold text-gray-800 text-sm leading-tight">{niche.category}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${satColors[niche.saturation] ?? 'bg-gray-100 text-gray-600'}`}>{niche.saturation}</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{totalScore} pts</span>
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
                <Icon size={9} className="text-gray-400" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(niche.scores?.[key] ?? 0) * 10}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-600">{niche.scores?.[key]}/10</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 italic mb-3 line-clamp-1">"{niche.seoTitle}"</p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
            <DollarSign size={10} /> {niche.commissionRange}
          </span>
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{niche.salesType}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mb-3">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Menos detalhes' : 'Ver análise completa'}
        </button>
        {expanded && (
          <div className="space-y-3 mb-3 text-xs text-gray-600">
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Users size={11} /> Público-alvo</p><p>{niche.targetAudience}</p></div>
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Target size={11} /> Ângulo da review</p><p>{niche.reviewAngle}</p></div>
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Zap size={11} /> Por que encaixa no canal</p><p>{niche.whyItFits}</p></div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <p className="font-semibold text-indigo-700 mb-1">🎣 Gancho de abertura</p>
              <p className="italic text-indigo-800">"{niche.hook}"</p>
            </div>
          </div>
        )}
        <button onClick={() => onMine(niche)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
          <Play size={12} /> Minerar produtos desta categoria
        </button>
      </div>
    </div>
  )
}

function ShortNicheCard({ niche, onMine }) {
  const [expanded, setExpanded] = useState(false)
  const totalScore = Object.values(niche.scores ?? {}).reduce((a, b) => a + b, 0)
  const ticketColors = {
    'baixo ticket impulso': 'bg-blue-100 text-blue-700',
    'médio ticket considerado': 'bg-purple-100 text-purple-700',
    'alto ticket considerado': 'bg-orange-100 text-orange-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{niche.rank}</span>
            <h4 className="font-semibold text-gray-800 text-sm leading-tight">{niche.category}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${satColors[niche.saturation] ?? 'bg-gray-100 text-gray-600'}`}>{niche.saturation}</span>
            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{totalScore} pts</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { key: 'earningPotential', label: 'Comissão', icon: DollarSign },
            { key: 'viralPotential', label: 'Viral', icon: TrendingUp },
            { key: 'beginnerFriendly', label: 'Facilidade', icon: Zap },
            { key: 'evergreen', label: 'Perenidade', icon: Target },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Icon size={9} className="text-gray-400" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(niche.scores?.[key] ?? 0) * 10}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-600">{niche.scores?.[key]}/10</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
            <DollarSign size={10} /> {niche.commissionRange}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ticketColors[niche.ticketType] ?? 'bg-gray-100 text-gray-600'}`}>{niche.ticketType}</span>
        </div>
        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 mb-3">
          <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider mb-1">⚡ Gancho — primeiros 3 segundos</p>
          <p className="text-xs italic text-pink-900 font-medium">"{niche.hook}"</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-pink-500 hover:text-pink-700 flex items-center gap-1 mb-3">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Menos detalhes' : 'Ver análise completa'}
        </button>
        {expanded && (
          <div className="space-y-3 mb-3 text-xs text-gray-600">
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Clapperboard size={11} /> Melhor estilo de vídeo</p><p>{niche.bestVideoStyle}</p></div>
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Video size={11} /> Ângulo mais fácil</p><p>{niche.easiestContentAngle}</p></div>
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Users size={11} /> Público-alvo</p><p>{niche.targetAudience}</p></div>
            <div><p className="font-semibold text-gray-700 flex items-center gap-1 mb-0.5"><Zap size={11} /> Por que funciona no short-form</p><p>{niche.whyItFitsShortForm}</p></div>
          </div>
        )}
        <button onClick={() => onMine(niche)}
          className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
          <Play size={12} /> Minerar produtos desta categoria
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Mining() {
  const { data: sessionsData, refetch: refetchSessions } = useApi('/mining/sessions')
  const { data: statsData } = useApi('/mining/catalog/stats')
  const { data: trendsData } = useApi('/mining/trends')
  const sessions = sessionsData?.sessions ?? []
  const catalogStats = statsData ?? {}
  const trendingKeywords = trendsData?.trends ?? []

  const [selectedSessionId, setSelectedSessionId] = useState(null)
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

  // Niche intelligence
  const [nicheFormat,    setNicheFormat]    = useState('longform')
  const [nicheReports,   setNicheReports]   = useState({})
  const [nicheLoading,   setNicheLoading]   = useState(false)
  const [nicheError,     setNicheError]     = useState(null)
  const [nicheOpen,      setNicheOpen]      = useState(true)

  const nicheReport = nicheReports[nicheFormat] ?? null

  const catalogPath = selectedSessionId
    ? `/mining/catalog?sessionId=${selectedSessionId}`
    : '/mining/catalog'

  const { data: catalogData, loading: catalogLoading, refetch: refetchCatalog } = useApi(catalogPath)
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

  const marketplaces = useMemo(() => [...new Set(rawProducts.map(p => p.marketplace).filter(Boolean))], [rawProducts])
  const needsSetup = error?.includes('SERPAPI_KEY') || error?.includes('serpapi')

  async function handleRun({ marketplace, siteFilter, category, sortBy: runSortBy }) {
    setRunning(true); setError(null); setLastResult(null); setMineModalOpen(false)
    try {
      const result = await apiPost('/mining/run', { marketplace, category, siteFilter, sortBy: runSortBy })
      setLastResult({ count: result.count, warnings: result.warnings, competitionLevel: result.competitionLevel, listingTotal: result.listingTotal })
      await Promise.all([refetchCatalog(), refetchSessions()])
    } catch (e) { console.error("[mining]", e.message); setError(friendlyError(e.message)) }
    finally { setRunning(false) }
  }

  async function handleGenerateNiches() {
    setNicheLoading(true); setNicheError(null)
    try {
      const res = await fetch('/api/mining/niches/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: nicheFormat }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar recomendações')
      setNicheReports(prev => ({ ...prev, [nicheFormat]: data }))
      setNicheOpen(true)
    } catch (e) { setNicheError(e.message) }
    finally { setNicheLoading(false) }
  }

  function handleMineNiche(niche) {
    handleRun({ marketplace: 'mercadolivre_direct', siteFilter: 'ml_amazon', category: niche.category, sortBy: 'sold_quantity_desc' })
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
    refetchCatalog()
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
    <div>
      <AILoadingOverlay show={running} steps={MINING_STEPS} title="Minerando Produtos" />
      <PageHeader
        title="Mineração de Produtos"
        description="Dashboard de produtos com analytics e filtros de nicho"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setMineModalOpen(true)} disabled={running}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
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
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
        </div>
      )}

      {needsSetup && (
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="font-bold text-amber-800 text-sm">Configure o SerpAPI para Google Shopping / Amazon</p>
          </div>
          <p className="text-amber-700 text-xs">Para ML Direto não é necessário — use "Mercado Livre Direto" na nova mineração.</p>
        </div>
      )}

      {/* ── Niche Intelligence ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={() => setNicheOpen(o => !o)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <Sparkles size={16} className="text-indigo-500" />
              <h3 className="font-semibold text-gray-800">Inteligência de Nicho</h3>
            </button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setNicheFormat('longform')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${nicheFormat === 'longform' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Video size={11} /> Vídeos Longos
              </button>
              <button onClick={() => setNicheFormat('shortform')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${nicheFormat === 'shortform' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Clapperboard size={11} /> Vídeos Curtos
              </button>
            </div>
            {nicheReport && (
              <span className="text-xs text-gray-400">
                {new Date(nicheReport.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Show refresh icon only when report exists, no button when empty */}
            {nicheReport && (
              <button onClick={handleGenerateNiches} disabled={nicheLoading}
                title="Atualizar recomendações"
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors">
                <RefreshCw size={14} className={nicheLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button onClick={() => setNicheOpen(o => !o)} className="text-gray-400 hover:text-gray-600">
              {nicheOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        {nicheOpen && (
          <div className="p-5">
            {nicheError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                <AlertTriangle size={14} className="shrink-0" /> {nicheError}
              </div>
            )}
            {!nicheReport && !nicheLoading && (
              <div className="flex flex-col md:flex-row items-center gap-6 py-6 px-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${nicheFormat === 'shortform' ? 'bg-pink-100' : 'bg-indigo-100'}`}>
                  {nicheFormat === 'shortform'
                    ? <Clapperboard size={28} className="text-pink-500" />
                    : <Video size={28} className="text-indigo-500" />}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {nicheFormat === 'shortform'
                      ? 'Descubra nichos virais para TikTok, Reels e Shorts'
                      : 'Descubra os nichos com maior potencial de monetização'}
                  </p>
                  <p className="text-xs text-gray-400 mb-3 max-w-lg">
                    {nicheFormat === 'shortform'
                      ? 'A IA analisa tendências, potencial viral, facilidade de produção e comissão de afiliado para recomendar os melhores nichos para short-form content.'
                      : 'A IA analisa o mercado brasileiro de afiliados e aponta os nichos com maior potencial de comissão, retenção de audiência e oportunidade de conteúdo evergreen.'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {['Análise de mercado BR', 'Score de saturação', 'Ganchos prontos', 'Orientação de produto'].map(tag => (
                      <span key={tag} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${nicheFormat === 'shortform' ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'}`}>{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleGenerateNiches}
                  disabled={nicheLoading}
                  className={`shrink-0 flex items-center gap-2 disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm ${nicheFormat === 'shortform' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  <Sparkles size={15} /> Gerar Recomendações
                </button>
              </div>
            )}
            {nicheLoading && (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-gray-600">Analisando o mercado brasileiro…</p>
                <p className="text-xs text-gray-400">Isso leva alguns segundos</p>
              </div>
            )}
            {nicheReport && !nicheLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(nicheReport.niches ?? []).map(niche =>
                  nicheFormat === 'shortform'
                    ? <ShortNicheCard key={niche.rank} niche={niche} onMine={handleMineNiche} />
                    : <NicheCard key={niche.rank} niche={niche} onMine={handleMineNiche} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Stats dashboard ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total de Produtos"  value={(catalogStats.total ?? rawProducts.length).toLocaleString()}
          sub="no catálogo" icon={ShoppingBag} color="indigo" />
        <StatCard label="Melhor Score"        value={catalogStats.bestScore ?? (topProducts[0]?.score ?? 0)}
          sub="produto top" icon={Trophy} color="yellow" />
        <StatCard label="Preço Médio"         value={catalogStats.avgPrice ? fmtPrice(catalogStats.avgPrice) : '—'}
          sub="média do catálogo" icon={DollarSign} color="green" />
        <StatCard label="Total Vendidos"      value={catalogStats.totalSold ? fmtNumber(catalogStats.totalSold) : '—'}
          sub="soma ML soldQuantity" icon={Flame} color="orange" />
      </div>

      {/* ── Trending keywords ──────────────────────────────────────────────── */}
      {trendingKeywords.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-orange-600" />
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Tendências no Mercado Livre agora</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingKeywords.slice(0, 20).map((kw, i) => (
              <button key={i}
                onClick={() => handleRun({ marketplace: 'mercadolivre_direct', siteFilter: 'ml_amazon', category: kw, sortBy: 'sold_quantity_desc' })}
                disabled={running}
                className="flex items-center gap-1 text-xs bg-white border border-orange-200 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600 px-3 py-1.5 rounded-full transition-all font-medium disabled:opacity-50">
                <Flame size={10} /> {kw}
                <ArrowUpRight size={10} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Top 5 best scored ─────────────────────────────────────────────── */}
      {topProducts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-gray-700">Top 5 Produtos por Score</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topProducts.map((p, idx) => (
              <div key={p.id} onClick={() => setDrawerProduct(p)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </span>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="" className="w-8 h-8 object-contain rounded bg-gray-50 shrink-0" />
                  : <div className="w-8 h-8 bg-gray-100 rounded shrink-0" />
                }
                <p className="text-xs text-gray-700 flex-1 truncate">{p.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {(p.soldQuantity ?? p.reviews ?? 0) > 0 && (
                    <span className="text-[11px] text-orange-500 font-medium"><Flame size={10} className="inline" /> {fmtNumber(p.soldQuantity ?? p.reviews)}</span>
                  )}
                  {(p.blogReviews?.length ?? 0) > 0 && (
                    <span className="text-[11px] text-purple-600 font-medium flex items-center gap-0.5">
                      <BookOpen size={9} /> {p.blogReviews.length}
                    </span>
                  )}
                  <ScoreBadge score={p.score ?? 0} blogBonus={p.blogReviewScore ?? 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4">
        {/* Niche presets */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={13} className="text-gray-400 shrink-0" />
          {NICHES.map(n => (
            <button key={n.id} onClick={() => setNicheFilter(n.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${nicheFilter === n.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {n.label}
            </button>
          ))}
        </div>

        {/* Search + marketplace + sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {marketplaces.length > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setMpFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mpFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Todos
              </button>
              {marketplaces.map(mp => (
                <button key={mp} onClick={() => setMpFilter(mp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${mpFilter === mp ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {mp.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal size={13} className="text-gray-400" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          {(search || mpFilter !== 'all' || nicheFilter !== 'all') && (
            <span className="text-xs text-gray-400">
              {products.length} de {rawProducts.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Session chips ─────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedSessionId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedSessionId === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Todas as sessões
            </button>
            {sessions.map(s => (
              <button key={s.id} onClick={() => setSelectedSessionId(s.id === selectedSessionId ? null : s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${selectedSessionId === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.category}
                <span className={`text-[10px] ${selectedSessionId === s.id ? 'text-indigo-200' : 'text-gray-400'}`}>{timeAgo(s.createdAt)}</span>
                {s.status === 'failed' && <AlertTriangle size={10} className="text-red-400" />}
              </button>
            ))}
            {sessions.length > 0 && (
              <button onClick={handleClearSessions}
                className="px-3 py-1.5 rounded-full text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1">
                <Trash2 size={10} /> limpar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Product grid ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {selectedSession ? `Busca: "${selectedSession.category}"` : 'Catálogo de Produtos'}
          {products.length > 0 && <span className="ml-2 text-gray-400 font-normal">{products.length} produto{products.length !== 1 ? 's' : ''}</span>}
        </h3>
        {rawProducts.length > 0 && (
          <button onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
            <Trash2 size={11} /> Limpar catálogo
          </button>
        )}
      </div>

      {catalogLoading ? (
        <div className="py-16 text-center text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm">Carregando produtos…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
          <ShoppingBag size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500 mb-1">
            {rawProducts.length === 0 ? 'Nenhum produto ainda' : 'Nenhum produto corresponde ao filtro'}
          </p>
          {rawProducts.length === 0 && (
            <p className="text-xs text-gray-400 mb-4">Clique em "Nova Mineração" ou use um trending acima</p>
          )}
          {rawProducts.length === 0 && (
            <button onClick={() => setMineModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
              <Play size={14} /> Iniciar primeira mineração
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onOpen={setDrawerProduct} />
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
      />
    </div>
  )
}
