import { motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────────
   Brand line-art illustrations. Stroke = currentColor (set color via className).
   Each shape draws itself in on scroll via pathLength, staggered by the <svg>.
   Architectural, editorial, no fills — consistent with the TEKTONE drafting grid.
   ───────────────────────────────────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1]

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 1.5, ease: EASE } },
}

// Shared <svg> wrapper: triggers the stagger when scrolled into view.
function Canvas({ viewBox, className, children, stagger = 0.18 }) {
  return (
    <motion.svg
      viewBox={viewBox}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.svg>
  )
}

const P = (props) => <motion.path variants={draw} stroke="currentColor" {...props} />
const L = (props) => <motion.line variants={draw} stroke="currentColor" {...props} />
const C = (props) => <motion.circle variants={draw} stroke="currentColor" fill="none" {...props} />

/* 1 — HERO: brutalist tower skyline (Asunción financial district as a clean slate) */
export function TowerSkyline({ className = '' }) {
  return (
    <Canvas viewBox="0 0 240 160" className={className} stagger={0.1}>
      <L x1="8" y1="150" x2="232" y2="150" />
      <P d="M28 150 V64 H58 V150" />
      <P d="M68 150 V36 H100 V150" />
      <P d="M110 150 V88 H136 V150" />
      <P d="M146 150 V22 H182 V150" />
      <P d="M192 150 V98 H216 V150" />
      {/* floor lines */}
      <L x1="68" y1="70" x2="100" y2="70" />
      <L x1="68" y1="104" x2="100" y2="104" />
      <L x1="146" y1="58" x2="182" y2="58" />
      <L x1="146" y1="94" x2="182" y2="94" />
      <L x1="146" y1="130" x2="182" y2="130" />
      <L x1="28" y1="100" x2="58" y2="100" />
    </Canvas>
  )
}

/* 2 — THE PROBLEM: the monolith + tracker reticle (CPF as a tracker on your money) */
export function TrackerMonolith({ className = '' }) {
  return (
    <Canvas viewBox="0 0 200 200" className={className}>
      <P d="M54 36 H146 V176 H54 Z" />
      {/* scan grid */}
      <L x1="54" y1="76" x2="146" y2="76" strokeDasharray="3 6" />
      <L x1="54" y1="116" x2="146" y2="116" strokeDasharray="3 6" />
      <L x1="54" y1="156" x2="146" y2="156" strokeDasharray="3 6" />
      {/* the crack */}
      <P d="M100 36 L92 78 L108 110 L94 146 L100 176" strokeWidth="2" />
      {/* targeting reticle */}
      <C cx="100" cy="110" r="26" />
      <L x1="100" y1="74" x2="100" y2="92" />
      <L x1="100" y1="128" x2="100" y2="146" />
      <L x1="64" y1="110" x2="82" y2="110" />
      <L x1="118" y1="110" x2="136" y2="110" />
    </Canvas>
  )
}

/* 3 — THE ESCAPE: energy monolith / Itaipu dam (cheap energy backing low tax) */
export function EnergyDam({ className = '' }) {
  return (
    <Canvas viewBox="0 0 240 160" className={className}>
      <P d="M24 44 H216 L196 116 H44 Z" />
      {/* spillway columns */}
      <L x1="74" y1="44" x2="66" y2="116" />
      <L x1="120" y1="44" x2="120" y2="116" />
      <L x1="166" y1="44" x2="174" y2="116" />
      <L x1="40" y1="80" x2="200" y2="80" />
      {/* rushing water / energy lines */}
      <P d="M52 120 C 70 136, 90 136, 108 122" />
      <P d="M104 122 C 122 138, 142 138, 160 124" />
      <P d="M156 122 C 170 134, 184 134, 196 124" />
      <L x1="120" y1="20" x2="120" y2="40" strokeDasharray="2 5" />
    </Canvas>
  )
}

/* 4 — A SALA: the executive table (the empty pristine room that invites a seat) */
export function SalaTable({ className = '' }) {
  return (
    <Canvas viewBox="0 0 240 160" className={className}>
      {/* table top in perspective */}
      <P d="M70 66 H170 L206 120 H34 Z" />
      <L x1="92" y1="66" x2="66" y2="120" strokeDasharray="2 5" />
      <L x1="148" y1="66" x2="174" y2="120" strokeDasharray="2 5" />
      {/* chairs */}
      <P d="M40 124 h22 v12 h-22 z" />
      <P d="M178 124 h22 v12 h-22 z" />
      <P d="M104 130 h32 v12 h-32 z" />
      <P d="M88 56 h18 v10 h-18 z" />
      <P d="M134 56 h18 v10 h-18 z" />
      {/* pendant light */}
      <L x1="120" y1="14" x2="120" y2="34" />
      <P d="M104 34 H136 L128 46 H112 Z" />
    </Canvas>
  )
}

/* 5 — THE PROCESS: the seal over a document (Sigillum — the system that guides) */
export function SealBlueprint({ className = '' }) {
  return (
    <Canvas viewBox="0 0 200 200" className={className} stagger={0.12}>
      {/* document with folded corner */}
      <P d="M44 30 H132 L156 54 V170 H44 Z" />
      <P d="M132 30 V54 H156" />
      <L x1="58" y1="150" x2="120" y2="150" strokeDasharray="3 6" />
      <L x1="58" y1="162" x2="104" y2="162" strokeDasharray="3 6" />
      {/* seal */}
      <C cx="108" cy="100" r="40" />
      <C cx="108" cy="100" r="31" />
      {/* radiating ticks */}
      <L x1="108" y1="56" x2="108" y2="66" />
      <L x1="108" y1="134" x2="108" y2="144" />
      <L x1="64" y1="100" x2="74" y2="100" />
      <L x1="142" y1="100" x2="152" y2="100" />
      {/* monogram cross */}
      <P d="M96 112 L108 80 L120 112" />
      <L x1="100" y1="102" x2="116" y2="102" />
    </Canvas>
  )
}
