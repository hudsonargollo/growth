import { useEffect, useState } from 'react'
import LeadForm from '../components/LeadForm.jsx'
import DockedVSL from '../components/DockedVSL.jsx'
import UrgencyBar from '../components/UrgencyBar.jsx'
import { captureAttribution, trackVisit } from '../lib/api.js'
import { motion, Reveal, Stagger, CountUp, Parallax, EASE } from '../components/motion.jsx'
import { TrackerMonolith, SealBlueprint } from '../components/illustrations.jsx'
import { IsoLayers, IsoData, Sparkles } from '../components/scenesV2.jsx'
import {
  PlaneLanding, ShieldCheck, ShoppingBag, Users, Sun, Stamp, PlaneTakeoff,
} from 'lucide-react'
import {
  SealCheck, Checklist, Community, CoinsPercent, Tracker, Star, ThumbsUp,
} from '../components/doodleIcons.jsx'

const PRICE = '25.000'
const LOGO = '/brand/logo-icon-trans.webp'
const LOGO_FEATURE = '/brand/logo-highres.webp' // gold-on-leather, for the brand seal band
const PEDRO = '/brand/pedro-silvestrini.webp'
const DOC = '/brand/documento.webp' // residency document photo (optional; placeholder until added)
const SEAL = {
  shield: '/brand/seal-shield.webp',
  map: '/brand/seal-map.webp',
  money: '/brand/seal-money.webp',
  doc: '/brand/seal-doc.webp',
  chart: '/brand/seal-chart.webp',
}
const VSL_SRC = 'https://www.youtube.com/watch?v=Qh24_Bc1Jqs'

const DAYS = [
  ['01', 'Domingo', 'Você chega', PlaneLanding,
    'Check-in e jantar com o grupo. Todo mundo se apresenta e a semana começa.'],
  ['02', 'Segunda', 'O processo começa', ShieldCheck,
    'Você é conduzido ao lugar correto. A fila certa, na hora certa, pedindo o documento certo.'],
  ['03', 'Terça', 'Momento de aproveitar os lugares certos e pagar mais barato por presentes', ShoppingBag,
    'Tour de compras. Eletrônicos e produtos importados a preço de fronteira. À noite, livre.'],
  ['04', 'Quarta', 'O networking de verdade. Em grande estilo.', Users,
    'Churrasco e rodada de hot seat. Seu negócio é apresentado pro grupo. Saem conexões, parcerias e soluções.'],
  ['05', 'Quinta', 'Momento livre', Sun,
    'Para aprofundar conversas ou explorar a cidade.'],
  ['06', 'Sexta', 'A residência fica pronta', Stamp,
    'Residência protocolada. Voltamos à Interpol e seguimos ao Departamento de Migração. Está feito.'],
  ['07', 'Sábado', 'Você volta ao Brasil', PlaneTakeoff,
    'Você volta ao Brasil com a residência no bolso e contatos que podem mudar o seu ano.'],
]

const ETAPAS = [
  [Checklist, 'Preparação blindada', 'Pré-embarque',
    'Nada de "descobrir na hora". Você recebe nosso checklist exclusivo e a orientação exata dos documentos ainda no Brasil. Sua única missão é reunir a papelada — nós cuidamos da estratégia de validação para você chegar com tudo pronto para protocolar.'],
  [Star, 'Imersão estratégica', 'Os 7 dias',
    'Casa de alto padrão desenhada para convivência. Condução VIP em cada protocolo — Polícia, Interpol, Migrações — sem fila errada, sem balcão equivocado. Networking de elite onde seu negócio é analisado pela sala. E a logística invisível da Andressa cuidando de transporte, horários e segurança.'],
  [ThumbsUp, 'Resultado', 'O retorno',
    'Você volta ao Brasil com o processo de residência protocolado e andando, e com uma rede de contatos que vale mais que o próprio investimento. Você não sai com um "plano" — sai com a coisa feita.'],
]

