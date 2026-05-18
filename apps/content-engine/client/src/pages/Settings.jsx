import { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Save, Tv2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { apiPut, apiDelete } from '../hooks/useApi.js'
import { supabase } from '../lib/supabase.js'

// ── API Keys Tab ──────────────────────────────────────────────────────────────

const KEY_GROUPS = [
  {
    title: 'YouTube',
    keys: [
      { key: 'YOUTUBE_API_KEY',     label: 'YouTube Data API Key',    placeholder: 'AIza…',   required: true },
      { key: 'YOUTUBE_CHANNEL_ID',  label: 'YouTube Channel ID',      placeholder: 'UCxxxx…', required: true },
      { key: 'YOUTUBE_OAUTH_TOKEN', label: 'YouTube OAuth Token',     placeholder: 'ya29.…',  required: false, hint: 'Necessário para postar respostas' },
    ],
  },
  {
    title: 'IA',
    keys: [
      { key: 'OPENAI_API_KEY',      label: 'OpenAI API Key',          placeholder: 'sk-…',    required: true },
      { key: 'ELEVENLABS_API_KEY',  label: 'ElevenLabs API Key',      placeholder: 'sk_…',    required: true },
    ],
  },
  {
    title: 'Entrega',
    keys: [
      { key: 'WHATSAPP_TOKEN',      label: 'WhatsApp Business Token', placeholder: 'EAAx…',   required: true },
      { key: 'WHATSAPP_PHONE_ID',   label: 'WhatsApp Phone Number ID',placeholder: '123456…', required: true },
    ],
  },
  {
    title: 'Mineração',
    keys: [
      { key: 'SERPAPI_KEY',          label: 'SerpAPI Key',               placeholder: '…',      required: false },
      { key: 'AMAZON_AFFILIATE_TAG', label: 'Tag Amazon Associates',     placeholder: 'tag-20', required: false },
      { key: 'ML_AFFILIATE_ID',      label: 'ID Afiliado MercadoLibre',  placeholder: '…',      required: false },
    ],
  },
]

function KeyField({ keyDef, savedState, onSaved, onDeleted }) {
  const [value, setValue]   = useState('')
  const [show, setShow]     = useState(false)
  const [status, setStatus] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const isSet = savedState?.isSet ?? false

  async function handleSave() {
    if (!value.trim()) return
    setStatus('saving')
    setErrMsg('')
    try {
      await apiPut(`/apikeys/${keyDef.key}`, { value: value.trim() })
      setStatus('saved')
      setValue('')
      onSaved(keyDef.key)
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus('error')
      setErrMsg(e.message)
    }
  }

  async function handleDelete() {
    setStatus('saving')
    try {
      await apiDelete(`/apikeys/${keyDef.key}`)
      setStatus(null)
      onDeleted(keyDef.key)
    } catch (e) {
      setStatus('error')
      setErrMsg(e.message)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">
          {keyDef.label}
          {keyDef.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {isSet && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle size={11} />
            Salvo
            {savedState?.updated_at && (
              <span className="text-gray-400 font-normal ml-1">
                · {new Date(savedState.updated_at).toLocaleDateString()}
              </span>
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
            placeholder={isSet ? '••••••••  (deixe em branco para manter)' : keyDef.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono placeholder:font-sans placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!value.trim() || status === 'saving'}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : null}
          Salvar
        </button>
        {isSet && (
          <button
            onClick={handleDelete}
            disabled={status === 'saving'}
            className="px-3 py-2 border border-gray-200 hover:border-red-300 hover:text-red-500 text-gray-400 text-xs rounded-lg transition-colors"
          >
            Remover
          </button>
        )}
      </div>
      {keyDef.hint && <p className="text-xs text-gray-400">{keyDef.hint}</p>}
      {status === 'saved' && <p className="text-xs text-emerald-600">✓ Salvo com sucesso</p>}
      {status === 'error' && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} /> {errMsg}
        </p>
      )}
    </div>
  )
}

function ApiKeysTab() {
  const [keyStates, setKeyStates] = useState({})
  const [loading, setLoading]     = useState(true)

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
    setKeyStates((prev) => ({ ...prev, [keyName]: { ...(prev[keyName] ?? {}), isSet: true, updated_at: new Date().toISOString() } }))
  }
  function handleDeleted(keyName) {
    setKeyStates((prev) => ({ ...prev, [keyName]: { ...(prev[keyName] ?? {}), isSet: false, updated_at: null } }))
  }

  const configuredCount  = Object.values(keyStates).filter((k) => k.isSet).length
  const requiredMissing  = KEY_GROUPS.flatMap((g) => g.keys).filter((k) => k.required && !keyStates[k.key]?.isSet).length

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-6">
      {requiredMissing > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{requiredMissing} chave{requiredMissing > 1 ? 's' : ''} obrigatória{requiredMissing > 1 ? 's' : ''} ainda não configurada{requiredMissing > 1 ? 's' : ''}. Algumas funções ficarão indisponíveis.</span>
        </div>
      )}
      {requiredMissing === 0 && configuredCount > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} />
          Todas as chaves obrigatórias configuradas — plataforma totalmente operacional
        </div>
      )}
      {KEY_GROUPS.map((group) => (
        <div key={group.title} className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">{group.title}</h3>
          <div className="grid grid-cols-1 gap-5">
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
      ))}
    </div>
  )
}

