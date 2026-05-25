import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, PlusCircle, Trash2, Pencil, X, Check, AlertTriangle,
  Loader2, Tag, Repeat, ShoppingBag, Terminal, Copy,
  Sparkles, Power, LayoutDashboard, Undo2, UserCircle2,
} from 'lucide-react'
import { FINANCE_BASE, useFinanceApi, financePost, financePut, financeDelete } from '../hooks/useFinanceApi.js'

// ── Role config ───────────────────────────────────────────────────────────────
const ADMINS = ['hudsonargollo@gmail.com', 'pedro@growth.com', 'alison@growth.com']

// ── Constants ─────────────────────────────────────────────────────────────────
const CARD_GRADIENTS = {
  purple: 'from-purple-600 to-purple-900',
  blue:   'from-blue-500 to-blue-900',
  green:  'from-emerald-500 to-emerald-800',
  orange: 'from-orange-500 to-orange-800',
  pink:   'from-pink-500 to-rose-800',
  indigo: 'from-indigo-500 to-indigo-900',
  teal:   'from-teal-500 to-teal-900',
  gray:   'from-gray-500 to-gray-800',
  red:    'from-[#A31621] to-[#6b0d13]',
}
const CARD_COLOR_OPTIONS = [
  { value: 'red',    label: 'Growth'  },
  { value: 'indigo', label: 'Índigo'  },
  { value: 'purple', label: 'Roxo'    },
  { value: 'blue',   label: 'Azul'    },
  { value: 'green',  label: 'Verde'   },
  { value: 'orange', label: 'Laranja' },
  { value: 'pink',   label: 'Rosa'    },
  { value: 'teal',   label: 'Teal'    },
  { value: 'gray',   label: 'Cinza'   },
]
const DEFAULT_CATEGORIES = [
  { name: 'SaaS / Ferramentas', color: '#A31621', icon: '💻' },
  { name: 'Cursos',             color: '#8b5cf6', icon: '📚' },
  { name: 'Serviços',           color: '#10b981', icon: '⚙️' },
  { name: 'Freelancers',        color: '#f59e0b', icon: '👤' },
  { name: 'Marketing / Ads',    color: '#ec4899', icon: '📣' },
  { name: 'Infraestrutura',     color: '#64748b', icon: '🏗️' },
  { name: 'Outros',             color: '#94a3b8', icon: '📦' },
]
const CAT_COLORS = ['#A31621','#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#3b82f6','#64748b','#0ea5e9','#14b8a6']
const CAT_ICONS  = ['💻','📚','⚙️','👤','📣','🏗️','📦','🎯','💡','🔒','📊','🛒','✈️','🎨','📱','🤖','🔧','💬','🌐','💰']

const SETUP_SQL = `-- Run once in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS financial_cards (
  id          text PRIMARY KEY,
  name        text NOT NULL DEFAULT '',
  "lastFour"  text DEFAULT '',
  brand       text DEFAULT '',
  color       text DEFAULT 'red',
  "isDefault" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS financial_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  color       text DEFAULT '#A31621',
  icon        text DEFAULT '📦',
  "createdAt" timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS financial_expenses (
  id            text PRIMARY KEY,
  "ownerEmail"  text,
  "cardId"      text REFERENCES financial_cards(id) ON DELETE SET NULL,
  "categoryId"  text REFERENCES financial_categories(id) ON DELETE SET NULL,
  description   text NOT NULL DEFAULT '',
  amount        numeric NOT NULL DEFAULT 0,
  type          text NOT NULL DEFAULT 'one_time',
  status        text DEFAULT 'active',
  "billingDay"  integer,
  "paidAt"      timestamptz,
  notes         text DEFAULT '',
  "createdAt"   timestamptz DEFAULT now(),
  "updatedAt"   timestamptz DEFAULT now()
);
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS "ownerEmail" text;
NOTIFY pgrst, 'reload schema';`

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)

