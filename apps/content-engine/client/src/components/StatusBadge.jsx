const config = {
  pending:     { ring: 'ring-amber-200/80',   bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'  },
  in_progress: { ring: 'ring-blue-200/80',    bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'   },
  completed:   { ring: 'ring-emerald-200/80', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500'},
  failed:      { ring: 'ring-red-200/80',     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500'    },
  flagged:     { ring: 'ring-orange-200/80',  bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-500' },
  rejected:    { ring: 'ring-gray-200/80',    bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400'   },
}

const labels = {
  pending:     'pendente',
  in_progress: 'em andamento',
  completed:   'concluído',
  failed:      'falhou',
  flagged:     'sinalizado',
  rejected:    'rejeitado',
}

export default function StatusBadge({ status }) {
  const c     = config[status] ?? config.rejected
  const label = labels[status] ?? status?.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${c.ring} ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {label}
    </span>
  )
}
