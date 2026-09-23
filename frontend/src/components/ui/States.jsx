export function Spinner({ label = 'Loading…' }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600"
      />
      {label}
    </span>
  );
}

export function LoadingBlock({ title = 'Loading', description }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-surface px-5 py-12 text-center" aria-busy="true">
      <div className="flex justify-center">
        <span
          aria-hidden="true"
          className="h-7 w-7 animate-spin rounded-full border-[3px] border-stone-200 border-t-brand-600"
        />
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{title}…</p>
      {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
    </div>
  );
}

export function ErrorBlock({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-5 py-10 text-center">
      <div className="flex justify-center">
        <svg
          aria-hidden="true"
          className="h-8 w-8 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-red-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-[13px] text-red-700">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-9 rounded border border-red-300 bg-white px-4 text-sm font-medium text-red-800 transition-colors hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-surface px-5 py-12 text-center">
      {icon ? (
        <div className="flex justify-center text-stone-300">{icon}</div>
      ) : (
        <div className="flex justify-center">
          <svg
            aria-hidden="true"
            className="h-10 w-10 text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Skeleton shimmer for list/card loading placeholder */
export function SkeletonLine({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-stone-200 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div aria-hidden="true" className="rounded-lg border border-stone-200 bg-surface p-5 shadow-subtle">
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-3 w-2/3" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded border border-stone-100 bg-surface px-4 py-3">
          <SkeletonLine className="h-4 w-1/4" />
          <SkeletonLine className="h-4 w-1/3" />
          <SkeletonLine className="h-4 w-1/5 ml-auto" />
        </div>
      ))}
    </div>
  );
}
