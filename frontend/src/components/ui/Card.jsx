/**
 * Card — the primary surface container.
 *
 * Props:
 *   title       — optional card heading (h2/h3 semantics)
 *   description — optional subtitle below heading
 *   actions     — optional controls in the card header (right-aligned)
 *   children    — card body content
 *   className   — extra classes on the outer wrapper
 *   as          — root element ('section' | 'div' | 'article') — default 'section'
 *   padding     — 'none' | 'sm' | 'md' (default 'md')
 *   noBorder    — removes border (useful for page-level wrappers)
 */
export default function Card({
  title,
  description,
  actions,
  children,
  className = '',
  as: As = 'section',
  padding = 'md',
  noBorder = false,
}) {
  const padClass = {
    none: '',
    sm: 'px-4 py-3',
    md: 'px-5 py-4',
  }[padding] ?? 'px-5 py-4';

  const borderClass = noBorder ? '' : 'border border-stone-200';

  return (
    <As className={`rounded-xl bg-surface shadow-subtle ${borderClass} ${className}`}>
      {(title || actions) && (
        <header
          className={`flex items-start justify-between gap-4 border-b border-stone-100 ${
            padding === 'sm' ? 'px-4 py-3' : 'px-5 py-4'
          }`}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-[14.5px] font-semibold text-ink leading-snug truncate">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[12.5px] text-ink-muted leading-snug">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={padClass}>{children}</div>
    </As>
  );
}
