import { useState } from 'react'
import { Users, TrendingUp, GraduationCap, Wallet, Target, CalendarRange, Trophy, Pencil, Filter, Eye, AlertTriangle } from 'lucide-react'
import { useApi, apiPatch, apiPost } from '../../hooks/useApi.js'
import { useAuth } from '../../lib/auth.jsx'

const SUPERADMIN = 'hudson@tektone.com.br'
import { LEAD_STATUSES, meta, brl } from './ciStatus.js'
import { Header, ErrorBanner } from './CrmLeads.jsx'
import { revenueLabel, headcountLabel } from '../../lib/leadFields.js'

const pct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`

export default function CrmDashboard() {
  const { user } = useAuth()
  const isSuper = (user?.email || '').toLowerCase() === SUPERADMIN
  const { data, loading, error, refetch } = useApi('/ci/admin/dashboard')
  const d = data || {}

  async function resetAll() {
    if (window.prompt('Isso APAGA todos os leads, vendas, comissões, jornada e visitas (mantém logins, parceiros, closers, taxas e fontes). Digite ZERAR para confirmar.') !== 'ZERAR') return
    try { await apiPost('/ci/admin/reset-all', {}); window.location.reload() } catch (e) { window.alert(e.message) }
  }
  const counts = d.counts || {}
  const commissions = d.commissions || {}
  const maxStage = Math.max(1, ...LEAD_STATUSES.map((s) => counts[s.key] || 0))

  const revenue = Number(d.revenue || 0)
  const goal = Number(d.revenueGoal || 1000000)
  const price = Number(d.programPrice || 25000)
  const goalPct = goal ? revenue / goal : 0
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  async function saveGoal() {
    setSavingGoal(true)
    try { await apiPatch('/ci/admin/settings', { revenue_goal: Number(goalDraft) || goal }); setEditingGoal(false); await refetch() }
    finally { setSavingGoal(false) }
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral do funil de leads e resultados." />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {loading && <div className="py-10 text-center ci-data" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Carregando…</div>}

      {!loading && (
        <>
          {/* Revenue goal tracker */}
          <div className="ci-card mb-5" style={{ padding: '22px 24px' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={15} style={{ color: 'var(--ci-green)' }} />
                <span className="ci-eyebrow">Meta de receita do projeto</span>
              </div>
              {editingGoal ? (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: 'rgba(20,22,24,0.6)' }}>R$</span>
                  <input className="ci-input" style={{ width: 140 }} type="number" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} autoFocus />
                  <button className="ci-btn" style={{ padding: '8px 12px' }} disabled={savingGoal} onClick={saveGoal}>OK</button>
                  <button className="ci-btn ci-btn--ghost" style={{ padding: '8px 12px' }} onClick={() => setEditingGoal(false)}>×</button>
                </div>
              ) : (
                <button onClick={() => { setGoalDraft(String(goal)); setEditingGoal(true) }} className="flex items-center gap-1" style={{ fontSize: 11, color: 'rgba(20,22,24,0.5)' }}><Pencil size={11} /> ajustar meta</button>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap mb-3">
              <span className="ci-data" style={{ fontSize: 30, fontWeight: 700, color: 'var(--ci-mineral)', lineHeight: 1 }}>{brl(revenue)}</span>
              <span style={{ fontSize: 13, color: 'rgba(20,22,24,0.5)' }}>de {brl(goal)}</span>
              <span className="ci-data" style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 700, color: 'var(--ci-green)' }}>{pct(goalPct)}</span>
            </div>
            <div className="relative" style={{ height: 12 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,22,24,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, goalPct * 100)}%`, height: '100%', background: 'var(--ci-green)', borderRadius: 999, transition: 'width .6s' }} />
              </div>
              {/* milestone ticks */}
              {[25, 50, 75].map((m) => (
                <span key={m} style={{ position: 'absolute', left: `${m}%`, top: -3, bottom: -3, width: 1.5, background: goalPct * 100 >= m ? 'var(--ci-ivory)' : 'rgba(20,22,24,0.28)' }} />
              ))}
            </div>
            <div className="relative" style={{ height: 12, marginTop: 3 }}>
              {[[25, '250k'], [50, '500k'], [75, '750k']].map(([m, l]) => (
                <span key={m} className="ci-data" style={{ position: 'absolute', left: `${m}%`, transform: 'translateX(-50%)', fontSize: 8.5, color: 'rgba(20,22,24,0.4)' }}>{l}</span>
              ))}
              <span className="ci-data" style={{ position: 'absolute', right: 0, fontSize: 8.5, color: 'rgba(20,22,24,0.4)' }}>1M</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'rgba(20,22,24,0.55)', marginTop: 8 }}>
              Faltam <strong style={{ color: 'var(--ci-mineral)' }}>{brl(Math.max(0, goal - revenue))}</strong> · ~{Math.max(0, Math.ceil((goal - revenue) / price))} vendas de {brl(price)}
              {(() => {
                const pace = Number(d.revenue30 || 0)
                const remaining = Math.max(0, goal - revenue)
                if (revenue >= goal) return ' · 🎯 meta atingida!'
                if (pace <= 0) return ''
                const months = Math.ceil(remaining / pace)
                return ` · no ritmo atual (~${brl(pace)}/mês), meta em ~${months} ${months === 1 ? 'mês' : 'meses'}`
              })()}
            </p>
          </div>

          {/* Acquisition funnel — Visitas → Iniciaram → Leads → Fechados */}
          <Funnel d={d} />

          {/* Pré-venda page visits (per day) */}
          <VisitsCard />

          {/* KPI cards */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <Kpi icon={Users} label="Total de leads" value={d.totalLeads ?? 0} sub={`${d.last7 ?? 0} nos últimos 7 dias`} />
            <Kpi icon={Target} label="Taxa de conversão" value={pct(d.conversion)} sub={`${pct(d.winRate)} dos decididos`} accent />
            <Kpi icon={GraduationCap} label="Clientes (Fechados)" value={d.won ?? 0} sub={`${d.paidClients ?? 0} já pagaram`} />
            <Kpi icon={TrendingUp} label="Receita" value={brl(d.revenue)} sub="vendas pagas+" />
            <Kpi icon={Wallet} label="Comissões a pagar" value={brl((commissions.pending || 0) + (commissions.approved || 0))} sub={`${brl(commissions.projected)} previstas · ${brl(commissions.paid)} pago`} />
            <Kpi icon={CalendarRange} label="Leads / 30 dias" value={d.last30 ?? 0} sub={`${d.last7 ?? 0} esta semana`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Funnel */}
            <div className="ci-card">
              <div className="ci-card-h"><Filter size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Funil por estágio</h3></div>
              <div className="p-5 flex flex-col gap-3">
                {LEAD_STATUSES.map((s) => {
                  const n = counts[s.key] || 0
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1" style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--ci-mineral)', fontWeight: 600 }}>{meta(LEAD_STATUSES, s.key).label}</span>
                        <span className="ci-data" style={{ color: 'rgba(20,22,24,0.6)' }}>{n}</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(20,22,24,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${(n / maxStage) * 100}%`, height: '100%', background: s.color, borderRadius: 999, transition: 'width .5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Breakdowns */}
            <div className="flex flex-col gap-5">
              <Breakdown title="Leads por origem" rows={(d.bySource || []).map((r) => [r.source, r.n])} />
              <Breakdown title="Por closer (leads · fechados)" rows={(d.byCloser || []).map((r) => [r.closer, `${r.leads} · ${r.won || 0}`])} />
            </div>
          </div>

          {/* Qualification breakdowns */}
          <div className="grid gap-5 lg:grid-cols-2 mt-5">
            <Breakdown title={`Por faixa de faturamento${d.qualified ? ` · ${d.qualified} qualificados` : ''}`}
              rows={(d.byRevenueBand || []).map((r) => [revenueLabel(r.band), r.n])} bars />
            <Breakdown title="Por tamanho de equipe"
              rows={(d.byHeadcount || []).map((r) => [headcountLabel(r.band), r.n])} bars />
          </div>

          {/* Danger zone — superadmin only */}
          {isSuper && (
            <div className="ci-card mt-6" style={{ borderColor: 'rgba(155,44,44,0.4)' }}>
              <div className="ci-card-h" style={{ borderColor: 'rgba(155,44,44,0.25)' }}>
                <AlertTriangle size={13} style={{ color: '#9b2c2c' }} />
                <h3 className="ci-title" style={{ color: '#9b2c2c' }}>Zona de risco · superadmin</h3>
              </div>
              <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <p style={{ fontSize: 12, color: 'rgba(20,22,24,0.65)', lineHeight: 1.5, maxWidth: 520 }}>
                  <strong>Zerar tudo para o lançamento</strong> apaga <strong>todos os leads, vendas, comissões, jornada e visitas</strong>.
                  Mantém logins, parceiros, closers, taxas, fontes e turmas. Não tem como desfazer.
                </p>
                <button onClick={resetAll} className="ci-btn shrink-0"
                  style={{ background: '#9b2c2c', borderColor: '#9b2c2c' }}>
                  <AlertTriangle size={13} /> Zerar tudo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function VisitsCard() {
  const { user } = useAuth()
  const isSuper = (user?.email || '').toLowerCase() === SUPERADMIN
  const { data } = useApi('/ci/admin/visits?page=pre-venda&days=14')
  const series = (data?.series || []).slice().reverse() // oldest → newest
  const max = Math.max(1, ...series.map((s) => s.n))
  const last7 = series.slice(-7).reduce((a, s) => a + s.n, 0)
  const fmtDay = (iso) => { const [, m, dd] = iso.split('-'); return `${dd}/${m}` }
  return (
    <div className="ci-card mb-5" style={{ padding: '20px 22px' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <Eye size={14} style={{ color: 'var(--ci-green)' }} />
          <span className="ci-eyebrow">Visitas — página pré-venda <span style={{ textTransform: 'none', letterSpacing: 0, color: 'rgba(20,22,24,0.4)' }}>(/aplicacao)</span></span>
          {isSuper && (
            <button onClick={async () => { if (!window.confirm('Zerar todos os contadores de visitas (landing + pré-venda)?')) return; await apiPost('/ci/admin/visits/reset', {}); window.location.reload() }}
              className="ci-data" title="Somente superadmin" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(20,22,24,0.4)', border: '1px solid var(--ci-line)', padding: '2px 7px' }}>zerar</button>
          )}
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right"><p className="ci-data" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ci-mineral)', lineHeight: 1 }}>{data?.today ?? 0}</p><p style={{ fontSize: 9.5, color: 'rgba(20,22,24,0.45)' }}>hoje</p></div>
          <div className="text-right"><p className="ci-data" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ci-mineral)', lineHeight: 1 }}>{last7}</p><p style={{ fontSize: 9.5, color: 'rgba(20,22,24,0.45)' }}>7 dias</p></div>
          <div className="text-right"><p className="ci-data" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ci-green)', lineHeight: 1 }}>{data?.total ?? 0}</p><p style={{ fontSize: 9.5, color: 'rgba(20,22,24,0.45)' }}>total</p></div>
        </div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 64 }}>
        {series.map((s) => (
          <div key={s.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${fmtDay(s.date)}: ${s.n}`}>
            <span className="ci-data" style={{ fontSize: 9, color: 'rgba(20,22,24,0.5)' }}>{s.n || ''}</span>
            <div style={{ width: '100%', height: `${(s.n / max) * 44}px`, minHeight: s.n ? 3 : 1, background: s.n ? 'var(--ci-green)' : 'rgba(20,22,24,0.1)', borderRadius: 2, transition: 'height .4s' }} />
            <span className="ci-data" style={{ fontSize: 8, color: 'rgba(20,22,24,0.4)' }}>{fmtDay(s.date)}</span>
          </div>
        ))}
        {series.length === 0 && <p style={{ fontSize: 12, color: 'rgba(20,22,24,0.45)' }}>Sem dados ainda.</p>}
      </div>
    </div>
  )
}

