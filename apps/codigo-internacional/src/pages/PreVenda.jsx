import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, Target, CalendarCheck, ShieldCheck, Lock, Check,
  Clock, Users, Receipt, TrendingUp, MessageCircle, ArrowRight, ArrowLeft,
} from 'lucide-react'
import { submitLead, trackVisit } from '../lib/api.js'
import { REVENUE_BANDS, HEADCOUNT_BANDS, YEARS_BANDS, DECISION_BANDS } from '../lib/leadFields.js'

const LOGO = '/brand/logo-icon-trans.webp'

const TURMAS = [
  { id: '2026-07-12', label: '12 de Julho' },
  { id: '2026-07-19', label: '19 de Julho' },
  { id: '2026-07-26', label: '26 de Julho' },
  { id: '2026-08-02', label: '02 de Agosto' },
  { id: '2026-08-09', label: '09 de Agosto' },
]
const SIMNAO = [{ key: 'sim', label: 'Sim' }, { key: 'nao', label: 'Não' }]

const STEPS = [
  { title: 'Quem é você', icon: User },
  { title: 'Sobre o negócio', icon: Building2 },
  { title: 'Objetivos e contribuição', icon: Target },
  { title: 'Logística e decisão', icon: CalendarCheck },
]
const STEP_REQUIRED = [
  ['name', 'phone', 'company', 'segmento'],
  ['years', 'headcount', 'tax_estimate', 'revenue_band'],
  ['main_challenge', 'problem_to_solve'],
  ['turma', 'availability', 'decision_timeline', 'wants_call'],
]
const EMPTY = {
  name: '', phone: '', company: '', segmento: '',
  years: '', headcount: '', tax_estimate: '', revenue_band: '',
  main_challenge: '', problem_to_solve: '', value_add: '',
  turma: '', availability: '', decision_timeline: '', wants_call: '',
}

function Label({ icon: Icon, children }) {
  return (
    <label className="data flex items-center gap-1.5 mb-2" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(20,22,24,0.8)', fontWeight: 600 }}>
      {Icon && <Icon size={13} style={{ color: 'var(--color-green)' }} />} {children}
    </label>
  )
}

function Choice({ active, onClick, label, sub }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`relative flex flex-col items-start justify-start text-left py-3 px-3.5 border transition-colors ${
        active ? 'bg-mineral text-ivory border-mineral' : 'bg-white border-mineral/30 text-mineral hover:border-green'
      }`}>
      <span className="data block text-[14px] leading-tight font-medium pr-4">{label}</span>
      {sub && <span className="data block mt-0.5 uppercase" style={{ fontSize: 8.5, letterSpacing: '0.12em', opacity: active ? 0.7 : 0.55 }}>{sub}</span>}
      {active && <Check size={13} className="absolute top-2 right-2" style={{ color: 'var(--color-sand)' }} />}
    </button>
  )
}

function Buttons({ options, value, onChange, cols = 'grid-cols-2 sm:grid-cols-4' }) {
  return (
    <div className={`grid ${cols} gap-2`}>
      {options.map((o) => {
        const key = o.key ?? o.id
        return <Choice key={key} active={value === key} label={o.label} sub={o.sub} onClick={() => onChange(value === key ? '' : key)} />
      })}
    </div>
  )
}

