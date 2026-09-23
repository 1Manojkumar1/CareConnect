import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOperationsQueue } from '../../lib/admin';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';

export default function OperationsQueue() {
  const [queue, setQueue] = useState(null);
  const [activeTab, setActiveTab] = useState('unassigned');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getOperationsQueue();
      setQueue(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load operations queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock message="Loading operations queue..." />;
  if (error) return <ErrorBlock title="Queue Error" message={error} onRetry={load} />;
  if (!queue) return null;

  const { summary, unassignedBookings, disputedBookings, urgentRequests } = queue;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Operations Dispatch & Escalations"
          description="Action items requiring intervention: unassigned confirmed bookings, disputed jobs, and urgent requests."
        />
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 bg-white border border-stone-300 text-ink rounded-lg text-sm hover:bg-stone-50"
          >
            ↻ Refresh Queue
          </button>
          <Link
            to="/admin/stats"
            className="px-3 py-1.5 bg-stone-100 text-ink rounded-lg text-sm hover:bg-stone-200"
          >
            View Stats
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'unassigned'
              ? 'bg-brand-700 text-white shadow-sm'
              : 'text-ink-muted hover:bg-stone-100'
          }`}
        >
          Unassigned Bookings
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'unassigned' ? 'bg-brand-900 text-brand-100' : 'bg-stone-200 text-ink'
          }`}>
            {summary.unassignedBookingsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'disputes'
              ? 'bg-red-700 text-white shadow-sm'
              : 'text-ink-muted hover:bg-stone-100'
          }`}
        >
          Disputed Bookings
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'disputes' ? 'bg-red-900 text-red-100' : 'bg-stone-200 text-ink'
          }`}>
            {summary.disputedBookingsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('urgent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'urgent'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-ink-muted hover:bg-stone-100'
          }`}
        >
          Urgent Requests
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'urgent' ? 'bg-amber-800 text-amber-100' : 'bg-stone-200 text-ink'
          }`}>
            {summary.urgentRequestsCount}
          </span>
        </button>
      </div>

      {/* Tab: Unassigned Bookings */}
      {activeTab === 'unassigned' && (
        <Card title={`Unassigned Bookings (${unassignedBookings.length})`}>
          {unassignedBookings.length === 0 ? (
            <EmptyState
              title="All bookings assigned"
              description="There are no pending unassigned confirmed bookings at this time."
            />
          ) : (
            <div className="divide-y divide-stone-200">
              {unassignedBookings.map((b) => (
                <div key={b._id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">Booking #{b.bookingNumber || b._id.slice(-6)}</span>
                      <Badge tone="warning">Awaiting Provider</Badge>
                      {b.requestId?.urgency && (
                        <Badge tone="danger">{b.requestId.urgency}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      Customer: <span className="font-medium text-ink">{b.customerId?.name || 'Customer'}</span> ({b.customerId?.email})
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Scheduled: {new Date(b.startAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/bookings/${b._id}`}
                      className="px-3 py-1.5 bg-brand-700 text-white text-xs font-medium rounded hover:bg-brand-800 hover:text-white"
                    >
                      Assign Provider →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Disputed Bookings */}
      {activeTab === 'disputes' && (
        <Card title={`Disputed Bookings (${disputedBookings.length})`}>
          {disputedBookings.length === 0 ? (
            <EmptyState
              title="No active disputes"
              description="No bookings are currently flagged under dispute."
            />
          ) : (
            <div className="divide-y divide-stone-200">
              {disputedBookings.map((b) => (
                <div key={b._id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">Booking #{b.bookingNumber || b._id.slice(-6)}</span>
                      <Badge tone="danger">DISPUTED</Badge>
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      Customer: {b.customerId?.name} · Last updated: {new Date(b.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/bookings/${b._id}`}
                      className="px-3 py-1.5 bg-stone-100 text-ink text-xs font-medium rounded hover:bg-stone-200"
                    >
                      View Booking
                    </Link>
                    <Link
                      to="/disputes"
                      className="px-3 py-1.5 bg-red-700 text-white text-xs font-medium rounded hover:bg-red-800 hover:text-white"
                    >
                      Open Disputes →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Urgent Requests */}
      {activeTab === 'urgent' && (
        <Card title={`High Urgency Requests (${urgentRequests.length})`}>
          {urgentRequests.length === 0 ? (
            <EmptyState
              title="No urgent backlog"
              description="All emergency and same-day requests have been addressed."
            />
          ) : (
            <div className="divide-y divide-stone-200">
              {urgentRequests.map((r) => (
                <div key={r._id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{r.title || r.categoryId?.name || 'Service Request'}</span>
                      <Badge tone="danger">{r.urgency}</Badge>
                      <Badge tone="neutral">{r.status}</Badge>
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      Customer: {r.customerId?.name} ({r.customerId?.email})
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Created: {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/requests/${r._id}`}
                      className="px-3 py-1.5 bg-brand-700 text-white text-xs font-medium rounded hover:bg-brand-800 hover:text-white"
                    >
                      Review Request →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
