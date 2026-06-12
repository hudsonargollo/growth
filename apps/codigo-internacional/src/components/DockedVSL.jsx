import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock } from 'lucide-react'

// Load the YouTube IFrame API once (shared promise).
let ytApiPromise = null
function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT) }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

/**
 * VSL that opens big + centered, then (when `tucked` flips true) morphs into a
 * small bottom-right mini-player — same <iframe>, so playback never restarts.
 * Detects video END via the YouTube IFrame API and animates out.
 */
export default function DockedVSL({ videoId, tucked = false, scrollLocked = false, lockSeconds = 10, onEnded }) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const builtRef = useRef(false)
  const [visible, setVisible] = useState(true)
  const [remaining, setRemaining] = useState(lockSeconds)

  // The × is only offered once the visitor has scrolled into the page (tucked).
  const canClose = tucked

  // Live countdown while scrolling is locked — drives the curiosity-hook notice.
  useEffect(() => {
    if (!scrollLocked) { setRemaining(0); return }
    setRemaining(lockSeconds)
    const started = Date.now()
    const iv = setInterval(() => {
      const left = Math.max(0, lockSeconds - Math.round((Date.now() - started) / 1000))
      setRemaining(left)
      if (left <= 0) clearInterval(iv)
    }, 250)
    return () => clearInterval(iv)
  }, [scrollLocked, lockSeconds])

  useEffect(() => {
    let cancelled = false
    loadYouTubeAPI().then((YT) => {
      if (cancelled || builtRef.current || !hostRef.current) return
      builtRef.current = true
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e) => { if (e.data === 0) { setVisible(false); onEnded && onEnded() } },
        },
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      try { playerRef.current?.destroy() } catch { /* noop */ }
      builtRef.current = false
    }
  }, [videoId])

  function dismiss() { setVisible(false); onEnded && onEnded() }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {!tucked && (
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[65]"
              style={{ background: 'rgba(20,22,24,0.55)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
          )}
          <motion.div
            key="player"
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ layout: { type: 'spring', stiffness: 280, damping: 30 }, default: { duration: 0.4 } }}
            className={tucked
              ? 'fixed z-[70] right-3 sm:right-5 bottom-3 sm:bottom-5 w-[min(340px,72vw)]'
              : 'fixed z-[70] inset-x-0 mx-auto top-[80px] sm:top-[96px] w-[min(880px,92vw)]'}
          >
            <div className="relative aspect-video bg-mineral border border-sand/40 shadow-[0_20px_60px_rgba(20,22,24,0.55)] overflow-hidden">
              <div ref={hostRef} className="w-full h-full" />
            </div>

            {/* Big mode only: countdown hook while locked, then a scroll-down hint. */}
            <AnimatePresence mode="wait">
              {!tucked && scrollLocked && (
                <motion.div
                  key="hook"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 mx-auto flex items-center gap-2.5 px-4 py-2.5 w-fit max-w-full"
                  style={{ background: 'rgba(20,22,24,0.72)', border: '1px solid rgba(199,183,156,0.35)', backdropFilter: 'blur(4px)' }}
                >
                  <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} className="shrink-0 grid place-items-center">
                    <Lock size={13} style={{ color: 'var(--color-sand)' }} />
                  </motion.span>
                  <p style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--color-ivory)' }}>
                    Os detalhes que mais importam vêm logo a seguir — vale assistir até o fim.
                    <span className="data" style={{ color: 'var(--color-sand)', marginLeft: 6, fontWeight: 600 }}>
                      {remaining}s
                    </span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* The close button only appears after the lock window passes. */}
            <AnimatePresence>
              {canClose && (
                <motion.button
                  key="close"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  onClick={dismiss}
                  aria-label="Fechar vídeo"
                  className="absolute -top-3 -right-3 w-8 h-8 grid place-items-center rounded-full bg-mineral text-ivory border border-sand/50 hover:bg-green transition-colors"
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
