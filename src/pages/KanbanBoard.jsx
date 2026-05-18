// KanbanBoard

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Calendar, Trash2, Check, Pencil, ChevronRight, Users2, LayoutGrid, AlertCircle, Loader2 } from 'lucide-react'

// ── Config ────────────────────────────────────────────────────────────────────

const API = ''  // same origin — worker serves both app and API

const COLUMNS = [
  { id: 'backlog',    title: 'Backlog',      color: '#94a3b8' },
  { id: 'todo',       title: 'A Fazer',      color: '#6366f1' },
  { id: 'inprogress', title: 'Em Andamento', color: '#f59e0b' },
  { id: 'review',     title: 'Em Revisão',   color: '#8b5cf6' },
  { id: 'done',       title: 'Concluído',    color: '#10b981' },
]

const PRIORITY = {
  low:    { label: 'Baixa',  bg: 'bg-gray-100',  text: 'text-gray-500',  dot: 'bg-gray-300'  },
  medium: { label: 'Média',  bg: 'bg-amber-50',  text: 'text-amber-600', dot: 'bg-amber-400' },
  high:   { label: 'Alta',   bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-500'   },
}

const COLORS = ['#A31621','#1877F2','#10A37F','#F48120','#7C3AED','#25D366','#E37400','#4A154B','#0F9D58','#CC785C']

function uid() { return Math.random().toString(36).slice(2,10) }
function today() { return new Date().toISOString().slice(0,10) }

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, size = 6 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 0
  const sz = size <= 6 ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: `hsl(${hue},55%,45%)` }} title={name}>
      {initials}
    </div>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] ?? PRIORITY.low
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.bg} ${p.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  )
}

// ── Card Modal ────────────────────────────────────────────────────────────────

