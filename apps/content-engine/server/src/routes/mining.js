import { Router } from 'express'
import { runMiningSession, getCatalog, getSessions } from '../services/miningService.js'

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

// GET /api/mining/sessions
router.get('/sessions', async (_req, res) => {
  try {
    const sessions = await getSessions()
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/mining/run
router.post('/run', async (req, res) => {
  const { marketplace = 'both', category = 'electronics' } = req.body
  try {
    const result = await runMiningSession({ marketplace, category })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
