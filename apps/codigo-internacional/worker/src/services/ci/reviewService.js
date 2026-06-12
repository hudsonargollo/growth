/**
 * Board feedback for the internal landing-page review (/pagereview).
 */
import { all, run } from '../../lib/ci-db.js'
import { uid } from '../../lib/uid.js'

export async function addFeedback(env, input = {}) {
  const id = uid()
  await run(
    env,
    `INSERT INTO review_feedback (id, name, role, prefer_urgency, ready, weakest, copy_changes, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name ?? null,
      input.role ?? null,
      input.prefer_urgency ?? null,
      input.ready ?? null,
      input.weakest ?? null,
      input.copy_changes ?? null,
      input.notes ?? null,
    ],
  )
  return { id }
}

export async function listFeedback(env) {
  return all(env, `SELECT * FROM review_feedback ORDER BY created_at DESC LIMIT 200`)
}
