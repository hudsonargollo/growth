import { useState, useEffect } from 'react'
import {
  LogOut, Grid3x3, Users, Kanban, UserCircle2,
  ExternalLink, Search, ChevronDown, Plus, Check,
  Mail, Bot, Code2, Video, Layout, BarChart3,
  MessageSquare, FileText, Zap, Globe, Lock, Unlock,
  Copy, Eye, EyeOff, KeyRound, Pencil, X, Menu,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const ALL_TOOLS = [
  { id: 'gmail',          name: 'Gmail',               category: 'Produtividade', url: 'https://mail.google.com',                                  icon: Mail,          color: '#EA4335', desc: 'E-mail corporativo',      credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'gdrive',         name: 'Google Drive',        category: 'Produtividade', url: 'https://drive.google.com',                                 icon: FileText,      color: '#4285F4', desc: 'Armazenamento e docs',    credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'gcal',           name: 'Google Calendar',     category: 'Produtividade', url: 'https://calendar.google.com',                              icon: Grid3x3,       color: '#0F9D58', desc: 'Agenda e reuniões',       credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'notion',         name: 'Notion',              category: 'Produtividade', url: 'https://notion.so',                                        icon: FileText,      color: '#000000', desc: 'Docs e wikis',            credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'miro',           name: 'Miro',                category: 'Produtividade', url: 'https://miro.com',                                         icon: Layout,        color: '#FFD02F', desc: 'Quadro colaborativo',     credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'claude',         name: 'Claude',              category: 'IA',            url: 'https://claude.ai',                                        icon: Bot,           color: '#CC785C', desc: 'Assistente IA Anthropic', credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'chatgpt',        name: 'ChatGPT',             category: 'IA',            url: 'https://chat.openai.com',                                  icon: Bot,           color: '#10A37F', desc: 'Assistente IA OpenAI',    credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'kiro',           name: 'Kiro',                category: 'IA',            url: 'https://kiro.dev',                                         icon: Code2,         color: '#6366F1', desc: 'IDE com IA',              credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'perplexity',     name: 'Perplexity',          category: 'IA',            url: 'https://perplexity.ai',                                    icon: Search,        color: '#20B2AA', desc: 'Pesquisa com IA',         credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'higgsfield',     name: 'Higgsfield',          category: 'Criativo',      url: 'https://higgsfield.ai',                                    icon: Video,         color: '#7C3AED', desc: 'Geração de vídeo IA',     credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'runway',         name: 'Runway',              category: 'Criativo',      url: 'https://runwayml.com',                                     icon: Video,         color: '#FF4500', desc: 'Edição de vídeo IA',      credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'canva',          name: 'Canva',               category: 'Criativo',      url: 'https://canva.com',                                        icon: Layout,        color: '#00C4CC', desc: 'Design gráfico',          credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'figma',          name: 'Figma',               category: 'Criativo',      url: 'https://figma.com',                                        icon: Layout,        color: '#F24E1E', desc: 'Design de interfaces',    credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'ga4',            name: 'Google Analytics',    category: 'Analytics',     url: 'https://analytics.google.com',                             icon: BarChart3,     color: '#E37400', desc: 'Analytics web',           credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'metaads',        name: 'Meta Ads',            category: 'Analytics',     url: 'https://business.facebook.com',                            icon: BarChart3,     color: '#1877F2', desc: 'Anúncios Meta',           credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'googleads',      name: 'Google Ads',          category: 'Analytics',     url: 'https://ads.google.com',                                   icon: BarChart3,     color: '#4285F4', desc: 'Anúncios Google',         credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'slack',          name: 'Slack',               category: 'Comunicação',   url: 'https://slack.com',                                        icon: MessageSquare, color: '#4A154B', desc: 'Comunicação da equipe',   credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'whatsapp',       name: 'WhatsApp Business',   category: 'Comunicação',   url: 'https://business.whatsapp.com',                            icon: MessageSquare, color: '#25D366', desc: 'Atendimento ao cliente',  credentials: { login: '+55 11 00000-0000',       password: '' } },
  { id: 'github',         name: 'GitHub',              category: 'Dev',           url: 'https://github.com',                                       icon: Code2,         color: '#181717', desc: 'Repositórios de código',  credentials: { login: 'growthclube',            password: '' } },
  { id: 'cloudflare',     name: 'Cloudflare',          category: 'Dev',           url: 'https://dash.cloudflare.com',                              icon: Globe,         color: '#F48120', desc: 'CDN e Workers',           credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'supabase',       name: 'Supabase',            category: 'Dev',           url: 'https://supabase.com/dashboard',                           icon: Zap,           color: '#3ECF8E', desc: 'Banco de dados e auth',   credentials: { login: 'equipe@growthclube.com', password: '' } },
  { id: 'content-engine', name: 'Fábrica de Conteúdo', category: 'Interno',      url: 'https://content-engine.hudsonargollo2.workers.dev',         icon: Zap,           color: '#A31621', desc: 'Automação de conteúdo',   credentials: { login: 'equipe@growthclube.com', password: '' } },
]

const CATEGORIES = ['Todos', ...Array.from(new Set(ALL_TOOLS.map((t) => t.category)))]
const ROLES = ['Admin', 'Editor', 'Viewer']

const INITIAL_MEMBERS = [
  { id: '1', email: 'hudson@growthclube.com', name: 'Hudson', role: 'Admin',  tools: ALL_TOOLS.map((t) => t.id) },
  { id: '2', email: 'ana@growthclube.com',    name: 'Ana',    role: 'Editor', tools: ['gmail', 'claude', 'miro', 'canva', 'higgsfield'] },
  { id: '3', email: 'pedro@growthclube.com',  name: 'Pedro',  role: 'Viewer', tools: ['gmail', 'ga4', 'metaads', 'googleads'] },
]

// ── Shared sub-components ─────────────────────────────────────────────────────

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy(e) {
    e.stopPropagation()
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} disabled={!value} title={`Copiar ${label}`}
      className={`p-1 rounded transition-colors ${value ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-700' : 'text-gray-200 cursor-default'}`}>
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  )
}

