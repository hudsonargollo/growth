/**
 * /api/storyboard — Storyboard & Video Automation Pipeline
 *
 *   GET    /api/storyboard/:scriptId                     get storyboard state
 *   POST   /api/storyboard/:scriptId/shot-list           Phase 1: generate shot list from script
 *   POST   /api/storyboard/:scriptId/frames              Phase 3: generate ALL pending frames
 *   POST   /api/storyboard/:scriptId/frames/:sceneIndex  Phase 3: generate / regen one frame
 *   GET    /api/storyboard/:scriptId/poll-frames         poll Higgsfield frame job statuses
 *   POST   /api/storyboard/:scriptId/animate             Phase 4: animate ALL ready frames
 *   POST   /api/storyboard/:scriptId/animate/:sceneIndex Phase 4: animate one scene
 *   GET    /api/storyboard/:scriptId/poll-videos         poll Higgsfield video job statuses
 *   PATCH  /api/storyboard/:scriptId/scenes/:sceneIndex  update scene MCSLA prompt / reference
 *   DELETE /api/storyboard/:scriptId                     delete storyboard
 */
import { Hono } from 'hono'
import { getDb } from '../lib/db.js'
import {
  generateShotList,
  generateFrame,
  generateAllFrames,
  pollFrameStatus,
  animateScene,
  animateAll,
  pollVideoStatus,
  getStoryboard,
  updateSceneMcsla,
  updateProductReference,
  deleteStoryboard,
} from '../services/storyboardService.js'

const router = new Hono()

// ── GET storyboard ────────────────────────────────────────────────────────────
router.get('/:scriptId', async (c) => {
  try {
    const sb = await getStoryboard(c.env, c.req.param('scriptId'))
    if (!sb) return c.json({ storyboard: null })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Phase 1: Shot list ────────────────────────────────────────────────────────
router.post('/:scriptId/shot-list', async (c) => {
  const scriptId = c.req.param('scriptId')
  const body     = await c.req.json().catch(() => ({}))

  // If scriptText not provided, fetch it from Supabase
  let scriptText = body.script_text
  if (!scriptText) {
    try {
      const db = getDb(c.env)
      // Use maybeSingle() — never throws on "no rows found", returns null instead
      const { data, error: dbErr } = await db.from('scripts').select('*').eq('id', scriptId).maybeSingle()
      if (dbErr) return c.json({ error: `Erro no banco: ${dbErr.message}` }, 500)
      if (!data)  return c.json({ error: 'Roteiro não encontrado' }, 404)

      if (Array.isArray(data.sections) && data.sections.length) {
        scriptText = data.sections.map(s => `[${s.label ?? ''}]\n${s.content ?? ''}`).join('\n\n')
      } else {
        scriptText = data.text ?? ''
      }
    } catch (e) {
      return c.json({ error: `Falha ao buscar roteiro: ${e.message}` }, 500)
    }
  }

  if (!scriptText?.trim()) return c.json({ error: 'Roteiro vazio — gere o roteiro primeiro' }, 400)

  try {
    const sb = await generateShotList(c.env, {
      scriptId,
      scriptText,
      blueprintType: body.blueprint_type ?? 'longform',
      productIds:    body.product_ids    ?? [],
    })
    return c.json({ storyboard: sb }, 201)
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Phase 3: Generate all frames ──────────────────────────────────────────────
router.post('/:scriptId/frames', async (c) => {
  try {
    const sb = await generateAllFrames(c.env, { scriptId: c.req.param('scriptId') })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Phase 3: Generate / regenerate one frame ──────────────────────────────────
router.post('/:scriptId/frames/:sceneIndex', async (c) => {
  const body        = await c.req.json().catch(() => ({}))
  const sceneIndex  = parseInt(c.req.param('sceneIndex'), 10)
  if (isNaN(sceneIndex)) return c.json({ error: 'sceneIndex inválido' }, 400)
  try {
    const sb = await generateFrame(c.env, {
      scriptId:     c.req.param('scriptId'),
      sceneIndex,
      overrideMcsla: body.mcsla ?? null,
    })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Poll frame statuses ───────────────────────────────────────────────────────
router.get('/:scriptId/poll-frames', async (c) => {
  try {
    const sb = await pollFrameStatus(c.env, { scriptId: c.req.param('scriptId') })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Phase 4: Animate all frames ───────────────────────────────────────────────
router.post('/:scriptId/animate', async (c) => {
  try {
    const sb = await animateAll(c.env, { scriptId: c.req.param('scriptId') })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Phase 4: Animate one scene ────────────────────────────────────────────────
router.post('/:scriptId/animate/:sceneIndex', async (c) => {
  const sceneIndex = parseInt(c.req.param('sceneIndex'), 10)
  if (isNaN(sceneIndex)) return c.json({ error: 'sceneIndex inválido' }, 400)
  try {
    const sb = await animateScene(c.env, {
      scriptId:   c.req.param('scriptId'),
      sceneIndex,
    })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── Poll video statuses ───────────────────────────────────────────────────────
router.get('/:scriptId/poll-videos', async (c) => {
  try {
    const sb = await pollVideoStatus(c.env, { scriptId: c.req.param('scriptId') })
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── PATCH scene (update prompt or product reference) ─────────────────────────
router.patch('/:scriptId/scenes/:sceneIndex', async (c) => {
  const body       = await c.req.json().catch(() => ({}))
  const sceneIndex = parseInt(c.req.param('sceneIndex'), 10)
  if (isNaN(sceneIndex)) return c.json({ error: 'sceneIndex inválido' }, 400)
  try {
    let sb
    if (body.product_image_url !== undefined) {
      sb = await updateProductReference(c.env, {
        scriptId:        c.req.param('scriptId'),
        sceneIndex,
        productImageUrl: body.product_image_url,
      })
    } else if (body.mcsla) {
      sb = await updateSceneMcsla(c.env, {
        scriptId:   c.req.param('scriptId'),
        sceneIndex,
        mcsla:      body.mcsla,
      })
    } else {
      return c.json({ error: 'Nada para atualizar — forneça mcsla ou product_image_url' }, 400)
    }
    return c.json({ storyboard: sb })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

// ── DELETE storyboard ─────────────────────────────────────────────────────────
router.delete('/:scriptId', async (c) => {
  try {
    await deleteStoryboard(c.env, c.req.param('scriptId'))
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: e.message }, 500)
  }
})

export default router
