import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/api';
import { listBookings, assignProvider } from '../../lib/bookings';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';
import { STATUS_TONE, formatStatus } from '../../lib/status';
import { useDispatch } from 'react-redux';
import { pushToast } from '../../store/uiSlice';

const STATUSES = [
  '', 'CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY',
  'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CUSTOMER_CONFIRMED',
  'CLOSED', 'CANCELLED', 'DISPUTED',
];

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BookingsAdmin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [assignModal, setAssignModal] = useState(null); // { bookingId }
  const [providerId, setProviderId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const dispatch = useDispatch();

  async function load() {
    setState('loading');
    try {
      const data = await listBookings(filter ? { status: filter } : {});
      setItems(Array.isArray(data) ? data : data.items || []);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load bookings.'));
      setState('error');
    }
  }

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
        setError(getApiErrorMessage(err, 'Could not load bookings.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  async function handleAssign() {
    if (!providerId.trim()) {
      dispatch(pushToast({ tone: 'danger', message: 'Enter a provider profile ID.' }));
      return;
    }
    setAssigning(true);
    try {
      await assignProvider(assignModal.bookingId, { providerId: providerId.trim() });
      dispatch(pushToast({ tone: 'success', message: 'Provider reassigned.' }));
      setAssignModal(null);
      setProviderId('');
      load();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not reassign provider.') }));
    } finally {
      setAssigning(false);
    }
  }

  const byStatus = {
    urgent: items.filter((b) => ['DISPUTED'].includes(b.status)),
    active: items.filter((b) => ['CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)),
    pending: items.filter((b) => ['COMPLETED', 'CUSTOMER_CONFIRMED'].includes(b.status)),
    closed: items.filter((b) => ['CLOSED', 'CANCELLED', 'REFUNDED'].includes(b.status)),
  };

  return (
    <div>
      <PageHeader
        title="Booking queue"
        description="Monitor all service bookings, assign providers, and manage escalations."
      />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="admin-booking-filter" className="text-sm font-medium text-ink">Filter</label>
        <select
          id="admin-booking-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded border border-stone-300 bg-white px-3 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s || 'all'} value={s}>
              {s === '' ? 'All statuses' : formatStatus(s)}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={load}>Refresh</Button>
      </div>

      {!filter && state === 'success' && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Disputed', count: byStatus.urgent.length },
            { label: 'Active', count: byStatus.active.length },
            { label: 'Pending close', count: byStatus.pending.length },
            { label: 'Closed', count: byStatus.closed.length },
          ].map(({ label, count }) => (
            <div key={label} className="rounded-lg border border-stone-200 bg-surface px-4 py-3 shadow-subtle">
              <p className="text-[13px] text-ink-faint">{label}</p>
              <p className="mt-1 text-2xl font-bold text-ink">{count}</p>
            </div>
          ))}
        </div>
      )}

      {state === 'loading' && <LoadingBlock title="Loading bookings" />}
      {state === 'error' && <ErrorBlock title="Could not load bookings" description={error} onRetry={load} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState title="No bookings" description="No bookings match the current filter." />
      )}

      {state === 'success' && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Booking</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Scheduled</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const customerName = b.customerId?.name || '—';
                const providerName = b.providerId?.userId?.name || '—';
                const serviceTitle = b.requestId?.categoryId?.name || 'Service';
                const isDisputed = b.status === 'DISPUTED';
                return (
                  <tr key={b._id} className={`border-b border-stone-100 last:border-0 ${isDisputed ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link to={`/bookings/${b._id}`} className="font-medium text-brand-700 hover:underline">
                        {serviceTitle}
                      </Link>
                      <span className="block text-[11px] text-ink-faint">{b._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{customerName}</td>
                    <td className="px-4 py-3 text-ink-muted">{providerName}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmt(b.startAt)}</td>
                    <td className="px-4 py-3 font-medium">
                      {b.pricing?.total > 0 ? `$${b.pricing.total.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[b.status] || 'neutral'}>{formatStatus(b.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/bookings/${b._id}`} className="text-[13px] font-medium text-brand-700 hover:underline">
                          View
                        </Link>
                        {!['CLOSED', 'REFUNDED'].includes(b.status) && (
                          <button
                            type="button"
                            onClick={() => setAssignModal({ bookingId: b._id })}
                            className="text-[13px] font-medium text-ink-muted hover:underline"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign provider modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-ink">Reassign provider</h2>
            <p className="mb-3 text-sm text-ink-muted">
              Enter the Provider Profile ID to reassign this booking.
            </p>
            <input
              type="text"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="Provider profile ObjectId"
              className="mb-4 w-full rounded border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setAssignModal(null); setProviderId(''); }}
                className="h-9 rounded border border-stone-300 bg-white px-4 text-sm text-ink hover:bg-stone-50"
              >
                Cancel
              </button>
              <Button size="sm" onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Assigning…' : 'Reassign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
