import React from 'react'
import {
  AbsoluteFill,
  Sequence,
  OffthreadVideo,
  Img,
  Audio,
  useCurrentFrame,
  interpolate,
} from 'remotion'
import { Caption } from './components/Caption.jsx'
import { KenBurns } from './components/KenBurns.jsx'

// The blueprint is produced by the Worker's remotionComposer — this component
// contains ZERO timing logic, it only maps numeric frame ranges to React props.
export const VideoTimeline = ({ blueprint }) => {
  const { tracks, dimensions } = blueprint
  const safeZone = dimensions.height > dimensions.width ? 'short' : 'long'

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* ── Video / image track ───────────────────────────────────────────── */}
      {(tracks.video ?? []).map((clip, i) => {
        const durationInFrames = Math.max(1, clip.endFrame - clip.startFrame)
        const isImage = (clip.mediaType ?? '').startsWith('image')
        return (
          <Sequence key={`v${i}`} from={clip.startFrame} durationInFrames={durationInFrames}>
            <ClipFade durationInFrames={durationInFrames} fadeFrames={clip.transition?.durationInFrames ?? 0}>
              {isImage ? (
                clip.effects?.includes('kenBurns') ? (
                  <KenBurns src={clip.assetUrl} durationInFrames={durationInFrames} />
                ) : (
                  <Img src={clip.assetUrl} style={coverStyle} />
                )
              ) : (
                <OffthreadVideo src={clip.assetUrl} style={coverStyle} muted />
              )}
            </ClipFade>
          </Sequence>
        )
      })}

      {/* ── Audio track (voiceover + optional ducked music) ───────────────── */}
      {(tracks.audio ?? []).map((a, i) => (
        <Sequence key={`a${i}`} from={a.startFrame ?? 0}>
          <Audio src={a.assetUrl} volume={dbToLinear(a.gainDb ?? 0)} />
        </Sequence>
      ))}

      {/* ── Caption track ─────────────────────────────────────────────────── */}
      {(tracks.text ?? []).map((t, i) => {
        const durationInFrames = Math.max(1, t.endFrame - t.startFrame)
        return (
          <Sequence key={`t${i}`} from={t.startFrame} durationInFrames={durationInFrames}>
            <Caption text={t.text} style={t.style} safeZone={t.safeZone ?? safeZone} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

const coverStyle = { width: '100%', height: '100%', objectFit: 'cover' }

// dB → linear gain. 0 dB = 1.0; -18 dB ≈ 0.126.
const dbToLinear = (db) => Math.pow(10, db / 20)

// Lightweight cross-fade at the head/tail of a clip without pulling the full
// @remotion/transitions presentation graph (kept available in deps for later).
const ClipFade = ({ children, durationInFrames, fadeFrames }) => {
  const frame = useCurrentFrame()
  if (!fadeFrames) return <AbsoluteFill>{children}</AbsoluteFill>
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}
