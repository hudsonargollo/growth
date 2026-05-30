import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Save,
  Copy, Check, Key, Radio, Globe, Youtube, Link2, Unlink, ShoppingCart,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { apiPut, apiDelete } from '../hooks/useApi.js'
import { supabase } from '../lib/supabase.js'

// ── Key groups ────────────────────────────────────────────────────────────────
const KEY_GROUPS = [
  {
    title: 'YouTube',
    icon: '▶️',
    keys: [
      { key: 'YOUTUBE_API_KEY',    label: 'YouTube Data API Key', placeholder: 'AIza…',   required: true },
      { key: 'YOUTUBE_CHANNEL_ID', label: 'YouTube Channel ID',   placeholder: 'UCxxxx…', required: true },
      { key: 'GOOGLE_CLIENT_ID',     label: 'Google OAuth Client ID',     placeholder: '265158…apps.googleusercontent.com', required: false, hint: 'Google Cloud Console → OAuth 2.0 Credentials → Client ID' },
      { key: 'GOOGLE_CLIENT_SECRET', label: 'Google OAuth Client Secret', placeholder: 'GOCSPX-…',                          required: false, hint: 'Google Cloud Console → OAuth 2.0 Credentials → Client Secret' },
    ],
  },
  {
    title: 'IA',
    icon: '🤖',
    keys: [
      { key: 'ANTHROPIC_API_KEY',   label: 'Anthropic API Key',         placeholder: 'sk-ant-…',          required: false, hint: 'Claude — para geração de roteiros e análise de nichos' },
      { key: 'OPENAI_API_KEY',      label: 'OpenAI API Key',            placeholder: 'sk-…',              required: false, hint: 'Fallback para IA + narração de voz (TTS)' },
      { key: 'ELEVENLABS_API_KEY',  label: 'ElevenLabs API Key',        placeholder: 'sk_…',              required: false },
    ],
  },
  {
    title: 'Mineração',
    icon: '⛏️',
    keys: [
      { key: 'SERPAPI_KEY',          label: 'SerpAPI Key',               placeholder: '…',                 required: false },
      { key: 'AMAZON_AFFILIATE_TAG', label: 'Tag Amazon Associates',     placeholder: 'seusite-20',        required: false },
      { key: 'ML_AFFILIATE_TAG',    label: 'Tag Afiliado MercadoLivre', placeholder: 'matt:usuario:id',   required: false, hint: 'Formato: matt:seunome:78793736 — ou tag simples' },
      { key: 'ML_APP_ID',           label: 'Mercado Livre App ID',      placeholder: '1234567',           required: false, hint: 'App ID do seu app em Mercado Libre Developers' },
      { key: 'ML_CLIENT_SECRET',    label: 'Mercado Livre Client Secret',placeholder: 'xxxxx…',           required: false },
    ],
  },
]

function KeyField({ keyDef, savedState, onSaved, onDeleted }) {
  const [value,  setValue]  = useState('')
  const [show,   setShow]   = useState(false)
  const [status, setStatus] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const isSet = savedState?.isSet ?? false

  async function handleSave() {
    if (!value.trim()) return
    setStatus('saving'); setErrMsg('')
    try {
      await apiPut(`/apikeys/${keyDef.key}`, { value: value.trim() })
      setStatus('saved'); setValue(''); onSaved(keyDef.key)
      setTimeout(() => setStatus(null), 3000)
    } catch (e) { setStatus('error'); setErrMsg(e.message) }
  }

  async function handleDelete() {
    setStatus('saving')
    try { await apiDelete(`/apikeys/${keyDef.key}`); setStatus(null); onDeleted(keyDef.key) }
    catch (e) { setStatus('error'); setErrMsg(e.message) }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {keyDef.label}
          {keyDef.required && <span style={{ color: '#FF3366' }} className="ml-1">*</span>}
        </label>
        {isSet && (
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#00FFB9' }}>
            <CheckCircle size={11} /> Salvo
            {savedState?.updated_at && (
              <span className="font-normal ml-1" style={{ color: 'rgba(255,255,255,0.30)' }}>· {new Date(savedState.updated_at).toLocaleDateString()}</span>
            )}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={isSet ? '•••••••• (deixe em branco para manter)' : keyDef.placeholder}
            className="input font-mono pr-9 placeholder:font-sans"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'rgba(255,255,255,0.30)' }} onMouseEnter={e=>e.currentTarget.style.color='rgba(255,255,255,0.65)'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.30)'}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || status === 'saving'}
          className="btn-primary py-2 px-3 text-xs"
        >
          {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : null}
          Salvar
        </button>
        {isSet && (
          <button onClick={handleDelete} disabled={status === 'saving'} className="btn-secondary py-2 px-3 text-xs text-red-400 hover:text-red-600">
            Remover
          </button>
        )}
      </div>
      {keyDef.hint && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>{keyDef.hint}</p>}
      {status === 'saved' && <p className="text-[11px] font-medium" style={{ color: '#00FFB9' }}>✓ Salvo com sucesso</p>}
      {status === 'error' && (
        <p className="text-[11px] flex items-center gap-1" style={{ color: '#FF3366' }}><AlertCircle size={11} /> {errMsg}</p>
      )}
    </div>
  )
}

