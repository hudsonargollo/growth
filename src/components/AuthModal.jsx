import { useState } from 'react'
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode]       = useState('login')   // 'login' | 'signup' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [info, setInfo]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onSuccess(data.user)

      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Verifique seu e-mail para confirmar o cadastro.')

      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setInfo('Link de redefinição enviado para seu e-mail.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#1A1A1A]/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#F5F4F0] border border-[#A31621]/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#A31621]/10">
          <div className="flex items-center gap-3">
            <svg width="28" height="17" viewBox="0 0 40 24" fill="none">
              <path d="M2 3.5L18 12L2 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M38 3.5L22 12L38 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <span className="font-extrabold text-[#A31621] tracking-wider text-sm">
              {mode === 'login' ? 'ENTRAR' : mode === 'signup' ? 'CRIAR CONTA' : 'REDEFINIR SENHA'}
            </span>
          </div>
          <button onClick={onClose} className="text-[#A31621]/50 hover:text-[#A31621] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-[#A31621]/10 border border-[#A31621]/20 text-[#A31621] text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm">
              {info}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#A31621]/70 tracking-widest uppercase mb-2">E-mail</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A31621]/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-9 pr-4 py-3 bg-white border border-[#A31621]/20 text-[#1A1A1A] text-sm placeholder-[#999] focus:outline-none focus:border-[#A31621] transition-colors"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-bold text-[#A31621]/70 tracking-widest uppercase mb-2">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A31621]/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-9 pr-4 py-3 bg-white border border-[#A31621]/20 text-[#1A1A1A] text-sm placeholder-[#999] focus:outline-none focus:border-[#A31621] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#A31621] text-[#F5F4F0] py-3.5 font-bold tracking-wide text-sm hover:bg-[#8B121C] disabled:opacity-60 transition-all duration-300"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {mode === 'login' ? 'ENTRAR' : mode === 'signup' ? 'CRIAR CONTA' : 'ENVIAR LINK'}
          </button>

          {/* Mode switchers */}
          <div className="flex flex-col items-center gap-2 pt-2 text-xs text-[#777]">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setMode('reset'); setError(null) }}
                  className="hover:text-[#A31621] transition-colors">
                  Esqueceu a senha?
                </button>
                <button type="button" onClick={() => { setMode('signup'); setError(null) }}
                  className="hover:text-[#A31621] transition-colors font-semibold">
                  Não tem conta? Criar agora
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button type="button" onClick={() => { setMode('login'); setError(null) }}
                className="hover:text-[#A31621] transition-colors font-semibold">
                ← Voltar para login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