function StepBody({ step, form, set, pick }) {
  if (step === 0) return (
    <div className="space-y-5">
      <div><Label icon={User}>Nome completo *</Label><input className="field" value={form.name} onChange={set('name')} placeholder="Seu nome" autoComplete="name" /></div>
      <div><Label icon={MessageCircle}>WhatsApp *</Label><input className="field" value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" /></div>
      <div><Label icon={Building2}>Nome da sua empresa *</Label><input className="field" value={form.company} onChange={set('company')} placeholder="Sua empresa" /></div>
      <div><Label icon={Target}>Segmento de atuação *</Label><input className="field" value={form.segmento} onChange={set('segmento')} placeholder="Ex.: infoprodutos, e-commerce, clínica…" /></div>
    </div>
  )
  if (step === 1) return (
    <div className="space-y-6">
      <div><Label icon={Clock}>Há quantos anos você empreende? *</Label><Buttons options={YEARS_BANDS} value={form.years} onChange={pick('years')} /></div>
      <div><Label icon={Users}>Quantas pessoas fazem parte da empresa? *</Label><Buttons options={HEADCOUNT_BANDS} value={form.headcount} onChange={pick('headcount')} /></div>
      <div><Label icon={Receipt}>Quanto estima pagar de impostos por ano hoje? *</Label><input className="field" value={form.tax_estimate} onChange={set('tax_estimate')} placeholder="Ex.: R$ 120 mil/ano" /></div>
      <div><Label icon={TrendingUp}>Faturamento médio mensal (últimos 6 meses) *</Label><Buttons options={REVENUE_BANDS} value={form.revenue_band} onChange={pick('revenue_band')} cols="grid-cols-2 sm:grid-cols-3" /></div>
    </div>
  )
  if (step === 2) return (
    <div className="space-y-5">
      <div><Label icon={Target}>Qual o principal desafio da sua empresa hoje? *</Label><textarea className="field" rows={3} value={form.main_challenge} onChange={set('main_challenge')} placeholder="Seja específico." /></div>
      <div><Label icon={Users}>Com 7 dias numa sala de empresários de alto nível, que problema gostaria de resolver? *</Label><textarea className="field" rows={3} value={form.problem_to_solve} onChange={set('problem_to_solve')} placeholder="O que você quer levar de lá." /></div>
      <div><Label icon={Check}>O que você acredita que pode agregar aos outros empresários da turma?</Label><textarea className="field" rows={3} value={form.value_add} onChange={set('value_add')} placeholder="Opcional, mas conta pontos." /></div>
    </div>
  )
  return (
    <div className="space-y-6">
      <div><Label icon={CalendarCheck}>Qual turma você tem interesse? *</Label><Buttons options={TURMAS} value={form.turma} onChange={pick('turma')} /></div>
      <div><Label icon={Check}>Tem disponibilidade para os 7 dias completos no Paraguai? *</Label><Buttons options={SIMNAO} value={form.availability} onChange={pick('availability')} cols="grid-cols-2" /></div>
      <div><Label icon={Clock}>Caso aprovado, em quanto tempo pretende confirmar sua vaga? *</Label><Buttons options={DECISION_BANDS} value={form.decision_timeline} onChange={pick('decision_timeline')} /></div>
      <div><Label icon={MessageCircle}>Gostaria de uma conversa, cara a cara, com o Pedro Silvestrini? *</Label><Buttons options={SIMNAO} value={form.wants_call} onChange={pick('wants_call')} cols="grid-cols-2" /></div>
    </div>
  )
}

