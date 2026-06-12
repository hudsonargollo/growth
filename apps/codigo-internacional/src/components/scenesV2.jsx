import { motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────────
   Animated isometric line scenes — recreated in the TEKTONE style from the
   reference images. Stroke = currentColor. Built to draw in / float / trace.
   ───────────────────────────────────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1]
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 1.4, ease: EASE } },
}
const inView = { initial: 'hidden', whileInView: 'visible', viewport: { once: true, margin: '-60px' } }

// Isometric tile (flat diamond) corner points around a center.
function tile(cx, cy, w, h) {
  return `M${cx} ${cy - h} L${cx + w} ${cy} L${cx} ${cy + h} L${cx - w} ${cy} Z`
}

const P = (props) => <motion.path variants={draw} stroke="currentColor" fill="none" {...props} />

// Twinkling 4-point sparkles. `points`: [x, y, size, delay][]. Use inside an <svg>.
export function Sparkles({ points = [] }) {
  return (
    <g>
      {points.map(([x, y, s, d], i) => (
        <motion.path key={i}
          d={`M${x} ${y - s} L${x + s * 0.32} ${y - s * 0.32} L${x + s} ${y} L${x + s * 0.32} ${y + s * 0.32} L${x} ${y + s} L${x - s * 0.32} ${y + s * 0.32} L${x - s} ${y} L${x - s * 0.32} ${y - s * 0.32} Z`}
          fill="currentColor" stroke="none" style={{ transformOrigin: `${x}px ${y}px` }}
          animate={{ scale: [0, 1, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: 'easeInOut' }} />
      ))}
    </g>
  )
}

/* 1 — Exploded layers (the "órgãos / 7 dias" stacked-protocol motif) */
export function IsoLayers({ className = '' }) {
  const layers = [
    { cy: 70, label: 'doc' },
    { cy: 140, label: 'gov' },
    { cy: 210, label: 'grid' },
  ]
  return (
    <motion.svg viewBox="0 0 360 280" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      className={className} {...inView} variants={{ visible: { transition: { staggerChildren: 0.22 } } }}>
      {/* connectors */}
      <motion.line variants={draw} stroke="currentColor" x1="100" y1="70" x2="100" y2="210" strokeDasharray="3 6"
        animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} opacity="0.5" />
      <motion.line variants={draw} stroke="currentColor" x1="260" y1="70" x2="260" y2="210" strokeDasharray="3 6"
        animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} opacity="0.5" />
      {layers.map((l, i) => (
        <motion.g key={i} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
          <P d={tile(180, l.cy, 120, 60)} />
          {l.label === 'doc' && <><P d="M150 60 h60 M150 70 h44 M150 80 h52" opacity="0.7" /><P d="M205 50 l8 5 -8 5 Z" /></>}
          {l.label === 'gov' && <><P d="M150 138 h60 v-18 h-60 Z" /><P d="M156 120 v18 M168 120 v18 M192 120 v18 M204 120 v18" opacity="0.7" /><P d="M150 120 l30 -14 30 14" /></>}
          {l.label === 'grid' && [0, 1, 2, 3].map((c) => [0, 1].map((r) => (
            <P key={`${c}${r}`} d={tile(150 + c * 20 - r * 20, l.cy + c * 10 + r * 10 - 5, 14, 7)} opacity={c === 1 ? 1 : 0.55} />
          )))}
          <motion.circle cx="100" cy={l.cy} r="3" fill="currentColor" variants={draw} />
          <motion.circle cx="260" cy={l.cy} r="3" fill="currentColor" variants={draw} />
        </motion.g>
      ))}
    </motion.svg>
  )
}

/* 2 — Guarded vault: central locked cube, rotating seal, radiating verified links
   (the surveillance/protection + "tudo já está pronto" motif) */