function CredentialRow({ label, value, isPassword, isAdmin, onSave }) {
  const [showPass, setShowPass] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const display = isPassword
    ? (showPass ? (value || '—') : (value ? '••••••••' : '—'))
    : (value || '—')

  function handleSave(e) {
    e.stopPropagation()
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10 shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input autoFocus type={isPassword ? 'password' : 'text'} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(e); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 min-w-0 text-xs border border-[#A31621]/30 rounded px-2 py-1 focus:outline-none focus:border-[#A31621]" />
          <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); setEditing(false) }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={11} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-xs text-gray-700 truncate flex-1 font-mono">{display}</span>
          {isPassword && value && (
            <button onClick={(e) => { e.stopPropagation(); setShowPass((s) => !s) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 shrink-0">
              {showPass ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          )}
          <CopyButton value={value} label={label} />
          {isAdmin && (
            <button onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 shrink-0">
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Desktop Tool Card (large, full email visible) ─────────────────────────────
function DesktopToolCard({ tool, granted, onToggle, isAdmin, onCredentialSave }) {
  const Icon = tool.icon
  const creds = tool.credentials ?? { login: '', password: '' }

  return (
    <div className={`group flex flex-col gap-4 p-5 border rounded-2xl transition-all duration-200 ${
      granted
        ? 'bg-white border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5'
        : 'bg-gray-50/60 border-gray-100 opacity-50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: tool.color + '18' }}>
          <Icon size={20} style={{ color: tool.color }} />
        </div>
        {isAdmin ? (
          <button onClick={() => onToggle(tool.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
              granted ? 'bg-[#A31621] border-[#A31621]' : 'border-gray-300 hover:border-[#A31621]'
            }`}>
            {granted && <Check size={11} className="text-white" />}
          </button>
        ) : (
          granted ? <Unlock size={14} className="text-green-500" /> : <Lock size={14} className="text-gray-300" />
        )}
      </div>

      {/* Name + desc */}
      <div>
        <p className="font-bold text-gray-900 text-base leading-tight">{tool.name}</p>
        <p className="text-xs text-gray-400 mt-1">{tool.desc}</p>
      </div>

      {/* Credentials */}
      {granted && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <KeyRound size={11} className="text-gray-300" />
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Credenciais</span>
          </div>
          <CredentialRow label="Login" value={creds.login} isPassword={false}
            isAdmin={isAdmin} onSave={(v) => onCredentialSave(tool.id, 'login', v)} />
          <CredentialRow label="Senha" value={creds.password} isPassword={true}
            isAdmin={isAdmin} onSave={(v) => onCredentialSave(tool.id, 'password', v)} />
        </div>
      )}

      {/* Open link */}
      {granted && (
        <a href={tool.url} target="_blank" rel="noreferrer"
          className="mt-auto flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#A31621] hover:bg-[#8B121C] rounded-lg py-2 transition-colors">
          Abrir <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}

// ── Mobile Stacked Card (3D pile effect) ──────────────────────────────────────
function MobileStackedRow({ category, tools, grantedIds, credentials, isAdmin, onToggle, onCredentialSave }) {
  const [expanded, setExpanded] = useState(false)
  const granted = tools.filter((t) => grantedIds.includes(t.id))
  const preview = granted.slice(0, 3)

  return (
    <div className="mb-8">
      {/* Category label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{category}</h3>
        <span className="text-xs text-gray-300">{granted.length} ferramentas</span>
      </div>

      {/* Stacked pile — tap to expand */}
      {!expanded ? (
        <div className="relative h-28 cursor-pointer" onClick={() => setExpanded(true)}
          style={{ perspective: '600px' }}>
          {preview.map((tool, i) => {
            const Icon = tool.icon
            const offset = (preview.length - 1 - i) * 8
            const rotate = (preview.length - 1 - i) * -2
            return (
              <div key={tool.id}
                className="absolute inset-x-0 bg-white border border-gray-200 rounded-2xl shadow-md flex items-center gap-4 px-4 py-3 transition-all duration-300"
                style={{
                  bottom: offset,
                  transform: `rotateX(${rotate}deg) scale(${1 - (preview.length - 1 - i) * 0.03})`,
                  zIndex: i + 1,
                  transformOrigin: 'bottom center',
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tool.color + '18' }}>
                  <Icon size={18} style={{ color: tool.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{tool.name}</p>
                  <p className="text-xs text-gray-400 truncate font-mono">
                    {credentials[tool.id]?.login || tool.credentials?.login || '—'}
                  </p>
                </div>
                {i === preview.length - 1 && (
                  <span className="text-[10px] font-bold text-[#A31621] bg-[#A31621]/10 px-2 py-0.5 rounded-full shrink-0">
                    Ver {granted.length}
                  </span>
                )}
              </div>
            )
          })}
          {granted.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm border border-dashed border-gray-200 rounded-2xl">
              Sem acesso
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isGranted = grantedIds.includes(tool.id)
            const creds = credentials[tool.id] ?? tool.credentials ?? { login: '', password: '' }
            return (
              <div key={tool.id}
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-opacity ${isGranted ? '' : 'opacity-40'}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: tool.color + '18' }}>
                    <Icon size={18} style={{ color: tool.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{tool.name}</p>
                    <p className="text-xs text-gray-400">{tool.desc}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => onToggle(tool.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isGranted ? 'bg-[#A31621] border-[#A31621]' : 'border-gray-300'
                      }`}>
                      {isGranted && <Check size={10} className="text-white" />}
                    </button>
                  )}
                </div>
                {isGranted && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-gray-50 pt-2">
                    <CredentialRow label="Login" value={creds.login} isPassword={false}
                      isAdmin={isAdmin} onSave={(v) => onCredentialSave(tool.id, 'login', v)} />
                    <CredentialRow label="Senha" value={creds.password} isPassword={true}
                      isAdmin={isAdmin} onSave={(v) => onCredentialSave(tool.id, 'password', v)} />
                    <a href={tool.url} target="_blank" rel="noreferrer"
                      className="mt-2 flex items-center gap-1 text-xs font-bold text-[#A31621]">
                      Abrir <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            )
          })}
          <button onClick={() => setExpanded(false)}
            className="w-full text-xs font-bold text-gray-400 py-2 hover:text-gray-600 transition-colors">
            ↑ Recolher
          </button>
        </div>
      )}
    </div>
  )
}

// ── Member Row ────────────────────────────────────────────────────────────────
function MemberRow({ member, isAdmin, onRoleChange, onToolsChange, allTools }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}>
        <div className="w-9 h-9 rounded-full bg-[#A31621]/10 flex items-center justify-center text-[#A31621] font-bold text-sm shrink-0">
          {member.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{member.name}</p>
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
          member.role === 'Admin'  ? 'bg-[#A31621]/10 text-[#A31621]' :
          member.role === 'Editor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
        }`}>{member.role}</span>
        <span className="text-xs text-gray-400 hidden sm:block shrink-0">{member.tools.length} ferramentas</span>
        {isAdmin && (
          <select value={member.role}
            onChange={(e) => { e.stopPropagation(); onRoleChange(member.id, e.target.value) }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-[#A31621] hidden sm:block">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        )}
        <ChevronDown size={15} className={`text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </div>
      {expanded && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso às Ferramentas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allTools.map((tool) => {
              const granted = member.tools.includes(tool.id)
              return (
                <label key={tool.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                  granted ? 'bg-white border-[#A31621]/20 text-gray-700' : 'bg-white border-gray-100 text-gray-400'
                } ${isAdmin ? 'hover:border-[#A31621]/40' : 'cursor-default'}`}>
                  {isAdmin
                    ? <input type="checkbox" checked={granted} onChange={() => onToolsChange(member.id, tool.id)} className="accent-[#A31621] w-3.5 h-3.5" />
                    : (granted ? <Unlock size={11} className="text-green-500 shrink-0" /> : <Lock size={11} className="text-gray-300 shrink-0" />)
                  }
                  <span className="truncate font-medium">{tool.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function TeamDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]     = useState('tools')
  const [search, setSearch]           = useState('')
  const [category, setCategory]       = useState('Todos')
  const [members, setMembers]         = useState(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting]       = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [credentials, setCredentials] = useState(
    Object.fromEntries(ALL_TOOLS.map((t) => [t.id, { login: t.credentials?.login ?? '', password: '' }]))
  )

  useEffect(() => {
    async function loadCreds() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('https://content-engine.hudsonargollo2.workers.dev/api/credentials', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const { credentials: rows } = await res.json()
        setCredentials((prev) => {
          const next = { ...prev }
          for (const row of rows) next[row.toolId] = { login: row.login, password: row.password }
          return next
        })
      } catch (e) { console.error('[credentials] load failed', e) }
    }
    loadCreds()
  }, [])

  const isAdmin  = true
  const myMember = members[0]
  const myTools  = ALL_TOOLS.filter((t) => myMember.tools.includes(t.id))

  const filteredTools = ALL_TOOLS
    .filter((t) => category === 'Todos' || t.category === category)
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

  // Group by category for mobile stacked view
  const toolsByCategory = CATEGORIES.filter((c) => c !== 'Todos').map((cat) => ({
    category: cat,
    tools: ALL_TOOLS.filter((t) => t.category === cat &&
      t.name.toLowerCase().includes(search.toLowerCase())),
  })).filter((g) => g.tools.length > 0)

  function toggleMyTool(toolId) {
    setMembers((prev) => prev.map((m, i) =>
      i === 0 ? { ...m, tools: m.tools.includes(toolId) ? m.tools.filter((id) => id !== toolId) : [...m.tools, toolId] } : m
    ))
  }

  async function handleCredentialSave(toolId, field, value) {
    setCredentials((prev) => ({ ...prev, [toolId]: { ...prev[toolId], [field]: value } }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const current = credentials[toolId] ?? { login: '', password: '' }
      await fetch(`https://content-engine.hudsonargollo2.workers.dev/api/credentials/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          login:    field === 'login'    ? value : current.login,
          password: field === 'password' ? value : current.password,
        }),
      })
    } catch (e) { console.error('[credentials] save failed', e) }
  }

  function handleRoleChange(memberId, role) {
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
  }
  function handleToolsChange(memberId, toolId) {
    setMembers((prev) => prev.map((m) => {
      if (m.id !== memberId) return m
      const tools = m.tools.includes(toolId) ? m.tools.filter((id) => id !== toolId) : [...m.tools, toolId]
      return { ...m, tools }
    }))
  }
  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)
    await new Promise((r) => setTimeout(r, 800))
    setMembers((prev) => [...prev, { id: String(Date.now()), email: inviteEmail, name: inviteEmail.split('@')[0], role: 'Viewer', tools: ['gmail'] }])
    setInviteEmail('')
    setInviting(false)
  }
  async function handleLogout() {
    await supabase.auth.signOut()
    onLogout()
  }

  const tabs = [
    { id: 'tools', label: 'Ferramentas', icon: Grid3x3 },
    { id: 'team',  label: 'Equipe',      icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#1A1A1A] font-sans antialiased">

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg width="28" height="17" viewBox="0 0 40 24" fill="none">
              <path d="M2 3.5L18 12L2 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M38 3.5L22 12L38 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <span className="font-extrabold text-[#A31621] tracking-wider text-sm hidden sm:block">GROWTH CLUBE</span>
            <span className="text-gray-200 hidden sm:block">|</span>
            <span className="text-sm font-semibold text-gray-500 hidden sm:block">Dashboard</span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden sm:flex items-center gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide rounded-lg transition-colors ${
                  activeTab === id ? 'bg-[#A31621] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                <Icon size={13} />{label}
              </button>
            ))}
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 cursor-not-allowed" title="Em breve">
              <Kanban size={13} />Kanban
            </button>
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-gray-300 cursor-not-allowed" title="Em breve">
              <BarChart3 size={13} />CRM
            </button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#A31621]/10 flex items-center justify-center">
                <UserCircle2 size={16} className="text-[#A31621]" />
              </div>
              <span className="text-xs font-semibold text-gray-600 max-w-[120px] truncate">{user?.email}</span>
            </div>
            <button onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#A31621] transition-colors px-2 py-1.5">
              <LogOut size={13} />Sair
            </button>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen((o) => !o)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveTab(id); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === id ? 'bg-[#A31621] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={16} />{label}
              </button>
            ))}
            <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 cursor-not-allowed">
              <Kanban size={16} />Kanban <span className="text-xs font-normal ml-auto">Em breve</span>
            </button>
            <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 cursor-not-allowed">
              <BarChart3 size={16} />CRM <span className="text-xs font-normal ml-auto">Em breve</span>
            </button>
            <div className="border-t border-gray-100 pt-3 mt-2 flex items-center justify-between px-1">
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-[#A31621]">
                <LogOut size={13} />Sair
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── TOOLS TAB ── */}
        {activeTab === 'tools' && (
          <div>
            {/* Page header + search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-[#A31621] tracking-tight">Ferramentas da Equipe</h1>
                <p className="text-sm text-gray-500 mt-1">{myTools.length} ferramentas disponíveis</p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar ferramenta…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 bg-white focus:outline-none focus:border-[#A31621] rounded-xl w-full sm:w-56" />
              </div>
            </div>

            {/* ── DESKTOP: category pills + large grid ── */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                      category === cat ? 'bg-[#A31621] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#A31621]/40'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTools.map((tool) => (
                  <DesktopToolCard key={tool.id}
                    tool={{ ...tool, credentials: credentials[tool.id] }}
                    granted={myMember.tools.includes(tool.id)}
                    onToggle={toggleMyTool}
                    isAdmin={isAdmin}
                    onCredentialSave={handleCredentialSave}
                  />
                ))}
              </div>
              {filteredTools.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">Nenhuma ferramenta encontrada para "{search}"</div>
              )}
            </div>

            {/* ── MOBILE: stacked pile per category ── */}
            <div className="sm:hidden">
              {toolsByCategory.map(({ category: cat, tools }) => (
                <MobileStackedRow key={cat}
                  category={cat}
                  tools={tools}
                  grantedIds={myMember.tools}
                  credentials={credentials}
                  isAdmin={isAdmin}
                  onToggle={toggleMyTool}
                  onCredentialSave={handleCredentialSave}
                />
              ))}
              {toolsByCategory.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">Nenhuma ferramenta encontrada</div>
              )}
            </div>
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === 'team' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-extrabold text-[#A31621] tracking-tight">Gestão de Equipe</h1>
                <p className="text-sm text-gray-500 mt-1">{members.length} membros · Gerencie acessos e permissões</p>
              </div>
            </div>
            {isAdmin && (
              <form onSubmit={handleInvite} className="flex items-center gap-3 mb-8 p-5 bg-white border border-gray-100 rounded-xl">
                <Plus size={16} className="text-[#A31621] shrink-0" />
                <input type="email" placeholder="email@equipe.com" value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 text-sm border-0 focus:outline-none text-gray-700 placeholder-gray-300" />
                <button type="submit" disabled={inviting || !inviteEmail}
                  className="flex items-center gap-2 bg-[#A31621] text-white px-4 py-2 text-xs font-bold hover:bg-[#8B121C] disabled:opacity-50 transition-colors rounded-lg">
                  {inviting ? 'Convidando…' : 'Convidar'}
                </button>
              </form>
            )}
            <div className="space-y-3">
              {members.map((member) => (
                <MemberRow key={member.id} member={member} isAdmin={isAdmin}
                  onRoleChange={handleRoleChange} onToolsChange={handleToolsChange} allTools={ALL_TOOLS} />
              ))}
            </div>
            <div className="mt-12 grid sm:grid-cols-2 gap-4">
              {[
                { icon: Kanban,    label: 'Kanban', desc: 'Gestão de projetos com quadros e sprints' },
                { icon: BarChart3, label: 'CRM',    desc: 'Pipeline de vendas e gestão de clientes' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4 p-5 border border-dashed border-gray-200 rounded-xl bg-white/50 opacity-60">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-500 text-sm">{label} <span className="text-xs font-normal text-gray-400 ml-1">— Em breve</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
