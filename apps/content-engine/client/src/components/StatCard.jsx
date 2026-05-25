// Dark metric card — inline styles for gradients so Tailwind v4 build never strips them
const ICON_COLORS = {
  indigo: { from: '#6366f1', to: '#8b5cf6', glow: 'rgba(99,102,241,0.4)'  },
  green:  { from: '#10b981', to: '#14b8a6', glow: 'rgba(16,185,129,0.35)' },
  yellow: { from: '#f59e0b', to: '#f97316', glow: 'rgba(245,158,11,0.35)' },
  red:    { from: '#ef4444', to: '#f43f5e', glow: 'rgba(239,68,68,0.35)'  },
  blue:   { from: '#3b82f6', to: '#6366f1', glow: 'rgba(59,130,246,0.35)' },
  violet: { from: '#8b5cf6', to: '#a855f7', glow: 'rgba(139,92,246,0.4)'  },
}

const CARD_STYLE = {
  background: 'linear-gradient(140deg, #13131e 0%, #1c1c2e 100%)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.07)',
  padding: '20px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  transition: 'all 0.2s',
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const ic = ICON_COLORS[color] ?? ICON_COLORS.indigo
  return (
    <div style={CARD_STYLE}>
      {Icon && (
        <div style={{
          background: `linear-gradient(135deg, ${ic.from}, ${ic.to})`,
          boxShadow: `0 4px 12px ${ic.glow}`,
          padding: '10px',
          borderRadius: '12px',
          flexShrink: 0,
        }}>
          <Icon size={18} color="#fff" strokeWidth={2} />
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: '4px',
        }}>{label}</p>
        <p style={{
          fontSize: '30px', fontWeight: 900, color: '#fff',
          letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{value}</p>
        {sub && <p style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px', fontWeight: 500,
        }}>{sub}</p>}
      </div>
    </div>
  )
}