export default function PreVenda() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [error, setError] = useState(null)

  useEffect(() => { document.title = 'O Código Internacional — Aplicação'; trackVisit('pre-venda') }, [])

  // Lock page scroll while the focused wizard is open.
  useEffect(() => {
    if (started && status !== 'success') {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
    document.body.style.overflow = ''
  }, [started, status])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pick = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const stepValid = () => STEP_REQUIRED[step].every((k) => String(form[k]).trim())

  function next() {
    if (!stepValid()) { setError('Responda todas as perguntas obrigatórias desta etapa.'); return }
    setError(null)
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else handleSubmit()
  }
  function back() { setError(null); setStep((s) => Math.max(0, s - 1)) }

  async function handleSubmit() {
    if (status === 'submitting') return
    setStatus('submitting'); setError(null)
    try {
      await submitLead({
        name: form.name.trim(), phone: form.phone.trim(), company: form.company.trim(), segmento: form.segmento.trim(),
        headcount: form.headcount, revenue_band: form.revenue_band, turma: form.turma,
        utm_source: 'pre-venda', utm_medium: 'instagram', utm_campaign: 'pre-venda', landing_path: window.location.pathname,
        application: {
          years: form.years, tax_estimate: form.tax_estimate.trim(),
          main_challenge: form.main_challenge.trim(), problem_to_solve: form.problem_to_solve.trim(),
          value_add: form.value_add.trim() || null, availability: form.availability,
          decision_timeline: form.decision_timeline, wants_call: form.wants_call,
        },
      })
      setStatus('success'); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) { setError(err.message); setStatus('error') }
  }

  // ── Success ──
  if (status === 'success') {
    return (
      <main className="min-h-screen grid place-items-center px-5 py-16" style={{ background: 'var(--color-ivory)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="lead-form border border-mineral/25 p-9 sm:p-12 max-w-xl text-center">
          <div className="w-12 h-12 mx-auto grid place-items-center rounded-full mb-5" style={{ border: '1.5px solid var(--color-green)' }}>
            <ShieldCheck size={22} className="text-green" />
          </div>
          <p className="eyebrow mb-3 text-green">Aplicação recebida</p>
          <h1 className="text-2xl sm:text-3xl font-light leading-snug">
            Sua aplicação entrou na <span className="font-semibold">fila de seleção</span>.
          </h1>
          <p className="mt-4 text-mineral/70 leading-relaxed">
            O Pedro Silvestrini vai revisar suas respostas pessoalmente e te chamar no WhatsApp para a
            conversa de seleção. As turmas são pequenas — responda assim que ele chamar.
          </p>
          <p className="whisper mt-6">Ordo Tekhnē. Permanentia.</p>
        </motion.div>
      </main>
    )
  }

  // ── Intro (read first, then start) ──
  if (!started) {
    return (
      <main className="min-h-screen px-5 py-12 sm:py-16" style={{ background: 'var(--color-ivory)' }}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="max-w-xl mx-auto text-center">
          <img src={LOGO} alt="" className="w-12 h-12 object-contain mx-auto mb-4" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <p className="eyebrow mb-3">O Código Internacional</p>
          <h1 className="text-2xl sm:text-[30px] font-light leading-snug text-mineral">
            Faça parte do grupo de <span className="font-semibold">empresários que zeram o imposto</span>
          </h1>
          <p className="mt-5 text-mineral/75 leading-relaxed">
            São apenas <strong>10 empresários por turma</strong>, 5 turmas, uma por semana. Depois disso, o
            programa encerra com um grupo de 50 empresários brasileiros pagando zero imposto — com uma
            experiência de networking e conexão que vale o seu tempo.
          </p>
          <p className="whisper mt-5">Cada aplicação é lida pessoalmente pelo Pedro. Capriche nas respostas.</p>

          <button type="button" onClick={() => { setStarted(true); setStep(0); setError(null) }}
            className="cta-bar mt-9 w-full max-w-sm mx-auto">
            Iniciar minha aplicação <ArrowRight size={15} />
          </button>
          <p className="data mt-4" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'rgba(20,22,24,0.45)' }}>
            ~2 MINUTOS · 4 ETAPAS
          </p>
        </motion.div>
      </main>
    )
  }

  // ── Focused wizard (scroll-locked) ──
  const Step = STEPS[step].icon
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--color-ivory)' }}>
      {/* minimal header + progress */}
      <div className="shrink-0 px-5 py-3" style={{ background: 'rgba(239,232,220,0.96)', borderBottom: '1px solid rgba(20,22,24,0.12)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <span className="data" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-sand-deep)' }}>O Código Internacional</span>
            </div>
            <span className="data" style={{ fontSize: 10, color: 'rgba(20,22,24,0.5)' }}>{step + 1}/{STEPS.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} style={{ height: 4, background: i <= step ? 'var(--color-green)' : 'rgba(20,22,24,0.12)', transition: 'background .3s' }} />
            ))}
          </div>
        </div>
      </div>

      {/* scrollable step body */}
      <div className="flex-1 overflow-y-auto">
        <div className="lead-form max-w-xl mx-auto px-5 py-7" style={{ background: 'transparent', border: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 grid place-items-center shrink-0" style={{ background: 'var(--color-green)' }}>
              <Step size={17} style={{ color: 'var(--color-ivory)' }} />
            </div>
            <div>
              <p className="data" style={{ fontSize: 9.5, letterSpacing: '0.12em', color: 'rgba(20,22,24,0.5)' }}>ETAPA {step + 1} DE {STEPS.length}</p>
              <p className="font-semibold text-mineral leading-tight" style={{ fontSize: 16 }}>{STEPS[step].title}</p>
            </div>
          </div>
          <div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22 }}>
                <StepBody step={step} form={form} set={set} pick={pick} />
              </motion.div>
            </AnimatePresence>
            {error && <p className="data mt-5 text-sm" style={{ color: '#9b2c2c' }}>{error}</p>}
          </div>
        </div>
      </div>

      {/* sticky footer nav */}
      <div className="shrink-0 px-5 py-3.5" style={{ background: 'rgba(239,232,220,0.96)', borderTop: '1px solid rgba(20,22,24,0.12)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={back} disabled={status === 'submitting'}
                className="data flex items-center gap-1.5 px-4 py-3 border border-mineral/30 text-mineral hover:border-mineral transition-colors" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
            <button type="button" onClick={next} disabled={status === 'submitting'} className="cta-bar flex-1">
              {status === 'submitting' ? 'Enviando…' : step === STEPS.length - 1 ? 'Enviar minha aplicação' : <>Continuar <ArrowRight size={15} /></>}
            </button>
          </div>
          <p className="whisper mt-3 text-center flex items-center justify-center gap-1.5" style={{ fontSize: 12 }}>
            <Lock size={11} /> Suas respostas são confidenciais. Quando fechar, fechou.
          </p>
        </div>
      </div>
    </div>
  )
}
