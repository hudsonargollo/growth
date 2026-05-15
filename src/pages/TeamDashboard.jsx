import { useState } from 'react'
import {
  LogOut, Grid3x3, Users, Kanban, UserCircle2,
  ExternalLink, Search, ChevronDown, Plus, Check,
  Mail, Bot, Code2, Video, Layout, BarChart3,
  MessageSquare, FileText, Zap, Globe, Lock, Unlock,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// ── Tool definitions ──────────────────────────────────────────────────────────
const ALL_TOOLS = [
  // Productivity
  { id: 'gmail',       name: 'Gmail',          category: 'Produtividade', url: 'https://mail.google.com',          icon: Mail,        color: '#EA4335', desc: 'E-mail corporativo' },
  { id: 'gdrive',      name: 'Google Drive',   category: 'Produtividade', url: 'https://drive.google.com',         icon: FileText,    color: '#4285F4', desc: 'Armazenamento e docs' },
  { id: 'gcal',        name: 'Google Calendar',category: 'Produtividade', url: 'https://calendar.google.com',      icon: Grid3x3,     color: '#0F9D58', desc: 'Agenda e reuniões' },
  { id: 'notion',      name: 'Notion',         category: 'Produtividade', url: 'https://notion.so',                icon: FileText,    color: '#000000', desc: 'Docs e wikis' },
  { id: 'miro',        name: 'Miro',           category: 'Produtividade', url: 'https://miro.com',                 icon: Layout,      color: '#FFD02F', desc: 'Quadro colaborativo' },
  // AI
  { id: 'claude',      name: 'Claude',         category: 'IA',            url: 'https://claude.ai',                icon: Bot,         color: '#CC785C', desc: 'Assistente IA Anthropic' },
  { id: 'chatgpt',     name: 'ChatGPT',        category: 'IA',            url: 'https://chat.openai.com',          icon: Bot,         color: '#10A37F', desc: 'Assistente IA OpenAI' },
  { id: 'kiro',        name: 'Kiro',           category: 'IA',            url: 'https://kiro.dev',                 icon: Code2,       color: '#6366F1', desc: 'IDE com IA' },
  { id: 'perplexity',  name: 'Perplexity',     category: 'IA',            url: 'https://perplexity.ai',            icon: Search,      color: '#20B2AA', desc: 'Pesquisa com IA' },
  // Video & Creative
  { id: 'higgsfield',  name: 'Higgsfield',     category: 'Criativo',      url: 'https://higgsfield.ai',            icon: Video,       color: '#7C3AED', desc: 'Geração de vídeo IA' },
  { id: 'runway',      name: 'Runway',         category: 'Criativo',      url: 'https://runwayml.com',             icon: Video,       color: '#FF4500', desc: 'Edição de vídeo IA' },
  { id: 'canva',       name: 'Canva',          category: 'Criativo',      url: 'https://canva.com',                icon: Layout,      color: '#00C4CC', desc: 'Design gráfico' },
  { id: 'figma',       name: 'Figma',          category: 'Criativo',      url: 'https://figma.com',                icon: Layout,      color: '#F24E1E', desc: 'Design de interfaces' },
  // Analytics & Marketing
  { id: 'ga4',         name: 'Google Analytics',category: 'Analytics',    url: 'https://analytics.google.com',     icon: BarChart3,   color: '#E37400', desc: 'Analytics web' },
  { id: 'metaads',     name: 'Meta Ads',       category: 'Analytics',     url: 'https://business.facebook.com',    icon: BarChart3,   color: '#1877F2', desc: 'Anúncios Meta' },
  { id: 'googleads',   name: 'Google Ads',     category: 'Analytics',     url: 'https://ads.google.com',           icon: BarChart3,   color: '#4285F4', desc: 'Anúncios Google' },
  // Communication
  { id: 'slack',       name: 'Slack',          category: 'Comunicação',   url: 'https://slack.com',                icon: MessageSquare, color: '#4A154B', desc: 'Comunicação da equipe' },
  { id: 'whatsapp',    name: 'WhatsApp Business', category: 'Comunicação', url: 'https://business.whatsapp.com',  icon: MessageSquare, color: '#25D366', desc: 'Atendimento ao cliente' },
  // Dev & Infra
  { id: 'github',      name: 'GitHub',         category: 'Dev',           url: 'https://github.com',               icon: Code2,       color: '#181717', desc: 'Repositórios de código' },
  { id: 'cloudflare',  name: 'Cloudflare',     category: 'Dev',           url: 'https://dash.cloudflare.com',      icon: Globe,       color: '#F48120', desc: 'CDN e Workers' },
  { id: 'supabase',    name: 'Supabase',       category: 'Dev',           url: 'https://supabase.com/dashboard',   icon: Zap,         color: '#3ECF8E', desc: 'Banco de dados e auth' },
  // Internal
  { id: 'content-engine', name: 'Content Engine', category: 'Interno',   url: 'https://content-engine.hudsonargollo2.workers.dev', icon: Zap, color: '#A31621', desc: 'Automação de conteúdo' },
]

const CATEGORIES = ['Todos', ...Array.from(new Set(ALL_TOOLS.map((t) => t.category)))]

const ROLES = ['Admin', 'Editor', 'Viewer']

// Mock team members — replace with real Supabase query
const INITIAL_MEMBERS = [
  { id: '1', email: 'hudson@growthclube.com', name: 'Hudson',  role: 'Admin',  tools: ALL_TOOLS.map((t) => t.id) },
  { id: '2', email: 'ana@growthclube.com',    name: 'Ana',     role: 'Editor', tools: ['gmail', 'claude', 'miro', 'canva', 'higgsfield'] },
  { id: '3', email: 'pedro@growthclube.com',  name: 'Pedro',   role: 'Viewer', tools: ['gmail', 'ga4', 'metaads', 'googleads'] },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolCard({ tool, granted, onToggle, isAdmin }) {
  const Icon = tool.icon
  return (
    <div className={`relative group flex flex-col gap-3 p-4 border rounded-xl transition-all duration-200 ${
      granted
        ? 'bg-white border-gray-200 shadow-sm hover:shadow-md'
        : 'bg-gray-50 border-gray-100 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: tool.color + '18' }}>
          <Icon size={18} style={{ color: tool.color }} />
        </div>
        {isAdmin && (
          <button
            onClick={() => onToggle(tool.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              granted ? 'bg-[#A31621] border-[#A31621]' : 'border-gray-300 hover:border-[#A31621]'
            }`}
          >
            {granted && <Check size={12} className="text-white" />}
          </button>
        )}
        {!isAdmin && (
          granted
            ? <Unlock size={13} className="text-green-500" />
            : <Lock size={13} className="text-gray-300" />
        )}
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{tool.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{tool.desc}</p>
      </div>
      {granted && (
        <a
          href={tool.url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#A31621] hover:underline"
        >
          Abrir <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

function MemberRow({ member, isAdmin, onRoleChange, onToolsChange, allTools }) {
  const [expanded, setExpanded] = useState(false)
  const grantedCount = member.tools.length

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-9 h-9 rounded-full bg-[#A31621]/10 flex items-center justify-center text-[#A31621] font-bold text-sm shrink-0">
          {member.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{member.name}</p>
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          member.role === 'Admin'  ? 'bg-[#A31621]/10 text-[#A31621]' :
          member.role === 'Editor' ? 'bg-blue-50 text-blue-600' :
                                     'bg-gray-100 text-gray-500'
        }`}>{member.role}</span>
        <span className="text-xs text-gray-400 hidden sm:block">{grantedCount} ferramentas</span>
        {isAdmin && (
          <select
            value={member.role}
            onChange={(e) => { e.stopPropagation(); onRoleChange(member.id, e.target.value) }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-[#A31621] hidden sm:block"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        )}
        <ChevronDown size={15} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso às Ferramentas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allTools.map((tool) => {
              const granted = member.tools.includes(tool.id)
              return (
                <label key={tool.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                  granted ? 'bg-white border-[#A31621]/20 text-gray-700' : 'bg-white border-gray-100 text-gray-400'
                } ${isAdmin ? 'hover:border-[#A31621]/40' : 'cursor-default'}`}>
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={granted}
                      onChange={() => onToolsChange(member.id, tool.id)}
                      className="accent-[#A31621] w-3.5 h-3.5"
                    />
                  )}
                  {!isAdmin && (granted ? <Unlock size={11} className="text-green-500 shrink-0" /> : <Lock size={11} className="text-gray-300 shrink-0" />)}
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
  const [activeTab, setActiveTab]     = useState('tools')   // 'tools' | 'team'
  const [search, setSearch]           = useState('')
  const [category, setCategory]       = useState('Todos')
  const [members, setMembers]         = useState(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting]       = useState(false)

  const isAdmin = true // TODO: derive from user role in DB

  // My tools (first member = current user for demo)
  const myMember = members[0]
  const myTools  = ALL_TOOLS.filter((t) => myMember.tools.includes(t.id))

  const filteredTools = ALL_TOOLS
    .filter((t) => category === 'Todos' || t.category === category)
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

  function toggleMyTool(toolId) {
    setMembers((prev) => prev.map((m, i) =>
      i === 0
        ? { ...m, tools: m.tools.includes(toolId) ? m.tools.filter((id) => id !== toolId) : [...m.tools, toolId] }
        : m
    ))
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
    // TODO: send invite via Supabase admin API or edge function
    await new Promise((r) => setTimeout(r, 800))
    setMembers((prev) => [...prev, {
      id:    String(Date.now()),
      email: inviteEmail,
      name:  inviteEmail.split('@')[0],
      role:  'Viewer',
      tools: ['gmail'],
    }])
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

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <svg width="28" height="17" viewBox="0 0 40 24" fill="none">
              <path d="M2 3.5L18 12L2 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M38 3.5L22 12L38 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <span className="font-extrabold text-[#A31621] tracking-wider text-sm hidden sm:block">GROWTH CLUBE</span>
            <span className="text-gray-200 hidden sm:block">|</span>
            <span className="text-sm font-semibold text-gray-500 hidden sm:block">Dashboard</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide rounded-lg transition-colors ${
                  activeTab === id
                    ? 'bg-[#A31621] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
            {/* Placeholder future tabs */}
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide rounded-lg text-gray-300 cursor-not-allowed" title="Em breve">
              <Kanban size={13} />
              <span className="hidden sm:block">Kanban</span>
            </button>
            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide rounded-lg text-gray-300 cursor-not-allowed" title="Em breve">
              <BarChart3 size={13} />
              <span className="hidden sm:block">CRM</span>
            </button>
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#A31621]/10 flex items-center justify-center">
                <UserCircle2 size={16} className="text-[#A31621]" />
              </div>
              <span className="text-xs font-semibold text-gray-600 max-w-[120px] truncate">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#A31621] transition-colors px-2 py-1.5"
            >
              <LogOut size={13} />
              <span className="hidden sm:block">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── TOOLS TAB ── */}
        {activeTab === 'tools' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-extrabold text-[#A31621] tracking-tight">Ferramentas da Equipe</h1>
                <p className="text-sm text-gray-500 mt-1">{myTools.length} ferramentas disponíveis para você</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar ferramenta…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-2 text-sm border border-gray-200 bg-white focus:outline-none focus:border-[#A31621] rounded-lg w-48"
                  />
                </div>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    category === cat
                      ? 'bg-[#A31621] text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:border-[#A31621]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Tool grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  granted={myMember.tools.includes(tool.id)}
                  onToggle={toggleMyTool}
                  isAdmin={isAdmin}
                />
              ))}
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">
                Nenhuma ferramenta encontrada para "{search}"
              </div>
            )}
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

            {/* Invite form */}
            {isAdmin && (
              <form onSubmit={handleInvite} className="flex items-center gap-3 mb-8 p-5 bg-white border border-gray-100 rounded-xl">
                <Plus size={16} className="text-[#A31621] shrink-0" />
                <input
                  type="email"
                  placeholder="email@equipe.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 text-sm border-0 focus:outline-none text-gray-700 placeholder-gray-300"
                />
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="flex items-center gap-2 bg-[#A31621] text-white px-4 py-2 text-xs font-bold hover:bg-[#8B121C] disabled:opacity-50 transition-colors rounded-lg"
                >
                  {inviting ? 'Convidando…' : 'Convidar'}
                </button>
              </form>
            )}

            {/* Members list */}
            <div className="space-y-3">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  onRoleChange={handleRoleChange}
                  onToolsChange={handleToolsChange}
                  allTools={ALL_TOOLS}
                />
              ))}
            </div>

            {/* Coming soon modules */}
            <div className="mt-12 grid sm:grid-cols-2 gap-4">
              {[
                { icon: Kanban,    label: 'Kanban',  desc: 'Gestão de projetos com quadros e sprints' },
                { icon: BarChart3, label: 'CRM',     desc: 'Pipeline de vendas e gestão de clientes' },
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
