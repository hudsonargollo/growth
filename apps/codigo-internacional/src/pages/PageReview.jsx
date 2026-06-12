import { useEffect, useState } from 'react'
import {
  Clock, Users, Hourglass, ArrowRight, CheckCircle2, AlertTriangle, Target,
  ThumbsUp, ExternalLink, MessageSquare, BarChart3,
} from 'lucide-react'
import UrgencyBar from '../components/UrgencyBar.jsx'
import { fetchTurmaStatus, submitReviewFeedback, fetchReviewFeedback } from '../lib/api.js'

const LIVE = 'https://codigointernacional.com.br'
const brDate = (iso) => { if (!iso) return '—'; const [, m, d] = iso.split('-'); return `${d}/${m}` }

const URGENCY = [
  { key: 'topbar', n: 1, title: 'Barra fixa com contagem regressiva', lever: 'Prazo real (início da próxima turma)',
    pro: 'Factual e auto-atualiza conforme as turmas avançam. Sóbria, sem cara de promoção.', con: 'Exige lógica de "turma atual" e uma data de corte para nunca mostrar data vencida.' },
  { key: 'vagas', n: 2, title: 'Selo de vagas restantes', lever: 'Escassez de vagas (10 por turma)',
    pro: 'O gatilho mais forte que você tem — e lê do CRM, então é verdade.', con: 'Com poucas vendas no início, "1 de 10" parece vazio. Só aparece após ~40% preenchida.' },
  { key: 'finalidade', n: 3, title: 'Selo de finalidade — "apenas 5 turmas"', lever: 'Perda de acesso / "não vai repetir"',
    pro: 'Mais on-brand e zero manutenção. Porta se fechando, não liquidação.', con: 'Urgência mais suave que um relógio — depende de acreditarem na finalidade.' },
  { key: 'cta', n: 4, title: 'Barra de CTA flutuante (no scroll)', lever: 'Redução de atrito + lembrete persistente',
    pro: 'Captura o impulso "estou pronto" sem rolar até o formulário.', con: 'É mais conversão que urgência — melhor combinada com 1, 2 ou 3.' },
  { key: 'selecao', n: 5, title: 'Prazo de inscrição / seleção', lever: 'Prazo + exclusividade ("você aplica, nós selecionamos")',
    pro: 'Reforça o posicionamento high-ticket. Eleva em vez de baratear.', con: 'Mais texto; precisa caber bem no mobile.' },
]
const URGENCY_FORM = [...URGENCY.map((u) => ({ key: u.key, label: `${u.n}. ${u.title}` })),
  { key: 'combo', label: 'Combinação (recomendada)' }, { key: 'nenhum', label: 'Nenhum por enquanto' }]
const READY = [{ key: 'sim', label: 'Sim, pode rodar tráfego' }, { key: 'quase', label: 'Quase — pequenos ajustes' }, { key: 'no', label: 'Ainda não' }]
const ROLES = ['Pedro', 'Hudson', 'Alison', 'Wanderson', 'Andressa', 'Outro']

