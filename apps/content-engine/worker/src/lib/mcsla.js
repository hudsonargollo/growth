// ─────────────────────────────────────────────────────────────────────────────
// MCSLA prompt builder
//
// Higgsfield diffusion models produce far more reliable output when the prompt is
// structured rather than free-form. We enforce the MCSLA taxonomy so the agent —
// and the end user — never have to think about prompt engineering:
//
//   Model       · which Higgsfield model the prompt targets (router hint)
//   Composition · framing / shot type (wide-angle, rule of thirds, close-up…)
//   Subject     · the focus: character, product, action — granular and concrete
//   Lighting    · directional + physical light (warm rim light, volumetric fog…)
//   Aesthetic   · final texture / vibe (35mm film grain, editorial, moody…)
//
// The user types "dark moody tech review"; the orchestrator fills the slots and
// emits one clean prompt string for the Higgsfield `prompt` parameter.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an MCSLA-structured prompt string.
 * Only the provided slots are emitted, in canonical order, comma-joined.
 *
 * @param {object} parts
 * @param {string} [parts.model]        e.g. "Soul V2"
 * @param {string} [parts.composition]  e.g. "wide-angle, rule of thirds, negative space"
 * @param {string} [parts.subject]      e.g. "a weathered hiker cresting a ridge at dawn"
 * @param {string} [parts.lighting]     e.g. "warm rim light, soft fill, cinematic chiaroscuro"
 * @param {string} [parts.aesthetic]    e.g. "35mm film grain, editorial color grade, moody"
 * @returns {string}
 */
export function buildMcslaPrompt({ model, composition, subject, lighting, aesthetic } = {}) {
  const segments = [
    composition && `Composition: ${composition.trim()}`,
    subject && `Subject: ${subject.trim()}`,
    lighting && `Lighting: ${lighting.trim()}`,
    aesthetic && `Aesthetic: ${aesthetic.trim()}`,
  ].filter(Boolean)

  if (segments.length === 0) {
    throw new Error('buildMcslaPrompt: at least one of composition/subject/lighting/aesthetic is required')
  }

  // `model` is a router hint, not part of the rendered prompt text — the model is
  // selected via the Higgsfield endpoint/model id, not the prompt body.
  return segments.join('. ')
}

/**
 * Minimal validation so the orchestrator can self-correct a malformed payload
 * before spending credits. Returns { ok, errors[] }.
 */
export function validateMcsla(parts = {}) {
  const errors = []
  if (!parts.subject) errors.push('subject is required (what is on screen)')
  if (parts.aspectRatio && !['16:9', '9:16', '1:1'].includes(parts.aspectRatio)) {
    errors.push(`invalid aspectRatio "${parts.aspectRatio}" — must be 16:9, 9:16 or 1:1`)
  }
  return { ok: errors.length === 0, errors }
}