// ── Channel Profile Tab ───────────────────────────────────────────────────────

const TONE_OPTIONS = [
  'energético e informativo',
  'amigável e descontraído',
  'técnico e detalhado',
  'direto ao ponto',
  'entusiasmado e motivacional',
]

const INTRO_STYLES = [
  { value: 'hook_question',   label: 'Pergunta Gancho — "Você sabia que…?"' },
  { value: 'problem_pain',    label: 'Problema/Dor — "Cansado de gastar com produtos ruins?"' },
  { value: 'direct_promise',  label: 'Promessa Direta — "Hoje eu vou te mostrar os 5 melhores…"' },
  { value: 'curiosity_tease', label: 'Curiosidade — "O produto #1 vai te surpreender…"' },
]

const CTA_STYLES = [
  'links na descrição + inscrição',
  'link fixo na bio/descrição',
  'código de cupom personalizado',
  'botão de membro do canal',
]

const AFFILIATE_PLATFORMS = [
  { value: 'amazon_brasil',  label: 'Amazon Brasil' },
  { value: 'mercadolivre',   label: 'Mercado Livre' },
  { value: 'shopee',         label: 'Shopee' },
  { value: 'magalu',         label: 'Magazine Luiza' },
  { value: 'americanas',     label: 'Americanas' },
]

const PLATFORM_OPTIONS = [
  { value: 'youtube',           label: 'YouTube (vídeos longos)' },
  { value: 'youtube_shorts',    label: 'YouTube Shorts' },
  { value: 'tiktok',            label: 'TikTok' },
  { value: 'instagram_reels',   label: 'Instagram Reels' },
  { value: 'multi',             label: 'Multi-plataforma' },
]

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function ChannelProfileTab() {
  const defaultProfile = {
    channelName: '',
    niche: '',
    platformFocus: 'youtube',
    targetAudience: '',
    tone: 'energético e informativo',
    affiliatePlatforms: ['amazon_brasil', 'mercadolivre'],
    ctaStyle: 'links na descrição + inscrição',
    signaturePhrases: '',
    introStyle: 'hook_question',
  }

  const [profile, setProfile]   = useState(defaultProfile)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    fetch('/api/channel-profile')
      .then((r) => r.json())
      .then(({ profile: p }) => { if (p) setProfile(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) {
    setProfile((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function togglePlatform(val) {
    setProfile((prev) => {
      const current = prev.affiliatePlatforms ?? []
      return {
        ...prev,
        affiliatePlatforms: current.includes(val)
          ? current.filter((v) => v !== val)
          : [...current, val],
      }
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/channel-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Identity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Identidade do Canal</h3>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Nome do Canal *">
            <input
              type="text"
              value={profile.channelName}
              onChange={(e) => set('channelName', e.target.value)}
              placeholder="Me Ajuda Na Escolha"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Nicho Principal" hint="Categoria geral de produtos que você avalia">
            <input
              type="text"
              value={profile.niche}
              onChange={(e) => set('niche', e.target.value)}
              placeholder="Eletrônicos e gadgets custo-benefício"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
        </div>
        <Field label="Público-Alvo" hint="Descreva quem assiste e o que eles buscam">
          <textarea
            value={profile.targetAudience}
            onChange={(e) => set('targetAudience', e.target.value)}
            rows={2}
            placeholder="Consumidores brasileiros de 25–45 anos que querem o melhor produto pelo menor preço antes de comprar online"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </Field>
        <Field label="Foco de Plataforma">
          <select
            value={profile.platformFocus}
            onChange={(e) => set('platformFocus', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>

      {/* Voice & Style */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Voz e Estilo</h3>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Tom de Voz">
            <select
              value={profile.tone}
              onChange={(e) => set('tone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Estilo de CTA">
            <select
              value={profile.ctaStyle}
              onChange={(e) => set('ctaStyle', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CTA_STYLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Estilo de Abertura">
          <div className="grid grid-cols-2 gap-2">
            {INTRO_STYLES.map((s) => (
              <label
                key={s.value}
                className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                  profile.introStyle === s.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="introStyle"
                  value={s.value}
                  checked={profile.introStyle === s.value}
                  onChange={() => set('introStyle', s.value)}
                  className="mt-0.5 accent-indigo-600"
                />
                {s.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Frases Assinatura" hint="Expressões típicas do seu canal que a IA vai incorporar nos roteiros">
          <textarea
            value={profile.signaturePhrases}
            onChange={(e) => set('signaturePhrases', e.target.value)}
            rows={2}
            placeholder="Ex: 'Sem enrolação', 'Melhor custo-benefício', 'Link na descrição', 'Me ajuda na escolha!'"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </Field>
      </div>

      {/* Affiliates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Plataformas de Afiliado</h3>
        <div className="flex flex-wrap gap-2">
          {AFFILIATE_PLATFORMS.map((p) => {
            const active = (profile.affiliatePlatforms ?? []).includes(p.value)
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Salvo!' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

// ── Page Shell ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keys',    label: 'Chaves de API' },
  { id: 'profile', label: 'Perfil do Canal' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('keys')

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Chaves de API, perfil do canal e preferências da plataforma"
      />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keys'    && <ApiKeysTab />}
      {tab === 'profile' && <ChannelProfileTab />}
    </div>
  )
}
