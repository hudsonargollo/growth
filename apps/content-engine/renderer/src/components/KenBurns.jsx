import React from 'react'
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion'

// Slow zoom on a static image so stills don't feel dead next to motion clips.
export const KenBurns = ({ src, durationInFrames, from = 1.0, to = 1.12 }) => {
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, durationInFrames], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }}
      />
    </AbsoluteFill>
  )
}
