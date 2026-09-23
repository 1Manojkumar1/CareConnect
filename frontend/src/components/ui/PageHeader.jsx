/**
 * PageHeader — used on every main page to provide a consistent title/action bar.
 *
 * Props:
 *   title       — required, primary H1 text
 *   description — optional subtitle
 *   actions     — optional CTA buttons / controls aligned to the right
 *   breadcrumb  — optional breadcrumb nav content
 *   border      — if true, adds a bottom border separator (default: false)
 */
export default function PageHeader({ title, description, actions, breadcrumb, border = false }) {
  return (
    <div className={`mb-7 ${border ? 'border-b border-stone-200 pb-5' : ''}`}>
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12.5px] text-ink-faint">
          {breadcrumb}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[14px] text-ink-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
