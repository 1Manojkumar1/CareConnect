import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import { getApiErrorMessage } from '../lib/api';
import { getBooking, updateBookingStatus, addEvidence } from '../lib/bookings';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReviewForm from '../components/ReviewForm';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';
import { STATUS_TONE, formatStatus } from '../lib/status';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Determine next actions available to the current role
function getAvailableActions(status, role) {
  if (role === 'CUSTOMER') {
    const canCancel = ['CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED'].includes(status);
    const canConfirm = status === 'COMPLETED';
    const canDispute = ['COMPLETED', 'CUSTOMER_CONFIRMED'].includes(status);
    return { canCancel, canConfirm, canDispute };
  }
  if (role === 'PROVIDER') {
    const transitions = {
      CONFIRMED: ['SCHEDULED', 'PROVIDER_ASSIGNED'],
      SCHEDULED: ['PROVIDER_ASSIGNED', 'ON_THE_WAY'],
      PROVIDER_ASSIGNED: ['ON_THE_WAY'],
      ON_THE_WAY: ['ARRIVED'],
      ARRIVED: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
      COMPLETED: ['DISPUTED'],
    };
    return { providerTransitions: transitions[status] || [] };
  }
  if (['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role)) {
    return { isStaff: true };
  }
  return {};
}

const PROVIDER_ACTION_LABELS = {
  SCHEDULED: 'Mark as Scheduled',
  PROVIDER_ASSIGNED: 'Mark Provider Assigned',
  ON_THE_WAY: "I'm on my way",
  ARRIVED: 'Mark Arrived',
  IN_PROGRESS: 'Start Work',
  COMPLETED: 'Mark Completed',
  DISPUTED: 'Raise Dispute',
};

const TIMELINE_STEPS = [
  { key: 'CONFIRMED', label: 'Booking confirmed' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PROVIDER_ASSIGNED', label: 'Provider assigned' },
  { key: 'ON_THE_WAY', label: 'Provider en route' },
  { key: 'ARRIVED', label: 'Provider arrived' },
  { key: 'IN_PROGRESS', label: 'Work in progress' },
  { key: 'COMPLETED', label: 'Work completed' },
  { key: 'CUSTOMER_CONFIRMED', label: 'Customer confirmed' },
  { key: 'CLOSED', label: 'Closed' },
];

const STEP_ORDER = TIMELINE_STEPS.map((s) => s.key);

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const role = user?.role || 'CUSTOMER';
  const dispatch = useDispatch();

  const [booking, setBooking] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ open: false, phase: 'BEFORE', fileUrl: '', note: '' });

  async function load() {
    setState('loading');
    try {
      const data = await getBooking(id);
      setBooking(data);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load booking.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        const data = await getBooking(id);
        if (cancelled) return;
        setBooking(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load booking.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleTransition(toStatus) {
    setActionLoading(toStatus);
    try {
      const updated = await updateBookingStatus(id, { toStatus });
      setBooking(updated);
      dispatch(pushToast({ tone: 'success', message: `Status updated to ${formatStatus(toStatus)}.` }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not update status.') }));
    } finally {
      setActionLoading('');
    }
  }

  async function handleCancel() {
    setActionLoading('CANCELLED');
    try {
      const updated = await updateBookingStatus(id, { toStatus: 'CANCELLED', reason: cancelNote || 'Cancelled by customer.' });
      setBooking(updated);
      setShowCancel(false);
      dispatch(pushToast({ tone: 'success', message: 'Booking cancelled.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not cancel booking.') }));
    } finally {
      setActionLoading('');
    }
  }

  async function handleEvidence() {
    if (!evidenceForm.fileUrl.trim()) {
      dispatch(pushToast({ tone: 'danger', message: 'Please enter a file URL.' }));
      return;
    }
    setActionLoading('evidence');
    try {
      const updated = await addEvidence(id, {
        phase: evidenceForm.phase,
        fileUrl: evidenceForm.fileUrl.trim(),
        note: evidenceForm.note,
      });
      setBooking(updated);
      setEvidenceForm({ open: false, phase: 'BEFORE', fileUrl: '', note: '' });
      dispatch(pushToast({ tone: 'success', message: 'Evidence uploaded.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not upload evidence.') }));
    } finally {
      setActionLoading('');
    }
  }

  if (state === 'loading') return <LoadingBlock title="Loading booking" />;
  if (state === 'error') return <ErrorBlock title="Could not load booking" description={error} onRetry={load} />;
  if (!booking) return null;

  const status = booking.status;
  const isCancelled = ['CANCELLED', 'REFUNDED'].includes(status);
  const isDisputed = status === 'DISPUTED';
  const isClosed = status === 'CLOSED';
  const isTerminal = isCancelled || isClosed;

  const actions = getAvailableActions(status, role);
  const currentStepIdx = STEP_ORDER.indexOf(status);
  const providerName = booking.providerId?.userId?.name || 'Provider';
  const providerEmail = booking.providerId?.userId?.email || '';
  const serviceTitle = booking.requestId?.categoryId?.name || booking.requestId?.description || 'Service';

  return (
    <div className="space-y-6">
      <PageHeader
        title={serviceTitle}
        description={`Booking with ${providerName}`}
        breadcrumb={
          <span>
            <Link to="/bookings" className="text-brand-700 hover:underline">Bookings</Link> · {booking._id.slice(-6).toUpperCase()}
          </span>
        }
      />

      {/* Status banner */}
      <div className={`rounded-lg border px-5 py-4 ${isDisputed ? 'border-red-200 bg-red-50' : isCancelled ? 'border-stone-200 bg-stone-50' : 'border-teal-200 bg-teal-50'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={STATUS_TONE[status] || 'neutral'} className="text-sm">{formatStatus(status)}</Badge>
          <span className="text-sm text-ink-muted">
            Last updated {fmtDate(booking.updatedAt)}
          </span>
          {booking.cancellationReason && (
            <span className="text-sm text-red-700">· {booking.cancellationReason}</span>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: timeline + actions */}
        <div className="space-y-6 lg:col-span-2">

          {/* Job lifecycle timeline */}
          {!isCancelled && !isDisputed && (
            <Card title="Service progress">
              <ol className="space-y-3">
                {TIMELINE_STEPS.map((step, idx) => {
                  const done = currentStepIdx >= idx;
                  const active = currentStepIdx === idx;
                  return (
                    <li key={step.key} className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-500'
                      } ${active ? 'ring-2 ring-brand-300' : ''}`}>
                        {done ? '✓' : idx + 1}
                      </span>
                      <span className={`text-sm ${active ? 'font-semibold text-ink' : done ? 'text-ink-muted' : 'text-ink-faint'}`}>
                        {step.label}
                      </span>
                      {active && (
                        <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-brand-700">Current</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          {/* Customer actions */}
          {role === 'CUSTOMER' && !isTerminal && (
            <Card title="Actions">
              <div className="flex flex-wrap gap-2">
                {actions.canConfirm && (
                  <Button
                    size="sm"
                    onClick={() => handleTransition('CUSTOMER_CONFIRMED')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'CUSTOMER_CONFIRMED' ? 'Confirming…' : 'Confirm completion'}
                  </Button>
                )}
                {actions.canDispute && (
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() => navigate(`/disputes/new?bookingId=${booking._id}`)}
                    disabled={!!actionLoading}
                  >
                    Raise dispute
                  </Button>
                )}
                {actions.canCancel && !showCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancel(true)}
                    className="h-8 rounded border border-red-300 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Cancel booking
                  </button>
                )}
              </div>
              {showCancel && (
                <div className="mt-4 space-y-3 rounded border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">Cancel this booking?</p>
                  <textarea
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" tone="danger" onClick={handleCancel} disabled={!!actionLoading}>
                      {actionLoading === 'CANCELLED' ? 'Cancelling…' : 'Confirm cancel'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowCancel(false)}
                      className="h-8 rounded border border-stone-300 bg-white px-3 text-sm text-ink hover:bg-stone-50"
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Customer Review Section */}
          {role === 'CUSTOMER' && ['CUSTOMER_CONFIRMED', 'CLOSED'].includes(status) && (
            <Card title="Provider Review">
              {reviewed ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">
                  ✓ Thank you! Your review has been submitted and published.
                </div>
              ) : showReview ? (
                <ReviewForm
                  bookingId={booking._id}
                  onSuccess={() => {
                    dispatch(pushToast({ tone: 'success', message: 'Review published successfully!' }));
                    setReviewed(true);
                    setShowReview(false);
                  }}
                  onCancel={() => setShowReview(false)}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-muted">Share your feedback about this completed service.</p>
                  <Button size="sm" onClick={() => setShowReview(true)}>
                    ★ Rate & Review Provider
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Provider actions */}
          {role === 'PROVIDER' && !isTerminal && (
            <Card title="Job actions">
              {actions.providerTransitions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {actions.providerTransitions.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      tone={t === 'DISPUTED' ? 'danger' : 'default'}
                      onClick={() => handleTransition(t)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === t ? 'Updating…' : PROVIDER_ACTION_LABELS[t] || formatStatus(t)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">No actions available in this status.</p>
              )}

              {/* Evidence upload */}
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="mb-2 text-sm font-medium text-ink">Job evidence</p>
                {booking.evidence?.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {booking.evidence.map((ev) => (
                      <li key={ev._id} className="flex items-start gap-2 text-sm text-ink-muted">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase">{ev.phase}</span>
                        <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="break-all text-brand-700 hover:underline">
                          {ev.fileUrl}
                        </a>
                        {ev.note && <span>· {ev.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {!evidenceForm.open ? (
                  <button
                    type="button"
                    onClick={() => setEvidenceForm({ ...evidenceForm, open: true })}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    + Upload evidence
                  </button>
                ) : (
                  <div className="space-y-3 rounded border border-stone-200 bg-stone-50 p-3">
                    <div className="flex gap-2">
                      {['BEFORE', 'DURING', 'AFTER'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEvidenceForm({ ...evidenceForm, phase: p })}
                          className={`h-7 rounded px-3 text-xs font-semibold ${evidenceForm.phase === p ? 'bg-brand-700 text-white' : 'border border-stone-300 bg-white text-ink'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={evidenceForm.fileUrl}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, fileUrl: e.target.value })}
                      placeholder="File URL (e.g. https://...)"
                      className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={evidenceForm.note}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, note: e.target.value })}
                      placeholder="Note (optional)"
                      className="w-full rounded border border-stone-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEvidence} disabled={!!actionLoading}>
                        {actionLoading === 'evidence' ? 'Uploading…' : 'Upload'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setEvidenceForm({ open: false, phase: 'BEFORE', fileUrl: '', note: '' })}
                        className="text-sm text-ink-muted hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Event history */}
          <Card title="Event history">
            {booking.history?.length > 0 ? (
              <ol className="space-y-3">
                {[...booking.history].reverse().map((h) => (
                  <li key={h._id} className="flex gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] text-stone-600">
                      ↓
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{h.changedBy?.name || 'System'}</span>
                        {' '}changed status to{' '}
                        <Badge tone={STATUS_TONE[h.toStatus] || 'neutral'} className="text-xs">
                          {formatStatus(h.toStatus)}
                        </Badge>
                      </p>
                      {h.note && <p className="text-[13px] text-ink-muted">{h.note}</p>}
                      <p className="text-[11px] text-ink-faint">{fmt(h.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">No history yet.</p>
            )}
          </Card>
        </div>

        {/* Right: booking details */}
        <div className="space-y-4">
          <Card title="Booking details">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ink-faint">Scheduled start</dt>
                <dd className="font-medium text-ink">{fmt(booking.startAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Scheduled end</dt>
                <dd className="font-medium text-ink">{fmt(booking.endAt)}</dd>
              </div>
              {booking.pricing?.total > 0 && (
                <div>
                  <dt className="text-ink-faint">Amount</dt>
                  <dd className="font-semibold text-ink">${booking.pricing.total.toFixed(2)} {booking.pricing.currency}</dd>
                </div>
              )}
              {booking.address?.city && (
                <div>
                  <dt className="text-ink-faint">Location</dt>
                  <dd className="text-ink">
                    {[booking.address.street, booking.address.unit, booking.address.city, booking.address.state, booking.address.postalCode]
                      .filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
              {booking.notes && (
                <div>
                  <dt className="text-ink-faint">Notes</dt>
                  <dd className="text-ink-muted">{booking.notes}</dd>
                </div>
              )}
              {['CUSTOMER_CONFIRMED', 'CLOSED'].includes(status) && (
                <div className="pt-2 border-t border-stone-200">
                  <Link to="/invoices" className="text-sm font-medium text-brand-700 hover:underline">
                    View Invoices →
                  </Link>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Provider">
            <p className="font-medium text-ink">{providerName}</p>
            {providerEmail && <p className="text-sm text-ink-muted">{providerEmail}</p>}
            {booking.providerId?.headline && (
              <p className="mt-1 text-sm text-ink-muted">{booking.providerId.headline}</p>
            )}
            {booking.providerId?.ratingAvg > 0 && (
              <p className="mt-1 text-sm text-ink-muted">
                ★ {booking.providerId.ratingAvg.toFixed(1)} · {booking.providerId.jobsCompleted} jobs
              </p>
            )}
            {booking.providerId && (
              <Link to={`/providers/${booking.providerId._id}`} className="mt-2 block text-sm font-medium text-brand-700 hover:underline">
                View public profile →
              </Link>
            )}
          </Card>

          {booking.requestId && (
            <Card title="Service request">
              <Link to={`/requests/${booking.requestId._id}`} className="font-medium text-brand-700 hover:underline">
                {serviceTitle}
              </Link>
              {booking.requestId.description && (
                <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{booking.requestId.description}</p>
              )}
            </Card>
          )}

          {booking.quoteId && (
            <Card title="Quote">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-faint">Total</dt>
                  <dd className="font-semibold">${booking.quoteId.pricing?.total?.toFixed(2)}</dd>
                </div>
                {booking.quoteId.estimatedDurationMin && (
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Duration</dt>
                    <dd>{booking.quoteId.estimatedDurationMin} min</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-faint">Quote status</dt>
                  <dd><Badge tone={STATUS_TONE[booking.quoteId.status] || 'neutral'}>{booking.quoteId.status}</Badge></dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
