import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';
import { listBookings } from '../lib/bookings';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';
import { STATUS_TONE, formatStatus } from '../lib/status';

const ACTIVE_STATUSES = [
  '', 'CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY',
  'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CUSTOMER_CONFIRMED', 'CLOSED',
  'CANCELLED', 'DISPUTED',
];

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProviderJobs() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        const data = await listBookings(filter ? { status: filter } : {});
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : data.items || []);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load jobs.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  // Group by urgency: active jobs first, terminal last
  const activeItems = items.filter((b) =>
    !['CLOSED', 'CANCELLED', 'REFUNDED'].includes(b.status)
  );
  const closedItems = items.filter((b) =>
    ['CLOSED', 'CANCELLED', 'REFUNDED'].includes(b.status)
  );

  return (
    <div>
      <PageHeader
        title="My jobs"
        description="Active assignments, work in progress, and completed service history."
      />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="job-filter" className="text-sm font-medium text-ink">Status</label>
        <select
          id="job-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded border border-stone-300 bg-white px-3 text-sm"
        >
          {ACTIVE_STATUSES.map((s) => (
            <option key={s || 'all'} value={s}>
              {s === '' ? 'All' : formatStatus(s)}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' && <LoadingBlock title="Loading jobs" />}
      {state === 'error' && (
        <ErrorBlock title="Could not load jobs" description={error} onRetry={() => setState('loading')} />
      )}
      {state === 'success' && items.length === 0 && (
        <EmptyState
          title={filter ? `No ${formatStatus(filter)} jobs` : 'No jobs assigned yet'}
          description="Accepted quotes from customers will appear here as job assignments."
        />
      )}

      {state === 'success' && items.length > 0 && (
        <div className="space-y-6">
          {activeItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
                Active ({activeItems.length})
              </h2>
              <ul className="grid gap-3">
                {activeItems.map((b) => (
                  <JobCard key={b._id} booking={b} />
                ))}
              </ul>
            </section>
          )}
          {closedItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
                Completed &amp; Closed ({closedItems.length})
              </h2>
              <ul className="grid gap-3">
                {closedItems.map((b) => (
                  <JobCard key={b._id} booking={b} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function JobCard({ booking: b }) {
  const customerName = b.customerId?.name || 'Customer';
  const serviceTitle = b.requestId?.categoryId?.name || b.requestId?.description || 'Service job';
  const isUrgent = ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status);

  return (
    <li className={`rounded-lg border bg-surface px-4 py-4 shadow-subtle ${isUrgent ? 'border-amber-300' : 'border-stone-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <Link to={`/bookings/${b._id}`} className="font-semibold text-ink">
              {serviceTitle}
            </Link>
            <Badge tone={STATUS_TONE[b.status] || 'neutral'}>{formatStatus(b.status)}</Badge>
            {isUrgent && (
              <Badge tone="warning">Active now</Badge>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Customer: <span className="font-medium">{customerName}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            {fmt(b.startAt)}
            {b.address?.city ? ` · ${b.address.city}` : ''}
          </p>
          {b.pricing?.total > 0 && (
            <p className="mt-0.5 text-[13px] font-medium text-ink-muted">
              ${b.pricing.total.toFixed(2)} {b.pricing.currency || 'USD'}
            </p>
          )}
        </div>
        <Link to={`/bookings/${b._id}`} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
          Manage job →
        </Link>
      </div>
    </li>
  );
}
