// ─────────────────────────────────────────────────────────────────────────────
// Render server — Cloud Run entrypoint.
//
// POST /render  { projectId, blueprint, callbackUrl }   (signed: X-Signature)
//   1. verify HMAC over raw body (RENDER_WEBHOOK_SECRET, shared with the Worker)
//   2. ACK immediately (202) — rendering takes minutes, longer than any client wait
//   3. render headlessly, upload the .mp4, POST the result back to callbackUrl
//
// The Worker signs the request and verifies the callback with the same secret.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { selectComposition, renderMedia } from '@remotion/renderer'
import { uploadArtifact } from './upload.js'

const PORT = process.env.PORT || 8080
const SECRET = process.env.RENDER_WEBHOOK_SECRET || ''

const app = express()
// Capture the raw body for signature verification (must hash exact bytes).
app.use(express.json({ limit: '8mb', verify: (req, _res, buf) => { req.rawBody = buf } }))

const hmac = (msg) => crypto.createHmac('sha256', SECRET).update(msg).digest('hex')

function verify(req) {
  if (!SECRET) return false
  const provided = String(req.header('X-Signature') || '').replace(/^sha256=/, '')
  const expected = hmac(req.rawBody ?? Buffer.from(''))
  const a = Buffer.from(provided), b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Bundle once, reuse across renders (cold-start cost paid on first request).
let bundlePromise = null
function getBundle() {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), 'src/index.jsx'),
      // Keep the Remotion webpack config default.
    })
  }
  return bundlePromise
}

// Serve locally-stored artifacts when R2 isn't configured (dev / fallback).
app.use('/artifacts', express.static(process.env.ARTIFACT_DIR || '/tmp/artifacts'))

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.post('/render', async (req, res) => {
  if (!verify(req)) return res.status(401).json({ error: 'invalid signature' })

  const { projectId, blueprint, callbackUrl } = req.body || {}
  if (!projectId || !blueprint?.compositionId) {
    return res.status(400).json({ error: 'projectId and blueprint.compositionId required' })
  }

  // Ack now; render in the background.
  res.status(202).json({ accepted: true, projectId })

  renderAndCallback({ projectId, blueprint, callbackUrl }).catch((err) => {
    console.error(`[render] ${projectId} failed:`, err)
    postCallback(callbackUrl, { projectId, status: 'FAILED', error: String(err?.message || err) })
  })
})

async function renderAndCallback({ projectId, blueprint, callbackUrl }) {
  const serveUrl = await getBundle()
  const composition = await selectComposition({
    serveUrl,
    id: blueprint.compositionId,
    inputProps: { blueprint },
  })

  const outPath = path.join(os.tmpdir(), `${projectId}.mp4`)
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outPath,
    inputProps: { blueprint },
    // Cloud Run gives multiple vCPUs — let Remotion parallelise frame rendering.
    concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
  })

  const finalUrl = await uploadArtifact(outPath, `${projectId}.mp4`)
  await postCallback(callbackUrl, { projectId, status: 'DONE', finalUrl })
  console.log(`[render] ${projectId} done → ${finalUrl}`)
}

async function postCallback(callbackUrl, payload) {
  if (!callbackUrl) return
  const body = JSON.stringify(payload)
  await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': `sha256=${hmac(body)}` },
    body,
  }).catch((e) => console.error('[render] callback failed:', e))
}

app.listen(PORT, () => console.log(`renderer listening on :${PORT}`))
