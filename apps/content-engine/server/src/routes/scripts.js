import { Router } from 'express'
import { generateScript, listScripts } from '../services/scriptService.js'

const router = Router()

// GET /api/scripts
router.get('/', async (_req, res) => {
  try {
    const scripts = await listScripts()
    res.json({ scripts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/scripts/generate
router.post('/generate', async (req, res) => {
  const { blueprintId, catalogIds, language = 'en' } = req.body
  if (!blueprintId || !catalogIds?.length) {
    return res.status(400).json({ error: 'blueprintId and catalogIds are required' })
  }
  try {
    const script = await generateScript({ blueprintId, catalogIds, language })
    res.json(script)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
