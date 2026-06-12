import { Globe, LogOut, Wallet } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { useAuth } from '../lib/auth.jsx'
import { COMMISSION_STATUSES, meta, pill, brl } from './ci/ciStatus.js'

export default function Portal() {
  const { user, logout } = useAuth()
  const { data, loading, error } = useApi('/ci/me/portal')
  const totals = data?.totals ?? {}
  const commissions = data?.commissions ?? []
  const partner = data?.partner

  return (
    <div className="ci-theme min-h-screen">
      <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b" style={{ borderColor: 'var(--ci-line)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center" style={{ background: 'var(--ci-mineral)' }}>
            <Globe size={14} style={{ color: 'var(--ci-sand)' }} strokeWidth={2} />
          </div>
          <span className="text-[13px] font-semibold">O Código Internacional</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(20,22,24,0.5)' }}>
          <LogOut size={14} /> Sair
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <p className="ci-eyebrow mb-2">Painel do parceiro</p>
        <h1 className="ci-h1">Olá, {user?.name || user?.email}.</h1>
        <p className="whisper mt-1" style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', color: 'var(--ci-green)' }}>Seus resultados em O Código Internacional.</p>

        {error && <p className="ci-data mt-6" style={{ color: '#9b2c2c', fontSize: 13 }}>{error}</p>}
        {loading && <p className="ci-data mt-8" style={{ color: 'rgba(20,22,24,0.4)', fontSize: 12 }}>Carregando…</p>}

        {!loading && (
          <>
            {/* Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              <Stat label="Comissão total" value={brl(totals.total)} accent />
              <Stat label="A receber" value={brl((Number(totals.pending) || 0) + (Number(totals.approved) || 0))} />
              <Stat label="Já pago" value={brl(totals.paid)} />
            </div>

            {/* Partner funnel */}
            {partner && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <Stat label="Seu UTM" value={partner.utm_source} mono />
                <Stat label="Leads atribuídos" value={partner.lead_count} mono />
                <Stat label="Vendas" value={partner.sale_count} mono />
              </div>
            )}

            {/* Commission list */}
            <div className="ci-card mt-8">
              <div className="ci-card-h"><Wallet size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Suas comissões</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead><tr>{['Comprador', '%', 'Valor', 'Status'].map((h) => <th key={h} className="ci-th">{h}</th>)}</tr></thead>
                  <tbody>
                    {commissions.map((cm, i) => (
                      <tr key={i} className="ci-tr">
                        <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--ci-mineral)' }}>{cm.buyer_name || '—'}</td>
                        <td className="ci-data" style={{ padding: '11px 16px', fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>{cm.rate}%</td>
                        <td className="ci-data" style={{ padding: '11px 16px', fontSize: 12.5, fontWeight: 600 }}>{brl(cm.amount)}</td>
                        <td style={{ padding: '11px 16px' }}><span className="ci-pill" style={pill(COMMISSION_STATUSES, cm.status)}>{meta(COMMISSION_STATUSES, cm.status).label}</span></td>
                      </tr>
                    ))}
                    {commissions.length === 0 && <tr><td colSpan={4} style={{ padding: 36, textAlign: 'center', fontSize: 12, color: 'rgba(20,22,24,0.35)' }}>Nenhuma comissão ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, accent, mono }) {
  return (
    <div className="ci-card" style={{ padding: '16px 18px', ...(accent ? { background: 'var(--ci-green)', borderColor: 'var(--ci-green)' } : {}) }}>
      <p className="ci-eyebrow" style={accent ? { color: 'rgba(239,232,220,0.7)' } : {}}>{label}</p>
      <p className={mono ? 'ci-data' : 'ci-data'} style={{ fontSize: 22, fontWeight: 500, marginTop: 6, color: accent ? 'var(--ci-ivory)' : 'var(--ci-mineral)' }}>{value}</p>
    </div>
  )
}
