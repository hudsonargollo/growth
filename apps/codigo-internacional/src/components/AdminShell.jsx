import { useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Globe, Wallet, Handshake, LogOut, GraduationCap, LayoutDashboard, Inbox } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import CrmLeads from '../pages/ci/CrmLeads.jsx'
import CrmLeadDetail from '../pages/ci/CrmLeadDetail.jsx'
import CrmCommissions from '../pages/ci/CrmCommissions.jsx'
import CrmPartners from '../pages/ci/CrmPartners.jsx'
import CrmTurmas from '../pages/ci/CrmTurmas.jsx'
import CrmDashboard from '../pages/ci/CrmDashboard.jsx'
import CrmIncomplete from '../pages/ci/CrmIncomplete.jsx'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'Pipeline', icon: Globe },
  { to: '/admin/turmas', label: 'Turmas', icon: GraduationCap },
  { to: '/admin/commissions', label: 'Comissões', icon: Wallet },
  { to: '/admin/partners', label: 'Parceiros', icon: Handshake },
  { to: '/admin/incomplete', label: 'Incompletos', icon: Inbox },
]

/** Horizontal top-nav tab — full header height with an active underline. */
function TopLink({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} end title={label} className={({ isActive }) =>
      `flex items-center gap-2 px-3 lg:px-3.5 h-16 -mb-px border-b-2 whitespace-nowrap text-[13px] transition-colors ${
        isActive
          ? 'border-[#2e4a43] text-[#141618] font-semibold'
          : 'border-transparent text-[#141618]/55 hover:text-[#141618] hover:border-[#141618]/20'
      }`}>
      <Icon size={16} strokeWidth={1.75} /> <span className="hidden md:inline">{label}</span>
    </NavLink>
  )
}

export default function AdminShell() {
  const { user, logout } = useAuth()
  useEffect(() => { document.title = 'O Código Internacional — CRM' }, [])

  return (
    <div className="ci-theme min-h-screen">
      {/* Fixed top header (replaces the sidebar) */}
      <header className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-4 sm:px-6 lg:px-8"
        style={{ background: 'rgba(239,232,220,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--ci-line)' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0 mr-2 lg:mr-6">
          <img src="/brand/logo-icon-trans.webp" alt="" className="w-8 h-8 object-contain shrink-0" />
          <div className="leading-none hidden sm:block">
            <span className="block text-[12.5px] font-bold tracking-[0.08em] uppercase">Código Internacional</span>
            <span className="ci-eyebrow" style={{ fontSize: '0.5rem', marginTop: 2, display: 'block' }}>CRM · Mentoria</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 lg:gap-1 overflow-x-auto no-scrollbar h-16">
          {NAV.map((n) => <TopLink key={n.to} {...n} />)}
        </nav>

        {/* User */}
        <div className="ml-auto flex items-center gap-3 shrink-0 pl-3">
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--ci-sand)', color: 'var(--ci-mineral)' }}>
              {(user?.email ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <p className="hidden lg:block max-w-[180px] text-[11px] truncate" style={{ color: 'rgba(20,22,24,0.5)' }}>{user?.email}</p>
          </div>
          <button onClick={logout} title="Sair" style={{ color: 'rgba(20,22,24,0.45)' }} className="hover:opacity-70 grid place-items-center"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-10 pt-[88px] pb-12 max-w-[1400px] mx-auto min-w-0">
        {/* Relative paths — this <Routes> is nested under the "/admin/*" route. */}
        <Routes>
          <Route path="dashboard" element={<CrmDashboard />} />
          <Route path="leads" element={<CrmLeads />} />
          <Route path="leads/:id" element={<CrmLeadDetail />} />
          <Route path="turmas" element={<CrmTurmas />} />
          <Route path="commissions" element={<CrmCommissions />} />
          <Route path="partners" element={<CrmPartners />} />
          <Route path="incomplete" element={<CrmIncomplete />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
