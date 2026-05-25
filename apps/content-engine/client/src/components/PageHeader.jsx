export default function PageHeader({ title, description, action, overline }) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-up">
      <div>
        {overline && (
          <p className="overline mb-2">{overline}</p>
        )}
        <h2 className="text-[26px] font-black text-gray-900 tracking-tight leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-400 mt-1 font-medium leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 ml-6">{action}</div>}
    </div>
  )
}
