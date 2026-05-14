import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { existsSync } from 'fs'

import miningRouter    from './routes/mining.js'
import scriptsRouter   from './routes/scripts.js'
import voiceoverRouter from './routes/voiceover.js'
import deliveryRouter  from './routes/delivery.js'
import commentsRouter  from './routes/comments.js'

import { startCommentCron } from './services/commentAgent.js'

const app  = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

// In production the built client lives at server/public (copied by build step)
const clientDist = join(__dirname, '../../client/dist')

app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5174',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// API routes
app.use('/api/mining',    miningRouter)
app.use('/api/scripts',   scriptsRouter)
app.use('/api/voiceover', voiceoverRouter)
app.use('/api/delivery',  deliveryRouter)
app.use('/api/comments',  commentsRouter)

// Serve built React client in production
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')))
}

// Start cron jobs
startCommentCron()

app.listen(PORT, () => {
  console.log(`[content-engine] Server running on http://localhost:${PORT}`)
})