// ── YouTube OAuth connect card ─────────────────────────────────────────────────
function YouTubeOAuthCard({ onStatusChange }) {
  const [status,     setStatus]     = useState(null)  // null | 'connected' | 'disconnected'
  const [updatedAt,  setUpdatedAt]  = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [removing,   setRemoving]   = useState(false)
  const [hovered,    setHovered]    = useState(false)

  useEffect(() => {
    fetch('/api/youtube/oauth/status')
      .then((r) => r.json())
      .then(({ connected, updated_at }) => {
        setStatus(connected ? 'connected' : 'disconnected')
        setUpdatedAt(updated_at)
        onStatusChange?.(connected)
      })
      .catch(() => setStatus('disconnected'))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res  = await fetch('/api/youtube/oauth/url')
      const { url, error } = await res.json()
      if (error || !url) throw new Error(error ?? 'Failed to get auth URL')
      // Redirect to Google consent screen (same tab — callback will redirect back to /settings)
      window.location.href = url
    } catch (e) {
      console.error('[youtube/oauth]', e)
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setRemoving(true)
    try {
      await fetch('/api/youtube/oauth', { method: 'DELETE' })
      setStatus('disconnected')
      setUpdatedAt(null)
      onStatusChange?.(false)
    } catch {}
    finally { setRemoving(false) }
  }

  const isConnected = status === 'connected'

  return (
    <div className="card overflow-hidden">
      <div
        className="card-header"
        style={isConnected
          ? { background: 'rgba(0,255,185,0.05)', borderBottom: '1px solid rgba(0,255,185,0.15)' }
          : undefined}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={isConnected
            ? { background: 'rgba(0,255,185,0.15)', border: '1px solid rgba(0,255,185,0.35)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Youtube size={12} style={{ color: isConnected ? '#00FFB9' : 'rgba(255,255,255,0.45)' }} />
        </div>
        <h3 className="card-title">Automação de Comentários — OAuth</h3>
        {status === null && <Loader2 size={13} className="animate-spin ml-auto" style={{ color: 'rgba(255,255,255,0.30)' }} />}
        {isConnected && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#00FFB9' }}>
            <CheckCircle size={11} /> Conectado
            {updatedAt && (
              <span className="font-normal" style={{ color: 'rgba(255,255,255,0.30)' }}>
                · {new Date(updatedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Conecte sua conta Google para que o agente possa postar respostas automaticamente nos comentários do YouTube.
          O token é armazenado de forma criptografada e renovado automaticamente.
        </p>

        {!isConnected && status !== null && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.20)' }}>
            <p className="text-[11px]" style={{ color: 'rgba(255,184,0,0.80)' }}>
              Sem conexão OAuth, as respostas geradas pela IA são salvas no banco de dados mas <strong>não são postadas</strong> no YouTube.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting || status === null}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 12,
                background: hovered ? '#CCFF00' : 'rgba(204,255,0,0.10)',
                border: '1px solid rgba(204,255,0,0.40)',
                color: hovered ? '#07070B' : '#CCFF00',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: hovered ? '0 0 24px rgba(204,255,0,0.25)' : 'none',
              }}
            >
              {connecting
                ? <Loader2 size={14} className="animate-spin" />
                : <Link2 size={14} />}
              {connecting ? 'Redirecionando…' : 'Conectar conta Google'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.25)', color: '#FF3366' }}
            >
              {removing ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mercado Livre OAuth connect card ─────────────────────────────────────────
function MLOAuthCard() {
  const [status,     setStatus]     = useState(null)   // null | 'connected' | 'disconnected'
  const [updatedAt,  setUpdatedAt]  = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [removing,   setRemoving]   = useState(false)
  const [hovered,    setHovered]    = useState(false)

  useEffect(() => {
    fetch('/api/ml/oauth/status')
      .then((r) => r.json())
      .then(({ connected, updated_at }) => {
        setStatus(connected ? 'connected' : 'disconnected')
        setUpdatedAt(updated_at)
      })
      .catch(() => setStatus('disconnected'))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/ml/oauth/url')
      const { url, error } = await res.json()
      if (error || !url) throw new Error(error ?? 'Failed to get auth URL')
      window.location.href = url
    } catch (e) {
      console.error('[ml/oauth]', e)
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setRemoving(true)
    try {
      await fetch('/api/ml/oauth', { method: 'DELETE' })
      setStatus('disconnected')
      setUpdatedAt(null)
    } catch {}
    finally { setRemoving(false) }
  }

  const isConnected = status === 'connected'

  return (
    <div className="card overflow-hidden">
      <div
        className="card-header"
        style={isConnected
          ? { background: 'rgba(255,184,0,0.05)', borderBottom: '1px solid rgba(255,184,0,0.20)' }
          : undefined}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-sm"
          style={isConnected
            ? { background: 'rgba(255,184,0,0.15)', border: '1px solid rgba(255,184,0,0.35)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          🟡
        </div>
        <h3 className="card-title">Mercado Livre — OAuth</h3>
        {status === null && <Loader2 size={13} className="animate-spin ml-auto" style={{ color: 'rgba(255,255,255,0.30)' }} />}
        {isConnected && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#FFB800' }}>
            <CheckCircle size={11} /> Conectado
            {updatedAt && (
              <span className="font-normal" style={{ color: 'rgba(255,255,255,0.30)' }}>
                · {new Date(updatedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="p-6 space-y-4">
        <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Conecte sua conta Mercado Livre para que a Mineração possa buscar produtos com dados completos de vendas.
          O token é armazenado de forma criptografada e renovado automaticamente.
        </p>

        {!isConnected && status !== null && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.20)' }}>
            <p className="text-[11px]" style={{ color: 'rgba(255,184,0,0.80)' }}>
              Sem conexão OAuth, a busca de produtos usa credenciais de app com escopo limitado e pode retornar 0 resultados.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting || status === null}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 12,
                background: hovered ? '#FFB800' : 'rgba(255,184,0,0.10)',
                border: '1px solid rgba(255,184,0,0.40)',
                color: hovered ? '#07070B' : '#FFB800',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: hovered ? '0 0 24px rgba(255,184,0,0.25)' : 'none',
              }}
            >
              {connecting
                ? <Loader2 size={14} className="animate-spin" />
                : <Link2 size={14} />}
              {connecting ? 'Redirecionando…' : 'Conectar conta Mercado Livre'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.25)', color: '#FF3366' }}
            >
              {removing ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Marketplace config card ───────────────────────────────────────────────────
const MARKETPLACE_OPTIONS = [
  { id: 'mercadolivre', label: 'Mercado Livre', emoji: '🟡', desc: 'ML Direto — melhor dados de vendas' },
  { id: 'amazon',       label: 'Amazon',        emoji: '🟠', desc: 'Via SerpAPI — requer SERPAPI_KEY' },
  { id: 'google_shopping', label: 'Google Shopping', emoji: '🔵', desc: 'Via SerpAPI — produtos variados' },
]

function MarketplaceConfigCard() {
  const [marketplaces, setMarketplaces] = useState(['mercadolivre', 'amazon'])
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    fetch('/api/mining/config')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.marketplaces)) setMarketplaces(d.marketplaces) })
      .catch(() => {})
  }, [])

  function toggle(id) {
    setMarketplaces(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setSaving(true); setSaved(false)
    try {
      await fetch('/api/mining/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplaces }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <ShoppingCart size={15} style={{ color: '#FFB800' }} />
        <h3 className="card-title">Marketplaces Ativos</h3>
        <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.30)', fontFamily: "'JetBrains Mono', monospace" }}>
          {marketplaces.length} ativo{marketplaces.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
          Selecione de quais marketplaces buscar produtos na Mineração. Padrão: Mercado Livre + Amazon.
        </p>
        <div className="space-y-2">
          {MARKETPLACE_OPTIONS.map(mp => (
            <label key={mp.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: marketplaces.includes(mp.id) ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${marketplaces.includes(mp.id) ? 'rgba(139,92,246,0.30)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              <input
                type="checkbox"
                checked={marketplaces.includes(mp.id)}
                onChange={() => toggle(mp.id)}
                className="w-4 h-4 rounded accent-violet-500"
              />
              <span className="text-lg leading-none">{mp.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{mp.label}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{mp.desc}</p>
              </div>
              {marketplaces.includes(mp.id) && (
                <Check size={13} style={{ color: '#8B5CF6', flexShrink: 0 }} />
              )}
            </label>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || marketplaces.length === 0}
          className="flex items-center gap-2 text-[12px] font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-40"
          style={{
            background: saved ? 'rgba(0,255,185,0.10)' : 'rgba(139,92,246,0.15)',
            border: `1px solid ${saved ? 'rgba(0,255,185,0.30)' : 'rgba(139,92,246,0.30)'}`,
            color: saved ? '#00FFB9' : '#8B5CF6',
          }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
          {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar preferências'}
        </button>
      </div>
    </div>
  )
}

function ApiKeysTab() {
  const location    = useLocation()
  const [keyStates, setKeyStates]   = useState({})
  const [loading,   setLoading]     = useState(true)
  const [oauthMsg,  setOauthMsg]    = useState(null)  // { type: 'success'|'error', text: string }

  // Handle OAuth redirect-back params (?youtube=connected or ?youtube=error&reason=xxx)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const yt     = params.get('youtube')
    if (!yt) return

    if (yt === 'connected') {
      setOauthMsg({ type: 'success', text: 'YouTube conectado com sucesso! O agente agora pode postar respostas automaticamente.' })
    } else if (yt === 'error') {
      const reason = params.get('reason') ?? 'unknown'
      const detail = params.get('detail') ?? ''
      const msgs   = {
        no_refresh_token: 'Nenhum refresh_token retornado. Acesse myaccount.google.com/permissions, remova o app e tente novamente.',
        token_exchange:   'Falha ao trocar o código por token. Verifique o GOOGLE_CLIENT_SECRET.',
        server_config:    'Configuração do servidor incompleta. Execute: npx wrangler secret put GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
        db_error:         `Erro ao salvar credencial no banco de dados.${detail ? ` Detalhe: ${detail}` : ''}`,
      }
      setOauthMsg({ type: 'error', text: msgs[reason] ?? `Erro OAuth: ${reason}${detail ? ` — ${detail}` : ''}` })
    }

    // Clean the URL params without a reload
    window.history.replaceState({}, '', '/settings')
  }, [location.search])

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        const res = await fetch('/api/apikeys', { headers })
        if (!res.ok) return
        const { keys } = await res.json()
        const map = {}
        for (const k of keys ?? []) map[k.key_name] = k
        setKeyStates(map)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  function handleSaved(keyName) {
    setKeyStates((p) => ({ ...p, [keyName]: { ...(p[keyName] ?? {}), isSet: true, updated_at: new Date().toISOString() } }))
  }
  function handleDeleted(keyName) {
    setKeyStates((p) => ({ ...p, [keyName]: { ...(p[keyName] ?? {}), isSet: false, updated_at: null } }))
  }

  const configuredCount = Object.values(keyStates).filter((k) => k.isSet).length
  const requiredMissing = KEY_GROUPS.flatMap((g) => g.keys).filter((k) => k.required && !keyStates[k.key]?.isSet).length

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={22} className="animate-spin" style={{ color: '#8B5CF6' }} />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* OAuth redirect-back toast */}
      {oauthMsg && (
        <div className={oauthMsg.type === 'success' ? 'alert-success' : 'alert-error'} style={{ alignItems: 'flex-start' }}>
          {oauthMsg.type === 'success'
            ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
            : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold text-[12px]">{oauthMsg.type === 'success' ? 'YouTube conectado!' : 'Erro na conexão'}</p>
            <p className="text-[11px] mt-0.5 opacity-80">{oauthMsg.text}</p>
          </div>
          <button onClick={() => setOauthMsg(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {requiredMissing > 0 && (
        <div className="alert-warning">
          <AlertCircle size={15} className="shrink-0" />
          <span>
            {requiredMissing} chave{requiredMissing > 1 ? 's' : ''} obrigatória{requiredMissing > 1 ? 's' : ''} não configurada{requiredMissing > 1 ? 's' : ''}.
            Algumas funções ficarão indisponíveis.
          </span>
        </div>
      )}
      {requiredMissing === 0 && configuredCount > 0 && (
        <div className="alert-success">
          <CheckCircle size={15} />
          Todas as chaves obrigatórias configuradas — plataforma totalmente operacional
        </div>
      )}

      {/* YouTube OAuth card — rendered first in the YouTube group */}
      <YouTubeOAuthCard />
      <MLOAuthCard />

      {KEY_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="text-base">{group.icon}</span>
              <h3 className="card-title">{group.title}</h3>
              <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.30)', fontFamily: "'JetBrains Mono', monospace" }}>
                {group.keys.filter((k) => keyStates[k.key]?.isSet).length}/{group.keys.length} configuradas
              </span>
            </div>
            <div className="p-6 grid grid-cols-1 gap-5">
              {group.keys.map((keyDef) => (
                <KeyField
                  key={keyDef.key}
                  keyDef={keyDef}
                  savedState={keyStates[keyDef.key]}
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          </div>
          {/* Marketplace config shown right after Mineração group */}
          {group.title === 'Mineração' && <div className="mt-4"><MarketplaceConfigCard /></div>}
        </div>
      ))}
    </div>
  )
}

// ── Channel Profile ───────────────────────────────────────────────────────────

const TONE_OPTIONS      = ['energético e informativo','amigável e descontraído','técnico e detalhado','direto ao ponto','entusiasmado e motivacional']
const INTRO_STYLES      = [
  { value: 'hook_question',   label: 'Pergunta Gancho — "Você sabia que…?"' },
  { value: 'problem_pain',    label: 'Problema/Dor — "Cansado de gastar com produtos ruins?"' },
  { value: 'direct_promise',  label: 'Promessa Direta — "Hoje eu vou te mostrar os 5 melhores…"' },
  { value: 'curiosity_tease', label: 'Curiosidade — "O produto #1 vai te surpreender…"' },
]
const CTA_STYLES        = ['links na descrição + inscrição','link fixo na bio/descrição','código de cupom personalizado','botão de membro do canal']
const AFFILIATE_PLATFORMS = [
  { value: 'amazon_brasil', label: 'Amazon Brasil' },
  { value: 'mercadolivre',  label: 'Mercado Livre' },
  { value: 'shopee',        label: 'Shopee' },
  { value: 'magalu',        label: 'Magazine Luiza' },
  { value: 'americanas',    label: 'Americanas' },
]
const PLATFORM_OPTIONS  = [
  { value: 'youtube',         label: 'YouTube (vídeos longos)' },
  { value: 'youtube_shorts',  label: 'YouTube Shorts' },
  { value: 'tiktok',          label: 'TikTok' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'multi',           label: 'Multi-plataforma' },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.40)' }}>
      {copied ? <Check size={12} style={{ color: '#00FFB9' }} /> : <Copy size={12} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>{hint}</p>}
    </div>
  )
}

function ChannelProfileTab() {
  const defaultProfile = {
    channelName: '', niche: '', platformFocus: 'youtube', targetAudience: '',
    tone: 'energético e informativo', affiliatePlatforms: ['amazon_brasil', 'mercadolivre'],
    ctaStyle: 'links na descrição + inscrição', signaturePhrases: '', introStyle: 'hook_question',
  }

  const [profile,      setProfile]      = useState(defaultProfile)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    fetch('/api/channel-profile')
      .then((r) => r.json())
      .then(({ profile: p }) => { if (p) setProfile(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setProfile((p) => ({ ...p, [key]: val })); setSaved(false) }
  function togglePlatform(val) {
    setProfile((p) => {
      const cur = p.affiliatePlatforms ?? []
      return { ...p, affiliatePlatforms: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] }
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/channel-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setProfile(data); setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={22} className="animate-spin" style={{ color: '#8B5CF6' }} />
    </div>
  )

  return (
    <div className="space-y-5">
      {error && <div className="alert-error"><AlertCircle size={15} className="shrink-0" />{error}</div>}

      {/* Identity */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <Globe size={14} style={{ color: '#8B5CF6' }} />
          <h3 className="card-title">Identidade do Canal</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Nome do Canal *">
              <input type="text" value={profile.channelName} onChange={(e) => set('channelName', e.target.value)}
                placeholder="Me Ajuda Na Escolha" className="input" />
            </Field>
            <Field label="Nicho Principal" hint="Categoria geral de produtos que você avalia">
              <input type="text" value={profile.niche} onChange={(e) => set('niche', e.target.value)}
                placeholder="Eletrônicos e gadgets custo-benefício" className="input" />
            </Field>
          </div>
          <Field label="Público-Alvo" hint="Descreva quem assiste e o que eles buscam">
            <textarea value={profile.targetAudience} onChange={(e) => set('targetAudience', e.target.value)}
              rows={2} placeholder="Consumidores brasileiros de 25–45 anos que querem o melhor produto pelo menor preço"
              className="input resize-none" />
          </Field>
          <Field label="Foco de Plataforma">
            <select value={profile.platformFocus} onChange={(e) => set('platformFocus', e.target.value)} className="select">
              {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Voice & Style */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <Radio size={14} style={{ color: '#8B5CF6' }} />
          <h3 className="card-title">Voz e Estilo</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Tom de Voz">
              <select value={profile.tone} onChange={(e) => set('tone', e.target.value)} className="select">
                {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Estilo de CTA">
              <select value={profile.ctaStyle} onChange={(e) => set('ctaStyle', e.target.value)} className="select">
                {CTA_STYLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Estilo de Abertura">
            <div className="grid grid-cols-2 gap-2">
              {INTRO_STYLES.map((s) => (
                <label key={s.value}
                  className="flex items-start gap-2 p-3 rounded-xl cursor-pointer text-[12px] transition-all duration-150"
                  style={{
                    background: profile.introStyle === s.value ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                    border: profile.introStyle === s.value ? '1px solid rgba(139,92,246,0.45)' : '1px solid rgba(255,255,255,0.07)',
                    color: profile.introStyle === s.value ? '#8B5CF6' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <input type="radio" name="introStyle" value={s.value}
                    checked={profile.introStyle === s.value} onChange={() => set('introStyle', s.value)}
                    className="mt-0.5 accent-violet-500" />
                  {s.label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Frases Assinatura" hint="Expressões típicas do seu canal que a IA vai incorporar nos roteiros">
            <textarea value={profile.signaturePhrases} onChange={(e) => set('signaturePhrases', e.target.value)}
              rows={2} placeholder="Ex: 'Sem enrolação', 'Melhor custo-benefício', 'Link na descrição'"
              className="input resize-none" />
          </Field>
        </div>
      </div>

      {/* Affiliate platforms */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <Key size={14} style={{ color: '#8B5CF6' }} />
          <h3 className="card-title">Plataformas de Afiliado</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {AFFILIATE_PLATFORMS.map((p) => {
              const active = (profile.affiliatePlatforms ?? []).includes(p.value)
              return (
                <button key={p.value} type="button" onClick={() => togglePlatform(p.value)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150"
                  style={active
                    ? { background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.50)', color: '#8B5CF6', boxShadow: '0 0 12px rgba(139,92,246,0.20)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)' }
                  }
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saved ? '✓ Salvo!' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keys',    label: 'Chaves de API',   Icon: Key },
  { id: 'profile', label: 'Perfil do Canal', Icon: Radio },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('keys')

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Sistema"
        title="Configurações"
        description="Chaves de API, perfil do canal e preferências da plataforma"
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1.5 w-fit rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
            style={tab === id
              ? { background: 'rgba(139,92,246,0.20)', border: '1px solid rgba(139,92,246,0.40)', color: '#8B5CF6' }
              : { color: 'rgba(255,255,255,0.40)', border: '1px solid transparent' }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'keys'    && <ApiKeysTab />}
      {tab === 'profile' && <ChannelProfileTab />}
    </div>
  )
}
