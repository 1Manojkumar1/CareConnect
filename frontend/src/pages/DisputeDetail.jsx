import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDispute, updateDispute } from '../lib/disputes';
import { useSelector } from 'react-redux';

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

const STAFF_ROLES = ['SUPPORT', 'ADMIN', 'OPERATIONS'];

function TimelineEvent({ event }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
          {event.actor?.name?.[0] || '?'}
        </div>
        <div className="w-px flex-1 bg-neutral-200 mt-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-neutral-800">{event.actor?.name || 'System'}</span>
          <span className="text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
            {event.action}
          </span>
          <span className="text-xs text-neutral-400 ml-auto">
            {new Date(event.createdAt).toLocaleString()}
          </span>
        </div>
        {event.note && (
          <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 mt-1">
            {event.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DisputeDetail() {
  const { id } = useParams();
  const user = useSelector((s) => s.auth.user);
  const isStaff = STAFF_ROLES.includes(user?.role);

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Staff action form
  const [actionStatus, setActionStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    setLoading(true);
    getDispute(id)
      .then(setDispute)
      .catch(() => setErr('Dispute not found or access denied'))
      .finally(() => setLoading(false));
  }, [id]);

  const availableTransitions = dispute
    ? {
        OPEN: ['UNDER_REVIEW'],
        UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
        RESOLVED: [],
        REJECTED: [],
      }[dispute.status] || []
    : [];

  const handleAction = async () => {
    if (!actionStatus && !actionNote) return;
    setSaving(true);
    setSaveErr('');
    try {
      const updated = await updateDispute(id, {
        status: actionStatus || undefined,
        resolutionNote: resolutionNote || undefined,
        note: actionNote || undefined,
      });
      setDispute(updated);
      setActionStatus('');
      setResolutionNote('');
      setActionNote('');
    } catch (e) {
      setSaveErr(e.response?.data?.error?.message || 'Failed to update dispute');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (err || !dispute) {
    return (
      <div className="cc-container py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          {err || 'Dispute not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-container py-10 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link to="/disputes" className="text-brand-600 hover:underline text-sm">
          ← Back to Disputes
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Dispute</h1>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">{dispute._id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[dispute.status]}`}>
            {dispute.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
            <h2 className="font-semibold text-neutral-800 mb-4">Dispute Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="text-neutral-500 w-28 flex-shrink-0">Reason</dt>
                <dd className="text-neutral-800 font-medium">{REASON_LABELS[dispute.reason] || dispute.reason}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-neutral-500 w-28 flex-shrink-0">Raised By</dt>
                <dd className="text-neutral-800">{dispute.raisedBy?.name || 'Unknown'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-neutral-500 w-28 flex-shrink-0">Submitted</dt>
                <dd className="text-neutral-800">{new Date(dispute.createdAt).toLocaleString()}</dd>
              </div>
              {dispute.assignedTo && (
                <div className="flex gap-2">
                  <dt className="text-neutral-500 w-28 flex-shrink-0">Assigned To</dt>
                  <dd className="text-neutral-800">{dispute.assignedTo.name}</dd>
                </div>
              )}
              {dispute.resolvedAt && (
                <div className="flex gap-2">
                  <dt className="text-neutral-500 w-28 flex-shrink-0">Resolved</dt>
                  <dd className="text-neutral-800">{new Date(dispute.resolvedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-wide">Description</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{dispute.description}</p>
            </div>
            {dispute.resolutionNote && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-wide">Resolution Note</p>
                <p className="text-sm text-neutral-700 leading-relaxed">{dispute.resolutionNote}</p>
              </div>
            )}
            {dispute.evidenceLinks?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wide">Evidence Links</p>
                <ul className="space-y-1">
                  {dispute.evidenceLinks.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline break-all">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
            <h2 className="font-semibold text-neutral-800 mb-5">Timeline</h2>
            {dispute.timeline?.length > 0 ? (
              <div>
                {dispute.timeline.map((event, i) => (
                  <TimelineEvent key={i} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No activity recorded yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Booking Link */}
          {dispute.bookingId && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
              <h3 className="font-semibold text-neutral-800 mb-2 text-sm">Related Booking</h3>
              <Link
                to={`/bookings/${dispute.bookingId._id || dispute.bookingId}`}
                className="text-sm text-brand-600 hover:underline"
              >
                View Booking →
              </Link>
            </div>
          )}

          {/* Staff Action Panel */}
          {isStaff && availableTransitions.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
              <h3 className="font-semibold text-neutral-800 mb-3 text-sm">Staff Action</h3>

              <div className="space-y-3">
                <div>
                  <label className="cc-label text-xs">Transition Status</label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="cc-input text-sm"
                  >
                    <option value="">— Add note only —</option>
                    {availableTransitions.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {(actionStatus === 'RESOLVED' || actionStatus === 'REJECTED') && (
                  <div>
                    <label className="cc-label text-xs">Resolution Note</label>
                    <textarea
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Describe the resolution..."
                      className="cc-input text-sm resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="cc-label text-xs">Internal Note</label>
                  <textarea
                    rows={2}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Add a note to the timeline..."
                    className="cc-input text-sm resize-none"
                  />
                </div>

                {saveErr && (
                  <p className="text-xs text-red-600">{saveErr}</p>
                )}

                <button
                  onClick={handleAction}
                  disabled={saving || (!actionStatus && !actionNote)}
                  className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Submit Action'}
                </button>
              </div>
            </div>
          )}

          {isStaff && availableTransitions.length === 0 && dispute.status !== 'OPEN' && (
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-500">
              This dispute is <strong>{dispute.status}</strong> — no further transitions available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
