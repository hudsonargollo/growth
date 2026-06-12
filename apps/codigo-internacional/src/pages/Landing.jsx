import { useEffect } from 'react'
import LeadForm from '../components/LeadForm.jsx'
import VSL from '../components/VSL.jsx'
import { captureAttribution } from '../lib/api.js'
import { motion, Reveal, Stagger, CountUp, Parallax, EASE } from '../components/motion.jsx'
import { TowerSkyline, TrackerMonolith, SalaTable, SealBlueprint } from '../components/illustrations.jsx'

/* NOTE: price is R$ 25.000 per the sales copy (12× R$ 2.083). Keep in sync with
   the backend D1 ci_settings.program_price (commission base). */
const PRICE = '25.000'

// The 7 days — "Do aeroporto ao documento"
const DAYS = [
  ['01', 'Domingo', 'Você chega', 'Te esperamos no aeroporto e levamos até a casa onde acontecem os 7 dias. À noite o grupo se reúne no jantar pela primeira vez — todos se apresentam e passamos o cronograma da semana.'],
  ['02', 'Segunda', 'O processo começa', 'De manhã saímos juntos para a Interpol e o Departamento de Polícia Paraguaio. Eu e a Andressa conduzimos cada um: você sabe onde entrar, qual documento entregar, com quem falar. Sem fila errada, sem descoberta na hora.'],
  ['03', 'Terça', 'Tour de compras', 'Eletrônicos, equipamentos e produtos importados a preço de fronteira. Quem quiser aproveitar, aproveita. À noite é livre — boa parte dos melhores papos acontece aqui, sem agenda.'],
  ['04', 'Quarta', 'O networking de verdade', 'Churrasco e rodada de hot seat. Cada um apresenta sua empresa pro grupo: o que está construindo, onde está travado, o que está buscando. A sala inteira olha pro seu negócio.'],
  ['05', 'Quinta', 'Dia livre', 'Sem agenda. A semana já está pesada de propósito até aqui. Tempo para aprofundar as conversas, explorar a cidade ou trabalhar de um lugar diferente.'],
  ['06', 'Sexta', 'A residência fica pronta', 'Voltamos à Interpol para pegar o documento e seguimos ao Departamento de Migração. Sua residência temporária paraguaia é protocolada. O processo que trouxe você até aqui está feito.'],
  ['07', 'Sábado', 'Você volta ao Brasil', 'Com a residência no bolso, a certeza de que zerou seu imposto, e com contatos que podem criar negócios novos.'],
]

const WEEK_AGENDA = [
  ['Domingo', 'Chegada e jantar'],
  ['Segunda', 'Interpol + Polícia'],
  ['Terça', 'Tour de compras'],
  ['Quarta', 'Churrasco + Hot seat'],
  ['Quinta', 'Dia livre'],
  ['Sexta', 'Residência protocolada'],
  ['Sábado', 'Retorno'],
]

const TURMAS = [
  ['Turma 1', '12/07'],
  ['Turma 2', '19/07'],
  ['Turma 3', '26/07'],
  ['Turma 4', '02/08'],
]

const ETAPAS = [
  ['Etapa 1', 'Preparação blindada', 'Pré-embarque', 'Nada de "descobrir na hora". Você recebe nosso checklist exclusivo e a orientação exata dos documentos necessários ainda no Brasil. Sua única missão é reunir a papelada; nós cuidamos da estratégia de validação para você chegar com tudo pronto para protocolar.'],
  ['Etapa 2', 'Imersão estratégica', 'Os 7 dias', 'Casa de alto padrão desenhada para convivência. Condução VIP em cada protocolo — Polícia, Interpol, Migrações — sem fila errada. Networking de elite onde seu negócio é analisado pela sala. E a logística invisível da Andressa: transporte, horários, segurança.'],
  ['Etapa 3', 'Resultado', 'O retorno', 'Você volta ao Brasil com o processo de residência protocolado e andando, e com uma rede de contatos que vale mais que o próprio investimento. Você não sai com um "plano" — sai com a coisa feita.'],
]

function Eyebrow({ children }) {
  return <p className="eyebrow mb-4">{children}</p>
}

