import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import { getApiErrorMessage } from '../lib/api';
import { listQuotes, withdrawQuote } from '../lib/quotes';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

export default function ProviderQuotes() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  async function load() {
    setState('loading');
    try {
      const { items: data } = await listQuotes({});
      setItems(data);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load quotes.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: data } = await listQuotes({});
        if (cancelled) return;
        setItems(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load quotes.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleWithdraw(q) {
    try {
      await withdrawQuote(q.id);
      dispatch(pushToast({ tone: 'success', message: 'Quote withdrawn.' }));
      load();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not withdraw.') }));
    }
  }

  return (
    <div>
      <PageHeader title="My quotes" description="Track every offer — pending, decided, and expired." />
      {state === 'loading' && <LoadingBlock title="Loading quotes" />}
      {state === 'error' && <ErrorBlock title="Could not load quotes" description={error} onRetry={load} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState
          title="No quotes yet"
          description="Find open requests and submit your first transparent quote."
          action={<Link to="/provider/requests"><Button size="sm">Browse requests</Button></Link>}
        />
      )}
      {state === 'success' && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Request</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link to={`/requests/${q.requestId}`} className="font-medium">Request</Link>
                    <span className="block text-[13px] text-ink-faint">{new Date(q.proposedDate).toLocaleDateString()} · {q.timeWindow.toLowerCase()}</span>
                  </td>
                  <td className="px-4 py-2 font-semibold text-ink">${q.pricing.total.toFixed(2)}</td>
                  <td className="px-4 py-2 text-ink-muted">{new Date(q.expiresAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><Badge status={q.status} /></td>
                  <td className="px-4 py-2 text-right">
                    {q.status === 'PENDING' && (
                      <button type="button" onClick={() => handleWithdraw(q)} className="text-[13px] font-medium text-red-700 hover:underline">
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
