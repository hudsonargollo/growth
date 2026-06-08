import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, PlusCircle, Trash2, Pencil, X, Check, AlertTriangle,
  Loader2, Tag, Repeat, ShoppingBag, Terminal, Copy, Receipt,
  Sparkles, Power, LayoutDashboard,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi, apiPost, apiPut, apiDelete } from '../hooks/useApi.js'
import { supabase } from '../lib/supabase.js'

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
}
const CARD_COLOR_OPTIONS = [
  { value: 'purple', label: 'Roxo'    },
  { value: 'blue',   label: 'Azul'    },
  { value: 'green',  label: 'Verde'   },
  { value: 'orange', label: 'Laranja' },
  { value: 'pink',   label: 'Rosa'    },
  { value: 'indigo', label: 'Índigo'  },
  { value: 'teal',   label: 'Teal'    },
  { value: 'gray',   label: 'Cinza'   },
]
const DEFAULT_CATEGORIES = [
  { name: 'SaaS / Ferramentas', color: '#6366f1' },
  { name: 'Cursos',             color: '#8b5cf6' },
  { name: 'Serviços',           color: '#10b981' },
  { name: 'Freelancers',        color: '#f59e0b' },
  { name: 'Marketing / Ads',    color: '#ec4899' },
  { name: 'Infraestrutura',     color: '#64748b' },
  { name: 'Outros',             color: '#94a3b8' },
]
const CAT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#3b82f6','#64748b','#0ea5e9','#14b8a6']
// Categories are identified by color — no emoji icons.

const SETUP_SQL = `-- Run once in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS financial_cards (
  id          text PRIMARY KEY,
  name        text NOT NULL DEFAULT '',
  "lastFour"  text DEFAULT '',
  brand       text DEFAULT '',
  color       text DEFAULT 'indigo',
  "isDefault" boolean DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS financial_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  color       text DEFAULT '#6366f1',
  icon        text DEFAULT '',
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
-- If tables already exist, add ownerEmail column:
ALTER TABLE financial_expenses ADD COLUMN IF NOT EXISTS "ownerEmail" text;
NOTIFY pgrst, 'reload schema';`

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBRL = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)

