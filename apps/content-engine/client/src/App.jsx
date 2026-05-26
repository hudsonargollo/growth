import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Mic,
  Send,
  MessageSquare,
  Settings,
  LogOut,
  Loader2,
  Wallet,
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
  { to: '/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/mining',     label: 'Mineração',      icon: ShoppingBag },
  { to: '/scripts',    label: 'Roteiros',       icon: FileText },
  { to: '/voiceover',  label: 'Narração',       icon: Mic },
  { to: '/delivery',   label: 'Entrega',        icon: Send },
  { to: '/comments',   label: 'Comentários',    icon: MessageSquare },
  { to: '/settings',   label: 'Configurações',  icon: Settings },
]

function Sidebar({ user, onSignOut }) {
  return (
    <aside className="w-60 h-screen sticky top-0 bg-gray-900 text-white flex flex-col overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-700 flex items-center gap-3">
        <img src="/meajudenaescolha-logo.jpg" alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        <div>
          <h1 className="text-sm font-bold tracking-tight leading-tight">Fábrica de Conteúdo</h1>
          <p className="text-xs text-gray-400 mt-0.5">Automação de Conteúdo YouTube</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
      <div className="px-6 py-3 text-xs text-gray-600">v0.1.0 · MVP</div>
    </aside>
  )
}

function AppShell({ session }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={session.user} onSignOut={() => supabase.auth.signOut()} />
      <main className="flex-1 p-8 overflow-auto">
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
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — always accessible */}
        <Route
          path="/"
          element={session ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        {/* App shell — requires auth, redirects to landing if not signed in */}
        <Route
          path="/*"
          element={session ? <AppShell session={session} /> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
