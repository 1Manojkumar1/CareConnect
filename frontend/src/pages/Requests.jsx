import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';
import { listRequests } from '../lib/requests';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

const FILTERS = ['', 'DRAFT', 'OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'CLOSED'];

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Requests() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: data } = await listRequests(filter ? { status: filter } : {});
        if (cancelled) return;
        setItems(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load requests.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div>
      <PageHeader
        title="Service requests"
        description="Everything you've asked for, from draft to booked."
        actions={
          <Link to="/requests/new" className="inline-flex h-9 items-center rounded bg-brand-700 px-3 text-sm font-medium text-white no-underline hover:bg-brand-800 hover:no-underline">
            New request
          </Link>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="req-filter" className="text-sm font-medium text-ink">Status</label>
        <select id="req-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded border border-stone-300 bg-white px-3 text-sm">
          {FILTERS.map((f) => <option key={f || 'all'} value={f}>{f === '' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {state === 'loading' && <LoadingBlock title="Loading requests" />}
      {state === 'error' && <ErrorBlock title="Could not load requests" description={error} onRetry={() => window.location.reload()} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState
          title={filter ? `No ${filter.toLowerCase()} requests` : 'No requests yet'}
          description="Describe your problem and get matched with verified providers."
          action={<Link to="/requests/new"><Button size="sm">Create your first request</Button></Link>}
        />
      )}
      {state === 'success' && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link to={`/requests/${r.id}`} className="font-semibold text-ink">{r.category?.name || 'Service request'}</Link>
                    <Badge status={r.status} />
                    <Badge tone={r.urgency === 'HIGH' ? 'danger' : r.urgency === 'MEDIUM' ? 'warning' : 'neutral'}>{r.urgency} urgency</Badge>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{r.description}</p>
                  <p className="mt-1 text-[13px] text-ink-faint">
                    {formatDate(r.preferredDate)} · {r.timeWindow.toLowerCase()} · {r.address.city}
                  </p>
                </div>
                <Link to={`/requests/${r.id}`} className="shrink-0 text-sm font-medium">View details</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
