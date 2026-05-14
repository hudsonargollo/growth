import { Router } from 'express'
import { listCommentJobs, reviewComment, runCommentAgent } from '../services/commentAgent.js'

const router = Router()

// POST /api/comments/run  — manual trigger
router.post('/run', async (_req, res) => {
  try {
    await runCommentAgent()
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/comments
router.get('/', async (_req, res) => {
  try {
    const jobs = await listCommentJobs()
    res.json({ jobs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/comments/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await reviewComment(req.params.id, 'approved')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/comments/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const result = await reviewComment(req.params.id, 'rejected')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
