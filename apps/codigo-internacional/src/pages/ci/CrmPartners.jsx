import { useState, useEffect } from 'react'
import { Users, Link2, Copy, Check, UserPlus, Briefcase, Percent, Pencil, Trash2, X, Megaphone, Plus, MessageCircle } from 'lucide-react'
import { useApi, apiPost, apiPatch, apiDelete } from '../../hooks/useApi.js'
import { Header, ErrorBanner, SegBtn } from './CrmLeads.jsx'

const LANDING_BASE = 'https://codigointernacional.com.br'
const PARTNER_TYPES = [
  { key: 'ambassador', label: 'Embaixador' },
  { key: 'influencer', label: 'Influencer' },
  { key: 'partner',    label: 'Parceiro' },
  { key: 'mentor',     label: 'Mentor' },
]

export default function CrmPartners() {
  const { data, loading, error, refetch } = useApi('/ci/admin/partners')
  const { data: closersData, refetch: refetchClosers } = useApi('/ci/admin/closers')
  const { data: settingsData, refetch: refetchSettings } = useApi('/ci/admin/settings')
  const { data: sourcesData, refetch: refetchSources } = useApi('/ci/admin/sources')
  const partners = data?.partners ?? []
  const closers = closersData?.closers ?? []
  const settings = settingsData?.settings ?? {}
  const sources = sourcesData?.sources ?? []

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(null)

  const [showNewPartner, setShowNewPartner] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'ambassador', utm_source: '', commission_rate: '', whatsapp: '' })
  const [editing, setEditing] = useState(null)         // partner being edited
  const [editingCloser, setEditingCloser] = useState(null) // closer being edited/created
  const [sourceForm, setSourceForm] = useState({ label: '', key: '', medium: '' })
  const [editingSource, setEditingSource] = useState(null)

  const srcQuery = (s) => `?utm_source=${s.key}${s.medium ? `&utm_medium=${s.medium}` : ''}`
  const sourceLink = (s) => `${LANDING_BASE}/${srcQuery(s)}`
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  function copyUrl(url, key) { navigator.clipboard?.writeText(url); setCopied(key); setTimeout(() => setCopied(null), 1500) }
  const copyLink = (utm) => copyUrl(`${LANDING_BASE}/?utm_source=${utm}&utm_medium=instagram`, utm)

  // ── Partners ──
  async function createPartner(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try {
      await apiPost('/ci/admin/partners', { ...form, commission_rate: Number(form.commission_rate) || 0 })
      setForm({ name: '', type: 'ambassador', utm_source: '', commission_rate: '', whatsapp: '' }); setShowNewPartner(false); await refetch()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  async function saveEdit() {
    setBusy(true); setErr(null)
    try {
      await apiPatch(`/ci/admin/partners/${editing.id}`, { name: editing.name, type: editing.type, commission_rate: Number(editing.commission_rate) || 0, whatsapp: editing.whatsapp || null })
      setEditing(null); await refetch()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function removePartner(p) {
    if (!window.confirm(`Excluir o parceiro "${p.name}"? Os leads atribuídos a ele ficam sem parceiro (as comissões já geradas são mantidas).`)) return
    setBusy(true); setErr(null)
    try { await apiDelete(`/ci/admin/partners/${p.id}`); await refetch() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function savePartnerRate(id, rate) {
    setErr(null)
    try { await apiPatch(`/ci/admin/partners/${id}`, { commission_rate: Number(rate) || 0 }); await refetch() } catch (e) { setErr(e.message) }
  }
  async function saveSetting(key, val) {
    setErr(null)
    try { await apiPatch('/ci/admin/settings', { [key]: Number(val) || 0 }); await refetchSettings() } catch (e) { setErr(e.message) }
  }

  // ── Closers ──
  async function saveCloser() {
    setBusy(true); setErr(null)
    const body = { name: editingCloser.name, whatsapp: editingCloser.whatsapp || null, commission_rate: Number(editingCloser.commission_rate) || 0 }
    try {
      if (editingCloser.id) await apiPatch(`/ci/admin/closers/${editingCloser.id}`, body)
      else await apiPost('/ci/admin/closers', body)
      setEditingCloser(null); await refetchClosers()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  // ── Sources ──
  async function createSourceFn(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await apiPost('/ci/admin/sources', sourceForm); setSourceForm({ label: '', key: '', medium: '' }); await refetchSources() }
    catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  async function saveSource() {
    setBusy(true); setErr(null)
    try { await apiPatch(`/ci/admin/sources/${editingSource.key}`, { label: editingSource.label, medium: editingSource.medium }); setEditingSource(null); await refetchSources() }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  async function removeSource(s) {
    if (!window.confirm(`Excluir a fonte "${s.label}"?`)) return
    setBusy(true); setErr(null)
    try { await apiDelete(`/ci/admin/sources/${s.key}`); await refetchSources() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div>
      <Header title="Parceiros & Equipe" subtitle="Embaixadores com UTM próprio para atribuição e comissão · a equipe Tektone." />
      {error && <ErrorBanner>{error}</ErrorBanner>}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Coluna esquerda: Parceiros + Equipe Tektone (cards separados) ── */}
        <div className="flex flex-col gap-5">
        <div className="ci-card overflow-hidden">
          <div className="ci-card-h justify-between">
            <span className="flex items-center gap-2"><Users size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Parceiros</h3></span>
            <button onClick={() => setShowNewPartner(true)} className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ci-green)' }}>
              <Plus size={13} /> Novo parceiro
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr>{['Nome', 'Tipo', 'UTM', 'Comissão', 'Leads', 'Vendas', 'Link'].map((h) => <th key={h} className="ci-th">{h}</th>)}</tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="ci-tr">
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--ci-mineral)' }}>{p.name}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(20,22,24,0.5)' }}>{PARTNER_TYPES.find((t) => t.key === p.type)?.label ?? p.type}</td>
                    <td className="ci-data" style={{ padding: '10px 16px', fontSize: 11, color: 'var(--ci-green)' }}>{p.utm_source}</td>
                    <td style={{ padding: '10px 16px' }}><RateInput value={p.commission_rate} onSave={(v) => savePartnerRate(p.id, v)} /></td>
                    <td className="ci-data" style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(20,22,24,0.5)' }}>{p.lead_count}</td>
                    <td className="ci-data" style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(20,22,24,0.5)' }}>{p.sale_count}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => copyLink(p.utm_source)} className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: copied === p.utm_source ? 'var(--ci-green)' : 'rgba(20,22,24,0.55)' }}>
                          {copied === p.utm_source ? <Check size={12} /> : <Copy size={12} />}{copied === p.utm_source ? 'Copiado' : 'Copiar'}
                        </button>
                        <button onClick={() => setEditing({ id: p.id, name: p.name, type: p.type, commission_rate: p.commission_rate, whatsapp: p.whatsapp || '' })} title="Editar" style={{ color: 'rgba(20,22,24,0.5)' }} className="hover:opacity-70"><Pencil size={13} /></button>
                        <button onClick={() => removePartner(p)} title="Excluir" style={{ color: '#9b2c2c' }} className="hover:opacity-70"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && !loading && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Nenhum parceiro ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked */}
          <div className="sm:hidden">
            {partners.map((p) => (
              <div key={p.id} className="p-4" style={{ borderBottom: '1px solid var(--ci-line-soft)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ci-mineral)' }}>{p.name}</p>
                    <p className="ci-data truncate" style={{ fontSize: 11, color: 'var(--ci-green)', marginTop: 2 }}>?utm_source={p.utm_source}</p>
                    <p style={{ fontSize: 11, color: 'rgba(20,22,24,0.55)', marginTop: 3 }}>{PARTNER_TYPES.find((t) => t.key === p.type)?.label ?? p.type} · {p.lead_count} leads · {p.sale_count} vendas</p>
                  </div>
                  <div className="shrink-0 text-right"><RateInput value={p.commission_rate} onSave={(v) => savePartnerRate(p.id, v)} /></div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={() => copyLink(p.utm_source)} className="flex items-center gap-1.5" style={{ fontSize: 11, color: copied === p.utm_source ? 'var(--ci-green)' : 'rgba(20,22,24,0.55)' }}>{copied === p.utm_source ? <Check size={13} /> : <Copy size={13} />}{copied === p.utm_source ? 'Copiado' : 'Copiar link'}</button>
                  <button onClick={() => setEditing({ id: p.id, name: p.name, type: p.type, commission_rate: p.commission_rate, whatsapp: p.whatsapp || '' })} className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'rgba(20,22,24,0.6)' }}><Pencil size={13} /> Editar</button>
                  <button onClick={() => removePartner(p)} className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#9b2c2c' }}><Trash2 size={13} /> Excluir</button>
                </div>
              </div>
            ))}
            {partners.length === 0 && !loading && <p className="p-8 text-center" style={{ fontSize: 12, color: 'rgba(20,22,24,0.55)' }}>Nenhum parceiro ainda.</p>}
          </div>

        </div>

        {/* ── Equipe Tektone — card próprio ── */}
        <div className="ci-card overflow-hidden">
          <div className="ci-card-h justify-between">
            <span className="flex items-center gap-2"><Briefcase size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Equipe Tektone</h3></span>
            <button onClick={() => setEditingCloser({ name: '', whatsapp: '', commission_rate: '' })} className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ci-green)' }}><Plus size={13} /> Closer</button>
          </div>

          {/* Closers — uniform list rows */}
          <div style={{ padding: '9px 16px 7px' }}><span className="ci-eyebrow">Closers · recebem os leads</span></div>
          {closers.map((c) => (
            <button key={c.id} onClick={() => setEditingCloser({ id: c.id, name: c.name, whatsapp: c.whatsapp || '', commission_rate: c.commission_rate || '' })}
              className="w-full flex items-center justify-between gap-3 text-left transition-colors hover:bg-[rgba(46,74,67,0.07)]"
              style={{ padding: '11px 16px', borderTop: '1px solid var(--ci-line-soft)' }}>
              <div className="min-w-0">
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }} className="truncate">{c.name}</p>
                {c.whatsapp && <p className="ci-data flex items-center gap-1" style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.5)', marginTop: 2 }}><MessageCircle size={10} /> {c.whatsapp}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {Number(c.commission_rate) > 0 && <span className="ci-chip ci-data" style={{ fontWeight: 700 }}>{c.commission_rate}%</span>}
                <span className="ci-data" style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.5)' }}>{c.lead_count} leads</span>
                <Pencil size={12} style={{ color: 'rgba(20,22,24,0.4)' }} />
              </div>
            </button>
          ))}
          {closers.length === 0 && <p style={{ padding: '11px 16px', fontSize: 11, color: 'rgba(20,22,24,0.55)', borderTop: '1px solid var(--ci-line-soft)' }}>Nenhum closer.</p>}

          {/* House commission — uniform rows */}
          <div style={{ padding: '9px 16px 7px', borderTop: '1px solid var(--ci-line)' }}><span className="ci-eyebrow">Comissão Tektone</span></div>
          {[['Hudson', 'house_rate_hudson', 5], ['Alison', 'house_rate_alison', 5]].map(([name, key, def]) => (
            <div key={key} className="flex items-center justify-between" style={{ padding: '9px 16px', borderTop: '1px solid var(--ci-line-soft)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }}>{name}</span>
              <RateInput value={settings[key] ?? def} onSave={(v) => saveSetting(key, v)} />
            </div>
          ))}
          <p style={{ padding: '9px 16px 14px', fontSize: 10.5, color: 'rgba(20,22,24,0.55)', lineHeight: 1.5 }}>Aplica-se às próximas vendas. Comissões já geradas mantêm a taxa do momento do pagamento.</p>
        </div>
        </div>

        {/* ── Right column: traffic sources + UTM help ── */}
        <div className="flex flex-col gap-5">
          <div className="ci-card">
            <div className="ci-card-h"><Megaphone size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Fontes de tráfego</h3></div>
            <div className="p-5 flex flex-col gap-3">
              {sources.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ci-mineral)' }}>{s.label}</p>
                    <p className="ci-data truncate" style={{ fontSize: 10.5, color: 'var(--ci-green)' }}>{srcQuery(s)}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button onClick={() => copyUrl(sourceLink(s), s.key)} title="Copiar link" style={{ color: copied === s.key ? 'var(--ci-green)' : 'rgba(20,22,24,0.55)' }}>{copied === s.key ? <Check size={14} /> : <Copy size={14} />}</button>
                    <button onClick={() => setEditingSource({ ...s })} title="Editar" style={{ color: 'rgba(20,22,24,0.5)' }}><Pencil size={13} /></button>
                    <button onClick={() => removeSource(s)} title="Excluir" style={{ color: '#9b2c2c' }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {sources.length === 0 && <p style={{ fontSize: 11, color: 'rgba(20,22,24,0.5)' }}>Nenhuma fonte ainda.</p>}
              <form onSubmit={createSourceFn} className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid var(--ci-line-soft)' }}>
                <input className="ci-input" placeholder="Nome (ex: Tráfego pago)" value={sourceForm.label} onChange={(e) => setSourceForm((f) => ({ ...f, label: e.target.value }))} required />
                <div className="flex gap-2">
                  <input className="ci-input flex-1 min-w-0" placeholder="utm_source (ex: trafego)" value={sourceForm.key} onChange={(e) => setSourceForm((f) => ({ ...f, key: e.target.value }))} />
                  <input className="ci-input flex-1 min-w-0" placeholder="utm_medium (opcional)" value={sourceForm.medium} onChange={(e) => setSourceForm((f) => ({ ...f, medium: e.target.value }))} />
                </div>
                <button className="ci-btn ci-btn--ghost" disabled={busy}>Adicionar fonte</button>
              </form>
              <p style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.5)', lineHeight: 1.5 }}>Sem comissão (não é parceiro). Para cada campanha, acrescente <code className="ci-data" style={{ color: 'var(--ci-green)' }}>&utm_campaign=nome</code>.</p>
            </div>
          </div>

          <div className="ci-card-soft">
            <div className="ci-card-h"><Link2 size={13} style={{ color: 'var(--ci-green)' }} /><h3 className="ci-title">Como funciona o UTM</h3></div>
            <div className="p-5" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(20,22,24,0.6)' }}>
                Cada parceiro recebe um link <code className="ci-data" style={{ color: 'var(--ci-green)' }}>?utm_source=código&utm_medium=instagram</code>. O lead que chega por ele é atribuído automaticamente, e a comissão do parceiro é gerada quando o pagamento da venda é confirmado.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── New partner modal ── */}
      {showNewPartner && (
        <Modal title="Novo parceiro" icon={UserPlus} onClose={() => setShowNewPartner(false)}>
          <form onSubmit={createPartner} className="flex flex-col gap-3">
            <input className="ci-input" placeholder="Nome" value={form.name} onChange={set('name')} required autoFocus />
            <div className="grid grid-cols-2 gap-2">
              {PARTNER_TYPES.map((t) => <SegBtn key={t.key} active={form.type === t.key} onClick={() => setForm((f) => ({ ...f, type: t.key }))}>{t.label}</SegBtn>)}
            </div>
            <input className="ci-input" placeholder="utm_source (ex: joao_silva) — opcional" value={form.utm_source} onChange={set('utm_source')} />
            <input className="ci-input" type="number" step="0.5" placeholder="Comissão %" value={form.commission_rate} onChange={set('commission_rate')} />
            <input className="ci-input" placeholder="WhatsApp (opcional)" value={form.whatsapp} onChange={set('whatsapp')} />
            <div className="flex gap-2 mt-1">
              <button className="ci-btn flex-1" disabled={busy}>Criar parceiro</button>
              <button type="button" className="ci-btn ci-btn--ghost" onClick={() => setShowNewPartner(false)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit partner modal ── */}
      {editing && (
        <Modal title="Editar parceiro" icon={Pencil} onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-3">
            <input className="ci-input" placeholder="Nome" value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              {PARTNER_TYPES.map((t) => <SegBtn key={t.key} active={editing.type === t.key} onClick={() => setEditing((s) => ({ ...s, type: t.key }))}>{t.label}</SegBtn>)}
            </div>
            <label className="ci-eyebrow">Comissão %</label>
            <input className="ci-input" type="number" step="0.5" value={editing.commission_rate} onChange={(e) => setEditing((s) => ({ ...s, commission_rate: e.target.value }))} />
            <input className="ci-input" placeholder="WhatsApp" value={editing.whatsapp} onChange={(e) => setEditing((s) => ({ ...s, whatsapp: e.target.value }))} />
            <div className="flex gap-2 mt-1">
              <button className="ci-btn flex-1" disabled={busy} onClick={saveEdit}>Salvar</button>
              <button className="ci-btn ci-btn--ghost" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Closer modal (create / edit) ── */}
      {editingCloser && (
        <Modal title={editingCloser.id ? 'Editar closer' : 'Novo closer'} icon={Briefcase} onClose={() => setEditingCloser(null)}>
          <div className="flex flex-col gap-3">
            <div><label className="ci-eyebrow">Nome</label><input className="ci-input mt-1" placeholder="Nome do closer" value={editingCloser.name} onChange={(e) => setEditingCloser((s) => ({ ...s, name: e.target.value }))} autoFocus /></div>
            <div><label className="ci-eyebrow">WhatsApp (recebe os leads)</label><input className="ci-input mt-1" placeholder="55479..." value={editingCloser.whatsapp} onChange={(e) => setEditingCloser((s) => ({ ...s, whatsapp: e.target.value }))} /></div>
            <div><label className="ci-eyebrow">Comissão % (opcional)</label><input className="ci-input mt-1" type="number" step="0.5" placeholder="0" value={editingCloser.commission_rate} onChange={(e) => setEditingCloser((s) => ({ ...s, commission_rate: e.target.value }))} /></div>
            <p style={{ fontSize: 10.5, color: 'rgba(20,22,24,0.55)', lineHeight: 1.5 }}>Se &gt; 0, gera uma comissão para o closer em cada venda que ele fecha.</p>
            <div className="flex gap-2 mt-1">
              <button className="ci-btn flex-1" disabled={busy || !editingCloser.name?.trim()} onClick={saveCloser}>Salvar</button>
              <button className="ci-btn ci-btn--ghost" disabled={busy} onClick={() => setEditingCloser(null)}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit source modal ── */}
      {editingSource && (
        <Modal title="Editar fonte" icon={Megaphone} onClose={() => setEditingSource(null)}>
          <div className="flex flex-col gap-3">
            <p className="ci-eyebrow">utm_source fixo: {editingSource.key}</p>
            <input className="ci-input" placeholder="Nome" value={editingSource.label} onChange={(e) => setEditingSource((s) => ({ ...s, label: e.target.value }))} />
            <input className="ci-input" placeholder="utm_medium (opcional)" value={editingSource.medium} onChange={(e) => setEditingSource((s) => ({ ...s, medium: e.target.value }))} />
            <div className="flex gap-2 mt-1">
              <button className="ci-btn flex-1" disabled={busy} onClick={saveSource}>Salvar</button>
              <button className="ci-btn ci-btn--ghost" disabled={busy} onClick={() => setEditingSource(null)}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, icon: Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(20,22,24,0.5)' }} onClick={onClose}>
      <div className="ci-card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="ci-card-h justify-between">
          <span className="flex items-center gap-2">{Icon && <Icon size={13} style={{ color: 'var(--ci-green)' }} />}<h3 className="ci-title">{title}</h3></span>
          <button onClick={onClose} style={{ color: 'rgba(20,22,24,0.5)' }}><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function RateInput({ value, onSave }) {
  const [v, setV] = useState(value ?? 0)
  useEffect(() => { setV(value ?? 0) }, [value])
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" step="0.5" min="0" value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (String(v) !== String(value)) onSave(v) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="ci-data" style={{ width: 58, background: '#fffdf8', border: '1px solid var(--ci-line)', padding: '3px 7px', color: 'var(--ci-mineral)', fontSize: 12 }} />
      <span style={{ fontSize: 11, color: 'rgba(20,22,24,0.58)' }}>%</span>
    </span>
  )
}
