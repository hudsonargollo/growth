// In dev, requests hit the Vite proxy (/api → wrangler dev :8787).
// In production the landing page is a separate domain, so it calls the worker
// directly via VITE_API_BASE (set in .env / Pages env vars).
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/**
 * Capture UTM + attribution params from the current URL.
 * Persists to sessionStorage so attribution survives navigation within the page.
 */
export function captureAttribution() {
  const KEY = 'ci_attribution'
  const params = new URLSearchParams(window.location.search)
  const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

  let stored = {}
  try {
    stored = JSON.parse(sessionStorage.getItem(KEY) || '{}')
  } catch {
    stored = {}
  }

  const fresh = {}
  for (const f of fields) {
    const v = params.get(f)
    if (v) fresh[f] = v
  }

  // First-touch wins: only overwrite if we actually have new UTM params.
  const attribution = Object.keys(fresh).length ? fresh : stored
  attribution.referrer = stored.referrer || document.referrer || null
  attribution.landing_path = window.location.pathname + window.location.search

  try {
    sessionStorage.setItem(KEY, JSON.stringify(attribution))
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
  return attribution
}

// Fire-and-forget pageview ping — once per browser session per page (funnel metric).
export function trackVisit(page = 'landing') {
  try {
    const k = `ci_visited:${page}`
    if (sessionStorage.getItem(k)) return
    sessionStorage.setItem(k, '1')
  } catch { /* sessionStorage unavailable — still ping once */ }
  fetch(`${API_BASE}/api/ci/track/visit`, {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
  }).catch(() => {})
}

// Live turma fill-rates for the urgency bar.
export async function fetchTurmaStatus() {
  const res = await fetch(`${API_BASE}/api/ci/turmas/status`)
  if (!res.ok) throw new Error('turma-status')
  return res.json()
}

// Board review feedback (/pagereview).
export async function submitReviewFeedback(payload) {
  const res = await fetch(`${API_BASE}/api/ci/review/feedback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar.')
  return data
}
export async function fetchReviewFeedback() {
  const res = await fetch(`${API_BASE}/api/ci/review/feedback`)
  if (!res.ok) throw new Error('feedback')
  return res.json()
}

export async function fetchCohorts() {
  const res = await fetch(`${API_BASE}/api/ci/cohorts`)
  if (!res.ok) throw new Error('cohorts')
  const { cohorts } = await res.json()
  return cohorts
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function authPost(path, body) {
  const res = await fetch(`${API_BASE}/api/ci/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro de autenticação.')
  return data
}
export const authCheck = (email) => authPost('check', { email })
export const authRegister = (email, password) => authPost('register', { email, password })
export const authLogin = (email, password) => authPost('login', { email, password })

// Step 1 — saves nome + WhatsApp immediately. Returns { id, ref }.
export async function submitLead(payload) {
  const res = await fetch(`${API_BASE}/api/ci/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar. Tente novamente.')
  return data
}

// Step 2 — attaches the company profile to the lead created in step 1.
export async function qualifyLead(id, ref, payload) {
  const res = await fetch(`${API_BASE}/api/ci/leads/${id}/qualify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar. Tente novamente.')
  return data
}
