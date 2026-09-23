import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';
import { listBookings } from '../lib/bookings';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';
import { STATUS_TONE, formatStatus } from '../lib/status';

const BOOKING_STATUSES = [
  '', 'CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY',
  'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CUSTOMER_CONFIRMED', 'CLOSED',
  'CANCELLED', 'DISPUTED',
];

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function Bookings() {
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
        // paginated() response: data is the array, pagination is separate
        setItems(Array.isArray(data) ? data : data.items || []);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load bookings.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  return (
    <div>
      <PageHeader
        title="My bookings"
        description="Every service you've booked — from confirmed to closed."
      />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="booking-filter" className="text-sm font-medium text-ink">Status</label>
        <select
          id="booking-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded border border-stone-300 bg-white px-3 text-sm"
        >
          {BOOKING_STATUSES.map((s) => (
            <option key={s || 'all'} value={s}>
              {s === '' ? 'All' : formatStatus(s)}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' && <LoadingBlock title="Loading bookings" />}
      {state === 'error' && (
        <ErrorBlock title="Could not load bookings" description={error} onRetry={() => setState('loading')} />
      )}
      {state === 'success' && items.length === 0 && (
        <EmptyState
          title={filter ? `No ${formatStatus(filter)} bookings` : 'No bookings yet'}
          description="Accepted quotes will appear here as confirmed bookings."
        />
      )}
      {state === 'success' && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((b) => {
            const providerName = b.providerId?.userId?.name || 'Provider';
            const serviceTitle = b.requestId?.categoryId?.name || b.requestId?.description || 'Service';
            return (
              <li key={b._id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link to={`/bookings/${b._id}`} className="font-semibold text-ink">
                        {serviceTitle}
                      </Link>
                      <Badge tone={STATUS_TONE[b.status] || 'neutral'}>{formatStatus(b.status)}</Badge>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Provider: <span className="font-medium">{providerName}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-faint">
                      {fmt(b.startAt)} {fmtTime(b.startAt) && `· ${fmtTime(b.startAt)}`}
                      {b.address?.city ? ` · ${b.address.city}` : ''}
                    </p>
                    {b.pricing?.total > 0 && (
                      <p className="mt-0.5 text-[13px] font-medium text-ink-muted">
                        ${b.pricing.total.toFixed(2)} {b.pricing.currency || 'USD'}
                      </p>
                    )}
                  </div>
                  <Link to={`/bookings/${b._id}`} className="shrink-0 text-sm font-medium">
                    View details →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
