import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';
import { listOpenRequests } from '../lib/quotes';
import { fetchCategories, topLevel } from '../lib/catalog';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

export default function ProviderRequests() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [applied, setApplied] = useState({ categoryId: '', city: '' });
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (!cancelled) setCategories(topLevel(cats));
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = {};
        if (applied.categoryId) params.categoryId = applied.categoryId;
        if (applied.city) params.city = applied.city;
        const { items: data } = await listOpenRequests(params);
        if (cancelled) return;
        setItems(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load open requests.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied]);

  return (
    <div>
      <PageHeader
        title="Incoming requests"
        description="Open customer requests. Identities and exact addresses unlock at booking."
      />
      <form
        onSubmit={(e) => { e.preventDefault(); setApplied({ categoryId, city: city.trim() }); }}
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <select aria-label="Filter by category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm">
          <option value="">All services</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input aria-label="Filter by city" placeholder="City…" value={city} onChange={(e) => setCity(e.target.value)} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm" />
        <Button type="submit">Search</Button>
      </form>

      {state === 'loading' && <LoadingBlock title="Loading open requests" />}
      {state === 'error' && <ErrorBlock title="Could not load requests" description={error} onRetry={() => setApplied({ ...applied })} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState title="No open requests" description="New customer requests in your categories will appear here." />
      )}
      {state === 'success' && items.length > 0 && (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link to={`/requests/${r.id}`} className="font-semibold text-ink">{r.category?.name || 'Service request'}</Link>
                    <Badge tone={r.urgency === 'HIGH' ? 'danger' : r.urgency === 'MEDIUM' ? 'warning' : 'neutral'}>{r.urgency} urgency</Badge>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{r.description}</p>
                  <p className="mt-1 text-[13px] text-ink-faint">
                    {r.city} · ${r.budget.min}–${r.budget.max} · {new Date(r.preferredDate).toLocaleDateString()}
                  </p>
                </div>
                <Link to={`/requests/${r.id}`} className="shrink-0 text-sm font-medium">Review & quote</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
