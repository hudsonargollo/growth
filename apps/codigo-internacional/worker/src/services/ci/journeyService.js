/**
 * Concierge journey — the post-sale stages each buyer moves through.
 * Seeded when a sale enters 'onboarding'.
 */
import { all, run, first, now } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

// Default journey, derived from the program copy (pt-BR).
export const DEFAULT_JOURNEY = [
  { stage: 'checklist',   label: 'Checklist de documentos enviado' },
  { stage: 'docs_ready',  label: 'Documentos preparados no Brasil' },
  { stage: 'travel',      label: 'Viagem / chegada ao Paraguai' },
  { stage: 'week_onsite', label: '7 dias presenciais (órgãos + networking)' },
  { stage: 'residencia',  label: 'Residência protocolada' },
  { stage: 'completed',   label: 'Processo concluído' },
]

/** Seed journey stages for a sale (idempotent). */
export async function seedJourney(env, saleId) {
  const existing = await all(env, `SELECT id FROM journey_stages WHERE sale_id = ?`, [saleId])
  if (existing.length > 0) return listJourney(env, saleId)

  let sort = 0
  for (const s of DEFAULT_JOURNEY) {
    await run(
      env,
      `INSERT INTO journey_stages (id, sale_id, stage, label, sort) VALUES (?, ?, ?, ?, ?)`,
      [uid(), saleId, s.stage, s.label, sort++],
    )
  }
  return listJourney(env, saleId)
}

export async function listJourney(env, saleId) {
  return all(env, `SELECT * FROM journey_stages WHERE sale_id = ? ORDER BY sort ASC`, [saleId])
}

/** Update a journey stage status (pending|in_progress|done). */
export async function updateStage(env, stageId, status) {
  if (!['pending', 'in_progress', 'done'].includes(status)) {
    throw new Error(`Invalid journey stage status: ${status}`)
  }
  const completedAt = status === 'done' ? now() : null
  await run(env, `UPDATE journey_stages SET status = ?, completed_at = ? WHERE id = ?`, [status, completedAt, stageId])
  return first(env, `SELECT * FROM journey_stages WHERE id = ?`, [stageId])
}
