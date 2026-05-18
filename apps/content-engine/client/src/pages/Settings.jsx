import { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { apiPut, apiDelete } from '../hooks/useApi.js'
import { supabase } from '../lib/supabase.js'

const KEY_GROUPS = [
  {
    title: 'YouTube',
    keys: [
      { key: 'YOUTUBE_API_KEY',    label: 'YouTube Data API Key',    placeholder: 'AIza…',  required: true },
      { key: 'YOUTUBE_CHANNEL_ID', label: 'YouTube Channel ID',      placeholder: 'UCxxxx…', required: true },
      { key: 'YOUTUBE_OAUTH_TOKEN',label: 'YouTube OAuth Token',     placeholder: 'ya29.…',  required: false, hint: 'Required to post replies' },
    ],
  },
  {
    title: 'AI',
    keys: [
      { key: 'OPENAI_API_KEY',     label: 'OpenAI API Key',          placeholder: 'sk-…',   required: true },
      { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key',      placeholder: 'sk_…',   required: true },
    ],
  },
  {
    title: 'Delivery',
    keys: [
      { key: 'WHATSAPP_TOKEN',     label: 'WhatsApp Business Token', placeholder: 'EAAx…',  required: true },
      { key: 'WHATSAPP_PHONE_ID',  label: 'WhatsApp Phone Number ID',placeholder: '123456…', required: true },
    ],
  },
  {
    title: 'Mining',
    keys: [
      { key: 'SERPAPI_KEY',           label: 'SerpAPI Key',               placeholder: '…',     required: false },
      { key: 'AMAZON_AFFILIATE_TAG',  label: 'Amazon Associates Tag',     placeholder: 'tag-20', required: false },
      { key: 'ML_AFFILIATE_ID',       label: 'MercadoLibre Affiliate ID', placeholder: '…',     required: false },
    ],
  },
]

function KeyField({ keyDef, savedState, onSaved, onDeleted }) {
  const [value, setValue]   = useState('')
  const [show, setShow]     = useState(false)
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
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

export default function SettingsPage() {
  const [keyStates, setKeyStates] = useState({}) // { [key_name]: { isSet, updated_at } }
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}
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

  const configuredCount = Object.values(keyStates).filter((k) => k.isSet).length
  const totalRequired   = KEY_GROUPS.flatMap((g) => g.keys).filter((k) => k.required).length
  const requiredMissing = KEY_GROUPS.flatMap((g) => g.keys).filter((k) => k.required && !keyStates[k.key]?.isSet).length

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Configure suas chaves de API — armazenadas com criptografia, nunca expostas em texto puro"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {requiredMissing > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{requiredMissing} chave{requiredMissing > 1 ? 's' : ''} obrigatória{requiredMissing > 1 ? 's' : ''} ainda não configurada{requiredMissing > 1 ? 's' : ''}. Algumas funções ficarão indisponíveis até serem definidas.</span>
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
      )}
    </div>
  )
}
