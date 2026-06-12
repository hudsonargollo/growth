import { useEffect, useState } from 'react'
import { Clock, Users, Hourglass } from 'lucide-react'
import { fetchTurmaStatus } from '../lib/api.js'

const brDate = (iso) => { if (!iso) return ''; const [, m, d] = iso.split('-'); return `${d}/${m}` }

/** Live-ticking countdown to a YYYY-MM-DD deadline (end of that day). */
function useCountdown(deadlineISO) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadlineISO) return undefined
    const iv = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(iv)
  }, [deadlineISO])
  if (!deadlineISO) return null
  const target = new Date(`${deadlineISO}T23:59:59`).getTime()
  let diff = Math.max(0, target - now)
  const d = Math.floor(diff / 86400000); diff -= d * 86400000
  const h = Math.floor(diff / 3600000); diff -= h * 3600000
  const m = Math.floor(diff / 60000)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Decide what to show from live status (auto mode). */
function autoMode(status) {
  if (!status || status.editionClosed || !status.current) return 'finality'
  const c = status.current
  // Only claim "vagas restantes" once a turma is genuinely filling (≥40%) — never a lie.
  return c.filled > 0 && c.filled >= Math.ceil(c.capacity * 0.4) ? 'vacancy' : 'deadline'
}

/**
 * Sticky urgency bar wired to live turma fill-rates.
 * - variant='auto' (default): picks deadline / vacancy / finality from real data.
 * - force a variant ('deadline'|'vacancy'|'finality') for the /pagereview samples.
 * - pass `data` to reuse an already-fetched status (samples), else it self-fetches.
 */
export default function UrgencyBar({ data, variant = 'auto', sticky = true, href = '#aplicar', onCta }) {
  const [fetched, setFetched] = useState(null)
  useEffect(() => {
    if (data) return undefined
    let alive = true
    fetchTurmaStatus().then((s) => { if (alive) setFetched(s) }).catch(() => {})
    return () => { alive = false }
  }, [data])

  const status = data || fetched
  const mode = variant === 'auto' ? autoMode(status) : variant
  const cur = status?.current || status?.turmas?.find((t) => !t.past) || null
  const countdown = useCountdown(mode !== 'finality' ? cur?.start : null)

  if (!status && !data) return null // nothing until data is in (avoids a flash of fake numbers)

  let Icon = Clock
  let body = null
  if (mode === 'vacancy' && cur) {
    Icon = Users
    body = (
      <>
        <strong style={{ color: 'var(--color-ivory)', fontWeight: 700 }}>{cur.label}</strong>
        <span> · restam </span>
        <strong style={{ color: 'var(--color-sand)', fontWeight: 700 }}>{cur.remaining} de {cur.capacity}</strong>
        <span> vagas</span>
        {countdown && <span className="hidden sm:inline"> · encerra em {countdown}</span>}
      </>
    )
  } else if (mode === 'finality') {
    Icon = Hourglass
    body = <span>Apenas <strong style={{ color: 'var(--color-sand)', fontWeight: 700 }}>5 turmas</strong> nesta edição — quando fechar, fechou.</span>
  } else { // deadline
    Icon = Clock
    body = (
      <>
        <span>Próxima turma · </span>
        <strong style={{ color: 'var(--color-ivory)', fontWeight: 700 }}>{cur ? brDate(cur.start) : '—'}</strong>
        {countdown ? <span> · inscrições encerram em <strong style={{ color: 'var(--color-sand)', fontWeight: 700 }}>{countdown}</strong></span> : null}
      </>
    )
  }

  return (
    <div className={`${sticky ? 'sticky top-0' : ''} z-[60] w-full`}
      style={{ background: 'var(--color-mineral)', borderBottom: '1px solid rgba(199,183,156,0.25)' }}>
      <div className="shell flex items-center justify-center gap-3 py-2.5">
        <Icon size={14} style={{ color: 'var(--color-sand)', flexShrink: 0 }} />
        <p className="data text-center" style={{ fontSize: 11.5, letterSpacing: '0.04em', color: 'rgba(239,232,220,0.85)', lineHeight: 1.3 }}>
          {body}
        </p>
        {onCta ? (
          <button type="button" onClick={onCta} className="data shrink-0 hidden sm:inline-flex items-center"
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-mineral)', background: 'var(--color-sand)', padding: '5px 12px', cursor: 'pointer' }}>
            Quero minha vaga
          </button>
        ) : (
          <a href={href} className="data shrink-0 hidden sm:inline-flex items-center"
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-mineral)', background: 'var(--color-sand)', padding: '5px 12px' }}>
            Quero minha vaga
          </a>
        )}
      </div>
    </div>
  )
}
