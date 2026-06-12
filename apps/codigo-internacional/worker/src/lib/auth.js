/**
 * Edge-safe auth primitives (Web Crypto only — no Node deps).
 * - PBKDF2-SHA256 password hashing (100k iterations, per-user salt)
 * - HMAC-SHA256 signed stateless session tokens
 */

const enc = new TextEncoder()

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function hexToBuf(hex) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

// ── Passwords ────────────────────────────────────────────────────────────────
export async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  )
  return { hash: bufToHex(bits), salt: bufToHex(salt) }
}

export async function verifyPassword(password, saltHex, expectedHash) {
  if (!saltHex || !expectedHash) return false
  const { hash } = await hashPassword(password, saltHex)
  // constant-time-ish compare
  if (hash.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  return diff === 0
}

// ── Session tokens (HMAC) ──────────────────────────────────────────────────────
async function hmac(message, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return bufToHex(sig)
}

/** Sign a session token. payload gets an `exp` (ms epoch) added. */
export async function signToken(payload, secret, ttlSeconds = 60 * 60 * 24 * 14) {
  const body = { ...payload, exp: nowMs() + ttlSeconds * 1000 }
  const encoded = b64url(JSON.stringify(body))
  const sig = await hmac(encoded, secret)
  return `${encoded}.${sig}`
}

/** Verify + decode a token. Returns payload or null. */
export async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return null
  const [encoded, sig] = token.split('.')
  const expected = await hmac(encoded, secret)
  if (sig !== expected) return null
  let payload
  try { payload = JSON.parse(b64urlDecode(encoded)) } catch { return null }
  if (!payload.exp || payload.exp < nowMs()) return null
  return payload
}

// new Date()/Date.now() are fine in the Worker runtime at request time.
function nowMs() {
  return Date.parse(new Date().toISOString())
}
