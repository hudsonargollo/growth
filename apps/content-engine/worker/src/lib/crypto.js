/**
 * AES-GCM encryption/decryption using the Web Crypto API.
 * The raw key is derived from CREDENTIALS_SECRET (a 32-byte hex string stored
 * as a Cloudflare Worker secret — never exposed to the client).
 *
 * All values are base64url-encoded for safe storage in Postgres text columns.
 */

function b64uEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64uDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length + 2) % 4 || 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function importKey(secret) {
  // Derive a 256-bit key from the hex secret string
  const raw = new Uint8Array(secret.match(/.{2}/g).map((b) => parseInt(b, 16)))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext, secret) {
  const key = await importKey(secret)
  const iv  = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext: b64uEncode(enc), iv: b64uEncode(iv) }
}

export async function decrypt(ciphertext, iv, secret) {
  const key = await importKey(secret)
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64uDecode(iv) },
    key,
    b64uDecode(ciphertext),
  )
  return new TextDecoder().decode(dec)
}
