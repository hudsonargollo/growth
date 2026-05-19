import { useState, useEffect, useRef } from 'react'
import {
  Wand2, FileText, Plus, Trash2, ChevronUp, ChevronDown,
  Pencil, RefreshCw, Copy, Check, GripVertical, X,
  Loader2, BookTemplate, Package, Eye, EyeOff, Clock,
  ChevronRight, Layers,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApi, apiPost, timeAgo } from '../hooks/useApi.js'

const SECTION_TYPES = [
  { value: 'intro',      label: 'Abertura',     color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'product',    label: 'Produto',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'comparison', label: 'Comparação',    color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'pros_cons',  label: 'Prós/Contras',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'demo',       label: 'Demo',          color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'verdict',    label: 'Veredicto',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'cta',        label: 'CTA',           color: 'bg-rose-100 text-rose-700 border-rose-200' },
]

const typeColor = (type) =>
  SECTION_TYPES.find((t) => t.value === type)?.color ?? 'bg-gray-100 text-gray-600 border-gray-200'

const typeLabel = (type) =>
  SECTION_TYPES.find((t) => t.value === type)?.label ?? type

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ── Blueprint Editor ──────────────────────────────────────────────────────────

function SectionRow({ section, index, total, onChange, onRemove, onMove }) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex flex-col gap-0.5 pt-2.5">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex-1 border border-gray-200 rounded-lg p-3 bg-white space-y-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={section.type}
            onChange={(e) => onChange(index, { ...section, type: e.target.value })}
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${typeColor(section.type)}`}
            style={{ background: 'transparent' }}
          >
            {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="text"
            value={section.label}
            onChange={(e) => onChange(index, { ...section, label: e.target.value })}
            className="flex-1 min-w-0 text-sm font-medium text-gray-800 border-0 focus:outline-none bg-transparent truncate"
            placeholder="Nome da seção"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Clock size={11} />
            <input
              type="number"
              value={section.duration}
              onChange={(e) => onChange(index, { ...section, duration: parseInt(e.target.value) || 60 })}
              className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              min={10}
              max={600}
            />
            <span>s</span>
          </div>
        </div>
        <input
          type="text"
          value={section.instructions}
          onChange={(e) => onChange(index, { ...section, instructions: e.target.value })}
          className="w-full text-xs text-gray-500 border-0 focus:outline-none bg-transparent"
          placeholder="Instruções específicas para a IA nesta seção (opcional)"
        />
      </div>

      <button
        onClick={() => onRemove(index)}
        className="mt-2.5 p-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function BlueprintEditor({ blueprint, onChange }) {
  const sections = blueprint.sections ?? []
  const totalDuration = sections.reduce((s, sec) => s + (sec.duration ?? 60), 0)

  function updateSection(idx, updated) {
    const next = [...sections]
    next[idx] = updated
    onChange({ ...blueprint, sections: next })
  }

  function removeSection(idx) {
    onChange({ ...blueprint, sections: sections.filter((_, i) => i !== idx) })
  }

  function moveSection(idx, dir) {
    const next = [...sections]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange({ ...blueprint, sections: next })
  }

  function addSection(type = 'product') {
    const count = sections.filter((s) => s.type === type).length
    onChange({
      ...blueprint,
      sections: [
        ...sections,
        { id: uid(), type, label: `${typeLabel(type)} #${count + 1}`, duration: 90, instructions: '' },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <input
            type="text"
            value={blueprint.name}
            onChange={(e) => onChange({ ...blueprint, name: e.target.value })}
            className="font-semibold text-gray-800 text-base border-0 focus:outline-none bg-transparent w-full"
            placeholder="Nome do blueprint"
          />
          <input
            type="text"
            value={blueprint.description}
            onChange={(e) => onChange({ ...blueprint, description: e.target.value })}
            className="text-xs text-gray-400 border-0 focus:outline-none bg-transparent w-full"
            placeholder="Descrição (opcional)"
          />
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap">
          <Clock size={11} className="inline mr-1" />
          ~{Math.round(totalDuration / 60)} min · {sections.length} seções
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((sec, i) => (
          <SectionRow
            key={sec.id ?? i}
            section={sec}
            index={i}
            total={sections.length}
            onChange={updateSection}
            onRemove={removeSection}
            onMove={moveSection}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => addSection(t.value)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 border border-dashed border-gray-200 hover:border-indigo-300 px-2 py-1 rounded-lg transition-colors"
          >
            <Plus size={11} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Product Picker ─────────────────────────────────────────────────────────────

function ProductPicker({ selected, onToggle }) {
  const { data } = useApi('/mining/catalog')
  const products = data?.products ?? []
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{selected.length} produto{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}</p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto…"
          className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="col-span-2 text-center text-xs text-gray-400 py-6">
            {products.length === 0 ? 'Nenhum produto no catálogo — execute uma mineração primeiro' : 'Nenhum produto encontrado'}
          </div>
        )}
        {filtered.map((p) => {
          const active = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                active
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-200 bg-white'
              }`}
            >
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                : <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>
              }
              <div className="overflow-hidden">
                <p className="font-medium text-gray-700 truncate leading-tight">{p.title}</p>
                <p className="text-gray-400">
                  {p.price ? `R$${Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  {p.rating ? ` · ${p.rating}★` : ''}
                </p>
              </div>
              {active && <Check size={12} className="ml-auto text-indigo-600 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section Viewer Card ───────────────────────────────────────────────────────

function SectionCard({ section, index, scriptId, onUpdate }) {
  const [open, setOpen]           = useState(true)
  const [editing, setEditing]     = useState(false)
  const [content, setContent]     = useState(section.content ?? '')
  const [regen, setRegen]         = useState(false)
  const [regenInstr, setRegenInstr] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [saving, setSaving]       = useState(false)

  async function handleRegenerate() {
    setRegen(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/sections/${index}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: regenInstr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      const updatedSection = data.sections?.[index]
      if (updatedSection) {
        setContent(updatedSection.content ?? '')
        onUpdate(data)
      }
      setShowRegenInput(false)
      setRegenInstr('')
    } catch (e) {
      alert(e.message)
    } finally {
      setRegen(false)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionIndex: index, content }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEditing(false)
    } catch {
      // If PATCH not supported, just update local state
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(section.content ?? content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? 'border-gray-200' : 'border-gray-100'}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColor(section.type)}`}>
          {typeLabel(section.type)}
        </span>
        <span className="font-medium text-gray-800 text-sm flex-1">{section.label}</span>
        {section.duration && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={10} /> ~{Math.round(section.duration / 60 * 130)} palavras
          </span>
        )}
        <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            title="Copiar seção"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => { setShowRegenInput((v) => !v); setOpen(true) }}
            title="Regenerar com IA"
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          >
            {regen ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
          <button
            onClick={() => { setEditing((e) => !e); setOpen(true) }}
            title="Editar manualmente"
            className={`p-1.5 rounded transition-colors ${editing ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
          >
            <Pencil size={13} />
          </button>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Regen bar */}
      {showRegenInput && (
        <div className="px-4 pb-3 bg-indigo-50 border-b border-indigo-100 flex gap-2">
          <input
            type="text"
            value={regenInstr}
            onChange={(e) => setRegenInstr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegenerate()}
            placeholder="Instruções para a IA (opcional)… ex: mais energia, adicionar emoji"
            className="flex-1 text-xs border border-indigo-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            autoFocus
          />
          <button
            onClick={handleRegenerate}
            disabled={regen}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {regen ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Regerar
          </button>
          <button onClick={() => setShowRegenInput(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Body */}
      {open && (
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full text-sm text-gray-700 font-mono border border-indigo-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-medium">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {(section.content ?? content) || <span className="text-gray-300 italic">Seção vazia — clique em regenerar para gerar com IA</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Script Viewer ─────────────────────────────────────────────────────────────

function ScriptViewer({ script, onUpdate }) {
  const sections = script.sections ?? []
  const [copyAll, setCopyAll] = useState(false)

  const fullText = sections.map((s) => `[${s.label.toUpperCase()}]\n${s.content ?? ''}`).join('\n\n')

  function handleCopyAll() {
    navigator.clipboard.writeText(fullText || script.text || '')
    setCopyAll(true)
    setTimeout(() => setCopyAll(false), 2500)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{script.title || script.blueprintId}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {sections.length} seções · {script.language?.toUpperCase()} · {timeAgo(script.createdAt)}
          </p>
        </div>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          {copyAll ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copyAll ? 'Copiado!' : 'Copiar tudo'}
        </button>
      </div>

      {sections.length > 0 ? (
        sections.map((sec, i) => (
          <SectionCard
            key={sec.id ?? i}
            section={sec}
            index={i}
            scriptId={script.id}
            onUpdate={onUpdate}
          />
        ))
      ) : (
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
          {script.text}
        </pre>
      )}
    </div>
  )
}

// ── Script List Row ───────────────────────────────────────────────────────────

function ScriptListRow({ script, onSelect, isSelected }) {
  const sections = script.sections ?? []
  return (
    <tr
      onClick={() => onSelect(script)}
      className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800 text-sm truncate max-w-xs">{script.title || script.blueprintId}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
          <Layers size={10} />
          {sections.length > 0 ? `${sections.length} seções` : 'roteiro completo'}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 uppercase">{script.language}</td>
      <td className="px-4 py-3 text-xs font-semibold text-indigo-600">{script.confidence}%</td>
      <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(script.createdAt)}</td>
      <td className="px-4 py-3">
        <ChevronRight size={14} className={`text-gray-300 transition-transform ${isSelected ? 'rotate-90 text-indigo-500' : ''}`} />
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STANDARD_TYPES = [
  {
    id:    'top-5-custo-beneficio',
    name:  'Top 5 Custo-Benefício',
    icon:  '🏆',
    desc:  '5 produtos ranqueados do pior ao melhor custo-benefício',
    sections: [
      { id: uid(), type: 'intro',   label: 'Abertura',                    duration: 60,  instructions: 'Hook forte com a promessa de revelar os 5 melhores produtos custo-benefício. Inclua aviso de afiliado.' },
      { id: uid(), type: 'product', label: 'Critérios de Seleção',        duration: 45,  instructions: 'Explique brevemente os critérios usados para ranquear os produtos.' },
      { id: uid(), type: 'product', label: 'Produto #5',                  duration: 90,  instructions: 'Apresente o produto, preço, pontos positivos e para quem vale.' },
      { id: uid(), type: 'product', label: 'Produto #4',                  duration: 90,  instructions: 'Apresente o produto, destaque o diferencial em relação ao #5.' },
      { id: uid(), type: 'product', label: 'Produto #3',                  duration: 120, instructions: 'Análise mais detalhada, prós e contras principais.' },
      { id: uid(), type: 'product', label: 'Produto #2',                  duration: 120, instructions: 'Análise detalhada, por que quase chegou ao topo.' },
      { id: uid(), type: 'product', label: 'Produto #1 — Melhor Escolha', duration: 150, instructions: 'O campeão: análise completa, por que é o melhor custo-benefício, link afiliado com destaque.' },
      { id: uid(), type: 'cta',     label: 'CTA Final',                   duration: 45,  instructions: 'Convite para se inscrever, ativar notificações e acessar os links na descrição.' },
    ],
  },
  {
    id:    'comparacao-1x1',
    name:  'Comparação 1x1',
    icon:  '⚔️',
    desc:  'Dois produtos frente a frente com veredicto final',
    sections: [
      { id: uid(), type: 'intro',      label: 'Abertura',               duration: 60,  instructions: 'Hook: qual dos dois você escolheria? Crie suspense. Aviso de afiliado.' },
      { id: uid(), type: 'product',    label: 'Apresentação dos Dois',  duration: 90,  instructions: 'Apresente ambos os produtos, preços e posicionamento de mercado.' },
      { id: uid(), type: 'comparison', label: 'Design e Construção',    duration: 90,  instructions: 'Compare qualidade de materiais, ergonomia e acabamento.' },
      { id: uid(), type: 'comparison', label: 'Performance e Recursos', duration: 120, instructions: 'Compare funcionalidades, testes práticos e resultados.' },
      { id: uid(), type: 'pros_cons',  label: 'Custo-Benefício',        duration: 90,  instructions: 'Compare preço vs valor entregue por cada um.' },
      { id: uid(), type: 'verdict',    label: 'Veredicto Final',        duration: 75,  instructions: 'Declare o vencedor, para quem cada um é indicado e os links afiliados.' },
      { id: uid(), type: 'cta',        label: 'CTA Final',              duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
  {
    id:    'review-detalhado',
    name:  'Review Detalhado',
    icon:  '🔍',
    desc:  'Análise aprofundada de um único produto',
    sections: [
      { id: uid(), type: 'intro',    label: 'Abertura',                 duration: 60,  instructions: 'Hook com a principal dor que o produto resolve. Aviso de afiliado.' },
      { id: uid(), type: 'product',  label: 'Visão Geral',              duration: 90,  instructions: 'O que é, para quem é, posicionamento de preço no mercado.' },
      { id: uid(), type: 'product',  label: 'Unboxing e Design',        duration: 90,  instructions: 'Materiais, acabamento, o que vem na caixa, primeiras impressões.' },
      { id: uid(), type: 'demo',     label: 'Funcionalidades e Testes', duration: 150, instructions: 'Teste prático de cada função principal, resultados reais.' },
      { id: uid(), type: 'pros_cons', label: 'Prós e Contras',          duration: 90,  instructions: 'Lista honesta de pontos positivos e negativos.' },
      { id: uid(), type: 'verdict',  label: 'Para Quem Vale a Pena?',   duration: 60,  instructions: 'Perfil do comprador ideal, alternativas e faixa de preço justa.' },
      { id: uid(), type: 'cta',      label: 'CTA Final',                duration: 45,  instructions: 'Link afiliado com urgência, inscrição e notificações.' },
    ],
  },
]

const DEFAULT_BLUEPRINT = {
  id: null,
  ...STANDARD_TYPES[0],
}

export default function Scripts() {
  const { data: scriptsData, refetch } = useApi('/scripts')
  const scripts = scriptsData?.scripts ?? []

  // blueprints from DB
  const { data: bpData, refetch: refetchBp } = useApi('/blueprints')
  const dbBlueprints = bpData?.blueprints ?? []

  const [view, setView]               = useState('generate')   // 'generate' | 'blueprints'
  const [selectedScript, setSelected] = useState(null)
  const [activeTypeId, setActiveTypeId] = useState(STANDARD_TYPES[0].id)
  const [blueprint, setBlueprint]     = useState(DEFAULT_BLUEPRINT)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [language, setLanguage]       = useState('pt')
  const [generating, setGenerating]   = useState(false)
  const [savingBp, setSavingBp]       = useState(false)
  const [error, setError]             = useState(null)
  const [activeDbBp, setActiveDbBp]   = useState(null)

  function selectType(typeId) {
    const t = STANDARD_TYPES.find(t => t.id === typeId)
    if (!t) return
    setActiveTypeId(typeId)
    setActiveDbBp(null)
    // refresh section ids so they're unique
    setBlueprint({ id: null, name: t.name, desc: t.desc, sections: t.sections.map(s => ({ ...s, id: uid() })) })
  }

  function toggleProduct(id) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintData: blueprint,
          productIds:    selectedProducts,
          language,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      await refetch()
      setSelected(data)
      setView('generate')
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveBlueprint() {
    setSavingBp(true)
    try {
      const method = blueprint.id ? 'PUT' : 'POST'
      const url    = blueprint.id ? `/api/blueprints/${blueprint.id}` : '/api/blueprints'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blueprint),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setBlueprint(data)
      setActiveDbBp(data.id)
      await refetchBp()
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingBp(false)
    }
  }

  async function handleDeleteBlueprint(id) {
    if (!confirm('Excluir este blueprint?')) return
    await fetch(`/api/blueprints/${id}`, { method: 'DELETE' })
    await refetchBp()
    if (activeDbBp === id) {
      setBlueprint(DEFAULT_BLUEPRINT)
      setActiveDbBp(null)
    }
  }

  function handleScriptUpdate(updated) {
    setSelected(updated)
    refetch()
  }

  const totalDuration = blueprint.sections?.reduce((s, sec) => s + (sec.duration ?? 60), 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Roteiros"
        description="Crie roteiros estruturados com blueprints personalizados e edição por seção"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setView(view === 'blueprints' ? 'generate' : 'blueprints')}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                view === 'blueprints'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
              }`}
            >
              <BookTemplate size={15} />
              Blueprints
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              {generating ? 'Gerando…' : 'Gerar Roteiro'}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Config panel */}
        <div className="col-span-2 space-y-4">

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {STANDARD_TYPES.map(t => (
              <button key={t.id} onClick={() => selectType(t.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  activeTypeId === t.id && !activeDbBp
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}>
                <div className="text-lg mb-1">{t.icon}</div>
                <div className="text-xs font-semibold text-gray-800 leading-tight">{t.name}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Blueprint panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" />
                Blueprint
              </h3>
              <div className="flex gap-2 items-center">
                {dbBlueprints.length > 0 && (
                  <select
                    value={activeDbBp ?? ''}
                    onChange={(e) => {
                      const bp = dbBlueprints.find((b) => b.id === e.target.value)
                      if (bp) { setBlueprint(bp); setActiveDbBp(bp.id); setActiveTypeId(null) }
                      else { selectType(STANDARD_TYPES[0].id) }
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600"
                  >
                    <option value="">Padrão</option>
                    {dbBlueprints.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                <button
                  onClick={handleSaveBlueprint}
                  disabled={savingBp}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  {savingBp ? <Loader2 size={11} className="animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
            <div className="p-4">
              <BlueprintEditor blueprint={blueprint} onChange={setBlueprint} />
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Idioma</h3>
            <div className="flex gap-2">
              {[{ v: 'pt', l: 'Português' }, { v: 'en', l: 'English' }, { v: 'es', l: 'Español' }].map((lang) => (
                <button
                  key={lang.v}
                  onClick={() => setLanguage(lang.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    language === lang.v
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {lang.l}
                </button>
              ))}
            </div>
          </div>

          {/* Product picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Package size={14} className="text-indigo-500" />
              Produtos
              {selectedProducts.length > 0 && (
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5 font-medium">
                  {selectedProducts.length} selecionados
                </span>
              )}
            </h3>
            <ProductPicker selected={selectedProducts} onToggle={toggleProduct} />
          </div>
        </div>

        {/* Right: Script viewer + list */}
        <div className="col-span-3 space-y-4">
          {/* Selected script viewer */}
          {selectedScript && (
            <div className="bg-white rounded-xl border border-indigo-200 p-5">
              <ScriptViewer script={selectedScript} onUpdate={handleScriptUpdate} />
            </div>
          )}

          {/* Scripts list */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <FileText size={15} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 text-sm">Roteiros</h3>
              <span className="ml-auto text-xs text-gray-400">{scripts.length} total</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 text-xs">
                  <th className="px-4 py-2 font-medium">Título / Blueprint</th>
                  <th className="px-4 py-2 font-medium">Idioma</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Criado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {scripts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Nenhum roteiro ainda — configure o blueprint e gere o primeiro acima.
                    </td>
                  </tr>
                ) : (
                  scripts.map((s) => (
                    <ScriptListRow
                      key={s.id}
                      script={s}
                      isSelected={selectedScript?.id === s.id}
                      onSelect={(script) => setSelected((prev) => prev?.id === script.id ? null : script)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