function Frame({ children, label }) {
  return (
    <div className="border border-mineral/20 overflow-hidden" style={{ background: '#f4efe6', boxShadow: '0 10px 30px -18px rgba(20,22,24,0.4)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: 'rgba(20,22,24,0.05)', borderBottom: '1px solid rgba(20,22,24,0.1)' }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: 'rgba(20,22,24,0.18)' }} />
        <span style={{ width: 9, height: 9, borderRadius: 99, background: 'rgba(20,22,24,0.18)' }} />
        <span style={{ width: 9, height: 9, borderRadius: 99, background: 'rgba(20,22,24,0.18)' }} />
        <span className="data ml-2" style={{ fontSize: 9.5, color: 'rgba(20,22,24,0.4)' }}>{label}</span>
      </div>
      <div className="bg-ivory">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`text-left px-3 py-2 border transition-colors ${active ? 'bg-mineral text-ivory border-mineral' : 'bg-white border-mineral/25 text-mineral hover:border-mineral/50'}`}
      style={{ fontSize: 12.5 }}>
      {children}
    </button>
  )
}

function H2({ icon: Icon, children, eyebrow }) {
  return (
    <div className="mb-6 mt-16 first:mt-0">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 className="text-2xl sm:text-3xl font-light leading-tight flex items-center gap-2.5">
        {Icon && <Icon size={22} className="text-green shrink-0" />}{children}
      </h2>
    </div>
  )
}

export default function PageReview() {
  const [status, setStatus] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [form, setForm] = useState({ name: '', role: '', prefer_urgency: '', ready: '', weakest: '', copy_changes: '', notes: '' })
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { document.title = 'Revisão da Landing — O Código Internacional' }, [])
  useEffect(() => { fetchTurmaStatus().then(setStatus).catch(() => {}) }, [])
  const loadFeedback = () => fetchReviewFeedback().then((d) => setFeedback(d.feedback || [])).catch(() => {})
  useEffect(() => { loadFeedback() }, [])

  const cur = status?.current || status?.turmas?.find((t) => !t.past) || null
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Coloque seu nome.'); return }
    setBusy(true); setError(null)
    try { await submitReviewFeedback(form); setSent(true); await loadFeedback() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  // Tally of urgency preferences for "northing" consensus.
  const tally = {}
  for (const f of feedback) if (f.prefer_urgency) tally[f.prefer_urgency] = (tally[f.prefer_urgency] || 0) + 1
  const tallyMax = Math.max(1, ...Object.values(tally))

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-ivory)' }}>
      <div className="shell !max-w-3xl py-12 sm:py-16">
        {/* Header */}
        <p className="eyebrow mb-3">Documento interno · O Código Internacional</p>
        <h1 className="text-3xl sm:text-[40px] font-light leading-[1.1] tracking-tight">
          Revisão da <span className="font-semibold">landing page</span> e proposta de gatilhos de urgência.
        </h1>
        <p className="mt-4 text-mineral/70 leading-relaxed">
          Análise da página em <a href={LIVE} target="_blank" rel="noopener noreferrer" className="underline decoration-sand-deep underline-offset-2 inline-flex items-center gap-1">codigointernacional.com.br <ExternalLink size={13} /></a>,
          com amostras ao vivo das opções de urgência (dados reais de turma vindos do CRM). No fim, o board responde algumas perguntas para nortear as decisões.
        </p>

        {/* 1. Resumo executivo */}
        <H2 icon={Target} eyebrow="01 · Visão geral">Resumo executivo</H2>
        <div className="space-y-4 text-mineral/80 leading-relaxed">
          <p>A página tem <strong>oferta clara, narrativa forte e design premium consistente</strong>. O fluxo segue uma lógica sólida: promessa → vídeo (gate) → mecanismo (o "rastreador" do CPF) → os 7 dias → networking → preço ancorado (R$162k/ano vs R$25k) → aplicação.</p>
          <p>O <strong>maior buraco hoje é urgência ativa</strong>: a escassez existe no texto ("5 turmas, uma por semana, quando fechar fechou"), mas nada na tela faz o visitante sentir que o relógio está correndo <em>agora</em>. É exatamente o que esta revisão propõe resolver — com uma barra que lê as vagas reais do CRM, então nunca mente.</p>
          <p>Pontos secundários: a prova social/documental ficou mais enxuta após a última reescrita, e há claims fiscais que pedem cautela de linguagem.</p>
        </div>

        {/* 2. Pontos fortes */}
        <H2 icon={ThumbsUp} eyebrow="02 · O que está bom">Pontos fortes</H2>
        <ul className="space-y-3">
          {[
            ['Oferta e ancoragem de preço', 'O contraste R$162.000/ano vs R$25.000 uma vez (12× de R$2.083) é o argumento mais forte da página e está bem posicionado.'],
            ['Mecanismo memorável', 'A metáfora do "rastreador no CPF" explica o porquê de forma simples e difícil de esquecer.'],
            ['Gate de vídeo (VSL)', 'O vídeo travado com lock de 10s, contagem e auto-minimização cria foco e compromete o visitante antes de liberar o conteúdo.'],
            ['Captura em 2 etapas', 'Nome + WhatsApp salvos primeiro (mesmo quem abandona), depois qualificação. Nada de lead perdido.'],
            ['Identidade premium', 'Tipografia, paleta e a linha do tempo de 7 dias dão um tom de programa exclusivo, não de "curso".'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <CheckCircle2 size={18} className="text-green shrink-0 mt-0.5" />
              <span className="text-mineral/80 leading-relaxed"><strong className="text-mineral">{t}.</strong> {d}</span>
            </li>
          ))}
        </ul>

        {/* 3. Lacunas e riscos */}
        <H2 icon={AlertTriangle} eyebrow="03 · O que melhorar">Lacunas e riscos</H2>
        <ul className="space-y-3">
          {[
            ['Sem urgência ativa above-the-fold', 'A escassez está só na copy. Falta um elemento visível que faça o visitante agir hoje. → proposta abaixo.'],
            ['Prova enxuta', 'A foto do comprovante de residência e a carta longa saíram. Vale reintroduzir uma prova visual curta (documento, fotos de turma, depoimento) sem inchar a página.'],
            ['Claims fiscais', '"Zerar o imposto" e "27% ao governo" pedem linguagem cuidadosa ("residência fiscal legal", "pelos órgãos oficiais"). Reduz risco e aumenta credibilidade.'],
            ['Título do Dia 03 muito longo', 'Quebra em 3 linhas no card da timeline. Encurtar para um headline e jogar o detalhe no corpo.'],
            ['CTA único repetido', 'Toda a página leva para o mesmo formulário. Uma barra de CTA flutuante reduziria o atrito de quem já decidiu.'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: '#9c6f1e' }} />
              <span className="text-mineral/80 leading-relaxed"><strong className="text-mineral">{t}.</strong> {d}</span>
            </li>
          ))}
        </ul>

        {/* 4. Urgência — propostas com amostras ao vivo */}
        <H2 icon={Clock} eyebrow="04 · Proposta central">Gatilhos de urgência — amostras ao vivo</H2>
        <p className="text-mineral/75 leading-relaxed mb-2">
          As amostras abaixo usam <strong>dados reais do CRM</strong>. Estado atual:
        </p>
        <div className="flex flex-wrap gap-2 mb-7">
          {(status?.turmas || []).map((t) => (
            <span key={t.id} className="data" style={{ fontSize: 11, padding: '3px 9px', border: '1px solid var(--color-sand-deep)', color: 'var(--color-mineral)' }}>
              {t.label}: {t.filled}/{t.capacity} {t.past ? '(encerrada)' : ''}
            </span>
          ))}
          {!status && <span className="data" style={{ fontSize: 11, color: 'rgba(20,22,24,0.4)' }}>carregando dados de turma…</span>}
        </div>

        {/* Recommended live bar */}
        <div className="mb-3 flex items-center gap-2">
          <span className="ci-chip" style={{ fontSize: 10, color: 'var(--color-green)', background: 'rgba(46,74,67,0.1)', border: '1px solid rgba(46,74,67,0.25)', padding: '2px 9px', borderRadius: 999 }}>RECOMENDADO</span>
          <p className="data" style={{ fontSize: 11, color: 'rgba(20,22,24,0.55)' }}>Barra inteligente — alterna sozinha entre prazo / vagas / finalidade conforme os dados.</p>
        </div>
        <Frame label="barra ao vivo (modo automático)">
          <UrgencyBar data={status || undefined} variant="auto" sticky={false} />
          <div className="px-5 py-4" style={{ fontSize: 12, color: 'rgba(20,22,24,0.5)' }}>… resto da landing …</div>
        </Frame>

        {/* The 5 options */}
        <div className="mt-9 space-y-9">
          {/* 1 — top bar countdown */}
          <Option u={URGENCY[0]}>
            <Frame label="opção 1 · barra fixa"><UrgencyBar data={status || undefined} variant="deadline" sticky={false} /><Filler /></Frame>
          </Option>
          {/* 2 — vacancy badge */}
          <Option u={URGENCY[1]}>
            <Frame label="opção 2 · selo de vagas">
              <div className="p-6 flex flex-col items-start gap-3">
                <span className="data inline-flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-mineral)', background: 'var(--color-sand)', padding: '6px 12px' }}>
                  <Users size={13} /> {cur ? `${cur.label} · restam ${cur.remaining} de ${cur.capacity} vagas` : 'restam 10 de 10 vagas'}
                </span>
                <button className="cta-bar !w-auto" style={{ padding: '0.9rem 1.6rem', fontSize: '0.7rem' }}>Quero minha vaga</button>
              </div>
            </Frame>
          </Option>
          {/* 3 — finality */}
          <Option u={URGENCY[2]}>
            <Frame label="opção 3 · selo de finalidade"><UrgencyBar data={status || { editionClosed: true, turmas: [] }} variant="finality" sticky={false} /><Filler /></Frame>
          </Option>
          {/* 4 — floating CTA */}
          <Option u={URGENCY[3]}>
            <Frame label="opção 4 · barra flutuante">
              <div className="relative" style={{ height: 120 }}>
                <div className="px-5 py-4" style={{ fontSize: 12, color: 'rgba(20,22,24,0.4)' }}>… conteúdo da página …</div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'var(--color-mineral)' }}>
                  <span className="data" style={{ fontSize: 11.5, color: 'var(--color-ivory)' }}>
                    {cur ? <>Turma {cur.label.replace('Turma ', '')} · fecha {brDate(cur.start)}</> : 'Próxima turma'}
                  </span>
                  <span className="data" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-mineral)', background: 'var(--color-sand)', padding: '7px 14px' }}>Quero minha vaga</span>
                </div>
              </div>
            </Frame>
          </Option>
          {/* 5 — application deadline */}
          <Option u={URGENCY[4]}>
            <Frame label="opção 5 · prazo de seleção">
              <div className="flex items-center justify-center gap-2.5 py-3" style={{ background: 'var(--color-green)' }}>
                <Hourglass size={14} style={{ color: 'var(--color-sand)' }} />
                <p className="data text-center" style={{ fontSize: 11.5, color: 'rgba(239,232,220,0.9)' }}>
                  Inscrições em análise · o Pedro lê cada aplicação · {cur ? <>encerra <strong style={{ color: 'var(--color-sand)' }}>{brDate(cur.start)}</strong></> : 'vagas limitadas'}
                </p>
              </div>
              <Filler />
            </Frame>
          </Option>
        </div>

        {/* 5. Recomendação */}
        <H2 icon={ArrowRight} eyebrow="05 · Caminho sugerido">Recomendação</H2>
        <div className="border-l-2 border-green pl-5 space-y-3 text-mineral/80 leading-relaxed">
          <p>Para uma oferta de R$25k, <strong>dado real vence escassez falsa</strong>. A recomendação é a <strong>barra inteligente</strong> (opção 1 + 2 combinadas): mostra a contagem regressiva da próxima turma por padrão e troca para "vagas restantes" assim que a turma passa de ~40% preenchida — com a finalidade (opção 3) como mensagem evergreen quando não há turma fechando.</p>
          <p>Como complemento de conversão, a <strong>barra flutuante (opção 4)</strong> pode carregar essa mesma mensagem. Já está construída e lendo o CRM — é só o board decidir o tom.</p>
        </div>

        {/* 6. Feedback */}
        <H2 icon={MessageSquare} eyebrow="06 · Sua vez">Feedback do board</H2>
        {sent ? (
          <div className="border border-green/40 p-6" style={{ background: 'rgba(46,74,67,0.06)' }}>
            <p className="flex items-center gap-2 text-green font-semibold"><CheckCircle2 size={18} /> Respostas registradas. Obrigado!</p>
            <p className="text-mineral/70 mt-2 text-sm">Sua opinião já entra na contagem abaixo.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="lead-form border border-mineral/25 p-6 sm:p-8 space-y-6">
            <div>
              <label className="field-label">Quem é você?</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLES.map((r) => <Chip key={r} active={form.role === r} onClick={() => setForm((f) => ({ ...f, role: r }))}>{r}</Chip>)}
              </div>
              <input className="field mt-3" placeholder="Seu nome" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="field-label">Qual gatilho de urgência você prefere?</label>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {URGENCY_FORM.map((o) => <Chip key={o.key} active={form.prefer_urgency === o.key} onClick={() => setForm((f) => ({ ...f, prefer_urgency: o.key }))}>{o.label}</Chip>)}
              </div>
            </div>
            <div>
              <label className="field-label">A landing está pronta para tráfego pago?</label>
              <div className="grid sm:grid-cols-3 gap-2 mt-2">
                {READY.map((o) => <Chip key={o.key} active={form.ready === o.key} onClick={() => setForm((f) => ({ ...f, ready: o.key }))}>{o.label}</Chip>)}
              </div>
            </div>
            <div><label className="field-label">Qual o ponto mais fraco da página?</label><textarea className="field mt-1" rows={2} value={form.weakest} onChange={set('weakest')} placeholder="Seja direto." /></div>
            <div><label className="field-label">Alguma copy que você mudaria?</label><textarea className="field mt-1" rows={2} value={form.copy_changes} onChange={set('copy_changes')} placeholder="Trecho + sugestão." /></div>
            <div><label className="field-label">Outras observações</label><textarea className="field mt-1" rows={2} value={form.notes} onChange={set('notes')} placeholder="Qualquer coisa do resumo acima." /></div>
            {error && <p className="data text-sm" style={{ color: '#9b2c2c' }}>{error}</p>}
            <button className="cta-bar w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar meu feedback'}</button>
          </form>
        )}

        {/* Responses */}
        {feedback.length > 0 && (
          <>
            <div className="mt-10 mb-4 flex items-center gap-2">
              <BarChart3 size={15} className="text-green" />
              <p className="eyebrow !mb-0">Consenso até agora · {feedback.length} {feedback.length === 1 ? 'resposta' : 'respostas'}</p>
            </div>
            <div className="space-y-1.5 mb-8">
              {URGENCY_FORM.filter((o) => tally[o.key]).sort((a, b) => (tally[b.key] || 0) - (tally[a.key] || 0)).map((o) => (
                <div key={o.key} className="flex items-center gap-3">
                  <span className="shrink-0" style={{ width: 200, fontSize: 12, color: 'var(--color-mineral)' }}>{o.label}</span>
                  <div className="flex-1" style={{ height: 8, background: 'rgba(20,22,24,0.07)' }}><div style={{ width: `${(tally[o.key] / tallyMax) * 100}%`, height: '100%', background: 'var(--color-green)' }} /></div>
                  <span className="data shrink-0" style={{ fontSize: 11, color: 'rgba(20,22,24,0.6)', width: 20, textAlign: 'right' }}>{tally[o.key]}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {feedback.map((f) => (
                <div key={f.id} className="border border-mineral/15 p-4" style={{ background: '#f4efe6' }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-mineral)' }}>{f.name}</span>
                    {f.role && <span className="data" style={{ fontSize: 10, color: 'rgba(20,22,24,0.5)' }}>· {f.role}</span>}
                    {f.prefer_urgency && <span className="data" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-green)', background: 'rgba(46,74,67,0.1)', padding: '2px 7px' }}>{(URGENCY_FORM.find((o) => o.key === f.prefer_urgency) || {}).label}</span>}
                    {f.ready && <span className="data" style={{ fontSize: 9.5, color: 'rgba(20,22,24,0.5)' }}>{(READY.find((o) => o.key === f.ready) || {}).label}</span>}
                  </div>
                  {f.weakest && <p style={{ fontSize: 12.5, color: 'var(--color-mineral)' }} className="mt-1"><span className="text-mineral/45">Ponto fraco: </span>{f.weakest}</p>}
                  {f.copy_changes && <p style={{ fontSize: 12.5, color: 'var(--color-mineral)' }} className="mt-1"><span className="text-mineral/45">Copy: </span>{f.copy_changes}</p>}
                  {f.notes && <p style={{ fontSize: 12.5, color: 'var(--color-mineral)' }} className="mt-1"><span className="text-mineral/45">Notas: </span>{f.notes}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="whisper text-center mt-14">Ordo Tekhnē. Permanentia.</p>
      </div>
    </main>
  )
}

function Option({ u, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="data" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-sand-deep)' }}>{String(u.n).padStart(2, '0')}</span>
        <h3 className="text-lg font-semibold">{u.title}</h3>
      </div>
      {children}
      <div className="grid sm:grid-cols-3 gap-x-5 gap-y-2 mt-3" style={{ fontSize: 12.5 }}>
        <p><span className="eyebrow block mb-0.5" style={{ fontSize: 9 }}>Gatilho</span><span className="text-mineral/75">{u.lever}</span></p>
        <p><span className="eyebrow block mb-0.5" style={{ fontSize: 9 }}>A favor</span><span className="text-mineral/75">{u.pro}</span></p>
        <p><span className="eyebrow block mb-0.5" style={{ fontSize: 9 }}>Contra</span><span className="text-mineral/75">{u.con}</span></p>
      </div>
    </div>
  )
}

function Filler() {
  return <div className="px-5 py-4" style={{ fontSize: 12, color: 'rgba(20,22,24,0.4)' }}>… resto da landing …</div>
}