// ── Setup guide ───────────────────────────────────────────────────────────────
function SetupGuide({ onRetry, errMsg }) {
  const [copied,     setCopied]    = useState(false)
  const [checking,   setChecking]  = useState(false)
  const [pingResult, setPingResult] = useState(null)

  function handleCopy() {
    navigator.clipboard.writeText(SETUP_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCheck() {
    setChecking(true)
    setPingResult(null)
    try {
      const res  = await fetch(`${FINANCE_BASE}/ping`)
      const data = await res.json()
      setPingResult(data)
      const allOk = Object.values(data).every(t => t?.ok)
      if (allOk) onRetry?.()
    } catch (e) {
      setPingResult({ _fetchError: { ok: false, msg: e.message } })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden mb-6">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-amber-200">
        <div className="flex items-start gap-3">
          <Terminal size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Setup necessário — execute no Supabase SQL Editor</p>
            <p className="text-xs text-amber-600 mt-0.5">Cria as 3 tabelas do módulo financeiro. Rode uma vez e clique em Verificar.</p>
            {errMsg && <p className="text-xs font-mono text-red-600 mt-1 break-all">{errMsg}</p>}
          </div>
        </div>
        <button onClick={handleCheck} disabled={checking}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-60 transition-colors">
          {checking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {checking ? 'Verificando…' : 'Verificar novamente'}
        </button>
      </div>

      {pingResult && (
        <div className="px-5 py-3 border-b border-amber-200 bg-amber-100/50">
          {Object.entries(pingResult)
            .filter(([k]) => k !== 'supabaseUrl')
            .map(([tbl, res]) => (
              <div key={tbl} className="flex items-center gap-2 text-xs py-0.5">
                <span className={res?.ok ? 'text-green-600' : 'text-red-600'}>{res?.ok ? '✓' : '✗'}</span>
                <span className="font-mono text-amber-800">{tbl}</span>
                {!res?.ok && <span className="text-red-600 truncate">{res?.msg ?? String(res)}</span>}
              </div>
            ))}
        </div>
      )}

      <div className="p-5">
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">SQL Editor → New query → Run</span>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-white/10 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>
          <pre className="p-4 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{SETUP_SQL}</pre>
        </div>
      </div>
    </div>
  )
}

// ── Shared UI components ──────────────────────────────────────────────────────
function CategoryBadge({ category, small = false }) {
  if (!category) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
      style={{ backgroundColor: `${category.color}18`, color: category.color }}>
      {category.icon} {category.name}
    </span>
  )
}

function CardChip({ card }) {
  if (!card) return null
  const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.red
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient}`}>
      <CreditCard size={9} /> {card.name}{card.lastFour ? ` •${card.lastFour}` : ''}
    </span>
  )
}

function CardVisual({ card }) {
  const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.red
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl text-white px-5 py-4 relative overflow-hidden select-none`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full border-[20px] border-white" />
        <div className="absolute bottom-[-30px] right-[20px] w-40 h-40 rounded-full border-[20px] border-white" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <CreditCard size={20} className="opacity-80" />
          <span className="text-xs opacity-70 uppercase tracking-wider font-medium">{card.brand || 'Cartão'}</span>
        </div>
        <div className="text-lg font-mono tracking-widest opacity-90 mb-1">•••• •••• •••• {card.lastFour || '••••'}</div>
        <p className="text-sm font-semibold truncate">{card.name}</p>
      </div>
    </div>
  )
}

// ── Card modal ────────────────────────────────────────────────────────────────
function CardModal({ card, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', lastFour: '', brand: '', color: 'red', ...card })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true); setError(null)
    try { await onSave(form) } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{card?.id ? 'Editar Cartão' : 'Novo Cartão'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <CardVisual card={form} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do cartão *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Nubank PF, Itaú PJ…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Últimos 4 dígitos</label>
              <input value={form.lastFour} onChange={e => setForm(f => ({ ...f, lastFour: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                placeholder="1234" maxLength={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bandeira</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="Visa, Mastercard…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLOR_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${CARD_GRADIENTS[opt.value]} border-2 transition-all ${form.color === opt.value ? 'border-gray-800 scale-110' : 'border-transparent'}`} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11} />{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[#A31621] hover:bg-[#8B121C] disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Category modal (create + edit) ───────────────────────────────────────────
function CategoryModal({ category, onSave, onClose }) {
  const isEdit = !!category?.id
  const [form, setForm] = useState({ name: '', color: '#A31621', icon: '📦', ...category })
  const [saving, setSaving] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">{form.icon}</span>
            <span className="text-sm font-semibold" style={{ color: form.color }}>{form.name || 'Nome da categoria'}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: SaaS, Cursos, Freelancers…" autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Ícone</label>
            <div className="flex flex-wrap gap-1.5">
              {CAT_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-colors ${form.icon === ic ? 'bg-[#A31621]/10 ring-2 ring-[#A31621]' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CAT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-700 scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[#A31621] hover:bg-[#8B121C] disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Expense modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ expense, cards, categories, members = [], isAdmin = false, defaultType = 'fixed_monthly', ownerEmail, onSave, onClose }) {
  const [form, setForm] = useState({
    description: '', amount: '', type: defaultType,
    cardId: '', categoryId: '', billingDay: '', paidAt: '', notes: '', status: 'active',
    ownerEmail: ownerEmail ?? '',
    ...expense,
    amount: expense?.amount ? String(Math.abs(expense.amount)) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount) return
    setSaving(true); setError(null)
    try {
      await onSave({
        ...form,
        ownerEmail:  ownerEmail ?? form.ownerEmail ?? null,
        amount:      form.amount, // sign handled by parent handleSaveExpense
        cardId:      form.cardId     || null,
        categoryId:  form.categoryId || null,
        billingDay:  null,
        paidAt:      form.paidAt ? new Date(form.paidAt).toISOString() : new Date().toISOString(),
      })
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800">{expense?.id ? 'Editar' : 'Nova despesa'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {form.type === 'refund' ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Undo2 size={14} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700">Reembolso</p>
                <p className="text-[10px] text-emerald-600">Será registrado como crédito (valor negativo)</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
              {[
                { v: 'fixed_monthly', label: '🔁 Assinatura', desc: 'recorrente mensal' },
                { v: 'one_time',      label: '⚡ Avulso',     desc: 'compra única' },
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, type: opt.v }))}
                  className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg text-xs font-medium transition-colors ${form.type === opt.v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {opt.label}
                  <span className="text-[10px] text-gray-400 font-normal mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome / Descrição *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={form.type === 'fixed_monthly' ? 'Ex: Notion, ChatGPT Plus, Vercel…' : 'Ex: Curso de tráfego, Freelancer logo…'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" inputMode="decimal"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data da transação</label>
              <input type="date" value={form.paidAt ? form.paidAt.slice(0,10) : ''}
                onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cartão</label>
              <select value={form.cardId} onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]">
                <option value="">Sem cartão</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.lastFour ? ` •${c.lastFour}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
          {isAdmin && form.type === 'fixed_monthly' && members.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <UserCircle2 size={11} /> Responsável
              </label>
              <select value={form.ownerEmail ?? ''} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value || null }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]">
                <option value="">Sem responsável</option>
                {members.map(m => <option key={m.id} value={m.email}>{m.name} ({m.email})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Link, conta, observação…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A31621]" />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11}/>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || !form.description.trim() || !form.amount}
              className="flex-1 flex items-center justify-center gap-2 bg-[#A31621] hover:bg-[#8B121C] disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Subscription card ─────────────────────────────────────────────────────────
function SubscriptionCard({ expense, onEdit, onDelete, onToggle, onRefund, showOwner = false, members = [] }) {
  const active    = expense.status === 'active'
  const isRefund  = expense.type === 'refund'
  const owner     = expense.ownerEmail ? members.find(m => m.email === expense.ownerEmail) : null
  const ownerName = owner?.name ?? expense.ownerEmail
  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${
      isRefund ? 'border-emerald-200 bg-emerald-50/30' : active ? 'border-gray-200' : 'border-gray-100 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isRefund && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">↩ Reembolso</span>}
            <p className={`text-sm font-semibold truncate ${isRefund ? 'text-emerald-700' : active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
              {expense.description}
            </p>
          </div>
          {showOwner && ownerName && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-4 h-4 rounded-full bg-[#A31621]/10 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-[#A31621]">{ownerName[0]?.toUpperCase()}</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{ownerName}</p>
            </div>
          )}
        </div>
        <span className={`text-base font-bold shrink-0 ${isRefund ? 'text-emerald-600' : 'text-gray-900'}`}>
          {isRefund ? '+' : ''}{fmtBRL(Math.abs(expense.amount))}
          {!isRefund && <span className="text-xs font-normal text-gray-400">/mês</span>}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {expense.category && <CategoryBadge category={expense.category} small />}
        {expense.card && <CardChip card={expense.card} />}
      </div>
      {expense.notes && <p className="text-[11px] text-gray-400 truncate">{expense.notes}</p>}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
        {!isRefund && (
          <button onClick={() => onToggle(expense)} title={active ? 'Pausar' : 'Ativar'}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors font-medium ${active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
            <Power size={10} /> {active ? 'Pausar' : 'Ativar'}
          </button>
        )}
        {!isRefund && (
          <button onClick={() => onEdit(expense)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-400 hover:text-[#A31621] hover:bg-[#A31621]/5 transition-colors">
            <Pencil size={10} /> Editar
          </button>
        )}
        {!isRefund && onRefund && (
          <button onClick={() => onRefund(expense)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
            <Undo2 size={10} /> Reembolso
          </button>
        )}
        <button onClick={() => onDelete(expense.id)} className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ── Admin Visão Geral ─────────────────────────────────────────────────────────
function AdminOverview({ cards, categories, expenses, expLoading, members = [], onExpModal, onCardModal, onCatModal, onSeedDefaults, onDeleteCard, onDeleteCategory, onDeleteExpense, onToggle, onRefundExpense }) {
  const [catFilter,  setCatFilter]  = useState('')
  const [cardFilter, setCardFilter] = useState('')
  const [showPaused, setShowPaused] = useState(false)

  const subscriptions = useMemo(() => expenses.filter(e => e.type === 'fixed_monthly' || e.type === 'refund'), [expenses])
  const oneTimeBuys   = useMemo(() => expenses.filter(e => e.type === 'one_time'), [expenses])
  const activeSubs    = subscriptions.filter(e => e.status !== 'cancelled')
  const monthlyTotal  = activeSubs.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const filteredSubs = useMemo(() => {
    let list = showPaused ? subscriptions : activeSubs
    if (catFilter)  list = list.filter(e => e.categoryId === catFilter || e.category?.id === catFilter)
    if (cardFilter) list = list.filter(e => e.cardId === cardFilter || e.card?.id === cardFilter)
    return list
  }, [subscriptions, activeSubs, showPaused, catFilter, cardFilter])

  const filteredBuys = useMemo(() => {
    let list = oneTimeBuys
    if (catFilter)  list = list.filter(e => e.categoryId === catFilter || e.category?.id === catFilter)
    if (cardFilter) list = list.filter(e => e.cardId === cardFilter || e.card?.id === cardFilter)
    return list
  }, [oneTimeBuys, catFilter, cardFilter])

  const categoryTotals = useMemo(() => {
    const map = {}
    for (const e of activeSubs) {
      const key = e.category?.id ?? '__none'
      const cat = e.category ?? { id: '__none', name: 'Sem categoria', color: '#94a3b8', icon: '📦' }
      if (!map[key]) map[key] = { cat, total: 0 }
      map[key].total += Number(e.amount ?? 0)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [activeSubs])

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Total mensal</p>
            <p className="text-2xl font-bold text-[#A31621]">{fmtBRL(monthlyTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">{activeSubs.length} assinatura{activeSubs.length !== 1 ? 's' : ''} ativa{activeSubs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Projeção anual</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(monthlyTotal * 12)}</p>
            <p className="text-xs text-gray-400 mt-1">só fixos · sem avulsos</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Compras avulsas</p>
            <p className="text-2xl font-bold text-gray-900">{oneTimeBuys.length}</p>
            <p className="text-xs text-gray-400 mt-1">{fmtBRL(oneTimeBuys.reduce((s,e) => s+Number(e.amount??0),0))} no total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#A31621]">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={cardFilter} onChange={e => setCardFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#A31621]">
            <option value="">Todos os cartões</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.lastFour ? ` •${c.lastFour}` : ''}</option>)}
          </select>
          <button onClick={() => setShowPaused(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showPaused ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            <Power size={11} /> {showPaused ? 'Esconder pausadas' : 'Ver pausadas'}
          </button>
          {(catFilter || cardFilter) && (
            <button onClick={() => { setCatFilter(''); setCardFilter('') }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5">
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        {/* Subscriptions grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Repeat size={14} className="text-blue-500" /> Assinaturas mensais
              <span className="text-gray-400 font-normal">{filteredSubs.length}</span>
            </h2>
            <button onClick={() => onExpModal({ type: 'fixed_monthly' })} className="text-xs text-[#A31621] hover:text-[#8B121C] flex items-center gap-1">
              <PlusCircle size={12} /> Adicionar
            </button>
          </div>
          {expLoading ? (
            <div className="py-10 text-center"><Loader2 size={18} className="animate-spin mx-auto text-gray-300" /></div>
          ) : filteredSubs.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-10 text-center">
              <Repeat size={24} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma assinatura ainda</p>
              <button onClick={() => onExpModal({ type: 'fixed_monthly' })} className="mt-2 text-xs text-[#A31621] hover:underline">Adicionar primeira</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredSubs.map(e => (
                <SubscriptionCard key={e.id} expense={e} showOwner members={members}
                  onEdit={onExpModal} onDelete={onDeleteExpense} onToggle={onToggle} onRefund={onRefundExpense} />
              ))}
            </div>
          )}
        </div>

        {/* One-time */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ShoppingBag size={14} className="text-purple-500" /> Compras avulsas
              <span className="text-gray-400 font-normal">{filteredBuys.length}</span>
            </h2>
            <button onClick={() => onExpModal({ type: 'one_time' })} className="text-xs text-[#A31621] hover:text-[#8B121C] flex items-center gap-1">
              <PlusCircle size={12} /> Adicionar
            </button>
          </div>
          {filteredBuys.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-8 text-center">
              <ShoppingBag size={20} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma compra avulsa</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Descrição</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Categoria</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Valor</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuys.map(e => {
                    const isRefund = e.type === 'refund'
                    return (
                      <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50/50 group ${isRefund ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isRefund && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">↩ Reembolso</span>}
                            <p className={`font-medium ${isRefund ? 'text-emerald-700' : 'text-gray-800'}`}>{e.description}</p>
                          </div>
                          {e.ownerEmail && <p className="text-[10px] text-gray-400">{e.ownerEmail}</p>}
                        </td>
                        <td className="px-4 py-3"><CategoryBadge category={e.category} /></td>
                        <td className="px-4 py-3 text-xs text-gray-400">{e.paidAt ? new Date(e.paidAt).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isRefund ? 'text-emerald-600' : 'text-gray-800'}`}>
                          {isRefund ? '+' : ''}{fmtBRL(Math.abs(e.amount))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isRefund && <button onClick={() => onRefundExpense(e)} className="p-1 hover:bg-emerald-50 rounded text-gray-300 hover:text-emerald-600" title="Registrar reembolso"><Undo2 size={12} /></button>}
                            {!isRefund && <button onClick={() => onExpModal(e)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#A31621]"><Pencil size={12} /></button>}
                            <button onClick={() => onDeleteExpense(e.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-60 shrink-0 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tag size={11} /> Por categoria</h3>
          {categoryTotals.length === 0 ? <p className="text-xs text-gray-300 text-center py-3">—</p> : (
            <div className="space-y-2.5">
              {categoryTotals.map(({ cat, total }) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                      <span className="text-xs font-bold shrink-0 ml-1" style={{ color: cat.color }}>{fmtBRL(total)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${monthlyTotal > 0 ? (total/monthlyTotal)*100 : 0}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={11} /> Cartões</h3>
            <button onClick={() => onCardModal({})} className="text-[11px] text-[#A31621] flex items-center gap-0.5"><PlusCircle size={11} /> Novo</button>
          </div>
          {cards.length === 0 ? <p className="text-xs text-gray-300 text-center py-3">Nenhum cartão</p> : (
            <div className="space-y-2">
              {cards.map(card => {
                const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.red
                return (
                  <div key={card.id} className="flex items-center gap-2 group">
                    <div className={`w-8 h-5 rounded bg-gradient-to-r ${gradient} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{card.name}</p>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onCardModal(card)} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-[#A31621]"><Pencil size={10} /></button>
                      <button onClick={() => onDeleteCard(card.id)} className="p-1 hover:bg-red-50 rounded text-gray-200 hover:text-red-400"><Trash2 size={10} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Tag size={11} /> Categorias</h3>
            <div className="flex gap-1">
              {categories.length === 0 && (
                <button onClick={onSeedDefaults} className="text-[11px] text-[#A31621]/60 hover:text-[#A31621]" title="Criar padrões"><Sparkles size={11} /></button>
              )}
              <button onClick={() => onCatModal({})} className="text-[11px] text-[#A31621] flex items-center gap-0.5"><PlusCircle size={11} /> Nova</button>
            </div>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-gray-300">Nenhuma categoria</p>
              <button onClick={onSeedDefaults} className="text-[11px] text-[#A31621] hover:underline mt-1">Criar padrões</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 group">
                  <span className="text-sm shrink-0">{cat.icon}</span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: cat.color }}>{cat.name}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onCatModal(cat)} className="p-0.5 hover:bg-gray-100 rounded text-gray-300 hover:text-[#A31621]"><Pencil size={10} /></button>
                    <button onClick={() => onDeleteCategory(cat.id)} className="p-0.5 hover:bg-red-50 rounded text-gray-200 hover:text-red-400"><X size={10} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── My subscriptions ──────────────────────────────────────────────────────────
function MySubscriptions({ userEmail, cards, categories }) {
  const qs = userEmail ? `?ownerEmail=${encodeURIComponent(userEmail)}` : ''
  const { data: expData, refetch: refetchExp, loading: expLoading } = useFinanceApi(`/expenses${qs}`, [userEmail])

  const expenses      = expData?.expenses ?? []
  const subscriptions = useMemo(() => expenses.filter(e => e.type === 'fixed_monthly'), [expenses])
  const activeSubs    = subscriptions.filter(e => e.status === 'active')
  const monthlyTotal  = activeSubs.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const [catFilter,  setCatFilter]  = useState('')
  const [showPaused, setShowPaused] = useState(false)
  const [expModal,   setExpModal]   = useState(null)

  const filteredSubs = useMemo(() => {
    let list = showPaused ? subscriptions : activeSubs
    if (catFilter) list = list.filter(e => e.categoryId === catFilter || e.category?.id === catFilter)
    return list
  }, [subscriptions, activeSubs, showPaused, catFilter])

  const categoryTotals = useMemo(() => {
    const map = {}
    for (const e of activeSubs) {
      const key = e.category?.id ?? '__none'
      const cat = e.category ?? { id: '__none', name: 'Sem categoria', color: '#94a3b8', icon: '📦' }
      if (!map[key]) map[key] = { cat, total: 0 }
      map[key].total += Number(e.amount ?? 0)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [activeSubs])

  async function handleSaveExpense(form) {
    if (form.id) await financePut(`/expenses/${form.id}`, form)
    else         await financePost('/expenses', form)
    refetchExp(); setExpModal(null)
  }
  async function handleDeleteExpense(id) {
    if (!window.confirm('Remover?')) return
    await financeDelete(`/expenses/${id}`); refetchExp()
  }
  async function handleToggle(expense) {
    const next = expense.status === 'active' ? 'cancelled' : 'active'
    await financePut(`/expenses/${expense.id}`, { status: next })
    refetchExp()
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Total mensal</p>
            <p className="text-2xl font-bold text-[#A31621]">{fmtBRL(monthlyTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">{activeSubs.length} assinatura{activeSubs.length !== 1 ? 's' : ''} ativa{activeSubs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Projeção anual</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(monthlyTotal * 12)}</p>
            <p className="text-xs text-gray-400 mt-1">só fixos mensais</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#A31621]">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <button onClick={() => setShowPaused(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showPaused ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            <Power size={11} /> {showPaused ? 'Esconder pausadas' : 'Ver pausadas'}
          </button>
          {catFilter && <button onClick={() => setCatFilter('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5"><X size={11} /> Limpar</button>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Repeat size={14} className="text-blue-500" /> Minhas assinaturas
              <span className="text-gray-400 font-normal">{filteredSubs.length}</span>
            </h2>
            <button onClick={() => setExpModal({ type: 'fixed_monthly' })} className="text-xs text-[#A31621] hover:text-[#8B121C] flex items-center gap-1">
              <PlusCircle size={12} /> Adicionar
            </button>
          </div>
          {expLoading ? (
            <div className="py-10 text-center"><Loader2 size={18} className="animate-spin mx-auto text-gray-300" /></div>
          ) : filteredSubs.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#A31621]/5 flex items-center justify-center">
                <Repeat size={20} className="text-[#A31621]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Nenhuma assinatura ainda</p>
                <p className="text-xs text-gray-400 mt-1">Adicione as ferramentas e serviços que você paga todo mês.</p>
              </div>
              <button onClick={() => setExpModal({ type: 'fixed_monthly' })}
                className="flex items-center gap-2 bg-[#A31621] hover:bg-[#8B121C] text-white text-xs font-medium px-4 py-2 rounded-lg">
                <PlusCircle size={13} /> Adicionar primeira assinatura
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredSubs.map(e => (
                <SubscriptionCard key={e.id} expense={e}
                  onEdit={setExpModal} onDelete={handleDeleteExpense} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-56 shrink-0 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tag size={11} /> Por categoria</h3>
          {categoryTotals.length === 0 ? <p className="text-xs text-gray-300 text-center py-3">—</p> : (
            <div className="space-y-2.5">
              {categoryTotals.map(({ cat, total }) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                      <span className="text-xs font-bold shrink-0 ml-1" style={{ color: cat.color }}>{fmtBRL(total)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${monthlyTotal > 0 ? (total/monthlyTotal)*100 : 0}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#A31621]/5 border border-[#A31621]/10 rounded-xl p-4">
          <p className="text-xs font-bold text-[#A31621] mb-1">Dica</p>
          <p className="text-[11px] text-[#A31621]/70 leading-relaxed">
            Use "Pausar" para suspender temporariamente sem remover. A ferramenta some do total mas fica salva.
          </p>
        </div>
      </div>

      {expModal !== null && (
        <ExpenseModal expense={expModal?.id ? expModal : expModal} cards={cards} categories={categories}
          defaultType="fixed_monthly" ownerEmail={userEmail}
          onSave={handleSaveExpense} onClose={() => setExpModal(null)} />
      )}
    </div>
  )
}

// ── Main Finance component ────────────────────────────────────────────────────
export default function Finance({ user }) {
  const userEmail = user?.email ?? null
  const isAdmin   = ADMINS.includes(userEmail)

  const [activeTab, setActiveTab] = useState(isAdmin ? 'overview' : 'my_subs')

  const { data: cardsData,  refetch: refetchCards }               = useFinanceApi('/cards')
  const { data: catsData,   refetch: refetchCats }                = useFinanceApi('/categories')
  const { data: expData,    refetch: refetchExp, loading: expLoading } = useFinanceApi(
    isAdmin ? '/expenses' : null
  )

  // Fetch team members for responsibility attribution
  const [members, setMembers] = useState([])
  useEffect(() => {
    fetch('/api/kanban/members').then(r => r.json()).then(d => setMembers(d.members ?? [])).catch(() => {})
  }, [])

  const cards      = cardsData?.cards      ?? []
  const categories = catsData?.categories  ?? []
  const expenses   = expData?.expenses     ?? []
  const setupNeeded = cardsData?.setupNeeded || catsData?.setupNeeded || (isAdmin && expData?.setupNeeded)

  const [cardModal, setCardModal] = useState(null)
  const [expModal,  setExpModal]  = useState(null)
  const [catModal,  setCatModal]  = useState(null) // null=closed, {}=new, {id,...}=edit

  function refetchAll() { refetchCards(); refetchCats(); refetchExp?.() }

  async function handleSaveCard(form) {
    if (form.id) await financePut(`/cards/${form.id}`, form)
    else         await financePost('/cards', form)
    refetchCards(); setCardModal(null)
  }
  async function handleDeleteCard(id) {
    if (!window.confirm('Remover cartão?')) return
    await financeDelete(`/cards/${id}`); refetchAll()
  }
  async function handleSaveCategory(form) {
    if (form.id) await financePut(`/categories/${form.id}`, form)
    else         await financePost('/categories', form)
    refetchCats(); setCatModal(null)
  }
  async function handleSeedDefaults() {
    for (const cat of DEFAULT_CATEGORIES) await financePost('/categories', cat).catch(() => {})
    refetchCats()
  }
  async function handleDeleteCategory(id) {
    if (!window.confirm('Remover categoria?')) return
    await financeDelete(`/categories/${id}`); refetchAll()
  }
  async function handleSaveExpense(form) {
    const amount = form.type === 'refund'
      ? -Math.abs(parseFloat(String(form.amount).replace(',', '.')))
      : parseFloat(String(form.amount).replace(',', '.'))
    const payload = { ...form, amount }
    if (form.id) await financePut(`/expenses/${form.id}`, payload)
    else         await financePost('/expenses', payload)
    refetchExp(); setExpModal(null)
  }
  async function handleDeleteExpense(id) {
    if (!window.confirm('Remover?')) return
    await financeDelete(`/expenses/${id}`); refetchExp()
  }
  async function handleToggle(expense) {
    const next = expense.status === 'active' ? 'cancelled' : 'active'
    await financePut(`/expenses/${expense.id}`, { status: next })
    refetchExp()
  }
  function handleRefundExpense(expense) {
    setExpModal({
      description: `Reembolso: ${expense.description}`,
      amount:      String(expense.amount),
      type:        'refund',
      cardId:      expense.cardId      ?? '',
      categoryId:  expense.categoryId  ?? '',
      ownerEmail:  expense.ownerEmail  ?? null,
      notes:       `Reembolso referente a: ${expense.description}`,
      paidAt:      new Date().toISOString().slice(0, 10),
      status:      'active',
      refundOf:    expense.id,
    })
  }

  const TABS = [
    ...(isAdmin ? [{ id: 'overview', label: 'Visão Geral', icon: LayoutDashboard }] : []),
    { id: 'my_subs', label: 'Minhas Assinaturas', icon: Repeat },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#A31621] tracking-tight">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">{isAdmin ? 'Gestão financeira do projeto' : 'Controle das suas assinaturas'}</p>
        </div>
        {activeTab === 'overview' && isAdmin && (
          <button onClick={() => setExpModal({})}
            className="flex items-center gap-2 bg-[#A31621] hover:bg-[#8B121C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <PlusCircle size={15} /> Adicionar despesa
          </button>
        )}
      </div>

      {setupNeeded && <SetupGuide onRetry={refetchAll} errMsg={cardsData?._err ?? catsData?._err} />}

      {!setupNeeded && (
        <>
          {isAdmin && (
            <div className="flex gap-1 mb-6 border-b border-gray-200">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px ${
                    activeTab === id
                      ? 'border-[#A31621] text-[#A31621]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'overview' && isAdmin && (
            <AdminOverview
              cards={cards} categories={categories} expenses={expenses} expLoading={expLoading}
              members={members}
              onExpModal={setExpModal} onCardModal={setCardModal} onCatModal={setCatModal}
              onSeedDefaults={handleSeedDefaults} onDeleteCard={handleDeleteCard}
              onDeleteCategory={handleDeleteCategory} onDeleteExpense={handleDeleteExpense}
              onToggle={handleToggle} onRefundExpense={handleRefundExpense}
            />
          )}

          {activeTab === 'my_subs' && (
            <MySubscriptions userEmail={userEmail} cards={cards} categories={categories} />
          )}
        </>
      )}

      {cardModal !== null && (
        <CardModal card={cardModal?.id ? cardModal : null} onSave={handleSaveCard} onClose={() => setCardModal(null)} />
      )}
      {expModal !== null && (
        <ExpenseModal expense={expModal?.id ? expModal : expModal} cards={cards} categories={categories}
          members={members} isAdmin={isAdmin}
          onSave={handleSaveExpense} onClose={() => setExpModal(null)} />
      )}
      {catModal !== null && <CategoryModal category={catModal} onSave={handleSaveCategory} onClose={() => setCatModal(null)} />}
    </div>
  )
}