export function IsoVault({ className = '' }) {
  return (
    <motion.svg viewBox="0 0 320 300" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      className={className} {...inView} variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
      {/* radiating dashed links */}
      {[[60, 70], [260, 70], [40, 200], [280, 200]].map(([x, y], i) => (
        <motion.line key={i} variants={draw} stroke="currentColor" x1="160" y1="160" x2={x} y2={y} strokeDasharray="3 6"
          animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} opacity="0.45" />
      ))}
      {/* satellite cubes */}
      {[[60, 70], [260, 70], [40, 200], [280, 200]].map(([x, y], i) => (
        <P key={i} d={`${tile(x, y, 18, 9)} M${x - 18} ${y} v14 M${x} ${y + 9} v14 M${x + 18} ${y} v14 M${x - 18} ${y + 14} L${x} ${y + 23} L${x + 18} ${y + 14}`} opacity="0.8" />
      ))}
      {/* verified ticks on the links */}
      {[[110, 115], [210, 115], [100, 188], [220, 188]].map(([x, y], i) => (
        <motion.path key={i} variants={{ hidden: { opacity: 0, scale: 0 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } } }}
          d={`M${x - 4} ${y} l3 3 6 -7`} stroke="currentColor" />
      ))}
      {/* central cube */}
      <P d={tile(160, 160, 46, 23)} strokeWidth="1.6" />
      <P d="M114 160 v40 M160 183 v40 M206 160 v40 M114 200 L160 223 L206 200" strokeWidth="1.6" />
      {/* rotating seal on top */}
      <motion.g style={{ transformOrigin: '160px 160px' }} animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        <motion.circle variants={draw} stroke="currentColor" cx="160" cy="160" r="15" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2
          return <motion.line key={i} variants={draw} stroke="currentColor" x1={160 + Math.cos(a) * 15} y1={160 + Math.sin(a) * 7.5} x2={160 + Math.cos(a) * 19} y2={160 + Math.sin(a) * 9.5} opacity="0.7" />
        })}
      </motion.g>
      <motion.path variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.6 } } }} d="M153 160 l5 5 9 -10" stroke="currentColor" strokeWidth="1.6" />
      <Sparkles points={[[60, 52, 4.5, 0], [266, 58, 3.5, 0.7], [292, 150, 4, 1.3], [150, 36, 3, 0.4], [40, 232, 3.5, 1]]} />
    </motion.svg>
  )
}

/* 3 — Data / results dashboard (bars + panel + flowing connectors) */
export function IsoData({ className = '' }) {
  return (
    <motion.svg viewBox="0 0 360 280" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      className={className} {...inView} variants={{ visible: { transition: { staggerChildren: 0.18 } } }}>
      {/* iso bars */}
      {[[110, 60], [150, 110], [190, 80], [230, 130]].map(([x, top], i) => (
        <motion.g key={i} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
          <P d={`${tile(x, top, 16, 8)} M${x - 16} ${top} L${x - 16} 175 L${x} 183 L${x} ${top + 8} M${x} 183 L${x + 16} 175 L${x + 16} ${top}`} />
        </motion.g>
      ))}
      {/* dashboard panel */}
      <motion.g variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
        <P d={tile(200, 215, 95, 48)} strokeWidth="1.5" />
        <P d="M150 210 h40 M150 220 h28" opacity="0.7" />
        <P d="M225 200 l20 10 -20 10 -20 -10 Z" opacity="0.8" />
      </motion.g>
      {/* flowing connector */}
      <motion.path variants={draw} stroke="currentColor" d="M250 110 C 290 120, 290 170, 250 180" strokeDasharray="3 6"
        animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} opacity="0.5" />
      <motion.circle variants={draw} stroke="currentColor" cx="290" cy="95" r="3" fill="currentColor" />
      {/* floating cube */}
      <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
        <P d={`${tile(300, 70, 14, 7)} M286 70 v14 M300 77 v14 M314 70 v14 M286 84 L300 91 L314 84`} opacity="0.85" />
      </motion.g>
      <Sparkles points={[[300, 48, 4, 0.2], [118, 40, 3.5, 0.9], [332, 138, 3, 1.4], [90, 200, 3.5, 1.1]]} />
    </motion.svg>
  )
}
