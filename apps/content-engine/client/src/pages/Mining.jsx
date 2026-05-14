import { useState } from 'react'
import { Play, RefreshCw, ShoppingBag } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import StatCard from '../components/StatCard.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

export default function Mining() {
  const { data: catalogData,  refetch: refetchCatalog }   = useApi('/mining/catalog')
  const { data: sessionsData, refetch: refetchSessions }  = useApi('/mining/sessions')

  const products = catalogData?.products   ?? []
  const sessions = sessionsData?.sessions  ?? []

  const [running, setRunning]       = useState(false)
  const [marketplace, setMarketplace] = useState('amazon')
  const [category, setCategory]     = useState('electronics')
  const [error, setError]           = useState(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    try {
      await apiPost('/mining/run', { marketplace, category })
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
        title="Product Mining"
        description="Run mining sessions across MercadoLibre and Amazon"
        action={
          <div className="flex items-center gap-2">
            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="amazon">Amazon</option>
              <option value="mercadolibre">MercadoLibre</option>
              <option value="both">Both</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="electronics">Electronics</option>
              <option value="home-kitchen">Home & Kitchen</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="beauty">Beauty</option>
            </select>
            <button onClick={handleRun} disabled={running}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {running ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Running…' : 'Run Session'}
            </button>
          </div>
        }
      />

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Products"  value={products.length.toLocaleString()} sub="All marketplaces" icon={ShoppingBag} color="indigo" />
        <StatCard label="Amazon"          value={amazonCount.toLocaleString()}      sub={products.length ? `${Math.round(amazonCount/products.length*100)}% of catalog` : '—'} icon={ShoppingBag} color="blue" />
        <StatCard label="MercadoLibre"    value={mlCount.toLocaleString()}          sub={products.length ? `${Math.round(mlCount/products.length*100)}% of catalog` : '—'}    icon={ShoppingBag} color="yellow" />
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Mining Sessions</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Marketplace</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Products</th>
              <th className="px-6 py-3 font-medium">Run</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0
              ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No sessions yet — run your first mining session above.</td></tr>
              : sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800 capitalize">{s.marketplace}</td>
                  <td className="px-6 py-3 text-gray-500 capitalize">{s.category}</td>
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
          <h3 className="font-semibold text-gray-800">Top Scored Products</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Marketplace</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Rating</th>
              <th className="px-6 py-3 font-medium">Reviews</th>
              <th className="px-6 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0
              ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No products yet — run a mining session to populate the catalog.</td></tr>
              : products.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{p.title}</td>
                  <td className="px-6 py-3 text-gray-500 capitalize">{p.marketplace}</td>
                  <td className="px-6 py-3 text-gray-700">${p.price}</td>
                  <td className="px-6 py-3 text-gray-700">{p.rating} ★</td>
                  <td className="px-6 py-3 text-gray-700">{p.reviews?.toLocaleString()}</td>
                  <td className="px-6 py-3"><span className="font-bold text-indigo-600">{p.score}</span></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
