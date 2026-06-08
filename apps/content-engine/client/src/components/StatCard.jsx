export default function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const palette = {
    indigo: { icon: 'rgba(99,102,241,0.15)',  iconBorder: 'rgba(99,102,241,0.30)',  iconColor: '#818cf8' },
    violet: { icon: 'rgba(139,92,246,0.15)',  iconBorder: 'rgba(139,92,246,0.30)',  iconColor: '#a78bfa' },
    green:  { icon: 'rgba(0,255,185,0.10)',   iconBorder: 'rgba(0,255,185,0.25)',   iconColor: '#00FFB9' },
    yellow: { icon: 'rgba(255,184,0,0.12)',   iconBorder: 'rgba(255,184,0,0.28)',   iconColor: '#FFB800' },
    red:    { icon: 'rgba(255,51,102,0.12)',  iconBorder: 'rgba(255,51,102,0.28)',  iconColor: '#FF3366' },
    blue:   { icon: 'rgba(0,212,255,0.10)',   iconBorder: 'rgba(0,212,255,0.25)',   iconColor: '#00D4FF' },
  }
  const p = palette[color] ?? palette.indigo

  return (
    <div style={{
      background: 'rgba(15,15,22,0.70)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
    }}>
      {Icon && (
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: p.icon, border: `1px solid ${p.iconBorder}`,
        }}>
          <Icon size={18} style={{ color: p.iconColor }} />
        </div>
      )}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: '0.01em' }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  )
}
