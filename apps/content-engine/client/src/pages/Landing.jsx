import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronRight, Zap, ArrowRight, Eye, EyeOff, TrendingUp, FileText, Mic, Send,
  Mail, Package, ShoppingCart, Bot, MessageCircle, Search, BarChart3, Layers } from 'lucide-react'
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
function PipelineNode({ icon: Icon, label, sub, accent = false, delay = 0 }) {
  return (
    <div
      className="flex flex-col items-center gap-2 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
        ${accent
          ? 'border shadow-lg'
          : 'bg-white/[0.04] border border-white/[0.08]'}
      `}
        style={accent ? {
          background: 'rgba(193,255,47,0.10)',
          border: '1px solid rgba(193,255,47,0.35)',
          boxShadow: '0 0 24px rgba(193,255,47,0.18)',
        } : {}}
      >
        <Icon size={22} style={{ color: accent ? '#C1FF2F' : 'rgba(255,255,255,0.80)' }} />
        {accent && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping"
            style={{ background: '#C1FF2F' }} />
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
    label: 'Top 5',
    sections: [
      { type: 'intro',   label: 'Abertura com gancho de curiosidade', duration: '60s',  note: 'Revela fato surpresa do produto #1 sem nomear' },
      { type: 'product', label: 'Critérios de Seleção',               duration: '45s',  note: 'Metodologia — preço, avaliações, durabilidade' },
      { type: 'product', label: 'Produto #5 → #2',                    duration: '90s',  note: 'Análise + gancho de retenção em cada posição' },
      { type: 'product', label: 'Produto #1 — Campeão Absoluto',      duration: '150s', note: 'Revelação, argumentos e veredicto definitivo' },
      { type: 'cta',     label: 'CTA Final',                          duration: '45s',  note: 'Link na descrição — nunca cita loja pelo nome' },
    ],
  },
  {
    id: 'comparacao',
    label: '1x1',
    sections: [
      { type: 'intro',      label: 'Abertura — Diferença de Preço',   duration: '60s',  note: 'Cria tensão com o delta de preço logo na abertura' },
      { type: 'product',    label: 'Apresentação dos Dois',            duration: '90s',  note: 'Nome, preço, avaliações e posicionamento' },
      { type: 'comparison', label: 'Design, Build & Performance',      duration: '120s', note: 'Vencedor declarado em cada quesito — sem cima do muro' },
      { type: 'verdict',    label: 'Veredicto Final',                  duration: '75s',  note: 'Vencedor absoluto + perfil de comprador ideal' },
      { type: 'cta',        label: 'CTA Final',                       duration: '45s',  note: 'Links na descrição + pergunta para comentários' },
    ],
  },
  {
    id: 'review',
    label: 'Review',
    sections: [
      { type: 'intro',     label: 'Abertura — O Fato Mais Surpreendente', duration: '60s',  note: 'Sem "hoje vou falar sobre..." — cria razão pra assistir' },
      { type: 'product',   label: 'Visão Geral + Unboxing',               duration: '90s',  note: 'Preço, avaliações, primeiras impressões honestas' },
      { type: 'demo',      label: 'Funcionalidades & Testes Reais',        duration: '150s', note: 'Resultados com números — credibilidade máxima' },
      { type: 'pros_cons', label: 'Prós e Contras',                        duration: '90s',  note: '3–4 positivos reais + 1–2 negativos honestos' },
      { type: 'verdict',   label: 'Para Quem Vale a Pena?',                duration: '60s',  note: 'Perfil ideal + quando evitar + alternativas' },
      { type: 'cta',       label: 'CTA Final',                             duration: '45s',  note: 'Link afiliado + pergunta que provoca comentários' },
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
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPwd]  = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(false)

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
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-2xl relative"
        style={{
          background: 'rgba(15,15,22,0.95)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: '0 0 80px 0 rgba(193,255,47,0.08)' }} />

        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(193,255,47,0.10)', border: '1px solid rgba(193,255,47,0.25)' }}>
            <Zap size={22} style={{ color: '#C1FF2F' }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Entrar na plataforma' : 'Criar sua conta'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Fábrica de Conteúdo · Clube MKT</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-3"><Mail size={36} style={{ color: '#C1FF2F' }} /></div>
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
                className="w-full text-sm px-3 py-2.5 rounded-lg text-white placeholder-gray-600 focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm px-3 py-2.5 pr-10 rounded-lg text-white placeholder-gray-600 focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold text-sm py-2.5 rounded-lg transition-all mt-2"
              style={{ background: '#C1FF2F', color: '#07070B' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-600 mt-5">
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={onSwitchMode} style={{ color: '#C1FF2F' }}
            className="hover:opacity-80 transition-opacity">
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, tag, accentColor, delay = 0 }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="opacity-0 animate-fade-up rounded-2xl p-6 transition-all duration-300"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
        background: hovered
          ? `rgba(255,255,255,0.04)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? accentColor + '55' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? `0 8px 40px rgba(0,0,0,0.4), 0 0 32px ${accentColor}18` : 'none',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accentColor + '18', border: `1px solid ${accentColor}30` }}>
        <Icon size={18} style={{ color: accentColor }} strokeWidth={2} />
      </div>
      <h3 className="font-bold text-white text-base mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-4">{desc}</p>
      <span className="text-[11px] font-mono" style={{ color: accentColor + 'aa' }}>{tag}</span>
    </div>
  )
}

