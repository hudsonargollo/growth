import { useEffect, useRef } from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from 'framer-motion'

// Editorial easing — slow, confident, architectural.
const EASE = [0.16, 1, 0.3, 1]

/** Fade + slide-up on scroll into view. */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div' }) {
  const M = motion[as] ?? motion.div
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </M>
  )
}

/** Parent that staggers its <Stagger.Item> children as they enter view. */
export function Stagger({ children, className = '', gap = 0.12 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ visible: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

Stagger.Item = function StaggerItem({ children, className = '', y = 24 }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Animated number count-up when scrolled into view.
 * `value` is numeric; `prefix`/`suffix` wrap it; `format` controls thousands.
 */
export function CountUp({ value, prefix = '', suffix = '', format = false, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { duration: 1600, bounce: 0 })
  const text = useTransform(spring, (n) => {
    const v = Math.round(n)
    const s = format ? v.toLocaleString('pt-BR') : String(v)
    return `${prefix}${s}${suffix}`
  })

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  return <motion.span ref={ref} className={className}>{text}</motion.span>
}

/** Subtle parallax drift for decorative illustrations. */
export function Parallax({ children, distance = 40, className = '' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

export { motion, EASE }
