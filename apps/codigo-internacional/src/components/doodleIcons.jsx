/**
 * Hand-drawn line icons in the style of the reference icon sheet.
 * Single-stroke, rounded caps, currentColor. 24x24 viewBox.
 * Use: <Rocket className="w-8 h-8 text-mineral" />
 */
import { motion } from 'framer-motion'

function Svg({ children, className = '', sw = 1.6 }) {
  return (
    <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
      initial={{ scale: 0.55, opacity: 0, rotate: -12 }}
      whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 240, damping: 15 }}
      whileHover={{ scale: 1.14, rotate: 4 }}>
      {children}
    </motion.svg>
  )
}

export function Rocket(p) {
  return <Svg {...p}>
    <path d="M12 3c3 1.6 4.5 4.4 4.5 8 0 1.6-.4 3-1 4.2H8.5C7.9 14 7.5 12.6 7.5 11c0-3.6 1.5-6.4 4.5-8Z" />
    <circle cx="12" cy="9.5" r="1.6" />
    <path d="M8.6 15.2c-1.4.6-2.2 1.7-2.4 3.4 1.6-.2 2.8-.9 3.4-2.1M15.4 15.2c1.4.6 2.2 1.7 2.4 3.4-1.6-.2-2.8-.9-3.4-2.1" />
    <path d="M10.5 18.5c.4 1 .9 1.7 1.5 2 .6-.3 1.1-1 1.5-2" />
  </Svg>
}

export function LockCheck(p) {
  return <Svg {...p}>
    <rect x="5" y="10" width="14" height="9" rx="1.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    <path d="m9.5 14.5 1.6 1.6 3-3.2" />
  </Svg>
}

export function Tracker(p) {
  return <Svg {...p}>
    <path d="M12 21c4-4 6-7 6-10a6 6 0 1 0-12 0c0 3 2 6 6 10Z" />
    <circle cx="12" cy="11" r="2.4" />
    <path d="M12 6.5v1.8M12 13.7v1.8M7.5 11h1.8M14.7 11h1.8" />
  </Svg>
}

export function Conversation(p) {
  return <Svg {...p}>
    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h7a2.5 2.5 0 0 1 2.5 2.5v3A2.5 2.5 0 0 1 13 13H8l-3 2.5V13a2.5 2.5 0 0 1-1.5-2.3Z" />
    <path d="M16 10.5h2.5A2.5 2.5 0 0 1 21 13v2.5l-2.2-1.6" opacity=".75" />
  </Svg>
}

export function Community(p) {
  return <Svg {...p}>
    <circle cx="8" cy="9" r="2.2" /><circle cx="15.5" cy="9" r="2.2" />
    <path d="M4.5 18c0-2.2 1.6-3.6 3.5-3.6S11.5 15.8 11.5 18M12.5 18c0-2.2 1.6-3.6 3.5-3.6S19.5 15.8 19.5 18" />
    <path d="M12 4.2c.7.5 1 1.1 1 1.8 0 .9-1 1.8-1 1.8s-1-.9-1-1.8c0-.7.3-1.3 1-1.8Z" />
  </Svg>
}

export function Stopwatch(p) {
  return <Svg {...p}>
    <circle cx="12" cy="13" r="7" /><path d="M12 13V9.5M12 13l3 1.5M10 3h4M12 3v3" />
    <path d="m18.5 7 1.5-1.5" />
  </Svg>
}

export function ChartUp(p) {
  return <Svg {...p}>
    <path d="M5 4v15h15" />
    <path d="M8 15v-2M11 15v-5M14 15v-3" />
    <path d="M8 9.5 12 6l2.5 2L18 5" /><path d="M18 5v2.6M18 5h-2.6" />
  </Svg>
}

export function CoinsPercent(p) {
  return <Svg {...p}>
    <ellipse cx="9" cy="8" rx="4.5" ry="2" />
    <path d="M4.5 8v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V8" />
    <path d="M4.5 11v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-1" />
    <path d="m16.5 6.5 4 4M17 7.2h.01M20 9.8h.01" />
  </Svg>
}

export function MailHeart(p) {
  return <Svg {...p}>
    <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    <path d="M4 7l8 5.5L20 7" />
    <path d="M12 14.4c-1-1-2.4-1.4-2.4-2.7 0-.7.6-1.1 1.2-1.1.5 0 .9.3 1.2.7.3-.4.7-.7 1.2-.7.6 0 1.2.4 1.2 1.1 0 1.3-1.4 1.7-2.4 2.7Z" opacity=".8" />
  </Svg>
}

