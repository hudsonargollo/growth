/**
 * Convert a raw slug/id string into a readable display name.
 *
 * "compara-o-1x1"        → "Compara O 1x1"
 * "top-5-custo-beneficio" → "Top 5 Custo Benefício"
 * "mercadolivre"          → "Mercado Livre"
 * "prac-type-long-form"   → "PRAC Type Long Form"
 * undefined / null        → fallback
 */

// Known overrides that need special casing or accents
const OVERRIDES = {
  'mercadolivre':           'Mercado Livre',
  'mercadolivre_direct':    'Mercado Livre',
  'amazon':                 'Amazon',
  'comparacao-1x1':         'Comparação 1x1',
  'compara-o-1x1':          'Comparação 1x1',
  'top-5-custo-beneficio':  'Top 5 Custo Benefício',
  'review-detalhado':       'Review Detalhado',
  'top-n-review':           'Top N Review',
  'prac-type-long-form':    'PRAC · Top-N Afiliado',
  'prac-short-form':        'PRAC · Short-Form',
  'prac-comparison':        'PRAC · Comparação 1x1',
  'prac-single-review':     'PRAC · Review Completo',
}

export function humanize(str, fallback = 'Sem título') {
  if (!str) return fallback
  const key = str.toLowerCase().replace(/\s+/g, '-')
  if (OVERRIDES[key]) return OVERRIDES[key]
  const result = str
    .replace(/[-_]+/g, ' ')
    .trim()
  // Always capitalize first letter; leave the rest as-is (preserves "PRAC", "1x1", etc.)
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : fallback
}

/** Capitalize only the first character of any string. */
export function capFirst(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Best display name for a script object.
 * Priority: saved title → blueprint name → humanized blueprintId → id
 */
export function scriptDisplayName(script) {
  if (script?.title && !looksLikeRawId(script.title)) return script.title
  if (script?.blueprintId) return humanize(script.blueprintId)
  return script?.id ? `Roteiro ${script.id.slice(0, 6)}` : 'Roteiro'
}

/**
 * Best display name for a mining session.
 * Priority: saved name (already includes keyword · date) → keyword · date → humanized category → fallback
 */
export function sessionDisplayName(session) {
  if (session?.name && !looksLikeRawId(session.name)) return capFirst(session.name)
  // Build from keyword + date if available
  const keyword = session?.keyword || session?.category
  if (keyword) {
    const date = session?.createdAt
      ? new Date(session.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null
    const label = capFirst(humanize(keyword))
    return date ? `${label} · ${date}` : label
  }
  return 'Sessão'
}

function looksLikeRawId(str) {
  // Detect things like "k2jx3m9a" (8-char hex-ish) or pure slugs with no spaces
  if (!str) return true
  if (str.length <= 10 && /^[a-z0-9]+$/.test(str)) return true
  return false
}
