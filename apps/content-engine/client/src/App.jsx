import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, FileText, Mic, Send,
  MessageSquare, Settings, LogOut, Loader2, Zap,
} from 'lucide-react'
import { supabase } from './lib/supabase.js'

import Landing      from './pages/Landing.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import Mining       from './pages/Mining.jsx'
import Scripts      from './pages/Scripts.jsx'
import Voiceover    from './pages/Voiceover.jsx'
import Delivery     from './pages/Delivery.jsx'
import Comments     from './pages/Comments.jsx'
import SettingsPage from './pages/Settings.jsx'
import Wizard       from './pages/Wizard.jsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/mining',    label: 'Mineração',   icon: ShoppingBag },
  { to: '/scripts',   label: 'Roteiros',    icon: FileText },
  { to: '/voiceover', label: 'Narração',    icon: Mic },
  { to: '/delivery',  label: 'Entrega',     icon: Send },
  { to: '/comments',  label: 'Comentários', icon: MessageSquare },
]

const bottomNavItems = [
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function SideLink({ to, label, icon: Icon, highlight }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 pl-3 pr-2.5 py-2 text-[13px] font-medium transition-all border-l-2 ${
          isActive
            ? highlight
              ? 'text-[#07070B] bg-[#CCFF00] border-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.25)] rounded-r-xl'
              : 'text-white bg-[#0F0F16] border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.15)] rounded-r-xl'
            : highlight
              ? 'text-[#CCFF00]/70 border-transparent hover:text-[#CCFF00] hover:bg-[#CCFF00]/[0.06] rounded-r-xl'
              : 'text-white/40 border-transparent hover:text-white/75 hover:bg-white/[0.04] rounded-r-xl'
        }`
      }
      style={{ transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)', transitionDuration: '200ms' }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </NavLink>
  )
}

function Sidebar({ user, onSignOut }) {
  const initials = (user?.email ?? 'U').slice(0, 2).toUpperCase()
  return (
    <aside
      className="w-[220px] h-screen sticky top-0 flex flex-col overflow-y-auto shrink-0"
      style={{ background: '#07070B', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#CCFF00', boxShadow: '0 0 16px rgba(204,255,0,0.35)' }}
          >
            <Zap size={13} style={{ color: '#07070B' }} strokeWidth={2.5} />
          </div>
          <span className="font-black text-[13px] tracking-tight leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Fábrica de<br />Conteúdo
          </span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/15 mt-3">
          YouTube Automation
        </p>
      </div>

      <div className="mx-5 h-px bg-white/[0.06] mb-4" />

      <nav className="flex-1 px-3 space-y-0.5">
        <p className="px-2.5 mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/15">Pipeline</p>
        {navItems.map(({ to, label, icon, highlight }) => (
          <SideLink key={to} to={to} label={label} icon={icon} highlight={highlight} />
        ))}

        <div className="h-px bg-white/[0.06] my-4" />

        <p className="px-2.5 mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/15">Sistema</p>
        {bottomNavItems.map(({ to, label, icon }) => (
          <SideLink key={to} to={to} label={label} icon={icon} />
        ))}
      </nav>

      <div className="mx-5 h-px bg-white/[0.06] mt-4" />
      <div className="px-4 py-4 flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black"
          style={{ background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.40)', color: '#8B5CF6' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-white/35 truncate font-medium">{user?.email}</p>
        </div>
        <button
          onClick={onSignOut}
          title="Sair"
          className="text-white/20 hover:text-white/60 transition-colors"
        >
          <LogOut size={13} />
        </button>
      </div>
      <div className="px-5 pb-4 text-[9px] text-white/10 font-black uppercase tracking-widest">
        v0.1.0 · MVP
      </div>
    </aside>
  )
}

function AppShell({ session }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#07070B' }}>
      <Sidebar user={session.user} onSignOut={() => supabase.auth.signOut()} />
      <main className="flex-1 px-8 py-7 overflow-auto min-w-0">
        <Routes>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/wizard"     element={<Wizard />} />
          <Route path="/mining"     element={<Mining />} />
          <Route path="/scripts"    element={<Scripts />} />
          <Route path="/voiceover"  element={<Voiceover />} />
          <Route path="/delivery"   element={<Delivery />} />
          <Route path="/comments"   element={<Comments />} />
          <Route path="/settings"   element={<SettingsPage />} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070B' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: '#CCFF00', boxShadow: '0 0 28px rgba(204,255,0,0.40)' }}
          >
            <Zap size={20} style={{ color: '#07070B' }} strokeWidth={2.5} />
          </div>
          <Loader2 size={16} className="animate-spin" style={{ color: '#8B5CF6' }} />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"   element={session ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/*"  element={session ? <AppShell session={session} /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