function Funnel({ d }) {
  const landed = Number(d.landed || 0)
  const started = Number(d.started || 0)
  const leads = Number(d.totalLeads || 0)
  const won = Number(d.won || 0)
  const incomplete = Number(d.incomplete || 0)
  const stages = [
    { label: 'Visitas', value: landed, hint: 'acessos à landing' },
    { label: 'Iniciaram', value: started, hint: 'nome + WhatsApp' },
    { label: 'Leads', value: leads, hint: 'inscrição completa' },
    { label: 'Fechados', value: won, hint: 'viraram clientes' },
  ]
  const max = Math.max(1, landed, started, leads, won)
  const pctOf = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
  return (
    <div className="ci-card mb-5" style={{ padding: '20px 22px' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--ci-green)' }} />
          <span className="ci-eyebrow">Funil de aquisição</span>
        </div>
        {incomplete > 0 && (
          <span className="ci-data" style={{ fontSize: 11, color: 'var(--ci-sand-deep)' }}>
            {incomplete} {incomplete === 1 ? 'inscrição incompleta' : 'inscrições incompletas'} para remarketing
          </span>
        )}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {stages.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="ci-eyebrow">{s.label}</span>
              {i > 0 && <span className="ci-data" style={{ fontSize: 10, color: 'rgba(20,22,24,0.45)' }}>{pctOf(s.value, stages[i - 1].value)}</span>}
            </div>
            <p className="ci-data" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ci-mineral)', lineHeight: 1 }}>{s.value}</p>
            <div style={{ height: 6, background: 'rgba(20,22,24,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 7 }}>
              <div style={{ width: `${(s.value / max) * 100}%`, height: '100%', background: 'var(--ci-green)', borderRadius: 999, transition: 'width .6s' }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(20,22,24,0.45)', marginTop: 5 }}>{s.hint}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="ci-card" style={{ padding: '16px 18px' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 grid place-items-center" style={{ background: accent ? 'var(--ci-mineral)' : 'rgba(46,74,67,0.1)', border: accent ? 'none' : '1px solid rgba(46,74,67,0.25)' }}>
          <Icon size={14} style={{ color: accent ? 'var(--ci-sand)' : 'var(--ci-green)' }} />
        </div>
        <span className="ci-eyebrow">{label}</span>
      </div>
      <p className="ci-data" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ci-mineral)', lineHeight: 1.05 }}>{value}</p>
      {sub && <p style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.5)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function Breakdown({ title, rows, bars }) {
  const maxN = bars ? Math.max(1, ...rows.map(([, v]) => Number(v) || 0)) : 1
  return (
    <div className="ci-card">
      <div className="ci-card-h"><h3 className="ci-title">{title}</h3></div>
      <div className="p-4 flex flex-col">
        {rows.length === 0 && <p style={{ fontSize: 12, color: 'rgba(20,22,24,0.5)', padding: '8px 0' }}>Sem dados.</p>}
        {rows.map(([k, v], i) => (
          <div key={i} className="py-2" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--ci-line-soft)' : 'none' }}>
            <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
              <span className="truncate" style={{ color: 'var(--ci-mineral)' }}>{k}</span>
              <span className="ci-data shrink-0" style={{ color: 'rgba(20,22,24,0.6)', fontWeight: 600 }}>{v}</span>
            </div>
            {bars && (
              <div style={{ height: 6, background: 'rgba(20,22,24,0.06)', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${((Number(v) || 0) / maxN) * 100}%`, height: '100%', background: 'var(--ci-green)', borderRadius: 999, transition: 'width .5s' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
