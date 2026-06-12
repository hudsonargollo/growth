import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authCheck, authRegister, authLogin } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState('email') // email | password | create
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function go(user) {
    navigate(user.role === 'admin' ? '/admin/dashboard' : '/portal', { replace: true })
  }

  async function onEmail(e) {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      const r = await authCheck(email.trim())
      if (!r.allowed) { setError('E-mail não autorizado. Fale com o administrador.'); return }
      setName(r.name || '')
      setStep(r.firstAccess ? 'create' : 'password')
    } catch (e2) { setError(e2.message) } finally { setBusy(false) }
  }

  async function onCreate(e) {
    e.preventDefault(); setBusy(true); setError(null)
    if (password.length < 6) { setError('A senha precisa ter ao menos 6 caracteres.'); setBusy(false); return }
    if (password !== confirm) { setError('As senhas não conferem.'); setBusy(false); return }
    try {
      const { token, user } = await authRegister(email.trim(), password)
      login(token, user); go(user)
    } catch (e2) { setError(e2.message) } finally { setBusy(false) }
  }

  async function onLogin(e) {
    e.preventDefault(); setBusy(true); setError(null)
    try {
      const { token, user } = await authLogin(email.trim(), password)
      login(token, user); go(user)
    } catch (e2) { setError(e2.message) } finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-3">O Código Internacional</p>
        <h1 className="text-3xl font-light tracking-tight mb-1">Acesso restrito</h1>
        <p className="whisper mb-8">{step === 'create' ? 'Primeiro acesso — defina sua senha.' : 'Entre com seu e-mail.'}</p>

        {step === 'email' && (
          <form onSubmit={onEmail} className="space-y-5">
            <Field label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@tektone.com.br" autoFocus />
            {error && <Err>{error}</Err>}
            <button className="cta-bar" disabled={busy}>{busy ? '…' : 'Continuar'}</button>
          </form>
        )}

        {step === 'create' && (
          <form onSubmit={onCreate} className="space-y-5">
            <p className="text-sm text-mineral/60">Olá{name ? ` ${name}` : ''} — crie uma senha para o seu acesso.</p>
            <Field label="Nova senha" type="password" value={password} onChange={setPassword} placeholder="mínimo 6 caracteres" autoFocus />
            <Field label="Confirme a senha" type="password" value={confirm} onChange={setConfirm} />
            {error && <Err>{error}</Err>}
            <button className="cta-bar" disabled={busy}>{busy ? '…' : 'Criar senha e entrar'}</button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={onLogin} className="space-y-5">
            <p className="text-sm text-mineral/60">{email}</p>
            <Field label="Senha" type="password" value={password} onChange={setPassword} autoFocus />
            {error && <Err>{error}</Err>}
            <button className="cta-bar" disabled={busy}>{busy ? '…' : 'Entrar'}</button>
            <button type="button" onClick={() => { setStep('email'); setError(null); setPassword('') }} className="data text-xs text-mineral/40 w-full text-center uppercase tracking-widest">trocar e-mail</button>
          </form>
        )}
      </div>
    </main>
  )
}

function Field({ label, value, onChange, ...rest }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  )
}
function Err({ children }) {
  return <p className="data text-sm" style={{ color: '#9b2c2c' }}>{children}</p>
}
