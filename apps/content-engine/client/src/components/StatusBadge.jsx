const variants = {
  pending:     'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-green-100 text-green-800',
  failed:      'bg-red-100 text-red-800',
  flagged:     'bg-orange-100 text-orange-800',
}

export default function StatusBadge({ status }) {
  const label = status.replace('_', ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${variants[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}
