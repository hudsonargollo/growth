import { Router } from 'express'
import { generateVoiceover, listVoiceovers } from '../services/voiceoverService.js'

const router = Router()

// GET /api/voiceover
router.get('/', async (_req, res) => {
  try {
    const voiceovers = await listVoiceovers()
    res.json({ voiceovers })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voiceover/generate
router.post('/generate', async (req, res) => {
  const { scriptId, voiceModel = 'Rachel', stability = 0.75, similarityBoost = 0.80 } = req.body
  if (!scriptId) {
    return res.status(400).json({ error: 'scriptId is required' })
  }
  try {
    const result = await generateVoiceover({ scriptId, voiceModel, stability, similarityBoost })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
