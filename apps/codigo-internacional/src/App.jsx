import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import LandingV2 from './pages/LandingV2.jsx'
import LandingV3 from './pages/LandingV3.tsx'
import PreVenda from './pages/PreVenda.jsx'
import PageReview from './pages/PageReview.jsx'
import Login from './pages/Login.jsx'
import Portal from './pages/Portal.jsx'
import AdminShell from './components/AdminShell.jsx'

/** Require a logged-in user; optionally a specific role. */
function Protected({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    // wrong role → send them to where they belong
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/portal'} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* V1 and V2 now share the refined gated landing (kept Landing.jsx for reference). */}
      <Route path="/" element={<LandingV2 />} />
      <Route path="/v2" element={<LandingV2 />} />
      <Route path="/v3" element={<LandingV3 />} />
      {/* Dedicated pré-venda application form (Instagram campaign — utm_source=pre-venda) */}
      <Route path="/pre-venda" element={<PreVenda />} />
      <Route path="/aplicacao" element={<PreVenda />} />
      {/* Internal board review of the landing + urgency proposals */}
      <Route path="/pagereview" element={<PageReview />} />
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<Protected><Portal /></Protected>} />
      <Route path="/admin/*" element={<Protected role="admin"><AdminShell /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
