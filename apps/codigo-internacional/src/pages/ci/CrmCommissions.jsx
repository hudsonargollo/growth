import { useState } from 'react'
import { Wallet, Coins } from 'lucide-react'
import { useApi, apiPatch } from '../../hooks/useApi.js'
import { COMMISSION_STATUSES, meta, pill, brl } from './ciStatus.js'
import { Header, ErrorBanner } from './CrmLeads.jsx'

const PAGE_SIZE = 50

export default function CrmCommissions() {
  const [page, setPage] = useState(0)
  const { data: sumData, loading, error, refetch: refetchSum } = useApi('/ci/admin/commissions/summary')
  const { data: listData, refetch: refetchList } = useApi(`/ci/admin/commissions?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, [page])
  const summary = sumData?.summary ?? []
  const commissions = listData?.commissions ?? []
  const total = listData?.total ?? 0
  const maxPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function setStatus(cmId, status) {
    setBusy(true); setActionError(null)
    try { await apiPatch(`/ci/admin/commissions/${cmId}/status`, { status }); await refetchSum(); await refetchList() }
    catch (e) { setActionError(e.message) } finally { setBusy(false) }
  }

  const totalPending = summary.reduce((a, s) => a + Number(s.pending || 0), 0)

  return (
    <div>
      <Header
        title="Comissões"
        subtitle="Geradas quando o pagamento é confirmado."
        right={<span className="ci-data hidden sm:inline" style={{ fontSize: 11, color: 'rgba(20,22,24,0.45)' }}>{brl(totalPending)} a pagar</span>}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {actionError && <ErrorBanner>{actionError}</ErrorBanner>}
      {loading && <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Carregando…</div>}

      {summary.length > 0 && (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {summary.map((s) => (
            <div key={s.beneficiary_key} className="ci-card" style={{ padding: '16px 18px' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 grid place-items-center" style={{ background: 'rgba(46,74,67,0.10)', border: '1px solid rgba(46,74,67,0.25)' }}>
                  <Wallet size={15} style={{ color: 'var(--ci-green)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }}>{s.beneficiary_name}</p>
                  <p className="ci-eyebrow">{s.beneficiary_type === 'house' ? 'Casa' : 'Parceiro'}</p>
                </div>
              </div>
              <p className="ci-data" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ci-mineral)' }}>{brl(s.total)}</p>
              <div className="flex gap-3 mt-2 ci-data" style={{ fontSize: 10.5 }}>
                <span style={{ color: '#9c6f1e' }}>{brl(s.pending)} pend.</span>
                <span style={{ color: 'var(--ci-green)' }}>{brl(s.paid)} pago</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ci-card">
        <div className="ci-card-h"><Coins size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Lançamentos</h3></div>
        {/* Desktop: table */}
        <div className="hidden sm:block">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead><tr>{['Beneficiário', 'Comprador', '%', 'Valor', 'Status', 'Ações'].map((h) => <th key={h} className="ci-th">{h}</th>)}</tr></thead>
            <tbody>
              {commissions.map((cm) => (
                <tr key={cm.id} className="ci-tr">
                  <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 600, color: 'var(--ci-mineral)' }}>{cm.beneficiary_name}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>{cm.buyer_name || '—'}</td>
                  <td className="ci-data" style={{ padding: '11px 16px', fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>{cm.rate}%</td>
                  <td className="ci-data" style={{ padding: '11px 16px', fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }}>{brl(cm.amount)}</td>
                  <td style={{ padding: '11px 16px' }}><span className="ci-pill" style={pill(COMMISSION_STATUSES, cm.status)}>{meta(COMMISSION_STATUSES, cm.status).label}</span></td>
                  <td style={{ padding: '11px 16px' }}>
                    <div className="flex gap-1.5">
                      {cm.status === 'pending' && <MiniBtn disabled={busy} onClick={() => setStatus(cm.id, 'approved')}>Aprovar</MiniBtn>}
                      {(cm.status === 'pending' || cm.status === 'approved') && <MiniBtn disabled={busy} primary onClick={() => setStatus(cm.id, 'paid')}>Marcar paga</MiniBtn>}
                      {cm.status !== 'void' && cm.status !== 'paid' && <MiniBtn disabled={busy} danger onClick={() => setStatus(cm.id, 'void')}>Anular</MiniBtn>}
                    </div>
                  </td>
                </tr>
              ))}
              {commissions.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Nenhuma comissão ainda. Elas aparecem quando o pagamento de uma venda é confirmado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards — no horizontal scroll */}
        <div className="sm:hidden">
          {commissions.map((cm) => (
            <div key={cm.id} className="p-4" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ci-mineral)' }}>{cm.beneficiary_name}</p>
                  <p className="truncate" style={{ fontSize: 11.5, color: 'rgba(20,22,24,0.6)', marginTop: 2 }}>{cm.buyer_name || '—'} · {cm.rate}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="ci-data" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ci-mineral)' }}>{brl(cm.amount)}</p>
                  <span className="ci-pill mt-1.5 inline-flex" style={pill(COMMISSION_STATUSES, cm.status)}>{meta(COMMISSION_STATUSES, cm.status).label}</span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {cm.status === 'pending' && <MiniBtn disabled={busy} onClick={() => setStatus(cm.id, 'approved')}>Aprovar</MiniBtn>}
                {(cm.status === 'pending' || cm.status === 'approved') && <MiniBtn disabled={busy} primary onClick={() => setStatus(cm.id, 'paid')}>Marcar paga</MiniBtn>}
                {cm.status !== 'void' && cm.status !== 'paid' && <MiniBtn disabled={busy} danger onClick={() => setStatus(cm.id, 'void')}>Anular</MiniBtn>}
              </div>
            </div>
          ))}
          {commissions.length === 0 && !loading && (
            <p className="p-10 text-center" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Nenhuma comissão ainda. Elas aparecem quando o pagamento de uma venda é confirmado.</p>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--ci-line-soft)' }}>
            <span className="ci-data" style={{ fontSize: 11, color: 'rgba(20,22,24,0.58)' }}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</span>
            <div className="flex gap-2">
              <MiniBtn disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}>Anterior</MiniBtn>
              <MiniBtn disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(p + 1, maxPage))}>Próxima</MiniBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniBtn({ children, onClick, disabled, primary, danger }) {
  const base = { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '5px 9px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }
  const theme = primary
    ? { color: 'var(--ci-ivory)', background: 'var(--ci-mineral)', border: '1px solid var(--ci-mineral)' }
    : danger
      ? { color: '#9b2c2c', background: 'rgba(155,44,44,0.08)', border: '1px solid rgba(155,44,44,0.25)' }
      : { color: 'var(--ci-mineral)', background: 'transparent', border: '1px solid var(--ci-sand-deep)' }
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...theme }}>{children}</button>
}