function CardModal({ card, clients, members, onSave, onDelete, onClose }) {
  const [d, setD] = useState({ ...card })
  const set = (k, v) => setD(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Editar Card</span>
          <div className="flex gap-2">
            <button onClick={() => { if (window.confirm('Excluir este card?')) { onDelete(card.id); onClose() } }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Título</label>
            <input value={d.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-[#A31621]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea value={d.description ?? ''} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Detalhes da tarefa…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Coluna</label>
              <select value={d.columnId} onChange={e => set('columnId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621]">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Prioridade</label>
              <select value={d.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621]">
                {Object.entries(PRIORITY).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cliente</label>
              <select value={d.clientId ?? ''} onChange={e => set('clientId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621]">
                <option value="">— Nenhum —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Responsável</label>
              <select value={d.assignee ?? ''} onChange={e => set('assignee', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621]">
                <option value="">— Nenhum —</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Prazo</label>
            <input type="date" value={d.dueDate ?? ''} onChange={e => set('dueDate', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#A31621]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Etiqueta</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => set('labelColor', null)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!d.labelColor ? 'border-gray-500' : 'border-gray-200'}`}>
                <X size={10} className="text-gray-400" />
              </button>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('labelColor', c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${d.labelColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => { onSave(d); onClose() }}
            className="flex items-center gap-2 px-5 py-2 bg-[#A31621] text-white text-sm font-bold rounded-xl hover:bg-[#8B121C]">
            <Check size={14} /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ card, clients, onEdit, onDragStart, onDragEnd, isDragging }) {
  const isOverdue = card.dueDate && card.dueDate < today() && card.columnId !== 'done'
  const client = clients.find(c => c.id === card.clientId)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(card.id) }}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(card)}
      className={`bg-white border rounded-xl p-3.5 cursor-pointer select-none transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-95 shadow-none' : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {card.labelColor && <div className="h-1 rounded-full mb-3" style={{ backgroundColor: card.labelColor }} />}
      <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">{card.title}</p>
      {card.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{card.description}</p>}
      {client && (
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: client.color + '18', color: client.color }}>
          {client.name}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 mt-1">
        <PriorityBadge priority={card.priority} />
        <div className="flex items-center gap-1.5">
          {card.dueDate && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Calendar size={10} />
              {new Date(card.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {card.assignee && <Avatar name={card.assignee} />}
        </div>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ col, cards, clients, onAdd, onEdit, onDragStart, onDragEnd, onDrop, isOver, setOver, draggingId }) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{col.title}</span>
          <span className="text-xs font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded-full">{cards.length}</span>
        </div>
        <button onClick={() => onAdd(col.id)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
          <Plus size={14} />
        </button>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setOver(col.id) }}
        onDragLeave={() => setOver(null)}
        onDrop={() => { onDrop(col.id); setOver(null) }}
        className={`flex-1 min-h-28 rounded-2xl p-2 space-y-2.5 transition-colors duration-150 ${
          isOver ? 'bg-[#A31621]/5 ring-2 ring-[#A31621]/20' : 'bg-gray-100/60'
        }`}
      >
        {cards.map(card => (
          <KanbanCard key={card.id} card={card} clients={clients}
            onEdit={onEdit} onDragStart={onDragStart} onDragEnd={onDragEnd}
            isDragging={draggingId === card.id} />
        ))}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-300 font-medium">Arraste cards aqui</div>
        )}
      </div>
    </div>
  )
}

// ── Board View (shared by master + per-client) ────────────────────────────────

function BoardView({ cards, clients, members, activeClientId, onCardsChange, onAddClient }) {
  const [editingCard, setEditingCard] = useState(null)
  const [draggingId,  setDraggingId]  = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [saving,      setSaving]      = useState(false)

  // Filter cards to active client (null = all)
  const visibleCards = activeClientId
    ? cards.filter(c => c.clientId === activeClientId)
    : cards

  const totalActive = visibleCards.filter(c => c.columnId !== 'done').length
  const totalDone   = visibleCards.filter(c => c.columnId === 'done').length
  const overdue     = visibleCards.filter(c => c.dueDate && c.dueDate < today() && c.columnId !== 'done').length
  const activeClient = clients.find(c => c.id === activeClientId)

  async function addCard(columnId) {
    const card = {
      columnId,
      title:       'Nova tarefa',
      description: '',
      priority:    'medium',
      clientId:    activeClientId ?? (clients[0]?.id ?? ''),
      assignee:    '',
      dueDate:     '',
      labelColor:  null,
    }
    setSaving(true)
    try {
      const { card: saved } = await apiFetch('/api/kanban/cards', { method: 'POST', body: card })
      onCardsChange(prev => [...prev, saved])
      setEditingCard(saved)
    } finally { setSaving(false) }
  }

  async function saveCard(updated) {
    setSaving(true)
    try {
      await apiFetch(`/api/kanban/cards/${updated.id}`, { method: 'PUT', body: updated })
      onCardsChange(prev => prev.map(c => c.id === updated.id ? updated : c))
    } finally { setSaving(false) }
  }

  async function deleteCard(id) {
    setSaving(true)
    try {
      await apiFetch(`/api/kanban/cards/${id}`, { method: 'DELETE' })
      onCardsChange(prev => prev.filter(c => c.id !== id))
    } finally { setSaving(false) }
  }

  async function handleDrop(targetColId) {
    if (!draggingId) return
    const card = cards.find(c => c.id === draggingId)
    if (!card || card.columnId === targetColId) { setDraggingId(null); return }
    const updated = { ...card, columnId: targetColId }
    onCardsChange(prev => prev.map(c => c.id === draggingId ? updated : c))
    setDraggingId(null)
    await apiFetch(`/api/kanban/cards/${draggingId}`, { method: 'PUT', body: updated }).catch(() => {})
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            {activeClient && (
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeClient.color }} />
            )}
            <h1 className="text-2xl font-extrabold text-[#A31621] tracking-tight">
              {activeClient ? activeClient.name : 'Todos os Clientes'}
            </h1>
            {saving && <Loader2 size={14} className="text-gray-400 animate-spin" />}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {totalActive} ativas · {totalDone} concluídas
            {overdue > 0 && <span className="text-red-500 font-semibold"> · {overdue} atrasadas</span>}
          </p>
        </div>
        <button onClick={() => addCard('todo')}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#A31621] hover:bg-[#8B121C] rounded-lg px-4 py-2.5 transition-colors self-start sm:self-auto">
          <Plus size={13} /> Nova Tarefa
        </button>
      </div>

      {/* Columns */}
      <div className="flex gap-5 overflow-x-auto pb-6 flex-1" style={{ minHeight: 0 }}>
        {COLUMNS.map(col => (
          <KanbanColumn key={col.id} col={col}
            cards={visibleCards.filter(c => c.columnId === col.id)}
            clients={clients}
            onAdd={addCard}
            onEdit={setEditingCard}
            onDragStart={setDraggingId}
            onDragEnd={() => setDraggingId(null)}
            onDrop={handleDrop}
            isOver={dragOverCol === col.id}
            setOver={setDragOverCol}
            draggingId={draggingId}
          />
        ))}
      </div>

      {editingCard && (
        <CardModal card={editingCard} clients={clients} members={members}
          onSave={saveCard} onDelete={deleteCard} onClose={() => setEditingCard(null)} />
      )}
    </div>
  )
}

// ── Client Sidebar ────────────────────────────────────────────────────────────

function ClientSidebar({ clients, activeClientId, onSelect, onAdd, onDelete, onRename }) {
  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const [newColor,    setNewColor]    = useState(COLORS[0])
  const [renamingId,  setRenamingId]  = useState(null)
  const [renameVal,   setRenameVal]   = useState('')

  function submitAdd() {
    const name = newName.trim()
    if (!name) return
    onAdd(name, newColor)
    setNewName(''); setAdding(false)
  }

  function submitRename(id) {
    const name = renameVal.trim()
    if (name) onRename(id, name)
    setRenamingId(null)
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-1 pr-4 border-r border-gray-200">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Clientes</p>

      {/* All clients */}
      <button onClick={() => onSelect(null)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
          !activeClientId ? 'bg-[#A31621] text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}>
        <LayoutGrid size={14} />
        Todos
      </button>

      {/* Per-client */}
      {clients.map(client => (
        <div key={client.id} className="group relative">
          {renamingId === client.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitRename(client.id); if (e.key === 'Escape') setRenamingId(null) }}
                className="flex-1 text-xs border border-[#A31621]/40 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#A31621]" />
              <button onClick={() => submitRename(client.id)} className="p-1 text-green-600"><Check size={11} /></button>
              <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400"><X size={11} /></button>
            </div>
          ) : (
            <button onClick={() => onSelect(client.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeClientId === client.id ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={activeClientId === client.id ? { backgroundColor: client.color } : {}}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: client.color }} />
              <span className="flex-1 text-left truncate">{client.name}</span>
              {/* Actions on hover */}
              <span className="hidden group-hover:flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setRenamingId(client.id); setRenameVal(client.name) }}
                  className={`p-0.5 rounded hover:bg-black/10 ${activeClientId === client.id ? 'text-white/70' : 'text-gray-400'}`}>
                  <Pencil size={10} />
                </button>
                <button onClick={() => { if (window.confirm(`Excluir "${client.name}" e todos os seus cards?`)) onDelete(client.id) }}
                  className={`p-0.5 rounded hover:bg-black/10 ${activeClientId === client.id ? 'text-white/70' : 'text-gray-400'}`}>
                  <Trash2 size={10} />
                </button>
              </span>
            </button>
          )}
        </div>
      ))}

      {/* Add client */}
      {adding ? (
        <div className="mt-2 px-2 space-y-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Nome do cliente"
            className="w-full text-xs border border-[#A31621]/40 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#A31621]" />
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${newColor === c ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={submitAdd} className="flex-1 text-xs font-bold bg-[#A31621] text-white rounded-lg py-1.5 hover:bg-[#8B121C]">Adicionar</button>
            <button onClick={() => setAdding(false)} className="px-2 text-xs text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">✕</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-[#A31621] hover:bg-gray-100 transition-colors mt-1">
          <Plus size={13} /> Novo Cliente
        </button>
      )}
    </aside>
  )
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────

export default function KanbanBoard({ members: teamMembers = [] }) {
  const [clients,         setClients]         = useState([])
  const [cards,           setCards]           = useState([])
  const [members,         setMembers]         = useState([])
  const [activeClientId,  setActiveClientId]  = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)

  // Load everything from KV on mount
  useEffect(() => {
    async function load() {
      try {
        const [{ clients: cls }, { cards: cds }, { members: mbs }] = await Promise.all([
          apiFetch('/api/kanban/clients'),
          apiFetch('/api/kanban/cards'),
          apiFetch('/api/kanban/members'),
        ])
        setClients(cls)
        setCards(cds)
        // Merge KV members with any passed-in team members (KV is source of truth)
        setMembers(mbs.length ? mbs : teamMembers)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function addClient(name, color) {
    try {
      const { client } = await apiFetch('/api/kanban/clients', { method: 'POST', body: { name, color } })
      setClients(prev => [...prev, client])
      setActiveClientId(client.id)
    } catch (e) { alert('Erro ao criar cliente: ' + e.message) }
  }

  async function deleteClient(id) {
    try {
      await apiFetch(`/api/kanban/clients/${id}`, { method: 'DELETE' })
      setClients(prev => prev.filter(c => c.id !== id))
      setCards(prev => prev.filter(c => c.clientId !== id))
      if (activeClientId === id) setActiveClientId(null)
    } catch (e) { alert('Erro ao excluir cliente: ' + e.message) }
  }

  async function renameClient(id, name) {
    try {
      await apiFetch(`/api/kanban/clients/${id}`, { method: 'PUT', body: { name } })
      setClients(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    } catch (e) { alert('Erro ao renomear: ' + e.message) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm font-medium">Carregando kanban…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        <div>
          <p className="font-bold">Erro ao carregar dados</p>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 0 }}>
      <ClientSidebar
        clients={clients}
        activeClientId={activeClientId}
        onSelect={setActiveClientId}
        onAdd={addClient}
        onDelete={deleteClient}
        onRename={renameClient}
      />
      <div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: 0 }}>
        <BoardView
          cards={cards}
          clients={clients}
          members={members}
          activeClientId={activeClientId}
          onCardsChange={setCards}
          onAddClient={addClient}
        />
      </div>
    </div>
  )
}
