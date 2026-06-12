/**
 * Live turma (cohort) status — powers the landing's urgency bar with REAL
 * fill-rates so it never lies. A seat is "filled" when a lead is closed (won)
 * for that turma. Capacity is 10 per turma ("10 empresários por turma").
 */
import { all, first } from '../../lib/ci-db.js'

const CAPACITY = 10
const TURMAS = [
  { id: '2026-07-12', label: 'Turma 1', start: '2026-07-12', end: '2026-07-19' },
  { id: '2026-07-19', label: 'Turma 2', start: '2026-07-19', end: '2026-07-26' },
  { id: '2026-07-26', label: 'Turma 3', start: '2026-07-26', end: '2026-08-02' },
  { id: '2026-08-02', label: 'Turma 4', start: '2026-08-02', end: '2026-08-09' },
  { id: '2026-08-09', label: 'Turma 5', start: '2026-08-09', end: '2026-08-16' },
]

export async function getTurmaStatus(env) {
  const capRow = await first(env, `SELECT value FROM ci_settings WHERE key = 'turma_capacity'`)
  const capacity = Number(capRow?.value) || CAPACITY

  const rows = await all(env, `SELECT turma, COUNT(*) AS n FROM leads WHERE status = 'won' AND turma IS NOT NULL GROUP BY turma`)
  const filledMap = {}
  for (const r of rows) filledMap[r.turma] = r.n

  const today = new Date().toISOString().slice(0, 10)
  const turmas = TURMAS.map((t) => {
    const filled = Math.min(filledMap[t.id] || 0, capacity)
    return {
      ...t,
      capacity,
      filled,
      remaining: Math.max(0, capacity - filled),
      full: filled >= capacity,
      past: t.start < today,
    }
  })

  // The "current" turma = the soonest upcoming one that still has seats.
  const current = turmas.find((t) => !t.past && !t.full) || null
  const totalRemaining = turmas.filter((t) => !t.past).reduce((a, t) => a + t.remaining, 0)
  const editionClosed = turmas.every((t) => t.past || t.full)

  return { capacity, turmas, current, totalRemaining, editionClosed, today }
}
