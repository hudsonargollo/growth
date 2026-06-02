import React from 'react'
import { Composition } from 'remotion'
import { VideoTimeline } from './VideoTimeline.jsx'

// An empty-but-valid blueprint so Remotion Studio can mount the compositions
// before any real props are injected at render time.
const emptyBlueprint = (width, height) => ({
  compositionId: width < height ? 'ShortForm' : 'LongForm',
  fps: 30,
  dimensions: { width, height },
  durationInFrames: 30,
  tracks: { video: [], audio: [], text: [] },
})

// Pull fps / dimensions / duration straight from the injected blueprint so the
// Worker remains the single source of truth (composeBlueprint computed them).
const metadataFromBlueprint = ({ props }) => {
  const bp = props.blueprint
  return {
    durationInFrames: bp?.durationInFrames ?? 30,
    fps: bp?.fps ?? 30,
    width: bp?.dimensions?.width,
    height: bp?.dimensions?.height,
  }
}

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ShortForm"
        component={VideoTimeline}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={30}
        defaultProps={{ blueprint: emptyBlueprint(1080, 1920) }}
        calculateMetadata={metadataFromBlueprint}
      />
      <Composition
        id="LongForm"
        component={VideoTimeline}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={30}
        defaultProps={{ blueprint: emptyBlueprint(1920, 1080) }}
        calculateMetadata={metadataFromBlueprint}
      />
    </>
  )
}
