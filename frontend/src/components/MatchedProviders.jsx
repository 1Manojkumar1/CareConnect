import { Link } from 'react-router-dom';
import Badge from './ui/Badge';
import { EmptyState, LoadingBlock } from './ui/States';

export default function MatchedProviders({ providers, state, onBrowse }) {
  if (state === 'loading') return <LoadingBlock title="Finding matching providers" description="Checking verification, skills, and service areas." />;
  if (!providers || providers.length === 0) {
    return (
      <EmptyState
        title="No matching providers yet"
        description="No verified providers currently cover this skill and area. Try adjusting the request, or check back after more providers join."
      />
    );
  }
  return (
    <div>
      <ul className="grid gap-3">
        {providers.map((p) => (
          <li key={p.id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <Link to={`/providers/${p.id}`} className="font-semibold text-ink">{p.headline || p.name}</Link>
                  <span className="inline-flex items-center rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                    {p.score}% match
                  </span>
                </p>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {p.name}
                  {p.ratingCount > 0 && ` · ★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})`}
                  {` · ${p.experienceYears} yrs · $${p.pricing.hourlyRate}/hr`}
                  {` · Serves ${(p.serviceAreas || []).map((a) => a.city).join(', ')}`}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Why this provider matches">
                  {p.matchReasons.map((r) => (
                    <li key={r}>
                      <Badge tone="success">{r}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to={`/providers/${p.id}`} className="shrink-0 text-sm font-medium">View profile</Link>
            </div>
          </li>
        ))}
      </ul>
      {onBrowse && (
        <p className="mt-3 text-sm text-ink-muted">
          <button type="button" onClick={onBrowse} className="font-medium text-brand-700 hover:underline">
            Browse all verified providers
          </button>
        </p>
      )}
    </div>
  );
}
