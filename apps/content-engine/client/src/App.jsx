import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { supabase } from './lib/supabase.js'

import Dashboard    from './pages/Dashboard.jsx'
import Mining       from './pages/Mining.jsx'
import Scripts      from './pages/Scripts.jsx'
import Voiceover    from './pages/Voiceover.jsx'
import Delivery     from './pages/Delivery.jsx'
import Comments     from './pages/Comments.jsx'
import SettingsPage from './pages/Settings.jsx'

const navItems = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/mining',    label: 'Mining',     icon: ShoppingBag },
  { to: '/scripts',   label: 'Scripts',    icon: FileText },
  { to: '/voiceover', label: 'Voiceover',  icon: Mic },
  { to: '/delivery',  label: 'Delivery',   icon: Send },
  { to: '/comments',  label: 'Comments',   icon: MessageSquare },
  { to: '/settings',  label: 'Settings',   icon: Settings },
]

function Sidebar({ user, onSignOut }) {
  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">Content Engine</h1>
        <p className="text-xs text-gray-400 mt-0.5">YouTube Growth Automation</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
          Sign out
        </button>
      </div>
      <div className="px-6 py-3 text-xs text-gray-600">v0.1.0 · MVP</div>
    </aside>
  )
}

function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Content Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
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

  if (!session) return <LoginScreen />

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={session.user} onSignOut={() => supabase.auth.signOut()} />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/mining"    element={<Mining />} />
            <Route path="/scripts"   element={<Scripts />} />
            <Route path="/voiceover" element={<Voiceover />} />
            <Route path="/delivery"  element={<Delivery />} />
            <Route path="/comments"  element={<Comments />} />
            <Route path="/settings"  element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