// ── Landing page ───────────────────────────────────────────────────────────────
export default function Landing() {
  const [modal, setModal]                   = useState(null)
  const [activeBlueprint, setActiveBlueprint] = useState(0)

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#07070B' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.70; }
        }
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-fade-up  { animation: fadeUp 0.55s ease both; }
        .animate-glow     { animation: glow-pulse 4s ease-in-out infinite; }
        .animate-scroll   { animation: scroll-left 28s linear infinite; }
        .lime-text        { color: #C1FF2F; }
        .lime-border      { border-color: rgba(193,255,47,0.30); }
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full animate-glow"
          style={{ background: 'radial-gradient(ellipse, rgba(193,255,47,0.07) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-0 w-[700px] h-[500px] rounded-full animate-glow"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animationDelay: '2s' }} />
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(7,7,11,0.90)', backdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(193,255,47,0.12)', border: '1px solid rgba(193,255,47,0.25)' }}>
              <Zap size={14} style={{ color: '#C1FF2F' }} />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">Fábrica de Conteúdo</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal('login')}
              className="text-sm text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Entrar
            </button>
            <button
              onClick={() => setModal('signup')}
              className="text-sm font-bold px-4 py-2 rounded-lg transition-all"
              style={{ background: '#C1FF2F', color: '#07070B', boxShadow: '0 0 24px rgba(193,255,47,0.30)' }}
            >
              Começar agora
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-16 text-center">

        {/* badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-8 uppercase"
          style={{ background: 'rgba(193,255,47,0.08)', border: '1px solid rgba(193,255,47,0.22)', color: '#C1FF2F' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-ping inline-block" style={{ background: '#C1FF2F' }} />
          Powered by OpenAI · ElevenLabs · SerpAPI
        </div>

        <h1
          className="animate-fade-up text-5xl md:text-7xl font-black leading-[1.04] tracking-tighter mb-6"
          style={{ animationDelay: '80ms' }}
        >
          <span className="text-white">Do produto ao vídeo.</span>
          <br />
          <span style={{
            backgroundImage: 'linear-gradient(90deg, #C1FF2F 0%, #00FFB9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Em minutos, não dias.</span>
        </h1>

        <p className="animate-fade-up text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed"
          style={{ animationDelay: '160ms' }}>
          A Fábrica minera produtos do MercadoLivre e Amazon, gera roteiros com estruturas de retenção validadas,
          narra em voz realista e entrega o pacote completo para o seu editor — tudo no automático.
        </p>

        <p className="animate-fade-up text-sm text-gray-600 mb-10"
          style={{ animationDelay: '200ms' }}>
          Mais vídeos publicados. Mais links de afiliado convertendo.{' '}
          <span className="text-gray-400 font-medium">Zero bloqueio criativo.</span>
        </p>

        {/* Marketplace trust strip */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-2 mb-10"
          style={{ animationDelay: '220ms' }}>
          {[
            { icon: Package, label: 'Mercado Livre' },
            { icon: ShoppingCart, label: 'Amazon Afiliados' },
            { icon: Bot, label: 'OpenAI / Claude' },
            { icon: Mic, label: 'ElevenLabs' },
            { icon: MessageCircle, label: 'WhatsApp Handoff' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
              <Icon size={13} /> {label}
            </span>
          ))}
        </div>

        <div className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: '280ms' }}>
          <button
            onClick={() => setModal('signup')}
            className="group flex items-center gap-2 w-full sm:w-auto font-black text-base px-8 py-4 rounded-xl transition-all"
            style={{ background: '#C1FF2F', color: '#07070B', boxShadow: '0 0 48px rgba(193,255,47,0.35)' }}
          >
            Quero minha Fábrica de Conteúdo
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => document.getElementById('pipeline').scrollIntoView({ behavior: 'smooth' })}
            className="group flex items-center gap-2 w-full sm:w-auto text-gray-400 hover:text-white font-medium text-base px-8 py-4 rounded-xl transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.09)' }}
          >
            Ver como funciona
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-2xl p-6 md:p-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full animate-ping" style={{ background: '#C1FF2F' }} />
            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-600">
              Fábrica operando agora
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Roteiros Gerados', sub: 'Blueprint Engine · IA',           value: 1284 },
              { label: 'Narrações Renderizadas', sub: 'ElevenLabs Multilingual',    value: 847  },
              { label: 'Entregas ao Editor',  sub: 'WhatsApp Cloud API',            value: 623  },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-5xl font-black tabular-nums" style={{ color: '#C1FF2F', letterSpacing: '-0.05em' }}>
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
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(193,255,47,0.6)' }}>Pipeline completo</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Do nicho ao vídeo publicado</h2>
          <p className="text-gray-500 text-base mt-3 max-w-xl mx-auto">
            Seis etapas automatizadas. Você supervisiona. A máquina executa.
          </p>
        </div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
          {/* connecting line */}
          <div className="hidden md:block absolute top-7 left-[7%] right-[7%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(193,255,47,0.25), rgba(0,255,185,0.25), transparent)' }} />

          <PipelineNode icon={Search} label="Mineração"        sub="ML · Amazon · Google"   delay={0} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon={BarChart3} label="Score & Catálogo" sub="Relevância + Afiliados"  delay={100} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon={Layers} label="Blueprint Engine" sub="Top 5, 10, 1x1, Review"  delay={200} accent />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon={FileText} label="Roteiro IA"       sub="OpenAI · Claude"         delay={300} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon={Mic} label="Narração"        sub="ElevenLabs Realista"      delay={400} />
          <div className="text-gray-700 font-bold hidden md:block text-xl">→</div>
          <PipelineNode icon={Send} label="Handoff"          sub="Editor via WhatsApp"      delay={500} accent />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(193,255,47,0.6)' }}>O que você ganha</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Quatro módulos. Um sistema.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FeatureCard
            icon={TrendingUp}
            title="Mineração & Catálogo com Score de Oportunidade"
            desc="Busca automática no Mercado Livre, Amazon e Google Shopping. Cada produto recebe um score baseado em avaliações reais, volume de vendas, preço e concorrência — para você saber exatamente o que vale produzir antes de gravar um segundo."
            tag="SerpAPI · ML Direct API · Scoring Engine"
            accentColor="#C1FF2F"
            delay={0}
          />
          <FeatureCard
            icon={FileText}
            title="Roteirização por Blueprints com Estrutura de Retenção"
            desc="Chega de prompts soltos. A IA segue blueprints de retenção validados — Top 5, Comparativo 1x1 ou Review Detalhado — com ganchos, seções cronometradas e CTAs que não citam lojas pelo nome. Resultado: vídeos que as pessoas assistem até o final."
            tag="OpenAI · Claude · Blueprint Engine"
            accentColor="#00FFB9"
            delay={100}
          />
          <FeatureCard
            icon={Mic}
            title="Narração Realista Multilíngue"
            desc="O roteiro gerado vai direto para o ElevenLabs e volta como MP3 com voz ultra-realista. Suporte a português, inglês e espanhol. O arquivo fica salvo no Supabase Storage e disponível para o editor com um clique."
            tag="ElevenLabs · Supabase Storage · PT · EN · ES"
            accentColor="#818cf8"
            delay={200}
          />
          <FeatureCard
            icon={Send}
            title="Handoff Automatizado & Agente de Comentários"
            desc="Quando o pacote está pronto, o sistema notifica o editor direto no WhatsApp com o link do roteiro e do áudio. Paralelamente, o agente de comentários do YouTube responde dúvidas sobre produtos 24/7 — mantendo o engajamento no piloto automático."
            tag="WhatsApp Cloud API · YouTube Data API · IA"
            accentColor="#FF6B2B"
            delay={300}
          />
        </div>
      </section>

      {/* ── Blueprint Previews ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(193,255,47,0.6)' }}>Blueprints</p>
          <h2 className="text-3xl font-black text-white">Estruturas que prendem a atenção</h2>
          <p className="text-gray-500 text-sm mt-2">
            Cada formato tem seções cronometradas, ganchos obrigatórios e regras de CTA. A IA não improvisa.
          </p>
        </div>

        {/* tabs */}
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          {BLUEPRINTS.map((bp, i) => (
            <button
              key={bp.id}
              onClick={() => setActiveBlueprint(i)}
              className="text-sm font-semibold px-4 py-2 rounded-full transition-all"
              style={activeBlueprint === i ? {
                background: '#C1FF2F',
                color: '#07070B',
                boxShadow: '0 0 20px rgba(193,255,47,0.30)',
              } : {
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.40)',
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
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(193,255,47,0.60)' }} />
            <span className="ml-3 text-xs text-gray-500 font-mono">
              blueprint/{BLUEPRINTS[activeBlueprint].id}.json
            </span>
          </div>
          {/* sections */}
          <div className="p-5 space-y-2">
            {BLUEPRINTS[activeBlueprint].sections.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-gray-600 font-mono text-xs w-4 text-right shrink-0">{i + 1}</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[s.type] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {s.type}
                </span>
                <span className="text-sm text-gray-200 font-medium flex-1 truncate">{s.label}</span>
                <span className="text-xs text-gray-600 shrink-0 font-mono">{s.duration}</span>
                <span className="text-xs text-gray-500 hidden md:block shrink-0 max-w-[260px] truncate">{s.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / manifesto strip ── */}
      <section className="border-y py-14" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl md:text-3xl font-black text-white leading-snug mb-4">
            "Criadores que publicam mais, ganham mais. <br />
            <span style={{ color: '#C1FF2F' }}>A Fábrica garante que você nunca fique sem conteúdo.</span>"
          </p>
          <p className="text-gray-600 text-sm">
            Clube MKT Digital · Fábrica de Conteúdo v1.0
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-3xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-8 uppercase"
          style={{ background: 'rgba(193,255,47,0.08)', border: '1px solid rgba(193,255,47,0.20)', color: '#C1FF2F' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-ping inline-block" style={{ background: '#C1FF2F' }} />
          Sem cartão de crédito
        </div>

        <h2 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
          <span className="text-white">Sua fábrica está</span><br />
          <span style={{
            backgroundImage: 'linear-gradient(90deg, #C1FF2F 0%, #00FFB9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>esperando por você.</span>
        </h2>

        <p className="text-gray-500 mb-10 text-lg max-w-md mx-auto">
          Configure em minutos. Publique no mesmo dia. Escale sem contratar.
        </p>

        <button
          onClick={() => setModal('signup')}
          className="inline-flex items-center gap-3 font-black text-lg px-12 py-5 rounded-2xl transition-all"
          style={{
            background: '#C1FF2F',
            color: '#07070B',
            boxShadow: '0 0 70px rgba(193,255,47,0.45)',
          }}
        >
          Criar minha conta grátis
          <ArrowRight size={20} />
        </button>

        <p className="text-gray-700 text-xs mt-6">
          Acesso imediato · Configure e publique no mesmo dia
        </p>
      </section>

      <footer className="border-t py-10 text-center"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(193,255,47,0.10)', border: '1px solid rgba(193,255,47,0.20)' }}>
            <Zap size={10} style={{ color: '#C1FF2F' }} />
          </div>
          <span className="text-sm font-bold text-white">Fábrica de Conteúdo</span>
        </div>
        <p className="text-xs text-gray-700">© 2026 Clube MKT Digital · Todos os direitos reservados</p>
      </footer>
    </div>
  )
}
