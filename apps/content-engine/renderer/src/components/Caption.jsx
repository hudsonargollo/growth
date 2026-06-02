import React from 'react'
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from 'remotion'

// Word-level caption. A light spring pop on entry; positioned inside the
// platform safe zone so TikTok/Reels UI overlays don't cover it.
//   short (9:16): lifted to ~22% from the bottom
//   long  (16:9): classic lower third
export const Caption = ({ text, style = {}, safeZone = 'short' }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const scale = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 6 })

  const bottom = safeZone === 'short' ? '22%' : '8%'
  const fontSize = safeZone === 'short' ? 84 : 56

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          bottom,
          maxWidth: '88%',
          textAlign: 'center',
          transform: `scale(${scale})`,
          fontFamily: style.font || 'sans-serif',
          fontSize,
          fontWeight: 800,
          color: 'white',
          letterSpacing: 1,
          textTransform: 'uppercase',
          textShadow: style.shadow ? '0 4px 14px rgba(0,0,0,0.85)' : 'none',
          padding: '0 24px',
          lineHeight: 1.05,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  )
}
