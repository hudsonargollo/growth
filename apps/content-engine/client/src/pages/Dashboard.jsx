import { ShoppingBag, FileText, Mic, Send, MessageSquare, TrendingUp, Wand2, Zap, ArrowRight, FolderOpen, Radar, Film } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { humanize, scriptDisplayName, sessionDisplayName } from '../lib/humanize.js'
import { useState } from 'react'
import StatCard    from '../components/StatCard.jsx'
import PageHeader  from '../components/PageHeader.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useApi, timeAgo } from '../hooks/useApi.js'

// ── Wizard CTA banner ─────────────────────────────────────────────────────────

function WizardBanner() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => navigate('/wizard')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        borderRadius: 18, padding: '22px 28px',
        background: hovered
          ? 'linear-gradient(135deg, rgba(204,255,0,0.12) 0%, rgba(139,92,246,0.14) 100%)'
          : 'linear-gradient(135deg, rgba(204,255,0,0.08) 0%, rgba(139,92,246,0.10) 100%)',
        border: `1px solid ${hovered ? 'rgba(204,255,0,0.35)' : 'rgba(204,255,0,0.20)'}`,
        boxShadow: hovered ? '0 0 40px rgba(204,255,0,0.12)' : 'none',
        transition: 'all 250ms ease',
        marginBottom: 28,
      }}
    >
      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: -40, right: 80, width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, right: -20, width: 140, height: 140, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#CCFF00', boxShadow: hovered ? '0 0 28px rgba(204,255,0,0.45)' : '0 0 16px rgba(204,255,0,0.25)',
          transition: 'box-shadow 250ms ease',
        }}>
          <Wand2 size={22} color="#07070B" strokeWidth={2.5} />
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em' }}>
              Criar Conteúdo Completo
            </p>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 100,
              background: 'rgba(204,255,0,0.15)', border: '1px solid rgba(204,255,0,0.30)',
              color: '#CCFF00', textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>NOVO</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            Escolha um tópico em alta → mineração automática → roteiro com IA → narração pronta
          </p>
        </div>

        {/* Steps pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {[
            { icon: TrendingUp, label: 'Tópico' },
            { icon: ShoppingBag, label: 'Produtos' },
            { icon: FileText,   label: 'Roteiro' },
            { icon: Mic,        label: 'Áudio' },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 100,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
              }}>
                <Icon size={10} />
                {label}
              </div>
              {i < 3 && <ArrowRight size={10} color="rgba(255,255,255,0.20)" />}
            </div>
          ))}
          <div style={{
            width: 32, height: 32, borderRadius: 10, marginLeft: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? '#CCFF00' : 'rgba(204,255,0,0.12)',
            border: '1px solid rgba(204,255,0,0.30)',
            transition: 'all 250ms ease',
          }}>
            <ArrowRight size={14} color={hovered ? '#07070B' : '#CCFF00'} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Acesso Rápido ─────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { to: '/projects',   label: 'Projetos',        icon: FolderOpen, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.22)' },
  { to: '/radar',      label: 'Radar',           icon: Radar,      color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.20)'  },
  { to: '/mining',     label: 'Mineração',       icon: ShoppingBag,color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' },
  { to: '/scripts',    label: 'Roteiros',        icon: FileText,   color: '#CCFF00', bg: 'rgba(204,255,0,0.07)',  border: 'rgba(204,255,0,0.18)'  },
  { to: '/voiceover',  label: 'Narração',        icon: Mic,        color: '#00FFB9', bg: 'rgba(0,255,185,0.07)',  border: 'rgba(0,255,185,0.18)'  },
  { to: '/storyboard', label: 'Storyboard',      icon: Film,       color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.18)' },
  { to: '/delivery',   label: 'Entrega',         icon: Send,       color: '#FF6B2B', bg: 'rgba(255,107,43,0.07)', border: 'rgba(255,107,43,0.18)' },
  { to: '/comments',   label: 'Comentários',     icon: MessageSquare, color: '#FFB800', bg: 'rgba(255,184,0,0.07)', border: 'rgba(255,184,0,0.18)' },
]

function QuickAccess() {
  const navigate = useNavigate()
  return (
    <div className="mb-7">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/20 mb-3 px-0.5">Acesso Rápido</p>
      <div className="grid grid-cols-4 xl:grid-cols-8 gap-2">
        {QUICK_LINKS.map(({ to, label, icon: Icon, color, bg, border }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl transition-all group"
            style={{ background: bg, border: `1px solid ${border}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${bg}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={14} style={{ color }} />
            </div>
            <span className="text-[10px] font-semibold text-center leading-tight"
              style={{ color: 'rgba(255,255,255,0.55)' }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// type → inline style chip (dark neon palette, avoids Tailwind purge)
const TYPE_STYLES = {
  Mining:    { background: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)'  },
  Script:    { background: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)'  },
  Voiceover: { background: 'rgba(0,255,185,0.10)',   color: '#00FFB9', border: '1px solid rgba(0,255,185,0.20)'   },
  Delivery:  { background: 'rgba(204,255,0,0.08)',   color: '#CCFF00', border: '1px solid rgba(204,255,0,0.20)'   },
  Comment:   { background: 'rgba(255,184,0,0.10)',   color: '#FFB800', border: '1px solid rgba(255,184,0,0.20)'   },
}
const TYPE_DEFAULT = { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.10)' }

function SkeletonRows({ cols }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-5 py-3">
          <div className="skeleton h-4" style={{ width: `${55 + (j * 10) % 35}%` }} />
        </td>
      ))}
    </tr>
  ))
}

export default function Dashboard() {
  const { data: miningData }   = useApi('/mining/catalog')
  const { data: sessionsData } = useApi('/mining/sessions')
  const { data: scriptsData }  = useApi('/scripts')
  const { data: voData }       = useApi('/voiceover')
  const { data: delivData }    = useApi('/delivery')
  const { data: commData }     = useApi('/comments')

  const products   = miningData?.products   ?? []
  const sessions   = sessionsData?.sessions ?? []
  const scripts    = scriptsData?.scripts   ?? []
  const voiceovers = voData?.voiceovers     ?? []
  const deliveries = delivData?.jobs        ?? []
  const comments   = commData?.jobs         ?? []

  const aiReplies = comments.filter((c) => c.source === 'AI' && c.status === 'completed').length
  const aiPct     = comments.length ? Math.round((aiReplies / comments.length) * 100) : 0

  const activity = [
    ...sessions.map((s)   => ({ type: 'Mining',    name: sessionDisplayName(s),   status: s.status,    time: s.createdAt })),
    ...scripts.map((s)    => ({ type: 'Script',    name: scriptDisplayName(s),    status: 'completed', time: s.createdAt })),
    ...voiceovers.map((v) => ({ type: 'Voiceover', name: `${v.voiceModel} voice`,                    status: v.status,    time: v.createdAt })),
    ...deliveries.map((d) => ({ type: 'Delivery',  name: `Editor – ${d.editorContact}`,              status: d.status,    time: d.createdAt })),
    ...comments.map((c)   => ({ type: 'Comment',   name: c.comment?.slice(0, 50) ?? '—',             status: c.status,    time: c.createdAt })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 12)

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Visão Geral"
        title="Dashboard"
        description="Acompanhe seu pipeline de conteúdo em tempo real"
      />

      <WizardBanner />

      <QuickAccess />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard label="Produtos Catalogados"    value={products.length.toLocaleString()}   sub="Todos os marketplaces"                                                   icon={ShoppingBag}   color="indigo" />
        <StatCard label="Roteiros Gerados"        value={scripts.length.toLocaleString()}    sub={`${scripts.length} total`}                                               icon={FileText}      color="violet" />
        <StatCard label="Narrações Prontas"       value={voiceovers.length.toLocaleString()} sub={`${voiceovers.filter(v=>v.status==='completed').length} concluídas`}     icon={Mic}           color="green"  />
        <StatCard label="Entregas Enviadas"       value={deliveries.length.toLocaleString()} sub={`${deliveries.filter(d=>d.status==='completed').length} concluídas`}    icon={Send}          color="blue"   />
        <StatCard label="Comentários Respondidos" value={comments.length.toLocaleString()}   sub={`IA: ${aiPct}% · Humano: ${100 - aiPct}%`}                             icon={MessageSquare} color="yellow" />
        <StatCard label="Sessões de Mineração"    value={sessions.length.toLocaleString()}   sub={`${sessions.filter(s=>s.status==='completed').length} concluídas`}      icon={TrendingUp}    color="green"  />
      </div>

      <div className="card">
        <div className="card-header">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.35)' }}
          >
            <TrendingUp size={12} style={{ color: '#8B5CF6' }} />
          </div>
          <h3 className="card-title">Atividade Recente</h3>
          <span className="ml-auto text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.30)' }}>{activity.length} eventos</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th className="th">Tipo</th>
              <th className="th">Tarefa</th>
              <th className="th">Status</th>
              <th className="th">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0
              ? <SkeletonRows cols={4} />
              : activity.map((job, i) => (
                <tr key={i} className="tr">
                  <td className="px-5 py-3">
                    <span style={{
                      ...(TYPE_STYLES[job.type] ?? TYPE_DEFAULT),
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.10em', padding: '2px 8px', borderRadius: '100px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium max-w-xs truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>{job.name}</td>
                  <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.30)', fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(job.time)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {activity.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <TrendingUp size={20} style={{ color: '#8B5CF6' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Nenhuma atividade ainda</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Execute uma mineração para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
