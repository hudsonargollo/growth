// ─── Language metadata ────────────────────────────────────────────────────────
// Single source of truth for the four supported script/voiceover languages.
// Spanish is split by region: es-mx (México, MXN) vs es-es (España, EUR).
// `chip` is the compact text badge that replaces flag emojis across the UI
// (kept text-only on purpose so the product reads as a tool, not a toy).

export const LANGUAGES = [
  { code: 'pt',   chip: 'PT', label: 'Português', sub: 'Brasil' },
  { code: 'es-mx', chip: 'MX', label: 'Español',   sub: 'México' },
  { code: 'es-es', chip: 'ES', label: 'Español',   sub: 'España' },
  { code: 'en',   chip: 'EN', label: 'English',   sub: 'US & Canada' },
]

export const LANG_BY_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))

// Normalize any language-ish value → canonical code.
// Backward compat: old 'es' (neutral Spanish) maps to 'es-mx'.
export function normalizeLang(input) {
  const s = String(input ?? '').toLowerCase().replace('_', '-')
  if (s === 'es-mx' || s.includes('mexico') || s.includes('méxico')) return 'es-mx'
  if (s === 'es-es' || s.includes('spain') || s.includes('españa') || s.includes('espanha')) return 'es-es'
  if (s.startsWith('pt') || s.includes('portug')) return 'pt'
  // Generic 'es' / 'spanish' / 'español' → Mexico variant (backward compat with old scripts)
  if (s.startsWith('es') || s.includes('span') || s.includes('espa')) return 'es-mx'
  if (s.startsWith('en') || s.includes('engl')) return 'en'
  return LANGUAGES.some((l) => l.code === s) ? s : 'pt'
}

// Short label (PT/ES/EN) for a code, with a safe fallback.
export function langChip(code) {
  return LANG_BY_CODE[normalizeLang(code)]?.chip ?? String(code ?? '').toUpperCase()
}

// The two languages a given code does NOT cover — i.e. the "other two".
export function otherLanguages(code) {
  const c = normalizeLang(code)
  return LANGUAGES.filter((l) => l.code !== c)
}

// Order-independent signature of a script's product set. Handles arrays, a
// JSON-encoded string, or a single id — whatever the row happens to carry.
function productSignature(raw) {
  let arr = raw
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw) } catch { arr = raw ? [raw] : [] }
  }
  if (!Array.isArray(arr)) arr = arr == null ? [] : [arr]
  return arr.map(String).sort().join('|')
}

const videoTypeOf = (s) => s?.videoType ?? 'longform'

/**
 * Language-siblings of `script`: rows built from the same blueprint + product
 * set but in a different language. No schema change needed — we match on data
 * the /scripts list already returns. Shorts (different videoType / parented to
 * a longform) are excluded so a short never reads as a language variant.
 */
export function findLanguageSiblings(script, allScripts = []) {
  if (!script) return []
  const sig      = productSignature(script.productIds)
  const haveSig  = sig.length > 0
  const vtype    = videoTypeOf(script)
  const lang     = normalizeLang(script.language)
  return allScripts.filter((s) => {
    if (!s || s.id === script.id) return false
    if (s.blueprintId !== script.blueprintId) return false
    if (videoTypeOf(s) !== vtype) return false
    if (s.parentScriptId) return false // exclude generated shorts
    if (normalizeLang(s.language) === lang) return false
    // Prefer an exact product match; fall back to blueprint-only when neither
    // row carries productIds (older rows predating the column).
    const sSig = productSignature(s.productIds)
    if (haveSig && sSig.length > 0) return sSig === sig
    return true
  })
}

// Set of language codes a script already exists in (its own + any siblings).
export function existingLanguages(script, allScripts = []) {
  const langs = new Set()
  if (script) langs.add(normalizeLang(script.language))
  for (const s of findLanguageSiblings(script, allScripts)) langs.add(normalizeLang(s.language))
  return langs
}