const TURMAS = [
  ['Turma 1', '12/07', '19/07'],
  ['Turma 2', '19/07', '26/07'],
  ['Turma 3', '26/07', '02/08'],
  ['Turma 4', '02/08', '09/08'],
  ['Turma 5', '09/08', '16/08'],
]
const WEEK = [
  ['Dom', 'Chegada e jantar', PlaneLanding], ['Seg', 'Interpol + Polícia', ShieldCheck], ['Ter', 'Tour de compras', ShoppingBag],
  ['Qua', 'Churrasco + Hot seat', Users], ['Qui', 'Dia livre', Sun], ['Sex', 'Residência protocolada', Stamp], ['Sáb', 'Retorno', PlaneTakeoff],
]

function Eyebrow({ children }) { return <p className="eyebrow mb-4">{children}</p> }
function SealTile({ src, label, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <motion.figure whileHover={{ y: -5, scale: 1.03 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="text-center">
        <img src={src} alt={label} loading="lazy" className="w-full max-w-[200px] mx-auto"
          style={{ filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.55))' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <figcaption className="eyebrow text-sand/70 mt-3" style={{ fontSize: 9 }}>{label}</figcaption>
      </motion.figure>
    </Reveal>
  )
}
function Section({ id, children, className = '' }) {
  return <section id={id} className={`py-20 sm:py-28 ${className}`}><div className="shell">{children}</div></section>
}
function Cta({ href, children, foil = false }) {
  return (
    <motion.a href={href} className={`cta-bar ${foil ? 'cta-bar--foil' : ''}`}
      style={foil ? { color: '#141618', borderColor: '#c7b79c' } : undefined}
      whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      {children}
    </motion.a>
  )
}

export default function LandingV2() {
  const [unlocked, setUnlocked] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [scrollFreed, setScrollFreed] = useState(false) // true after the first 10s lock
  useEffect(() => { captureAttribution(); trackVisit('landing') }, [])

  // Scroll is locked before the video starts (hero gate) and for the first 10s
  // after it's triggered — then it frees up so the visitor can scroll into the page.
  useEffect(() => {
    if (!unlocked) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      document.body.style.overflow = ''
      setScrollFreed(true)
      // Auto-nudge: minimize the video into the corner and ease the page down
      // into the content — no awkward "scroll down" copy needed.
      setTucked(true)
      window.scrollTo({ top: Math.round(window.innerHeight * 0.82), behavior: 'smooth' })
    }, 10000)
    return () => { clearTimeout(t); document.body.style.overflow = '' }
  }, [unlocked])

  // Once the visitor starts scrolling, tuck the big player into the corner.
  useEffect(() => {
    if (!unlocked) return
    const onScroll = () => { if (window.scrollY > 40) setTucked(true) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [unlocked])

  return (
    <main>
      <UrgencyBar onCta={() => { if (!unlocked) setUnlocked(true); else document.getElementById('aplicar')?.scrollIntoView({ behavior: 'smooth' }) }} />
      {/* ── HERO — copy left, VSL 9:16 right ── */}
      <header className="border-b border-mineral/15 overflow-hidden">
        <Section className="!py-16 sm:!py-24">
          <div className="max-w-3xl">
            <Reveal>
              <div className="flex items-center gap-3 mb-6">
                <img src={LOGO} alt="O Código Internacional" className="w-11 h-11 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="eyebrow !mb-0">O Código Internacional</span>
              </div>
            </Reveal>
            <Reveal delay={0.08} as="h1">
              <span className="text-4xl sm:text-5xl font-light leading-[1.08] tracking-tight block">
                Como fazer parte do grupo de empresários brasileiros que estão{' '}
                <span className="font-semibold">zerando o imposto</span> em 7 dias no Paraguai.
              </span>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-7 text-lg sm:text-xl text-mineral/75 max-w-2xl leading-relaxed font-light">
                Em 7 dias no Paraguai, você sai com a residência fiscal no bolso.
                <span className="whisper block mt-2">Tudo feito pelos órgãos oficiais do governo.</span>
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 max-w-md">
                <motion.button
                  type="button"
                  onClick={() => setUnlocked(true)}
                  className="cta-bar w-full"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  Iniciar processo de seleção
                </motion.button>
              </div>
            </Reveal>
            {!unlocked && (
              <motion.p className="eyebrow mt-6" style={{ color: 'rgba(20,22,24,0.4)' }}
                animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }}>
                Assista ao vídeo para liberar o conteúdo ↓
              </motion.p>
            )}
          </div>
        </Section>
      </header>

      {/* Everything past the hero is gated behind the video CTA. */}
      {unlocked && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

      {/* ── HOOK — o rastreador ── */}
      <Section className="bg-mineral bg-tex text-ivory overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          <div className="max-w-2xl">
            <Reveal>
              <p className="text-2xl sm:text-3xl font-light leading-snug">
                Enquanto o seu CPF for residente fiscal brasileiro, ele funciona como um <span className="whisper text-sand">rastreador</span> no seu dinheiro.
              </p>
            </Reveal>
            <hr className="rule my-9" style={{ borderColor: 'rgba(199,183,156,0.25)' }} />
            <Stagger className="space-y-5 text-ivory/75 text-lg font-light leading-relaxed">
              <Stagger.Item><p className="text-ivory">Se você consegue a residência no Paraguai legalmente, o rastreador desliga.</p></Stagger.Item>
              <Stagger.Item><p>Você fecha o mês e o dinheiro é seu.</p></Stagger.Item>
              <Stagger.Item><p>O patrimônio que o Brasil taxava todo ano, ninguém toca.</p></Stagger.Item>
            </Stagger>
          </div>
          <TrackerMonolith className="w-48 sm:w-60 mx-auto text-sand" />
        </div>
      </Section>

      {/* ── 7 DAYS ── */}
      <Section className="bg-ivory-deep overflow-hidden">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-12">
          <div>
            <Reveal><Eyebrow>Do aeroporto ao documento</Eyebrow></Reveal>
            <Reveal delay={0.08}><h2 className="text-3xl sm:text-4xl font-light leading-tight mb-5">O que acontece em cada um dos 7 dias.</h2></Reveal>
            <Reveal delay={0.14}>
              <p className="text-mineral/70 font-light leading-relaxed mb-12 max-w-xl">
                Antes de embarcar, a gente já se conhece: você preenche um formulário, conta sobre a sua empresa e os seus objetivos, a gente lê, analisa, e só depois confirma a sua vaga. A Andressa cuida de tudo que você não deveria precisar pensar — aeroporto, transporte, cronograma, segurança. Você chega, ela já está lá.
              </p>
            </Reveal>
            <div className="relative">
              <Stagger gap={0.12}>
                {DAYS.map(([n, day, title, Icon, body], i) => (
                  <Stagger.Item key={n}>
                    <div className="relative pl-[60px] pb-12 last:pb-0">
                      {/* connector to the next node */}
                      {i < DAYS.length - 1 && (
                        <span className="absolute left-5 top-11 bottom-0 w-px" style={{ background: 'rgba(20,22,24,0.2)' }} />
                      )}
                      {/* icon node — its centre aligns with the DIA badge */}
                      <div className="absolute left-0 top-0 z-10 w-10 h-10 rounded-full grid place-items-center"
                        style={{ background: 'var(--color-ivory)', border: '1.5px solid var(--color-green)', boxShadow: '0 2px 8px rgba(20,22,24,0.08)' }}>
                        <Icon size={17} strokeWidth={1.75} className="text-green" />
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap" style={{ minHeight: 40 }}>
                        <span className="data" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-green)', background: 'rgba(46,74,67,0.08)', border: '1px solid rgba(46,74,67,0.2)', borderRadius: 999, padding: '2px 9px' }}>Dia {n}</span>
                        <span className="eyebrow !mb-0">{day}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold mt-1.5 leading-snug">{title}</h3>
                      <p className="text-mineral/70 mt-1.5 font-light leading-relaxed text-[15px]">{body}</p>
                    </div>
                  </Stagger.Item>
                ))}
              </Stagger>
            </div>
          </div>
          <Parallax distance={30} className="hidden lg:flex items-start justify-center pt-16">
            <IsoLayers className="w-full max-w-xs text-mineral" />
          </Parallax>
        </div>
      </Section>

      {/* ── NETWORKING ── */}
      <Section className="bg-green bg-tex-green text-ivory overflow-hidden">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <div className="max-w-2xl">
            <Reveal><div className="flex items-center gap-3 mb-4"><Community className="w-8 h-8 text-sand" /><span className="eyebrow !mb-0 text-sand">A conversa de jantar</span></div></Reveal>
            <Reveal delay={0.08}><h2 className="text-3xl sm:text-4xl font-light leading-tight">Vale mais que <span className="font-semibold">um ano de consultoria</span>.</h2></Reveal>
            <Stagger className="space-y-6 mt-9 text-lg text-ivory/80 font-light leading-relaxed" gap={0.08}>
              <Stagger.Item><p className="text-xl text-ivory">Um contato feito nessa mesa pode pagar a viagem inteira.</p></Stagger.Item>
              <Stagger.Item><p>Dez empresários sob o mesmo teto por sete dias. Cada um apresenta sua empresa, onde está travado, o que está buscando.</p></Stagger.Item>
              <Stagger.Item><p className="border-l-2 border-sand pl-6 text-ivory">Você sai com a residência no bolso e 9 contatos no celular que valem mais que o processo inteiro.</p></Stagger.Item>
            </Stagger>
          </div>
          <Parallax distance={24} className="hidden lg:block"><IsoData className="w-full text-sand" /></Parallax>
        </div>
      </Section>

      {/* ── ETAPAS ── */}
      <Section>
        <div className="max-w-4xl">
          <Reveal><Eyebrow>Antes de você pousar no Paraguai</Eyebrow></Reveal>
          <Reveal delay={0.08}><h2 className="text-3xl sm:text-4xl font-light leading-tight mb-12">Tudo já está pronto.</h2></Reveal>
          <Stagger className="grid gap-px bg-mineral/15 border border-mineral/15 sm:grid-cols-3" gap={0.12}>
            {ETAPAS.map(([Icon, title, sub, body]) => (
              <Stagger.Item key={title}>
                <div className="bg-ivory p-7 h-full">
                  <Icon className="w-9 h-9 text-green mb-4" />
                  <span className="eyebrow">{sub}</span>
                  <h3 className="text-xl font-semibold mt-1.5">{title}</h3>
                  <p className="text-mineral/75 mt-2 font-light leading-relaxed text-[15px]">{body}</p>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>
        </div>
      </Section>

      {/* ── PEDRO ── */}
      <Section className="bg-ivory-deep">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <figure className="relative max-w-sm mx-auto lg:mx-0">
              <div className="border border-mineral/25 p-3 bg-ivory">
                <div className="aspect-[4/5] overflow-hidden bg-mineral relative">
                  <img src={PEDRO} alt="Pedro Silvestrini" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div className="flex items-center justify-between px-1 pt-3 pb-1">
                  <span className="data text-[10px] tracking-[0.22em] uppercase text-mineral/45">Founder Seat · 01/05</span>
                  <span className="eyebrow !mb-0">Tektone</span>
                </div>
              </div>
            </figure>
          </Reveal>
          <div className="max-w-xl">
            <Reveal><Eyebrow>Quem te conduz</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <h2 className="text-3xl sm:text-4xl font-light leading-tight">
                E quem te conduz nisso sou eu, <span className="font-semibold">Pedro Silvestrini</span>, e minha equipe.
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-6 text-lg text-mineral/80 font-light leading-relaxed">
                Toda a agenda, o transporte e a documentação foram preparados para que a sua residência seja entregue em 7 dias, pelos órgãos oficiais do governo. Eu fiz esse processo na própria pele — e conduzo cada empresário, balcão por balcão, até estar protocolado e andando.
              </p>
            </Reveal>
            <Reveal delay={0.2}><p className="whisper text-xl mt-6">Ordo Tekhnē. Permanentia.</p></Reveal>
          </div>
        </div>
      </Section>

      {/* ── TURMAS ── */}
      <Section>
        <div className="max-w-3xl">
          <Reveal><Eyebrow>Cinco turmas · uma por semana</Eyebrow></Reveal>
          <Reveal delay={0.08}><h2 className="text-3xl sm:text-4xl font-light leading-tight">Escolha a semana que você volta com a residência no bolso.</h2></Reveal>
          <Stagger className="grid grid-cols-2 sm:grid-cols-5 gap-px mt-10 bg-mineral/15 border border-mineral/15" gap={0.1}>
            {TURMAS.map(([t, start, end]) => (
              <Stagger.Item key={t}>
                <div className="bg-ivory p-6 text-center h-full">
                  <p className="data text-2xl text-mineral leading-none">{start}</p>
                  <p className="data text-mineral/45 mt-1" style={{ fontSize: 11 }}>a {end}</p>
                  <p className="eyebrow mt-2">{t}</p>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>
          <Reveal>
            <p className="eyebrow mt-10 mb-3">A semana, dia a dia</p>
            <Stagger className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-mineral/15 border border-mineral/15" gap={0.06}>
              {WEEK.map(([day, label, Icon]) => (
                <Stagger.Item key={day}>
                  <div className="bg-ivory h-full p-4 flex flex-col items-center text-center gap-2.5">
                    <span className="eyebrow !mb-0">{day}</span>
                    <Icon size={22} strokeWidth={1.75} className="text-green" />
                    <span className="text-mineral/80 font-light text-[12.5px] leading-snug">{label}</span>
                  </div>
                </Stagger.Item>
              ))}
            </Stagger>
          </Reveal>
        </div>
      </Section>

      {/* ── BRAND SEAL — emblema + carimbos ── */}
      <Section className="bg-mineral bg-tex text-ivory overflow-hidden !py-20 sm:!py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid items-center gap-8 lg:gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* tiles à esquerda */}
            <div className="order-2 lg:order-1 grid grid-cols-2 lg:grid-cols-1 gap-7 lg:gap-12 lg:justify-items-end">
              <SealTile src={SEAL.map} label="Residência internacional" delay={0.1} />
              <SealTile src={SEAL.money} label="Imposto zerado" delay={0.2} />
            </div>

            {/* emblema central */}
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-[230px] sm:max-w-[300px]">
              <motion.img
                src={SEAL.shield}
                alt="O Código Internacional"
                className="w-full"
                style={{ filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.6))' }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1, ease: EASE }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full text-sand pointer-events-none" aria-hidden>
                <Sparkles points={[[28, 50, 6, 0], [272, 60, 5, 0.8], [44, 252, 5, 1.4], [276, 240, 6, 0.5], [150, 18, 4, 1.1]]} />
              </svg>
            </div>

            {/* tiles à direita */}
            <div className="order-3 grid grid-cols-2 lg:grid-cols-1 gap-7 lg:gap-12 lg:justify-items-start">
              <SealTile src={SEAL.doc} label="Documento oficial" delay={0.15} />
              <SealTile src={SEAL.chart} label="Patrimônio que cresce" delay={0.25} />
            </div>
          </div>

          <div className="text-center mt-12 sm:mt-16">
            <Reveal delay={0.1}>
              <p className="whisper text-xl sm:text-2xl max-w-xl mx-auto">
                O selo de quem já fez o caminho — e tem os carimbos para provar.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="eyebrow text-sand mt-5">Ordo Tekhnē · Permanentia</p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ── PRICE ── */}
      <Section className="bg-mineral bg-tex text-ivory">
        <div className="max-w-3xl">
          <Reveal><div className="flex items-center gap-3 mb-4"><CoinsPercent className="w-8 h-8 text-sand" /><span className="eyebrow !mb-0 text-sand">O investimento</span></div></Reveal>
          <Reveal delay={0.06}><h2 className="text-3xl sm:text-4xl font-light leading-tight">R$ <CountUp value={162} suffix=".000" /> por ano… ou R$ <CountUp value={25} suffix=".000" /> uma vez.</h2></Reveal>
          <div className="grid sm:grid-cols-2 gap-px mt-9 bg-ivory/15 border border-ivory/15">
            <div className="bg-mineral p-8">
              <div className="flex items-center gap-2.5 mb-3">
                <Tracker className="w-5 h-5 text-sand shrink-0" />
                <p className="eyebrow text-sand !mb-0">O que o imposto custa</p>
              </div>
              <p className="data text-3xl sm:text-4xl text-ivory mt-3">R$ 162.000<span className="text-lg text-ivory/50"> /ano</span></p>
              <p className="text-ivory/60 mt-3 font-light text-sm leading-relaxed">Faturando R$ 50k/mês e entregando 27% ao governo, são R$ 13.500 por mês saindo do seu bolso.</p>
            </div>
            <div className="bg-mineral p-8 border-l border-sand/30">
              <div className="flex items-center gap-2.5 mb-3">
                <SealCheck className="w-5 h-5 text-sand shrink-0" />
                <p className="eyebrow text-sand !mb-0">O Código Internacional</p>
              </div>
              <p className="data text-3xl sm:text-4xl text-ivory mt-3">R$ {PRICE}<span className="text-lg text-ivory/50"> uma vez</span></p>
              <p className="text-ivory/60 mt-3 font-light text-sm leading-relaxed">Em 12× de R$ 2.083 — cerca de R$ 70 por dia. Hospedagem, transporte, condução e networking inclusos.</p>
            </div>
          </div>
          <Reveal>
            <div className="mt-9 space-y-5 text-ivory/75 font-light leading-relaxed">
              <p>Se você fatura R$ 50k por mês e entrega 27% ao governo, são <strong className="text-ivory">R$ 162.000 por ano</strong>. O Código Internacional custa <strong className="text-ivory">R$ 25.000</strong>, com hospedagem, transporte e condução inclusos.</p>
              <p>Dividido em 12×: <strong className="text-ivory">R$ 2.083,00</strong>.</p>
              <p className="whisper text-sand text-xl">São 5 turmas. Uma por semana. Quando fechar, fechou.</p>
            </div>
            <div className="mt-9 max-w-md"><Cta href="#aplicar" foil>Quero minha vaga no Código Internacional</Cta></div>
          </Reveal>
        </div>
      </Section>

      {/* ── APPLY ── */}
      <Section className="bg-ivory-deep border-t border-mineral/15">
        <Reveal><div className="max-w-xl mx-auto"><LeadForm /></div></Reveal>
      </Section>

      {/* ── PS + FOOTER ── */}
      <Section className="!py-16">
        <div className="max-w-3xl">
          <p className="whisper text-xl sm:text-2xl leading-snug">
            P.S. Você não paga imposto porque é obrigado a ser honesto. Você paga porque ainda não conhecia uma saída inteligente.
          </p>
        </div>
      </Section>
      <footer className="border-t border-mineral/15 py-12">
        <div className="shell flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="" className="w-7 h-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <p className="eyebrow !mb-0">O Código Internacional</p>
          </div>
          <p className="whisper text-sm">Ordo Tekhnē. Permanentia.</p>
          <p className="data text-xs text-mineral/50">v2 · © {new Date().getFullYear()}</p>
        </div>
      </footer>
        </motion.div>
      )}

      {unlocked && <DockedVSL videoId="Qh24_Bc1Jqs" tucked={tucked} scrollLocked={!scrollFreed} onEnded={() => { document.body.style.overflow = '' }} />}
    </main>
  )
}
