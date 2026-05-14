import { Router } from 'express'
import { sendDelivery, listDeliveries } from '../services/deliveryService.js'

const router = Router()

// GET /api/delivery
router.get('/', async (_req, res) => {
  try {
    const jobs = await listDeliveries()
    res.json({ jobs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/delivery/send
router.post('/send', async (req, res) => {
  const { scriptId, voiceoverId, editorContact } = req.body
  if (!scriptId || !editorContact) {
    return res.status(400).json({ error: 'scriptId and editorContact are required' })
  }
  try {
    const result = await sendDelivery({ scriptId, voiceoverId, editorContact })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
