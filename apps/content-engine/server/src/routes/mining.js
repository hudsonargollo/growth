import { Router } from 'express'
import { runMiningSession, getCatalog, getSessions, getStats, ingestProducts, deleteSession, clearAll, deleteProduct, renameSession } from '../services/miningService.js'
import { db } from '../lib/db.js'

const router = Router()

// GET /api/mining/catalog
router.get('/catalog', async (_req, res) => {
  try {
    const products = await getCatalog()
    res.json({ products })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mining/catalog/stats
router.get('/catalog/stats', async (_req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mining/sessions
router.get('/sessions', async (_req, res) => {
  try {
    const sessions = await getSessions()
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/mining/sessions — clear all sessions
router.delete('/sessions', async (_req, res) => {
  try {
    await clearAll()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mining/sessions/:id
router.get('/sessions/:id', async (req, res) => {
  try {
    const { data, error } = await db.from('mining_sessions').select('*').eq('id', req.params.id).single()
    if (error) throw new Error(error.message)
    res.json(data ?? null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/mining/sessions/:id — rename session
router.patch('/sessions/:id', async (req, res) => {
  try {
    const { name, projectId } = req.body
    await renameSession(req.params.id, { name, projectId })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/mining/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await deleteSession(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mining/run
router.post('/run', async (req, res) => {
  const { marketplace = 'both', category = 'electronics', siteFilter, sortBy } = req.body
  try {
    const result = await runMiningSession({ marketplace, category, siteFilter, sortBy })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mining/ingest — receive pre-fetched ML results from browser-side ML fetch
router.post('/ingest', async (req, res) => {
  try {
    const { category, sortBy, results } = req.body
    const result = await ingestProducts({ category, sortBy, results })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/mining/config
router.get('/config', async (_req, res) => {
  res.json({
    mlConfigured:      !!(process.env.ML_APP_ID && process.env.ML_CLIENT_SECRET),
    serpApiConfigured: !!process.env.SERPAPI_KEY,
    amazonConfigured:  !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY),
  })
})

export default router
