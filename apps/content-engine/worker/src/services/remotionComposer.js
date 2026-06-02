// ─────────────────────────────────────────────────────────────────────────────
// remotionComposer — turns project state into the deterministic Remotion JSON
// blueprint consumed by the Cloud Run renderer.
//
// This is the contract boundary: the Worker does ALL timing math here so the
// renderer contains zero timing logic — it just maps numbers to React props.
// Any ambiguity (missing url, NaN frame) is caught by validateBlueprint() before
// dispatch so the agent can self-correct instead of crashing the render.
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSIONS = {
  short: { width: 1080, height: 1920 }, // 9:16
  long:  { width: 1920, height: 1080 }, // 16:9
}

const CAPTION_STYLE = {
  short: { font: 'Bebas Neue', shadow: true, safeZone: 'short' },
  long:  { font: 'Inter',      shadow: false, safeZone: 'long' },
}

const sec2frame = (sec, fps) => Math.round(sec * fps)

/**
 * Build the blueprint from a video_projects row.
 *
 * @param {object} project           a video_projects row
 * @param {object} [opts]
 * @param {number} [opts.fps=30]
 * @param {string} [opts.audioUrl]   overrides project.audioUrl
 * @param {Array}  [opts.alignment]  overrides project.alignment ({text,start,end,type}[])
 * @param {string} [opts.musicUrl]   optional background track (ducked under VO)
 * @returns {object} blueprint
 */
export function composeBlueprint(project, opts = {}) {
  const fps = opts.fps ?? 30
  const format = project.format === 'long' ? 'long' : 'short'
  const dimensions = DIMENSIONS[format]

  const audioUrl = opts.audioUrl ?? project.audioUrl
  const alignment = (opts.alignment ?? project.alignment ?? []).filter((w) => w?.type === 'word')

  // Total duration is driven by the voiceover: last word end → frames. Fall back
  // to a small floor so image-only drafts still render.
  const lastEnd = alignment.length ? alignment[alignment.length - 1].end : 0
  const durationInFrames = Math.max(sec2frame(lastEnd, fps), fps) // ≥ 1s

  // Completed assets, in scene order.
  const assets = (Array.isArray(project.assetManifest) ? project.assetManifest : [])
    .filter((m) => m.status === 'complete' && m.mediaUrl)
    .sort((a, b) => a.sceneIndex - b.sceneIndex)

  // Distribute scenes evenly across the timeline unless an asset carries explicit
  // durationFrames. Deterministic: last scene absorbs any rounding remainder.
  const videoTrack = []
  if (assets.length) {
    const explicit = assets.every((a) => Number.isFinite(a.durationFrames))
    if (explicit) {
      let cursor = 0
      for (const a of assets) {
        videoTrack.push(clip(a, cursor, cursor + a.durationFrames))
        cursor += a.durationFrames
      }
    } else {
      const per = Math.floor(durationInFrames / assets.length)
      assets.forEach((a, i) => {
        const start = i * per
        const end = i === assets.length - 1 ? durationInFrames : start + per
        videoTrack.push(clip(a, start, end))
      })
    }
  }

  // Captions: one text block per word, frame-aligned to the voiceover.
  const style = CAPTION_STYLE[format]
  const textTrack = alignment.map((w) => ({
    text: w.text,
    startFrame: sec2frame(w.start, fps),
    endFrame: sec2frame(w.end, fps),
    style: { font: style.font, shadow: style.shadow },
    safeZone: style.safeZone,
  }))

  const audioTrack = []
  if (audioUrl) audioTrack.push({ assetUrl: audioUrl, startFrame: 0, gainDb: 0 })
  if (opts.musicUrl) audioTrack.push({ assetUrl: opts.musicUrl, startFrame: 0, gainDb: -18, duck: true })

  return {
    compositionId: format === 'long' ? 'LongForm' : 'ShortForm',
    fps,
    dimensions,
    durationInFrames,
    tracks: { video: videoTrack, audio: audioTrack, text: textTrack },
  }
}

function clip(asset, startFrame, endFrame) {
  return {
    assetUrl: asset.mediaUrl,
    mediaType: asset.mediaType || 'video/mp4',
    startFrame,
    endFrame,
    fit: 'cover',
    transition: { type: 'fade', durationInFrames: 8 },
    effects: asset.mediaType?.startsWith('image') ? ['kenBurns'] : [],
  }
}

/**
 * Validate a blueprint before dispatch. Returns { ok, errors[] }.
 */
export function validateBlueprint(bp) {
  const errors = []
  if (!bp || typeof bp !== 'object') return { ok: false, errors: ['blueprint is not an object'] }
  if (!bp.compositionId) errors.push('compositionId missing')
  if (!Number.isFinite(bp.fps) || bp.fps <= 0) errors.push('fps must be a positive number')
  if (!Number.isFinite(bp.durationInFrames) || bp.durationInFrames <= 0) errors.push('durationInFrames must be positive')
  if (!bp.dimensions?.width || !bp.dimensions?.height) errors.push('dimensions incomplete')
  if (!bp.tracks?.video?.length) errors.push('no video clips — nothing to render')

  for (const [i, clip] of (bp.tracks?.video ?? []).entries()) {
    if (!clip.assetUrl) errors.push(`video[${i}] missing assetUrl`)
    if (!Number.isFinite(clip.startFrame) || !Number.isFinite(clip.endFrame)) errors.push(`video[${i}] non-numeric frames`)
    else if (clip.endFrame <= clip.startFrame) errors.push(`video[${i}] endFrame <= startFrame`)
  }
  return { ok: errors.length === 0, errors }
}
