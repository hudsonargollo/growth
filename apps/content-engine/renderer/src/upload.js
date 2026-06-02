// ─────────────────────────────────────────────────────────────────────────────
// Artifact upload. Puts the final .mp4 in R2 (S3-compatible) when configured,
// else falls back to serving from a local dir so the scaffold runs without cloud
// credentials. Returns a public URL for the Worker to store as finalUrl.
//
// R2 env (all required to enable R2):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_BASE   public URL base for the bucket (e.g. https://cdn.example.com)
// Local fallback:
//   PUBLIC_BASE_URL  this service's own base; files served from /artifacts
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const sha256hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest()

/** @returns {Promise<string>} public URL of the uploaded artifact */
export async function uploadArtifact(localPath, key) {
  const r2Ready = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET
  const body = await fs.readFile(localPath)

  if (r2Ready) return putToR2(body, key)

  // Local fallback — copy to a served directory.
  const dir = process.env.ARTIFACT_DIR || '/tmp/artifacts'
  await fs.mkdir(dir, { recursive: true })
  await fs.copyFile(localPath, path.join(dir, key))
  const base = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 8080}`).replace(/\/$/, '')
  return `${base}/artifacts/${key}`
}

// Minimal SigV4 PutObject against the R2 S3 endpoint.
async function putToR2(body, key) {
  const account = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET
  const accessKey = process.env.R2_ACCESS_KEY_ID
  const secretKey = process.env.R2_SECRET_ACCESS_KEY
  const region = 'auto'
  const service = 's3'

  const host = `${account}.r2.cloudflarestorage.com`
  const canonicalUri = `/${bucket}/${encodeURIComponent(key)}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256hex(body)

  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const scope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n')

  const kDate = hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Content-Type': 'video/mp4',
    },
    body,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`R2 upload failed (${res.status}): ${txt.slice(0, 200)}`)
  }

  const publicBase = (process.env.R2_PUBLIC_BASE || '').replace(/\/$/, '')
  return publicBase ? `${publicBase}/${key}` : `https://${host}${canonicalUri}`
}
