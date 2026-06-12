import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { captureAttribution, fetchCohorts, submitLead, qualifyLead } from '../lib/api.js'
import { REVENUE_BANDS, HEADCOUNT_BANDS } from '../lib/leadFields.js'

const FALLBACK_COHORTS = [
  { id: '2026-07-12', label: 'Turma 1 — 12/07' },
  { id: '2026-07-19', label: 'Turma 2 — 19/07' },
  { id: '2026-07-26', label: 'Turma 3 — 26/07' },
  { id: '2026-08-02', label: 'Turma 4 — 02/08' },
  { id: '2026-08-09', label: 'Turma 5 — 09/08' },
]

/** Squared selector button (no dropdowns — brand standard). */
function Choice({ active, onClick, label, sub }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start justify-start text-left py-3 px-3.5 border transition-colors ${
        active ? 'bg-mineral text-ivory border-mineral' : 'border-mineral/20 text-mineral hover:border-mineral/50'
      }`}
    >
      <span className="data block text-[15px] leading-tight font-medium">{label}</span>
      {sub && (
        <span className="data block mt-0.5 uppercase" style={{ fontSize: 8.5, letterSpacing: '0.12em', opacity: 0.6 }}>{sub}</span>
      )}
    </button>
  )
}

export default function LeadForm({ id = 'aplicar' }) {
  const [step, setStep] = useState(1) // 1 = contato · 2 = perfil · 3 = sucesso
  const [form, setForm] = useState({
    name: '', phone: '', email: '', turma: '',
    segmento: '', headcount: '', revenue_band: '', instagram: '',
  })
  const [ref, setRef] = useState(null)
  const [leadId, setLeadId] = useState(null)
  const [cohorts, setCohorts] = useState(FALLBACK_COHORTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCohorts().then((c) => c?.length && setCohorts(c)).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pick = (k, v) => setForm((f) => ({ ...f, [k]: f[k] === v ? '' : v }))

  // Step 1 — capture nome + WhatsApp. Saved immediately so the lead is never lost.
  async function submitStep1(e) {
    e.preventDefault()
    if (busy) return
    if (!form.name.trim() || !form.phone.trim()) { setError('Preencha nome e WhatsApp.'); return }
    setBusy(true); setError(null)
    try {
      const res = await submitLead({ name: form.name.trim(), phone: form.phone.trim(), ...captureAttribution() })
      setLeadId(res.id); setRef(res.ref)
      setStep(2)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  // Step 2 — attach the company profile.
  async function submitStep2(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      await qualifyLead(leadId, ref, {
        segmento: form.segmento.trim() || null,
        headcount: form.headcount || null,
        revenue_band: form.revenue_band || null,
        instagram: form.instagram.trim().replace(/^@+/, '') || null,
        email: form.email.trim() || null,
        turma: form.turma || null,
      })
      setStep(3)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div id={id} className="lead-form border border-mineral/25 p-8 sm:p-10">
      {/* Progress */}
      {step < 3 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow !mb-0">Processo de seleção</p>
            <span className="data" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(20,22,24,0.45)' }}>
              ETAPA {step} DE 2
            </span>
          </div>
          <div className="h-[3px] bg-mineral/10 overflow-hidden">
            <motion.div className="h-full bg-green" initial={false} animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 1 — contato ── */}
        {step === 1 && (
          <motion.form key="s1" onSubmit={submitStep1}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <h3 className="text-2xl font-light leading-snug mb-2">
              Solicite sua vaga no <span className="font-semibold">Código Internacional</span>.
            </h3>
            <p className="text-mineral/65 leading-relaxed mb-7" style={{ fontSize: 15 }}>
              Comece com o básico. Leva 20 segundos — o Pedro chama você no WhatsApp.
            </p>

            <div className="space-y-5">
              <div>
                <label className="field-label" htmlFor="ci-name">Seu nome</label>
                <input id="ci-name" className="field" value={form.name} onChange={set('name')}
                  placeholder="Nome completo" autoComplete="name" required />
              </div>
              <div>
                <label className="field-label" htmlFor="ci-phone">WhatsApp</label>
                <input id="ci-phone" className="field" value={form.phone} onChange={set('phone')}
                  placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" required />
              </div>
            </div>

            {error && <p className="data mt-5 text-sm" style={{ color: '#9b2c2c' }}>{error}</p>}

            <button type="submit" className="cta-bar mt-8 w-full" disabled={busy}>
              {busy ? 'Salvando…' : 'Continuar →'}
            </button>
            <p className="whisper mt-5 text-sm text-center">
              Turmas pequenas — uma por semana. Quando fechar, fechou.
            </p>
          </motion.form>
        )}

        {/* ── STEP 2 — perfil da empresa ── */}
        {step === 2 && (
          <motion.form key="s2" onSubmit={submitStep2}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <h3 className="text-2xl font-light leading-snug mb-2">
              Falta pouco{form.name ? `, ${form.name.split(' ')[0]}` : ''}.
            </h3>
            <p className="text-mineral/65 leading-relaxed mb-7" style={{ fontSize: 15 }}>
              Isso ajuda o Pedro a preparar a sua conversa de seleção e montar a turma certa.
            </p>

            <div className="space-y-6">
              <div>
                <label className="field-label" htmlFor="ci-seg">Segmento da empresa</label>
                <input id="ci-seg" className="field" value={form.segmento} onChange={set('segmento')}
                  placeholder="Ex.: infoprodutos, e-commerce, clínica, agência…" />
              </div>

              <div>
                <label className="field-label">Faturamento mensal</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {REVENUE_BANDS.map((b) => (
                    <Choice key={b.key} active={form.revenue_band === b.key} label={b.label} sub={b.sub}
                      onClick={() => pick('revenue_band', b.key)} />
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">Tamanho da equipe</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {HEADCOUNT_BANDS.map((b) => (
                    <Choice key={b.key} active={form.headcount === b.key} label={b.label} sub={b.sub}
                      onClick={() => pick('headcount', b.key)} />
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="ci-ig">Seu @ no Instagram</label>
                <div className="relative">
                  <span className="data" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(20,22,24,0.4)' }}>@</span>
                  <input id="ci-ig" className="field" style={{ paddingLeft: 28 }} value={form.instagram}
                    onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value.replace(/^@+/, '') }))}
                    placeholder="seu_perfil" autoCapitalize="none" />
                </div>
              </div>

              <div>
                <label className="field-label">Escolha a sua turma</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {cohorts.map((c) => {
                    const [t, d] = c.label.split('—').map((s) => s.trim())
                    return (
                      <Choice key={c.id} active={form.turma === c.id} label={d} sub={t}
                        onClick={() => pick('turma', c.id)} />
                    )
                  })}
                </div>
              </div>
            </div>

            {error && <p className="data mt-5 text-sm" style={{ color: '#9b2c2c' }}>{error}</p>}

            <button type="submit" className="cta-bar mt-8 w-full" disabled={busy}>
              {busy ? 'Enviando…' : 'Solicitar minha vaga'}
            </button>
            <button type="button" onClick={() => { setError(null); setStep(1) }}
              className="data block mx-auto mt-4" style={{ fontSize: 11, color: 'rgba(20,22,24,0.45)' }}>
              ← voltar
            </button>
          </motion.form>
        )}

        {/* ── STEP 3 — sucesso ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="eyebrow mb-3 text-green">Solicitação recebida</p>
            <h3 className="text-2xl font-light leading-snug">
              Seu pedido de vaga entrou na fila de seleção.
            </h3>
            <p className="mt-4 text-mineral/70 leading-relaxed">
              O Pedro Silvestrini vai te chamar pessoalmente no WhatsApp em breve para a conversa de seleção.
              As turmas são pequenas — responda assim que ele chamar.
            </p>
            <p className="whisper mt-6">Ordo Tekhnē. Permanentia.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
