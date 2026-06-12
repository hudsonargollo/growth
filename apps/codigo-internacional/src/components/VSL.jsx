import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Video Sales Letter slot.
 *
 *   <VSL />                                          ← branded placeholder only
 *   <VSL src="https://www.youtube.com/watch?v=ID" /> ← branded facade → click plays YouTube
 *   <VSL src="https://player.vimeo.com/video/ID" />  ← any other embed renders directly
 *
 * For YouTube we keep the architectural placeholder as a click-to-play facade:
 * the real iframe (and YouTube's scripts) only load when the user hits play.
 */
export default function VSL({ src, label = 'VSL · 3 minutos', aspect = '16/9', maxW = 'max-w-3xl' }) {
  const [playing, setPlaying] = useState(false)
  const yt = parseYouTube(src)

  // Non-YouTube embed → render the iframe directly inside the branded frame.
  if (src && !yt) {
    return (
      <Frame aspect={aspect} maxW={maxW}>
        <iframe
          src={src}
          title="O Código Internacional — VSL"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Frame>
    )
  }

  // YouTube, playing → autoplay iframe.
  if (yt && playing) {
    return (
      <Frame aspect={aspect} maxW={maxW}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`}
          title="O Código Internacional — VSL"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </Frame>
    )
  }

  // Branded facade (placeholder). Clicking a YouTube facade starts playback.
  const clickable = Boolean(yt)
  return (
    <Frame
      as={clickable ? motion.button : motion.div}
      aspect={aspect}
      maxW={maxW}
      onClick={clickable ? () => setPlaying(true) : undefined}
      aria-label={clickable ? 'Reproduzir vídeo' : undefined}
      className={`grid place-items-center group ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* YouTube poster (only when we have a video), dimmed for legibility */}
      {yt && (
        <>
          <img
            src={`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`}
            onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` }}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 transition-opacity duration-500 group-hover:opacity-55"
          />
          <span className="absolute inset-0 bg-mineral/30" />
        </>
      )}

      {/* architectural corner ticks (film frame) */}
      <Corner className="top-4 left-4" />
      <Corner className="top-4 right-4 rotate-90" />
      <Corner className="bottom-4 right-4 rotate-180" />
      <Corner className="bottom-4 left-4 -rotate-90" />

      <div className="relative text-center px-6">
        <div className="relative mx-auto w-20 h-20 grid place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full border border-sand/50"
            animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className="absolute inset-0 rounded-full border border-sand/40 transition-transform duration-300 group-hover:scale-110" />
          <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1 text-sand" fill="currentColor" aria-hidden>
            <path d="M5 4.5 19 12 5 19.5 Z" />
          </svg>
        </div>

        <p className="data text-sand text-xs tracking-[0.32em] uppercase mt-6">[ {label} ]</p>
        <p className="text-ivory/45 text-sm mt-2">
          {clickable ? 'Assista antes de solicitar sua vaga' : 'Vídeo será incluído aqui'}
        </p>
      </div>
    </Frame>
  )
}

/** Extract an 11-char YouTube id from watch / youtu.be / embed URLs. */
function parseYouTube(url) {
  if (!url) return null
  const m = String(url).match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  return m ? m[1] : null
}

function Frame({ as: Tag = 'div', children, className = '', aspect = '16/9', maxW = 'max-w-3xl', ...rest }) {
  return (
    <Tag
      className={`relative border border-mineral/25 bg-mineral w-full ${maxW} overflow-hidden ${className}`}
      style={{ aspectRatio: aspect.replace('/', ' / ') }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

function Corner({ className = '' }) {
  return <span className={`absolute w-5 h-5 border-t border-l border-sand/30 ${className}`} />
}

/**
 * Widescreen VSL that docks into a fixed floating mini-player once the user
 * scrolls past it — and keeps playing. The <iframe> is mounted ONCE and only
 * its wrapper's position toggles (inline ↔ fixed), so playback never restarts.
 */
export function StickyVSL({ src, label = 'VSL · 3 minutos' }) {
  const yt = parseYouTube(src)
  const anchorRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [past, setPast] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        const scrolledAbove = !e.isIntersecting && e.boundingClientRect.top < 0
        setPast(scrolledAbove)
        if (e.isIntersecting) setDismissed(false) // re-arm when it returns to view
      },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const floating = playing && past && !dismissed

  const player = (
    <div className="relative w-full h-full bg-mineral overflow-hidden border border-mineral/25">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1`}
          title="O Código Internacional — VSL"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button onClick={() => setPlaying(true)} aria-label="Reproduzir vídeo"
          className="group w-full h-full grid place-items-center cursor-pointer">
          {yt && <img src={`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`}
            onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` }}
            alt="" className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-60 transition-opacity" />}
          <span className="absolute inset-0 bg-mineral/30" />
          <Corner className="top-4 left-4" /><Corner className="top-4 right-4 rotate-90" />
          <Corner className="bottom-4 right-4 rotate-180" /><Corner className="bottom-4 left-4 -rotate-90" />
          <div className="relative text-center">
            <div className="relative mx-auto w-20 h-20 grid place-items-center">
              <motion.span className="absolute inset-0 rounded-full border border-sand/50"
                animate={{ scale: [1, 1.35], opacity: [0.5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }} />
              <span className="absolute inset-0 rounded-full border border-sand/40 group-hover:scale-110 transition-transform" />
              <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1 text-sand" fill="currentColor"><path d="M5 4.5 19 12 5 19.5 Z" /></svg>
            </div>
            <p className="data text-sand text-xs tracking-[0.32em] uppercase mt-5">[ {label} ]</p>
          </div>
        </button>
      )}
      {floating && (
        <button onClick={() => setDismissed(true)} aria-label="Fechar vídeo"
          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 grid place-items-center bg-mineral/80 text-ivory hover:bg-mineral">
          <X size={15} />
        </button>
      )}
    </div>
  )

  return (
    <div ref={anchorRef} className="relative w-full max-w-3xl mx-auto aspect-video">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className={floating
          ? 'fixed z-[60] bottom-4 right-4 w-[280px] sm:w-[380px] aspect-video shadow-2xl'
          : 'absolute inset-0'}
      >
        {player}
      </motion.div>
    </div>
  )
}
