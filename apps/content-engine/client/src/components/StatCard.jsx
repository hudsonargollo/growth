// Dark metric card with gradient icon well — distinctive against the light canvas
const iconBg = {
  indigo: 'from-indigo-500 to-violet-500',
  green:  'from-emerald-500 to-teal-500',
  yellow: 'from-amber-400  to-orange-500',
  red:    'from-red-500    to-rose-600',
  blue:   'from-blue-500   to-indigo-500',
  violet: 'from-violet-500 to-purple-600',
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
  const grad = iconBg[color] ?? iconBg.indigo
  return (
    <div className="metric-card">
      {Icon && (
        <div className={`bg-gradient-to-br ${grad} p-2.5 rounded-xl shrink-0 shadow-[0_4px_12px_rgba(99,102,241,0.35)]`}>
          <Icon size={18} className="text-white" strokeWidth={2} />
        </div>
      )}
      <div className="min-w-0">
        <p className="metric-label">{label}</p>
        <p className="metric-value">{value}</p>
        {sub && <p className="metric-sub">{sub}</p>}
      </div>
    </div>
  )
}