// ── Setup guide ───────────────────────────────────────────────────────────────
function SetupGuide({ onRetry }) {
  const [copied,    setCopied]    = useState(false)
  const [checking,  setChecking]  = useState(false)
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
      const res  = await fetch('/api/finance/ping')
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
          {Object.entries(pingResult).map(([tbl, res]) => (
            <div key={tbl} className="flex items-center gap-2 text-xs py-0.5">
              <span className={res.ok ? 'text-green-600' : 'text-red-600'}>{res.ok ? <Check size={12} /> : <X size={12} />}</span>
              <span className="font-mono text-amber-800">{tbl}</span>
              {!res.ok && <span className="text-red-600 truncate">{res.msg}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="p-5">
        <div className="rounded-xl overflow-hidden" style={{background:"#0d0d14"}}>
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

// ── Category badge ────────────────────────────────────────────────────────────
function CategoryBadge({ category, small = false }) {
  if (!category) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
      style={{ backgroundColor: `${category.color}18`, color: category.color }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />{category.name}
    </span>
  )
}

// ── Card chip ─────────────────────────────────────────────────────────────────
function CardChip({ card }) {
  if (!card) return null
  const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.indigo
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient}`}>
      <CreditCard size={9} /> {card.name}{card.lastFour ? ` •${card.lastFour}` : ''}
    </span>
  )
}

// ── Credit card visual ────────────────────────────────────────────────────────
function CardVisual({ card }) {
  const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.indigo
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
  const [form, setForm] = useState({ name: '', lastFour: '', brand: '', color: 'indigo', ...card })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true); setError(null)
    try { await onSave(form) } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Últimos 4 dígitos</label>
              <input value={form.lastFour} onChange={e => setForm(f => ({ ...f, lastFour: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                placeholder="1234" maxLength={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bandeira</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="Visa, Mastercard…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Category modal ────────────────────────────────────────────────────────────
function CategoryModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', color: '#6366f1', icon: '' })
  const [saving, setSaving] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Nova Categoria</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: form.color }} />
            <span className="text-sm font-semibold" style={{ color: form.color }}>{form.name || 'Nome da categoria'}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: SaaS, Cursos, Freelancers…" autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Expense modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ expense, cards, categories, defaultType = 'fixed_monthly', ownerEmail, onSave, onClose }) {
  const [form, setForm] = useState({
    description: '', amount: '', type: defaultType,
    cardId: '', categoryId: '', billingDay: '', paidAt: '', notes: '', status: 'active',
    ...expense,
    amount: expense?.amount ? String(expense.amount) : '',
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
        amount:     parseFloat(String(form.amount).replace(',', '.')),
        cardId:     form.cardId     || null,
        categoryId: form.categoryId || null,
        billingDay: form.billingDay ? parseInt(form.billingDay) : null,
        paidAt:     form.type === 'one_time' ? (form.paidAt || new Date().toISOString()) : null,
      })
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800">{expense?.id ? 'Editar' : 'Nova despesa'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
            {[
              { v: 'fixed_monthly', label: 'Assinatura', desc: 'recorrente mensal' },
              { v: 'one_time',      label: 'Avulso',     desc: 'compra única' },
            ].map(opt => (
              <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, type: opt.v }))}
                className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg text-xs font-medium transition-colors ${form.type === opt.v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {opt.label}
                <span className="text-[10px] text-gray-400 font-normal mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome / Descrição *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={form.type === 'fixed_monthly' ? 'Ex: Notion, ChatGPT Plus, Vercel…' : 'Ex: Curso de tráfego, Freelancer logo…'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" inputMode="decimal"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {form.type === 'fixed_monthly' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dia de cobrança</label>
                <input type="number" min="1" max="31" value={form.billingDay} onChange={e => setForm(f => ({ ...f, billingDay: e.target.value }))}
                  placeholder="Ex: 5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input type="date" value={form.paidAt ? form.paidAt.slice(0,10) : ''}
                  onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cartão</label>
              <select value={form.cardId} onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sem cartão</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.lastFour ? ` •${c.lastFour}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Link, conta, observação…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11}/>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving || !form.description.trim() || !form.amount}
              className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Subscription card ─────────────────────────────────────────────────────────
function SubscriptionCard({ expense, onEdit, onDelete, onToggle, showOwner = false }) {
  const active = expense.status === 'active'
  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col gap-3 transition-all ${active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
            {expense.description}
          </p>
          {expense.billingDay && (
            <p className="text-[10px] text-gray-400 mt-0.5">Todo dia {expense.billingDay}</p>
          )}
          {showOwner && expense.ownerEmail && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{expense.ownerEmail}</p>
          )}
        </div>
        <span className="text-base font-bold text-gray-900 shrink-0">{fmtBRL(expense.amount)}<span className="text-xs font-normal text-gray-400">/mês</span></span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {expense.category && <CategoryBadge category={expense.category} small />}
        {expense.card && <CardChip card={expense.card} />}
      </div>

      {expense.notes && <p className="text-[11px] text-gray-400 truncate">{expense.notes}</p>}

      <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
        <button onClick={() => onToggle(expense)}
          title={active ? 'Pausar' : 'Ativar'}
          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors font-medium ${active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
          <Power size={10} /> {active ? 'Pausar' : 'Ativar'}
        </button>
        <button onClick={() => onEdit(expense)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <Pencil size={10} /> Editar
        </button>
        <button onClick={() => onDelete(expense.id)} className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ── Admin finance overview ────────────────────────────────────────────────────
function AdminOverview({ cards, categories, expenses, expLoading, onExpModal, onCardModal, onCatModal, onSeedDefaults, onDeleteCard, onDeleteCategory, onDeleteExpense, onToggle, refetchAll, refetchCards, refetchCats, refetchExp }) {
  const [catFilter,  setCatFilter]  = useState('')
  const [cardFilter, setCardFilter] = useState('')
  const [showPaused, setShowPaused] = useState(false)

  const subscriptions   = useMemo(() => expenses.filter(e => e.type === 'fixed_monthly'), [expenses])
  const oneTimeBuys     = useMemo(() => expenses.filter(e => e.type === 'one_time'), [expenses])
  const activeSubs      = subscriptions.filter(e => e.status === 'active')
  const monthlyTotal    = activeSubs.reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const filteredSubs = useMemo(() => {
    let list = showPaused ? subscriptions : activeSubs
    if (catFilter)  list = list.filter(e => e.categoryId === catFilter  || e.category?.id === catFilter)
    if (cardFilter) list = list.filter(e => e.cardId === cardFilter || e.card?.id === cardFilter)
    return list
  }, [subscriptions, activeSubs, showPaused, catFilter, cardFilter])

  const filteredBuys = useMemo(() => {
    let list = oneTimeBuys
    if (catFilter)  list = list.filter(e => e.categoryId === catFilter  || e.category?.id === catFilter)
    if (cardFilter) list = list.filter(e => e.cardId === cardFilter || e.card?.id === cardFilter)
    return list
  }, [oneTimeBuys, catFilter, cardFilter])

  const categoryTotals = useMemo(() => {
    const map = {}
    for (const e of activeSubs) {
      const key = e.category?.id ?? '__none'
      const cat = e.category ?? { id: '__none', name: 'Sem categoria', color: '#94a3b8', icon: '' }
      if (!map[key]) map[key] = { cat, total: 0, count: 0 }
      map[key].total += Number(e.amount ?? 0)
      map[key].count++
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [activeSubs])

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Total mensal</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(monthlyTotal)}</p>
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
            <p className="text-xs text-gray-400 mt-1">{fmtBRL(oneTimeBuys.reduce((s,e) => s + Number(e.amount??0), 0))} no total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={cardFilter} onChange={e => setCardFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os cartões</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.lastFour ? ` •${c.lastFour}` : ''}</option>)}
          </select>
          <button onClick={() => setShowPaused(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showPaused ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            <Power size={11} /> {showPaused ? 'Esconder pausadas' : 'Ver pausadas'}
          </button>
          {(catFilter || cardFilter) && (
            <button onClick={() => { setCatFilter(''); setCardFilter('') }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5">
              <X size={11} /> Limpar filtros
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
            <button onClick={() => onExpModal({ type: 'fixed_monthly' })}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <PlusCircle size={12} /> Adicionar
            </button>
          </div>
          {expLoading ? (
            <div className="py-10 text-center"><Loader2 size={18} className="animate-spin mx-auto text-gray-300" /></div>
          ) : filteredSubs.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-10 text-center">
              <Repeat size={24} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhuma assinatura ainda</p>
              <button onClick={() => onExpModal({ type: 'fixed_monthly' })} className="mt-2 text-xs text-indigo-600 hover:underline">Adicionar primeira</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredSubs.map(e => (
                <SubscriptionCard key={e.id} expense={e} showOwner
                  onEdit={onExpModal} onDelete={onDeleteExpense} onToggle={onToggle} />
              ))}
            </div>
          )}
        </div>

        {/* One-time purchases */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ShoppingBag size={14} className="text-purple-500" /> Compras avulsas
              <span className="text-gray-400 font-normal">{filteredBuys.length}</span>
            </h2>
            <button onClick={() => onExpModal({ type: 'one_time' })}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
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
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Cartão</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Valor</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuys.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{e.description}</p>
                        {e.ownerEmail && <p className="text-[10px] text-gray-400 truncate">{e.ownerEmail}</p>}
                        {e.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><CategoryBadge category={e.category} /></td>
                      <td className="px-4 py-3">{e.card ? <CardChip card={e.card} /> : <span className="text-xs text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{e.paidAt ? new Date(e.paidAt).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">{fmtBRL(e.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onExpModal(e)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600"><Pencil size={12} /></button>
                          <button onClick={() => onDeleteExpense(e.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 shrink-0 space-y-4">
        {/* By category */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag size={11} /> Por categoria
          </h3>
          {categoryTotals.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-3">—</p>
          ) : (
            <div className="space-y-2.5">
              {categoryTotals.map(({ cat, total }) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                      <span className="text-xs font-bold shrink-0 ml-1" style={{ color: cat.color }}>{fmtBRL(total)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${monthlyTotal > 0 ? (total / monthlyTotal) * 100 : 0}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cards management */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={11} /> Cartões
            </h3>
            <button onClick={() => onCardModal({})} className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
              <PlusCircle size={11} /> Novo
            </button>
          </div>
          {cards.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-3">Nenhum cartão</p>
          ) : (
            <div className="space-y-2">
              {cards.map(card => {
                const n = expenses.filter(e => e.cardId === card.id || e.card?.id === card.id).length
                const gradient = CARD_GRADIENTS[card.color] ?? CARD_GRADIENTS.indigo
                return (
                  <div key={card.id} className="flex items-center gap-2 group">
                    <div className={`w-8 h-5 rounded bg-gradient-to-r ${gradient} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{card.name}</p>
                      <p className="text-[10px] text-gray-400">{n} despesa{n !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onCardModal(card)} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-indigo-500"><Pencil size={10} /></button>
                      <button onClick={() => onDeleteCard(card.id)} className="p-1 hover:bg-red-50 rounded text-gray-200 hover:text-red-400"><Trash2 size={10} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Categories management */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={11} /> Categorias
            </h3>
            <div className="flex gap-1">
              {categories.length === 0 && (
                <button onClick={onSeedDefaults} className="text-[11px] text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5" title="Criar padrões">
                  <Sparkles size={11} />
                </button>
              )}
              <button onClick={() => onCatModal(true)} className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                <PlusCircle size={11} /> Nova
              </button>
            </div>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-gray-300">Nenhuma categoria</p>
              <button onClick={onSeedDefaults} className="text-[11px] text-indigo-500 hover:underline mt-1">Criar padrões</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 group">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: cat.color }}>{cat.name}</span>
                  <button onClick={() => onDeleteCategory(cat.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-gray-200 hover:text-red-400 transition-all">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── My subscriptions (per-user tab) ───────────────────────────────────────────
function MySubscriptions({ userEmail, cards, categories }) {
  const qs = userEmail ? `?ownerEmail=${encodeURIComponent(userEmail)}` : ''
  const { data: expData, refetch: refetchExp, loading: expLoading } = useApi(`/finance/expenses${qs}`, [userEmail])

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
      const cat = e.category ?? { id: '__none', name: 'Sem categoria', color: '#94a3b8', icon: '' }
      if (!map[key]) map[key] = { cat, total: 0, count: 0 }
      map[key].total += Number(e.amount ?? 0)
      map[key].count++
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [activeSubs])

  async function handleSaveExpense(form) {
    if (form.id) await apiPut(`/finance/expenses/${form.id}`, form)
    else         await apiPost('/finance/expenses', form)
    refetchExp(); setExpModal(null)
  }
  async function handleDeleteExpense(id) {
    if (!window.confirm('Remover?')) return
    await apiDelete(`/finance/expenses/${id}`); refetchExp()
  }
  async function handleToggle(expense) {
    const next = expense.status === 'active' ? 'cancelled' : 'active'
    await apiPut(`/finance/expenses/${expense.id}`, { status: next })
    refetchExp()
  }

  return (
    <div className="flex gap-6">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Total mensal</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(monthlyTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">{activeSubs.length} assinatura{activeSubs.length !== 1 ? 's' : ''} ativa{activeSubs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 mb-1">Projeção anual</p>
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(monthlyTotal * 12)}</p>
            <p className="text-xs text-gray-400 mt-1">só fixos mensais</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowPaused(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showPaused ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}>
            <Power size={11} /> {showPaused ? 'Esconder pausadas' : 'Ver pausadas'}
          </button>
          {catFilter && (
            <button onClick={() => setCatFilter('')}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5">
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        {/* Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Repeat size={14} className="text-blue-500" /> Minhas assinaturas
              <span className="text-gray-400 font-normal">{filteredSubs.length}</span>
            </h2>
            <button onClick={() => setExpModal({ type: 'fixed_monthly' })}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <PlusCircle size={12} /> Adicionar
            </button>
          </div>

          {expLoading ? (
            <div className="py-10 text-center"><Loader2 size={18} className="animate-spin mx-auto text-gray-300" /></div>
          ) : filteredSubs.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Repeat size={20} className="text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Nenhuma assinatura ainda</p>
                <p className="text-xs text-gray-400 mt-1">Adicione as ferramentas e serviços que você paga todo mês.</p>
              </div>
              <button onClick={() => setExpModal({ type: 'fixed_monthly' })}
                className="btn-primary">
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

      {/* Right sidebar — category breakdown only */}
      <div className="w-56 shrink-0 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag size={11} /> Por categoria
          </h3>
          {categoryTotals.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-3">—</p>
          ) : (
            <div className="space-y-2.5">
              {categoryTotals.map(({ cat, total }) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                      <span className="text-xs font-bold shrink-0 ml-1" style={{ color: cat.color }}>{fmtBRL(total)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${monthlyTotal > 0 ? (total / monthlyTotal) * 100 : 0}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hint box */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">Dica</p>
          <p className="text-[11px] text-indigo-500 leading-relaxed">
            Use "Pausar" para suspender temporariamente sem remover. A ferramenta some do total mensal mas fica salva.
          </p>
        </div>
      </div>

      {expModal !== null && (
        <ExpenseModal
          expense={expModal?.id ? expModal : expModal}
          cards={cards}
          categories={categories}
          defaultType="fixed_monthly"
          ownerEmail={userEmail}
          onSave={handleSaveExpense}
          onClose={() => setExpModal(null)}
        />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Finance() {
  const [userEmail, setUserEmail] = useState(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
      setUserLoading(false)
    })
  }, [])

  const isAdmin    = ADMINS.includes(userEmail)
  const [activeTab, setActiveTab] = useState(null)

  // Set default tab once we know the user's role
  useEffect(() => {
    if (!userLoading && activeTab === null) {
      setActiveTab(isAdmin ? 'overview' : 'my_subs')
    }
  }, [userLoading, isAdmin, activeTab])

  // ── Shared data fetches
  const { data: cardsData,  refetch: refetchCards }               = useApi('/finance/cards')
  const { data: catsData,   refetch: refetchCats }                = useApi('/finance/categories')
  // Admin fetches all; non-admin path handled inside MySubscriptions
  const { data: expData,    refetch: refetchExp, loading: expLoading } = useApi(
    isAdmin ? '/finance/expenses' : null
  )

  const cards      = cardsData?.cards      ?? []
  const categories = catsData?.categories  ?? []
  const expenses   = expData?.expenses     ?? []
  const setupNeeded = cardsData?.setupNeeded || catsData?.setupNeeded || (isAdmin && expData?.setupNeeded)

  const [cardModal, setCardModal] = useState(null)
  const [expModal,  setExpModal]  = useState(null)
  const [catModal,  setCatModal]  = useState(false)

  function refetchAll() { refetchCards(); refetchCats(); refetchExp?.() }

  // ── CRUD (admin)
  async function handleSaveCard(form) {
    if (form.id) await apiPut(`/finance/cards/${form.id}`, form)
    else         await apiPost('/finance/cards', form)
    refetchCards(); setCardModal(null)
  }
  async function handleDeleteCard(id) {
    if (!window.confirm('Remover cartão?')) return
    await apiDelete(`/finance/cards/${id}`); refetchAll()
  }
  async function handleSaveCategory(form) {
    await apiPost('/finance/categories', form)
    refetchCats(); setCatModal(false)
  }
  async function handleSeedDefaults() {
    for (const cat of DEFAULT_CATEGORIES) await apiPost('/finance/categories', cat).catch(() => {})
    refetchCats()
  }
  async function handleDeleteCategory(id) {
    if (!window.confirm('Remover categoria?')) return
    await apiDelete(`/finance/categories/${id}`); refetchAll()
  }
  async function handleSaveExpense(form) {
    if (form.id) await apiPut(`/finance/expenses/${form.id}`, form)
    else         await apiPost('/finance/expenses', form)
    refetchExp(); setExpModal(null)
  }
  async function handleDeleteExpense(id) {
    if (!window.confirm('Remover?')) return
    await apiDelete(`/finance/expenses/${id}`); refetchExp()
  }
  async function handleToggle(expense) {
    const next = expense.status === 'active' ? 'cancelled' : 'active'
    await apiPut(`/finance/expenses/${expense.id}`, { status: next })
    refetchExp()
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    )
  }

  const TABS = [
    ...(isAdmin ? [{ id: 'overview', label: 'Visão Geral', icon: LayoutDashboard }] : []),
    { id: 'my_subs', label: 'Minhas Assinaturas', icon: Repeat },
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader
        overline="Sistema"
        title="Financeiro"
        description={isAdmin ? 'Gestão financeira do projeto' : 'Controle das suas assinaturas'}
        action={
          activeTab === 'overview' ? (
            <button onClick={() => setExpModal({})}
              className="btn-primary">
              <PlusCircle size={15} /> Adicionar despesa
            </button>
          ) : null
        }
      />

      {setupNeeded && <SetupGuide onRetry={refetchAll} />}

      {!setupNeeded && (
        <>
          {/* Tab bar — only show if admin (has multiple tabs) */}
          {isAdmin && (
            <div className="flex gap-1 mb-6 border-b border-gray-200 -mt-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'overview' && isAdmin && (
            <AdminOverview
              cards={cards}
              categories={categories}
              expenses={expenses}
              expLoading={expLoading}
              onExpModal={setExpModal}
              onCardModal={setCardModal}
              onCatModal={setCatModal}
              onSeedDefaults={handleSeedDefaults}
              onDeleteCard={handleDeleteCard}
              onDeleteCategory={handleDeleteCategory}
              onDeleteExpense={handleDeleteExpense}
              onToggle={handleToggle}
              refetchAll={refetchAll}
              refetchCards={refetchCards}
              refetchCats={refetchCats}
              refetchExp={refetchExp}
            />
          )}

          {activeTab === 'my_subs' && (
            <MySubscriptions
              userEmail={userEmail}
              cards={cards}
              categories={categories}
            />
          )}
        </>
      )}

      {/* Admin modals */}
      {cardModal !== null && (
        <CardModal card={cardModal?.id ? cardModal : null} onSave={handleSaveCard} onClose={() => setCardModal(null)} />
      )}
      {expModal !== null && (
        <ExpenseModal
          expense={expModal?.id ? expModal : expModal}
          cards={cards}
          categories={categories}
          onSave={handleSaveExpense}
          onClose={() => setExpModal(null)}
        />
      )}
      {catModal && (
        <CategoryModal onSave={handleSaveCategory} onClose={() => setCatModal(false)} />
      )}
    </div>
  )
}