function Section({ id, children, className = '' }) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`}>
      <div className="shell">{children}</div>
    </section>
  )
}

function CtaBar({ href, children, foil = false }) {
  return (
    <motion.a
      href={href}
      className={`cta-bar ${foil ? 'cta-bar--foil' : ''}`}
      style={foil ? { color: '#efe8dc', borderColor: '#c7b79c' } : undefined}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.a>
  )
}

export default function Landing() {
  useEffect(() => { captureAttribution() }, [])

  return (
    <main>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-mineral/15 overflow-hidden">
        <Section className="!py-24 sm:!py-32">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
            <div>
              <Reveal><Eyebrow>O Código Internacional</Eyebrow></Reveal>
              <Reveal delay={0.08} as="h1">
                <span className="text-4xl sm:text-5xl font-light leading-[1.07] tracking-tight block">
                  Como fazer parte do grupo de empresários brasileiros que estão{' '}
                  <span className="font-semibold">zerando o imposto</span> — sem mudar de país,
                  sem escritório no exterior e sem advogado caro.
                </span>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-8 text-lg sm:text-xl text-mineral/75 max-w-xl leading-relaxed font-light">
                  Em 7 dias no Paraguai, você sai com a residência fiscal no bolso.
                  <span className="whisper block mt-2">Tudo feito pelos órgãos oficiais do governo.</span>
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-10 max-w-md">
                  <CtaBar href="#aplicar">Iniciar processo de seleção</CtaBar>
                </div>
              </Reveal>
            </div>

            <Parallax distance={30} className="hidden lg:block">
              <TowerSkyline className="w-full text-sand-deep" />
            </Parallax>
          </div>

          {/* VSL slot — branded facade, click to play */}
          <div className="mt-14">
            <VSL src="https://www.youtube.com/watch?v=Qh24_Bc1Jqs" />
          </div>
        </Section>
      </header>

      {/* ── THE HOOK: o rastreador ────────────────────────────────────────── */}
      <Section className="bg-mineral text-ivory overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center">
          <div className="max-w-2xl">
            <Reveal>
              <p className="text-2xl sm:text-3xl font-light leading-snug">
                Não importa quanto o empresário sofre para ganhar seu dinheiro. Se você é residente
                fiscal brasileiro, o Brasil quer a parte dele — todo mês, todo ano.
              </p>
            </Reveal>
            <hr className="rule my-10" style={{ borderColor: 'rgba(199,183,156,0.25)' }} />
            <Stagger className="space-y-5 text-ivory/75 text-lg font-light leading-relaxed">
              <Stagger.Item><p>O Brasil não cobra imposto de <em className="whisper text-sand">onde</em> você mora. Cobra de <em className="whisper text-sand">quem</em> você é.</p></Stagger.Item>
              <Stagger.Item><p>Enquanto o seu CPF for residente fiscal brasileiro, ele funciona como um rastreador preso no seu dinheiro.</p></Stagger.Item>
              <Stagger.Item><p className="text-ivory">Se você consegue a residência no Paraguai, o rastreador desliga.</p></Stagger.Item>
              <Stagger.Item><p>Você fecha o mês com o faturamento alto e o dinheiro é seu. O patrimônio que o Brasil taxava todo ano só por existir, ninguém toca.</p></Stagger.Item>
            </Stagger>
          </div>
          <TrackerMonolith className="w-48 sm:w-60 mx-auto text-sand" />
        </div>
      </Section>

      {/* ── A LETTER: caro empresário + R$1M callout + documento ───────────── */}
      <Section>
        <div className="max-w-3xl">
          <Reveal><Eyebrow>Caro empresário</Eyebrow></Reveal>
          <Stagger className="space-y-6 text-lg text-mineral/80 font-light leading-relaxed" gap={0.07}>
            <Stagger.Item><p>Você sabe quanto tempo levou para virar lei o imposto que arranca dinheiro do seu bolso, todo mês, sem você ter o direito de dizer "não"?</p></Stagger.Item>
            <Stagger.Item><p className="text-2xl font-normal text-mineral">Bastou uma canetada.</p></Stagger.Item>
            <Stagger.Item><p>Com uma assinatura, foi decidido quanto do seu dinheiro fica com você. E podem fazer de novo amanhã — sem te avisar.</p></Stagger.Item>
            <Stagger.Item><p>Nos últimos 4 meses conversei com 35 empresários que me procuraram para escalar a empresa. Em quase toda conversa, ninguém perguntava: "como eu diminuo o meu imposto?" Todo empresário pensa em escalar, mas não passa pela cabeça que — mesmo morando no Brasil — você pode zerar seu imposto.</p></Stagger.Item>
          </Stagger>

          {/* R$1M callout */}
          <Reveal>
            <div className="mt-10 border border-sand-deep/50 p-8 sm:p-10">
              <p className="text-mineral/70 font-light leading-relaxed">
                A minha declaração de renda já entregou mais de 7 dígitos em 3 anos.
              </p>
              <p className="data text-4xl sm:text-5xl text-mineral mt-4 leading-none">
                R$ <CountUp value={1000000} format />
              </p>
              <p className="eyebrow mt-3">que poderia estar no meu bolso</p>
              <p className="whisper text-xl mt-5">Eu poderia comprar um Porsche com esse dinheiro.</p>
            </div>
          </Reveal>

          <Stagger className="space-y-6 mt-10 text-lg text-mineral/80 font-light leading-relaxed" gap={0.07}>
            <Stagger.Item><p>Se existe uma forma de não pagar esse imposto, dentro da lei, então eu nunca mais vou pagar por isso.</p></Stagger.Item>
            <Stagger.Item><p className="whisper text-xl">"É o preço de ser honesto."</p></Stagger.Item>
            <Stagger.Item><p>É verdade. Mas dá pra ser honesto de um jeito bem mais inteligente. O que vou te mostrar é a solução que encontrei para esses empresários zerarem o imposto — e que testei primeiro em mim.</p></Stagger.Item>
            <Stagger.Item><p className="border-l-2 border-sand pl-6 text-mineral text-xl">Repito, porque é de fato um fato: você pode zerar o seu imposto.</p></Stagger.Item>
          </Stagger>

          {/* Documento — [FOTO] placeholder, swap-ready */}
          <Reveal>
            <figure className="mt-10">
              <div className="relative border border-mineral/25 bg-mineral aspect-[16/10] grid place-items-center overflow-hidden">
                <SealBlueprint className="w-28 text-sand" />
                <figcaption className="absolute bottom-4 inset-x-0 text-center">
                  <p className="data text-sand text-xs tracking-[0.28em] uppercase">[ Documento · residência em 7 dias ]</p>
                  <p className="text-ivory/40 text-sm mt-1">Foto do comprovante entra aqui</p>
                </figcaption>
              </div>
            </figure>
          </Reveal>

          <Reveal>
            <p className="mt-10 text-lg text-mineral/80 font-light leading-relaxed">
              São no máximo <strong>10 vagas por turma</strong>. Cada uma passa por pré-seleção — você não
              entra num grupo aleatório. Você entra num grupo onde cada pessoa foi escolhida: fazendo
              networking, se conectando e tirando a residência paraguaia em 7 dias.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ── THE 7 DAYS — do aeroporto ao documento ────────────────────────── */}
      <Section className="bg-ivory-deep">
        <div className="max-w-3xl">
          <div className="flex items-start justify-between gap-8">
            <div>
              <Reveal><Eyebrow>O Código Internacional</Eyebrow></Reveal>
              <Reveal delay={0.08}>
                <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-4">
                  Do aeroporto ao documento: o que acontece em cada um dos 7 dias.
                </h2>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="text-mineral/70 font-light leading-relaxed mb-12">
                  Antes de embarcar, a gente já se conhece — você preenche um formulário, conta sobre sua
                  empresa e seus objetivos, e só depois confirmamos sua vaga. A Andressa cuida de tudo que
                  você não deveria precisar pensar: aeroporto, transporte, cronograma, segurança.
                </p>
              </Reveal>
            </div>
            <SealBlueprint className="hidden sm:block w-24 shrink-0 text-sand-deep" />
          </div>

          {/* Vertical timeline — line draws down, days stagger in */}
          <div className="relative pl-3">
            <motion.div
              className="absolute left-3 top-1 w-px bg-mineral/30 origin-top"
              style={{ bottom: '0.5rem' }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.4, ease: EASE }}
            />
            <Stagger gap={0.14}>
              {DAYS.map(([n, day, title, body]) => (
                <Stagger.Item key={n}>
                  <div className="relative pl-8 pb-11 last:pb-0">
                    <span className="absolute -left-[6px] top-1.5 w-3 h-3 bg-mineral" />
                    <div className="flex items-baseline gap-3">
                      <span className="data text-sand-deep text-sm">Dia {n}</span>
                      <span className="eyebrow !mb-0">{day}</span>
                    </div>
                    <h3 className="text-xl font-semibold mt-1.5">{title}</h3>
                    <p className="text-mineral/75 mt-2 font-light leading-relaxed">{body}</p>
                  </div>
                </Stagger.Item>
              ))}
            </Stagger>
          </div>
        </div>
      </Section>

      {/* ── A SALA / jantar — networking (green) ───────────────────────────── */}
      <Section className="bg-green text-ivory overflow-hidden">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <div className="max-w-2xl">
            <Reveal><Eyebrow>A conversa de jantar</Eyebrow></Reveal>
            <Reveal delay={0.08}>
              <h2 className="text-3xl sm:text-4xl font-light leading-tight">
                A conversa de jantar que vale mais que <span className="font-semibold">um ano de consultoria</span>.
              </h2>
            </Reveal>
            <Stagger className="space-y-6 mt-10 text-lg text-ivory/80 font-light leading-relaxed" gap={0.08}>
              <Stagger.Item><p>A maioria dos empresários passa a vida tentando entrar numa sala dessas — paga ingresso de evento, fica na fila do crachá, e ainda sai decepcionado com o nível da conversa.</p></Stagger.Item>
              <Stagger.Item><p>Aqui são 10 empresários inteligentes olhando para a sua empresa durante 7 dias. Uma sessão de hot seat estratégica onde o seu negócio é dissecado pela sala inteira.</p></Stagger.Item>
              <Stagger.Item><p className="border-l-2 border-sand pl-6 text-ivory">O que você gasta uma fortuna em consultoria para resolver, eles destravam em dez minutos de conversa.</p></Stagger.Item>
              <Stagger.Item><p>As barreiras caem quando você vive com empresários do mesmo nível, sob o mesmo teto, por sete dias. Um vira fornecedor do outro, abre aquela porta que você tentava há anos, ou se torna o sócio que faltava. Pode ser o contato que corta 30% do seu custo operacional.</p></Stagger.Item>
              <Stagger.Item><p className="text-xl text-ivory">Você sai com a residência no bolso e cinco contatos no celular que valem mais que o processo inteiro.</p></Stagger.Item>
            </Stagger>
          </div>
          <Parallax distance={26} className="hidden lg:block">
            <SalaTable className="w-full text-sand" />
          </Parallax>
        </div>
      </Section>

      {/* ── ETAPAS — tudo já está pronto ──────────────────────────────────── */}
      <Section>
        <div className="max-w-3xl">
          <Reveal><Eyebrow>Antes de você pousar</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight mb-12">
              Antes de você pousar no Paraguai, tudo já está pronto.
            </h2>
          </Reveal>
          <Stagger className="grid gap-px bg-mineral/15 border border-mineral/15" gap={0.12}>
            {ETAPAS.map(([tag, title, sub, body]) => (
              <Stagger.Item key={tag}>
                <div className="bg-ivory p-7 sm:p-9 h-full">
                  <div className="flex items-baseline gap-3">
                    <span className="data text-sand-deep text-sm">{tag}</span>
                    <span className="eyebrow !mb-0">{sub}</span>
                  </div>
                  <h3 className="text-xl font-semibold mt-2">{title}</h3>
                  <p className="text-mineral/75 mt-2.5 font-light leading-relaxed">{body}</p>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>
          <Reveal>
            <p className="mt-10 text-mineral/80 font-light leading-relaxed">
              E quem te conduz nisso sou eu, <span className="font-semibold">Pedro Silvestrini</span>, e minha
              equipe. Toda a agenda, transporte e documentação foi preparada para que sua residência seja
              entregue em 7 dias pelos órgãos do governo.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ── TURMAS — quatro turmas, uma por semana ────────────────────────── */}
      <Section className="bg-ivory-deep">
        <div className="max-w-3xl">
          <Reveal><Eyebrow>Quatro turmas · uma por semana</Eyebrow></Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight">
              Escolha a semana que você volta com a residência no bolso.
            </h2>
          </Reveal>

          <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-10 bg-mineral/15 border border-mineral/15" gap={0.1}>
            {TURMAS.map(([t, d]) => (
              <Stagger.Item key={t}>
                <div className="bg-ivory-deep p-6 text-center h-full">
                  <p className="data text-2xl text-mineral">{d}</p>
                  <p className="eyebrow mt-2">{t}</p>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>

          {/* Shared weekly agenda */}
          <Reveal>
            <div className="mt-8 border border-mineral/15">
              {WEEK_AGENDA.map(([day, label], i) => (
                <div
                  key={day}
                  className={`flex items-center justify-between px-5 py-3.5 ${i < WEEK_AGENDA.length - 1 ? 'border-b border-mineral/10' : ''}`}
                >
                  <span className="eyebrow !mb-0">{day}</span>
                  <span className="text-mineral/80 font-light">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── PRICE ─────────────────────────────────────────────────────────── */}
      <Section className="bg-mineral text-ivory">
        <div className="max-w-3xl">
          <Reveal><Eyebrow>O investimento</Eyebrow></Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-3xl sm:text-4xl font-light leading-tight">
              R$ <CountUp value={162} suffix=".000" /> por ano… ou R$ <CountUp value={25} suffix=".000" /> uma vez.
            </h2>
          </Reveal>

          {/* comparison */}
          <div className="grid sm:grid-cols-2 gap-px mt-10 bg-ivory/15 border border-ivory/15">
            <div className="bg-mineral p-8">
              <p className="eyebrow text-sand">O que o imposto custa</p>
              <p className="data text-3xl sm:text-4xl text-ivory mt-3">R$ 162.000<span className="text-lg text-ivory/50"> /ano</span></p>
              <p className="text-ivory/60 mt-3 font-light text-sm leading-relaxed">
                Faturando R$ 50k/mês e entregando 27% ao governo, são R$ 13.500 por mês saindo do seu bolso.
              </p>
            </div>
            <div className="bg-mineral p-8 border-l border-sand/30">
              <p className="eyebrow text-sand">O Código Internacional</p>
              <p className="data text-3xl sm:text-4xl text-ivory mt-3">R$ {PRICE}<span className="text-lg text-ivory/50"> uma vez</span></p>
              <p className="text-ivory/60 mt-3 font-light text-sm leading-relaxed">
                Em 12× de R$ 2.083 — cerca de R$ 70 por dia. Hospedagem, transporte, condução e networking inclusos.
              </p>
            </div>
          </div>

          <Reveal>
            <div className="mt-10 space-y-5 text-ivory/75 font-light leading-relaxed">
              <p>Sem erro: o processo já está todo desenhado. Você passa 7 dias no Paraguai com toda a hospedagem paga, transporte incluso, direcionamento e networking.</p>
              <p className="whisper text-sand text-xl">
                Separei 5 semanas da minha vida para acompanhar cada empresário do início ao fim. Uma turma por semana. Dificilmente isso se repetirá.
              </p>
            </div>
            <div className="mt-10 max-w-md">
              <CtaBar href="#aplicar" foil>Quero minha vaga no Código Internacional</CtaBar>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── APPLY ─────────────────────────────────────────────────────────── */}
      <Section className="bg-ivory-deep border-t border-mineral/15">
        <Reveal>
          <div className="max-w-xl mx-auto">
            <LeadForm />
          </div>
        </Reveal>
      </Section>

      {/* ── PS / FOOTER ───────────────────────────────────────────────────── */}
      <Section className="border-t border-mineral/15 !py-16">
        <div className="max-w-3xl">
          <p className="whisper text-xl sm:text-2xl leading-snug">
            P.S. Você não paga imposto porque é obrigado a ser honesto. Você paga porque ainda não
            conhecia uma saída inteligente.
          </p>
        </div>
      </Section>

      <footer className="border-t border-mineral/15 py-12">
        <div className="shell flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <p className="eyebrow">O Código Internacional</p>
          <p className="whisper text-sm">Ordo Tekhnē. Permanentia.</p>
          <p className="data text-xs text-mineral/50">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  )
}
