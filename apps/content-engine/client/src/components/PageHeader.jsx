export default function PageHeader({ title, description, overline, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        {overline && (
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)', marginBottom: 6 }}>
            {overline}
          </p>
        )}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 5, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