export function Headset(p) {
  return <Svg {...p}>
    <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
    <rect x="3.5" y="12.5" width="3.5" height="5" rx="1.2" />
    <rect x="17" y="12.5" width="3.5" height="5" rx="1.2" />
    <path d="M19 17.5v.5a3 3 0 0 1-3 3h-2.5" />
  </Svg>
}

export function KeySearch(p) {
  return <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" />
    <circle cx="9" cy="10.5" r="1.4" /><path d="M10.3 10.8 13 13.5M11.6 12.1l-.9.9M12.5 13l-.9.9" />
  </Svg>
}

export function CalendarCheck(p) {
  return <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14" rx="1.5" /><path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
    <path d="m9 14 2 2 4-4" />
  </Svg>
}

export function Lightbulb(p) {
  return <Svg {...p}>
    <path d="M9 15a5 5 0 1 1 6 0c-.7.5-1 1.2-1 2H10c0-.8-.3-1.5-1-2Z" />
    <path d="M10 19h4M10.5 21h3" />
    <path d="M12 2.5v1.5M4.5 6l1 1M19.5 6l-1 1" opacity=".7" />
  </Svg>
}

export function SealCheck(p) {
  return <Svg {...p}>
    <path d="M12 3.2 14 4.6l2.4-.2.8 2.3 2 1.4-.7 2.3.7 2.3-2 1.4-.8 2.3-2.4-.2L12 18l-2-1.4-2.4.2-.8-2.3-2-1.4.7-2.3L4.8 8.4l2-1.4.8-2.3L10 4.6Z" />
    <path d="m9.5 11.5 1.7 1.7 3.3-3.4" />
  </Svg>
}

export function Plane(p) {
  return <Svg {...p}>
    <path d="M3 13.5 21 6l-3.5 13-4-4.5-3 3v-4.2L3 13.5Z" />
  </Svg>
}

// Interpol / Polícia — shield + check (security, official protocol)
export function Shield(p) {
  return <Svg {...p}>
    <path d="M12 3 19 5.5v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9v-5L12 3Z" />
    <path d="m9 11.5 2 2 4-4" />
  </Svg>
}

// Tour de compras — shopping bag
export function ShoppingBag(p) {
  return <Svg {...p}>
    <path d="M6.5 8h11l-1 11.5H7.5L6.5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Svg>
}

// Dia livre / momento livre — sun (leisure)
export function Sun(p) {
  return <Svg {...p}>
    <circle cx="12" cy="12" r="3.8" />
    <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
  </Svg>
}

// Retorno / volta ao Brasil — home
export function Home(p) {
  return <Svg {...p}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10.4V19h12v-8.6" />
    <path d="M10 19v-4.4h4V19" />
  </Svg>
}

// Preparação blindada — checklist / documents
export function Checklist(p) {
  return <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="1.5" />
    <path d="M9 3.5h6v2.4H9z" />
    <path d="m7.8 11 1.1 1.1 2-2M7.8 16l1.1 1.1 2-2" />
    <path d="M13.5 10.4H16.5M13.5 15.4H16.5" />
  </Svg>
}

// — extra reference-sheet icons —
export function Star(p) {
  return <Svg {...p}>
    <path d="M12 3.5 14.2 9 20 9.6 15.6 13.4 17 19 12 15.8 7 19 8.4 13.4 4 9.6 9.8 9 Z" />
  </Svg>
}
export function ThumbsUp(p) {
  return <Svg {...p}>
    <path d="M7 11v8H4.6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1H7Z" />
    <path d="M7 11l3.4-6.6c1.2.1 2 .9 2 2.2V9h4.3a2 2 0 0 1 2 2.4l-1 5A2 2 0 0 1 17.7 18H7" />
  </Svg>
}
export function BoxDownload(p) {
  return <Svg {...p}>
    <path d="M4.5 12 12 15l7.5-3v5L12 20l-7.5-3Z" />
    <path d="M4.5 12 12 9l7.5 3" opacity="0.55" />
    <path d="M12 3v6M9.6 7l2.4 2.4L14.4 7" />
  </Svg>
}
export function BrowserGears(p) {
  return <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
    <path d="M3.5 9h17M6 7h.01M8 7h.01" />
    <circle cx="10.5" cy="14" r="2" />
    <path d="M10.5 11.3v-1M10.5 16.7v1M7.8 14h-1M13.2 14h1" opacity="0.7" />
  </Svg>
}
export function Magnifier(p) {
  return <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" />
  </Svg>
}
