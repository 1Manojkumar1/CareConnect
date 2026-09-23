import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDisputes } from '../lib/disputes';

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-neutral-100 text-neutral-600',
};

const REASON_LABELS = {
  SERVICE_NOT_COMPLETED: 'Service Not Completed',
  POOR_QUALITY: 'Poor Quality',
  PROVIDER_NO_SHOW: 'Provider No-Show',
  BILLING_ISSUE: 'Billing Issue',
  DAMAGE_OR_LOSS: 'Damage / Loss',
  SAFETY_CONCERN: 'Safety Concern',
  FRAUD: 'Fraud',
  OTHER: 'Other',
};

export default function Disputes() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    listDisputes({ status: status || undefined })
      .then(setData)
      .catch(() => setErr('Could not load disputes'))
      .finally(() => setLoading(false));
  }, [status]);

  const disputes = data?.disputes || [];
  const total = data?.total || 0;

  return (
    <div className="cc-container py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Disputes</h1>
          <p className="text-neutral-500 text-sm mt-1">{total} dispute{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/disputes/new"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 hover:text-white transition-colors"
        >
          + Raise Dispute
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 mb-6">{err}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⚖️</div>
          <p className="text-lg font-medium text-neutral-600">No disputes found</p>
          <p className="text-sm text-neutral-400 mt-1">
            {status ? 'No disputes match this filter.' : "You haven't raised any disputes yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Link
              key={d._id}
              to={`/disputes/${d._id}`}
              className="block bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[d.status]}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {REASON_LABELS[d.reason] || d.reason}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 line-clamp-2">{d.description}</p>
                </div>
                <span className="text-brand-600 text-sm ml-4 group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <span>Raised by {d.raisedBy?.name || 'Unknown'}</span>
                <span>·</span>
                <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                {d.assignedTo && (
                  <>
                    <span>·</span>
                    <span>Assigned to {d.assignedTo.name}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
