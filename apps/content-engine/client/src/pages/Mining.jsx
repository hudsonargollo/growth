import { useState } from 'react'
import { Play, RefreshCw, ShoppingBag, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

const SETUP_STEPS = [
  { label: 'Crie um app gratuito em', link: 'https://developers.mercadolibre.com', linkLabel: 'developers.mercadolibre.com' },
  { label: 'Copie o App ID e Client Secret do painel do app' },
  { label: 'Execute no terminal:', code: 'wrangler secret put ML_APP_ID' },
  { label: 'Execute no terminal:', code: 'wrangler secret put ML_CLIENT_SECRET' },
]

export default function Mining() {
  const { data: catalogData,  refetch: refetchCatalog }  = useApi('/mining/catalog')
  const { data: sessionsData, refetch: refetchSessions } = useApi('/mining/sessions')

  const products = catalogData?.products  ?? []
  const sessions = sessionsData?.sessions ?? []

  const [running, setRunning]         = useState(false)
  const [marketplace, setMarketplace] = useState('mercadolibre')
  const [category, setCategory]       = useState('fone de ouvido')
  const [error, setError]             = useState(null)
  const [lastResult, setLastResult]   = useState(null) // { count, warnings }

  const needsSetup = error?.includes('credentials not configured') || error?.includes('ML_APP_ID')

  async function handleRun() {
    setRunning(true)
    setError(null)
    setLastResult(null)
    try {
      const result = await apiPost('/mining/run', { marketplace, category })
      setLastResult({ count: result.count, warnings: result.warnings })
      await Promise.all([refetchCatalog(), refetchSessions()])
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const amazonCount = products.filter((p) => p.marketplace === 'amazon').length
  const mlCount     = products.filter((p) => p.marketplace === 'mercadolibre').length

  return (
    <div>
      <PageHeader
        title="Mineração de Produtos"
        description="Busca produtos no MercadoLibre e Amazon e salva no catálogo"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="mercadolibre">MercadoLibre</option>
              <option value="amazon">Amazon</option>
              <option value="both">Ambos</option>
            </select>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: fone de ouvido, tênis, notebook…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
            <button onClick={handleRun} disabled={running || !category.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Minerando…' : 'Iniciar Sessão'}
            </button>
          </div>
        }
      />

      {/* Success banner */}
      {lastResult && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{lastResult.count} produtos salvos no catálogo</p>
            {lastResult.warnings?.map((w, i) => (
              <p key={i} className="text-green-600 text-xs mt-0.5">⚠ {w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !needsSetup && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
        </div>
      )}

      {/* Setup instructions banner */}
      {needsSetup && (
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="font-bold text-amber-800 text-sm">Configuração necessária — MercadoLibre App</p>
          </div>
          <p className="text-amber-700 text-xs mb-4">
            A API do MercadoLibre requer um App ID e Client Secret. Crie um app gratuito em menos de 2 minutos:
          </p>
          <ol className="space-y-2">
            {SETUP_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 font-bold flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span>
                <span>
                  {step.label}{' '}
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-amber-700 underline font-semibold">
                      {step.linkLabel} <ExternalLink size={10} />
                    </a>
                  )}
                  {step.code && (
                    <code className="ml-1 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-amber-900">
                      {step.code}
                    </code>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total de Produtos" value={products.length.toLocaleString()} sub="Todos os marketplaces" icon={ShoppingBag} color="indigo" />
        <StatCard label="Amazon"            value={amazonCount.toLocaleString()}      sub={products.length ? `${Math.round(amazonCount / products.length * 100)}% do catálogo` : '—'} icon={ShoppingBag} color="blue" />
        <StatCard label="MercadoLibre"      value={mlCount.toLocaleString()}          sub={products.length ? `${Math.round(mlCount / products.length * 100)}% do catálogo` : '—'}    icon={ShoppingBag} color="yellow" />
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Sessões de Mineração</h3>
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
              ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">Nenhuma sessão ainda — execute sua primeira mineração acima.</td></tr>
              : sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800 capitalize">{s.marketplace}</td>
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

      {/* Catalog */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Produtos com Maior Score</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Produto</th>
              <th className="px-6 py-3 font-medium">Marketplace</th>
              <th className="px-6 py-3 font-medium">Preço</th>
              <th className="px-6 py-3 font-medium">Avaliação</th>
              <th className="px-6 py-3 font-medium">Reviews</th>
              <th className="px-6 py-3 font-medium">Score</th>
              <th className="px-6 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0
              ? <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">Nenhum produto ainda — execute uma sessão de mineração para popular o catálogo.</td></tr>
              : products.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800 max-w-xs truncate">{p.title}</td>
                  <td className="px-6 py-3 text-gray-500 capitalize">{p.marketplace}</td>
                  <td className="px-6 py-3 text-gray-700">{p.currency} {p.price?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-700">{p.rating > 0 ? `${p.rating} ★` : '—'}</td>
                  <td className="px-6 py-3 text-gray-700">{p.reviews > 0 ? p.reviews.toLocaleString() : '—'}</td>
                  <td className="px-6 py-3"><span className="font-bold text-indigo-600">{p.score}</span></td>
                  <td className="px-6 py-3">
                    {p.affiliateLink
                      ? <a href={p.affiliateLink} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-indigo-500 hover:underline text-xs">
                          Ver <ExternalLink size={11} />
                        </a>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
