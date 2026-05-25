import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, FileText, Mic, Send,
  MessageSquare, Settings, LogOut, Loader2, Wallet, Zap,
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
import Finance      from './pages/Finance.jsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/mining',    label: 'Mineração',   icon: ShoppingBag },
  { to: '/scripts',   label: 'Roteiros',    icon: FileText },
  { to: '/voiceover', label: 'Narração',    icon: Mic },
  { to: '/delivery',  label: 'Entrega',     icon: Send },
  { to: '/comments',  label: 'Comentários', icon: MessageSquare },
]

const bottomNavItems = [
  { to: '/finance',  label: 'Finanças',      icon: Wallet },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function SideLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'text-white shadow-[0_0_20px_rgba(99,102,241,0.22)]'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
        }`
      }
      style={({ isActive }) =>
        isActive
          ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.8) 100%)' }
          : {}
      }
    >
      <Icon size={14} />
      {label}
    </NavLink>
  )
}

function Sidebar({ user, onSignOut }) {
  const initials = (user?.email ?? 'U').slice(0, 2).toUpperCase()
  return (
    <aside
      className="w-[220px] h-screen sticky top-0 flex flex-col overflow-y-auto shrink-0"
      style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d1a 100%)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 14px rgba(99,102,241,0.5)' }}
          >
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-black text-[13px] tracking-tight leading-snug">
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
        {navItems.map(({ to, label, icon }) => (
          <SideLink key={to} to={to} label={label} icon={icon} />
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
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
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
    <div className="flex min-h-screen" style={{ background: '#f0f0f8' }}>
      <Sidebar user={session.user} onSignOut={() => supabase.auth.signOut()} />
      <main className="flex-1 px-8 py-7 overflow-auto min-w-0">
        <Routes>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/mining"     element={<Mining />} />
          <Route path="/scripts"    element={<Scripts />} />
          <Route path="/voiceover"  element={<Voiceover />} />
          <Route path="/delivery"   element={<Delivery />} />
          <Route path="/comments"   element={<Comments />} />
          <Route path="/finance"    element={<Finance />} />
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a12' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}
          >
            <Zap size={20} className="text-white" />
          </div>
          <Loader2 size={16} className="animate-spin text-indigo-500" />
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
