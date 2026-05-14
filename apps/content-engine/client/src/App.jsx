import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Mic,
  Send,
  MessageSquare,
  Settings,
} from 'lucide-react'

import Dashboard from './pages/Dashboard.jsx'
import Mining from './pages/Mining.jsx'
import Scripts from './pages/Scripts.jsx'
import Voiceover from './pages/Voiceover.jsx'
import Delivery from './pages/Delivery.jsx'
import Comments from './pages/Comments.jsx'
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

function Sidebar() {
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
      <div className="px-6 py-4 border-t border-gray-700 text-xs text-gray-500">
        v0.1.0 · MVP
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
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
