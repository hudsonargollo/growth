import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Play, RefreshCw, ShoppingBag, AlertTriangle, CheckCircle2,
  ExternalLink, Link2, Check, X, Pencil, Search, ChevronDown, ChevronUp,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

const SETUP_STEPS = [
  { label: 'Crie uma conta gratuita em', link: 'https://serpapi.com', linkLabel: 'serpapi.com' },
  { label: 'Copie sua API Key do dashboard (100 buscas/mês grátis)' },
  { label: 'Execute no terminal:', code: 'wrangler secret put SERPAPI_KEY' },
]

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
      <span className={`text-[10px] font-bold uppercase tracking-wider w-16 shrink-0 ${color}`}>{label}</span>
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

// ── Product row ───────────────────────────────────────────────────────────────
function ProductRow({ product, onSaveAffiliateLink }) {
  const [open, setOpen] = useState(false)
  const hasAffiliate = product.amazonAffiliateLink || product.mlAffiliateLink || product.affiliateLink

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded object-contain bg-gray-100 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                <ShoppingBag size={14} className="text-gray-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{product.title}</p>
              {hasAffiliate && <span className="text-[10px] text-green-600 font-medium">● link de afiliado</span>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
            {product.marketplace?.replace('_', ' ')}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {product.currency} {product.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {product.rating > 0 ? `${product.rating} ★` : '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {product.reviews > 0 ? product.reviews.toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-bold text-indigo-600">{product.score}</span>
        </td>
        <td className="px-4 py-3 text-gray-400">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-indigo-50/30">
          <td colSpan={7} className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={13} className="text-indigo-400" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Links de Afiliado</span>
              <span className="text-[10px] text-gray-400">Cole os links curtos gerados nas plataformas</span>
            </div>
            <div className="space-y-2.5 max-w-2xl">
              <AffiliateLinkEditor productId={product.id} label="Amazon"
                placeholder="https://amzn.to/xxxxxxx" initialValue={product.amazonAffiliateLink ?? ''}
                color="text-orange-500"
                onSave={(id, val) => onSaveAffiliateLink(id, 'amazonAffiliateLink', val)} />
              <AffiliateLinkEditor productId={product.id} label="Mercado Livre"
                placeholder="https://mercadolivre.com/sec/xxxxxxx" initialValue={product.mlAffiliateLink ?? ''}
                color="text-yellow-600"
                onSave={(id, val) => onSaveAffiliateLink(id, 'mlAffiliateLink', val)} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Mining() {
  const { data: sessionsData, refetch: refetchSessions } = useApi('/mining/sessions')
  const sessions = sessionsData?.sessions ?? []

  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [search,             setSearch]            = useState('')
  const [mpFilter,           setMpFilter]          = useState('all')
  const [running,            setRunning]            = useState(false)
  const [marketplace,        setMarketplace]        = useState('google_shopping')
  const [category,           setCategory]           = useState('fone de ouvido')
  const [error,              setError]              = useState(null)
  const [lastResult,         setLastResult]         = useState(null)
  const [affiliateOverrides, setAffiliateOverrides] = useState({})

  const catalogPath = selectedSessionId
    ? `/mining/catalog?sessionId=${selectedSessionId}`
    : '/mining/catalog'

  const { data: catalogData, loading: catalogLoading, refetch: refetchCatalog } = useApi(catalogPath)
  const rawProducts = catalogData?.products ?? []

  const products = useMemo(() => {
    let list = rawProducts.map(p => affiliateOverrides[p.id] ? { ...p, ...affiliateOverrides[p.id] } : p)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title?.toLowerCase().includes(q))
    }
    if (mpFilter !== 'all') {
      list = list.filter(p => p.marketplace === mpFilter)
    }
    return list
  }, [rawProducts, search, mpFilter, affiliateOverrides])

  const marketplaces = useMemo(() => [...new Set(rawProducts.map(p => p.marketplace).filter(Boolean))], [rawProducts])

  const needsSetup = error?.includes('SERPAPI_KEY') || error?.includes('serpapi')

  async function handleRun() {
    setRunning(true); setError(null); setLastResult(null)
    try {
      const result = await apiPost('/mining/run', { marketplace, category })
      setLastResult({ count: result.count, warnings: result.warnings })
      await Promise.all([refetchCatalog(), refetchSessions()])
      // Auto-select the most recent session after running
      await refetchSessions()
    } catch (e) { setError(e.message) }
    finally { setRunning(false) }
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

  return (
    <div>
      <PageHeader
        title="Mineração de Produtos"
        description="Busca produtos e gerencia links de afiliado"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={marketplace} onChange={e => setMarketplace(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="google_shopping">Google Shopping</option>
              <option value="amazon">Amazon</option>
              <option value="both">Ambos</option>
            </select>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
              placeholder="Ex: fone de ouvido, tênis…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52" />
            <button onClick={handleRun} disabled={running || !category.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Minerando…' : 'Iniciar Sessão'}
            </button>
          </div>
        }
      />

      {lastResult && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{lastResult.count} produtos salvos no catálogo</p>
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
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="font-bold text-amber-800 text-sm">Configuração necessária — SerpAPI</p>
          </div>
          <p className="text-amber-700 text-xs mb-4">100 buscas/mês grátis:</p>
          <ol className="space-y-2">
            {SETUP_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 font-bold flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span>
                <span>
                  {step.label}{' '}
                  {step.link && <a href={step.link} target="_blank" rel="noreferrer" className="text-amber-700 underline font-semibold">{step.linkLabel} <ExternalLink size={10} className="inline" /></a>}
                  {step.code && <code className="ml-1 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-amber-900">{step.code}</code>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Produtos"  value={rawProducts.length.toLocaleString()} sub={selectedSession ? `Busca: "${selectedSession.category}"` : 'Todos os marketplaces'} icon={ShoppingBag} color="indigo" />
        <StatCard label="Amazon"             value={rawProducts.filter(p => p.marketplace === 'amazon').length.toLocaleString()} sub="via SerpAPI" icon={ShoppingBag} color="blue" />
        <StatCard label="Google Shopping"    value={rawProducts.filter(p => p.marketplace === 'google_shopping').length.toLocaleString()} sub="via SerpAPI" icon={ShoppingBag} color="yellow" />
      </div>

      {/* Session filter row */}
      {sessions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Filtrar por busca</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSessionId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSessionId === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {sessions.map(s => (
              <button key={s.id}
                onClick={() => setSelectedSessionId(s.id === selectedSessionId ? null : s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedSessionId === s.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.category}
                <span className={`text-[10px] ${selectedSessionId === s.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {timeAgo(s.createdAt)}
                </span>
                {s.status === 'failed' && <AlertTriangle size={10} className="text-red-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + marketplace filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
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
                {mp.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
        {(search || mpFilter !== 'all') && (
          <span className="text-xs text-gray-400">
            {products.length} de {rawProducts.length} produto{rawProducts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Product catalog */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">
            {selectedSession ? `"${selectedSession.category}"` : 'Catálogo de Produtos'}
          </h3>
          <span className="text-xs text-gray-400">Clique para adicionar links de afiliado</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> com afiliado
          </span>
        </div>
        {catalogLoading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Carregando produtos…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Marketplace</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Avaliação</th>
                <th className="px-4 py-3 font-medium">Reviews</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {rawProducts.length === 0
                      ? 'Nenhum produto ainda — inicie uma sessão de mineração acima.'
                      : 'Nenhum produto corresponde ao filtro.'}
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <ProductRow key={p.id} product={p} onSaveAffiliateLink={handleSaveAffiliateLink} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Sessions history */}
      <div className="bg-white rounded-xl border border-gray-200 mt-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Histórico de Sessões</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Marketplace</th>
              <th className="px-6 py-3 font-medium">Busca</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Produtos</th>
              <th className="px-6 py-3 font-medium">Executado</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0
              ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">Nenhuma sessão ainda.</td></tr>
              : sessions.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedSessionId(s.id === selectedSessionId ? null : s.id)}>
                  <td className="px-6 py-3 font-medium text-gray-800 capitalize">{s.marketplace?.replace('_', ' ')}</td>
                  <td className="px-6 py-3 text-gray-500">{s.category}</td>
                  <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-3 text-gray-700">{s.productCount ?? 0}</td>
                  <td className="px-6 py-3 text-gray-400">{timeAgo(s.createdAt)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
