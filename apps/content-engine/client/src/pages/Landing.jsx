import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronRight, Zap, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * to))
      if (p < 1) requestAnimationFrame(tick)
    }
    tick()
  }, [to, duration])
  return <>{val.toLocaleString('pt-BR')}</>
}

// ── Pipeline node ─────────────────────────────────────────────────────────────
function PipelineNode({ icon, label, sub, accent = false, delay = 0 }) {
  return (
    <div
      className="flex flex-col items-center gap-2 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
        ${accent
          ? 'bg-violet-600/30 border border-violet-500/60 shadow-lg shadow-violet-900/40'
          : 'bg-white/[0.04] border border-white/[0.08]'}
      `}>
        {icon}
        {accent && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
        )}
      </div>
      <span className="text-xs font-semibold text-white whitespace-nowrap">{label}</span>
      {sub && <span className="text-[10px] text-gray-500 whitespace-nowrap">{sub}</span>}
    </div>
  )
}

// ── Blueprint tab ─────────────────────────────────────────────────────────────
const BLUEPRINTS = [
  {
    id: 'top-5',
    label: 'Top 5 Review',
    color: 'text-violet-400',
    sections: [
      { type: 'intro',   label: 'Abertura',                duration: '60s',  note: 'Hook + aviso de afiliado' },
      { type: 'product', label: 'Critérios de Seleção',    duration: '45s',  note: 'Metodologia de ranqueamento' },
      { type: 'product', label: 'Produto #5 → #2',         duration: '90s',  note: 'Análise + link afiliado' },
      { type: 'product', label: 'Produto #1 — Campeão',    duration: '150s', note: 'Análise completa + CTA' },
      { type: 'cta',     label: 'CTA Final',               duration: '45s',  note: 'Inscrição + notificações' },
    ],
  },
  {
    id: 'comparacao',
    label: 'Comparação 1x1',
    color: 'text-cyan-400',
    sections: [
      { type: 'intro',      label: 'Abertura + Suspense',  duration: '60s',  note: 'Qual você escolheria?' },
      { type: 'product',    label: 'Apresentação dos Dois', duration: '90s', note: 'Preços + posicionamento' },
      { type: 'comparison', label: 'Design & Performance', duration: '120s', note: 'Testes práticos' },
      { type: 'verdict',    label: 'Veredicto Final',      duration: '75s',  note: 'Vencedor + links afiliados' },
      { type: 'cta',        label: 'CTA Final',            duration: '45s',  note: 'Inscrição + notificações' },
    ],
  },
  {
    id: 'review',
    label: 'Review Detalhado',
    color: 'text-emerald-400',
    sections: [
      { type: 'intro',     label: 'Abertura — A Dor',      duration: '60s',  note: 'Problema que resolve' },
      { type: 'product',   label: 'Visão Geral + Unboxing', duration: '90s', note: 'Primeiras impressões' },
      { type: 'demo',      label: 'Funcionalidades & Test', duration: '150s', note: 'Resultados reais' },
      { type: 'pros_cons', label: 'Prós e Contras',        duration: '90s',  note: 'Análise honesta' },
      { type: 'verdict',   label: 'Para Quem Vale?',       duration: '60s',  note: 'Perfil + alternativas' },
      { type: 'cta',       label: 'CTA Final',             duration: '45s',  note: 'Link afiliado com urgência' },
    ],
  },
]

const TYPE_COLORS = {
  intro:      'bg-violet-900/40 text-violet-300 border-violet-700/50',
  product:    'bg-blue-900/40 text-blue-300 border-blue-700/50',
  comparison: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
  demo:       'bg-orange-900/40 text-orange-300 border-orange-700/50',
  pros_cons:  'bg-amber-900/40 text-amber-300 border-amber-700/50',
  verdict:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  cta:        'bg-rose-900/40 text-rose-300 border-rose-700/50',
}

// ── Auth modal ─────────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSwitchMode }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message) }
      else setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* glow */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: '0 0 80px 0 rgba(99,102,241,0.15)' }} />

        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-2xl">
            ⚡
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Entrar na plataforma' : 'Criar sua conta'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Fábrica de Conteúdo</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✉️</div>
            <p className="text-white font-medium">Verifique seu e-mail!</p>
            <p className="text-gray-400 text-sm mt-2">
              Link de confirmação enviado para <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-950/60 border border-red-800/60 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">E-mail</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full text-sm px-3 py-2.5 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Senha</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm px-3 py-2.5 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold text-sm py-2.5 rounded-lg transition-all mt-2 text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-600 mt-5">
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={onSwitchMode} className="text-violet-400 hover:text-violet-300 transition-colors">
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Landing page ───────────────────────────────────────────────────────────────
export default function Landing() {
  const [modal, setModal]       = useState(null)
  const [activeBlueprint, setActiveBlueprint] = useState(0)

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#09090b' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
        .animate-fade-up { animation: fadeUp 0.6s ease both; }
        .animate-glow    { animation: glow-pulse 3s ease-in-out infinite; }
      `}</style>

      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitchMode={() => setModal(m => m === 'login' ? 'signup' : 'login')}
        />
      )}

      {/* ── Ambient glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full animate-glow"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full animate-glow"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 70%)', filter: 'blur(60px)', animationDelay: '1.5s' }} />
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
              <Zap size={14} className="text-violet-400" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">Fábrica de Conteúdo</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal('login')}
              className="text-sm text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              Entrar
            </button>
            <button
              onClick={() => setModal('signup')}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}
            >
              Começar agora
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-8 uppercase"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          A máquina de conteúdo para Afiliados — Powered by OpenAI & ElevenLabs
        </div>

        <h1
          className="animate-fade-up text-5xl md:text-7xl font-black leading-[1.05] tracking-tighter mb-6"
          style={{
            animationDelay: '100ms',
            backgroundImage: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 65%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Transforme Seus Links<br />de Produtos em{' '}
          <span style={{
            backgroundImage: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Vídeos que Vendem.</span>
        </h1>

        {/* Affiliate trust strip */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3 mb-8"
          style={{ animationDelay: '150ms' }}>
          {[
            { icon: '🛒', label: 'Amazon Afiliados' },
            { icon: '🟢', label: 'Shopee' },
            { icon: '📦', label: 'Mercado Livre' },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#d1d5db' }}>
              {icon} {label}
            </span>
          ))}
        </div>

        <p className="animate-fade-up text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ animationDelay: '200ms' }}>
          Cole o link do produto, a IA pesquisa, escreve o roteiro de afiliado e entrega o vídeo pronto para publicar — com voz realista, gancho e CTA que converte.{' '}
          <span className="text-gray-200 font-medium">Mais comissões, zero bloqueio criativo.</span>
        </p>

        <div className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: '300ms' }}>
          <button
            onClick={() => setModal('signup')}
            className="group flex items-center gap-2 w-full sm:w-auto text-white font-bold text-base px-8 py-4 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
          >
            Construir Minha Fábrica de Conteúdo
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => document.getElementById('pipeline').scrollIntoView({ behavior: 'smooth' })}
            className="group flex items-center gap-2 w-full sm:w-auto text-gray-300 hover:text-white font-medium text-base px-8 py-4 rounded-xl transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Ver Engenharia do Sistema
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Live Stats Dashboard ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-2xl p-6 md:p-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold tracking-widest uppercase text-gray-500">
              Dashboard da Fábrica em Tempo Real
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Roteiros Gerados por IA', sub: 'Blueprint Engine', value: 1284, unit: '', color: '#a78bfa' },
              { label: 'Voiceovers Renderizados', sub: 'ElevenLabs Multilingual', value: 847, unit: '', color: '#34d399' },
              { label: 'Handoffs p/ Editores', sub: 'WhatsApp Cloud API', value: 623, unit: '', color: '#60a5fa' },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                <p className="text-4xl font-black tabular-nums" style={{ color: m.color }}>
                  <Counter to={m.value} />
                </p>
                <p className="text-xs text-gray-600">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section id="pipeline" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-600 mb-3">Fluxo completo</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">A Engenharia do Sistema</h2>
        </div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
          {/* connecting line */}
          <div className="hidden md:block absolute top-7 left-[7%] right-[7%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(16,185,129,0.4), transparent)' }} />

          <PipelineNode icon="🔗" label="Link do Produto"    sub="Amazon / ML"      delay={0} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon="🔍" label="Mineração"          sub="SerpAPI + Score"  delay={100} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon="📋" label="Blueprint Engine"   sub="Estrutura validada" delay={200} accent />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon="✍️" label="Roteiro IA"         sub="Claude / GPT"     delay={300} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon="🎙️" label="ElevenLabs Audio"  sub="Voz ultra-realista" delay={400} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon="📲" label="WhatsApp Handoff"   sub="Editor notificado" delay={500} accent />
        </div>
      </section>

      {/* ── Tríade da Escala ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-600 mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">A Tríade da Escala</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '🔍',
              title: 'Mineração & Catálogo Inteligente',
              color: 'border-violet-700/40',
              glow: 'rgba(99,102,241,0.08)',
              desc: 'Encontre produtos magnéticos no MercadoLivre e Amazon automaticamente. Atribua scores e crie um catálogo blindado antes de gastar um único segundo produzindo. Links afiliados encurtados com rastreamento de cliques incluído.',
              tag: 'SerpAPI + Scoring Engine',
            },
            {
              icon: '✍️',
              title: 'Roteirização por Blueprints',
              color: 'border-emerald-700/40',
              glow: 'rgba(16,185,129,0.08)',
              desc: 'Chega de prompts genéricos. Force a IA a seguir estruturas de retenção validadas — Top-N Reviews, Deep Dives ou Comparativos Diretos — para prender a atenção do espectador do primeiro ao último segundo.',
              tag: 'Claude + GPT Blueprint Engine',
            },
            {
              icon: '📲',
              title: 'Handoff Automatizado',
              color: 'border-blue-700/40',
              glow: 'rgba(96,165,250,0.08)',
              desc: 'O sistema gera o áudio MP3, estrutura o roteiro e aciona o editor diretamente no WhatsApp com os links do Supabase Storage. Menos microgerenciamento, mais execução. Agente de comentários ativo 24/7.',
              tag: 'Evolution API + ElevenLabs',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl p-6 border transition-all hover:scale-[1.01]`}
              style={{
                background: `radial-gradient(ellipse at top left, ${f.glow} 0%, rgba(255,255,255,0.01) 60%)`,
                borderColor: f.color.replace('border-', '').replace('/40', ''),
                border: `1px solid`,
              }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">{f.desc}</p>
              <span className="text-xs text-gray-600 font-mono">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Blueprint Previews ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-600 mb-3">Blueprints</p>
          <h2 className="text-3xl font-black text-white">Estruturas de Retenção Validadas</h2>
          <p className="text-gray-500 text-sm mt-2">Selecione o formato. A IA executa a estrutura.</p>
        </div>

        {/* tabs */}
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          {BLUEPRINTS.map((bp, i) => (
            <button
              key={bp.id}
              onClick={() => setActiveBlueprint(i)}
              className={`text-sm font-semibold px-4 py-2 rounded-full transition-all ${
                activeBlueprint === i
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={activeBlueprint === i ? {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 20px rgba(99,102,241,0.3)',
              } : {
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {bp.label}
            </button>
          ))}
        </div>

        {/* blueprint card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            <span className="ml-3 text-xs text-gray-500 font-mono">
              blueprint/{BLUEPRINTS[activeBlueprint].id}.json
            </span>
          </div>
          {/* sections */}
          <div className="p-5 space-y-2">
            {BLUEPRINTS[activeBlueprint].sections.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-gray-600 font-mono text-xs w-4 text-right">{i + 1}</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[s.type] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {s.type}
                </span>
                <span className="text-sm text-gray-200 font-medium flex-1">{s.label}</span>
                <span className="text-xs text-gray-600 shrink-0 font-mono">{s.duration}</span>
                <span className="text-xs text-gray-500 hidden md:block shrink-0 max-w-xs truncate">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4"
            style={{
              backgroundImage: 'linear-gradient(135deg, #ffffff 40%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            Pronto para escalar?
          </h2>
          <p className="text-gray-500 mb-10 text-lg">
            Configure sua fábrica em minutos. Publique mais conteúdo em menos tempo.
          </p>
          <button
            onClick={() => setModal('signup')}
            className="inline-flex items-center gap-3 text-white font-black text-lg px-10 py-4 rounded-2xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 60px rgba(99,102,241,0.5)',
            }}
          >
            Criar conta grátis
            <ArrowRight size={18} />
          </button>
          <p className="text-gray-600 text-xs mt-6">Sem cartão de crédito. Configure e publique no mesmo dia.</p>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-gray-700"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap size={10} className="text-violet-500" />
          <span>Fábrica de Conteúdo</span>
        </div>
        © 2026 Clube MKT Digital · Todos os direitos reservados
      </footer>
    </div>
  )
}
