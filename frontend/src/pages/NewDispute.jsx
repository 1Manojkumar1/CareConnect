import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { createDispute } from '../lib/disputes';
import { listBookings } from '../lib/bookings';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const REASONS = [
  { value: 'SERVICE_NOT_COMPLETED', label: 'Service Not Completed' },
  { value: 'POOR_QUALITY', label: 'Poor Quality' },
  { value: 'PROVIDER_NO_SHOW', label: 'Provider No-Show' },
  { value: 'BILLING_ISSUE', label: 'Billing Issue' },
  { value: 'DAMAGE_OR_LOSS', label: 'Damage / Loss' },
  { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewDispute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') || '';

  const [bookingId, setBookingId] = useState(initialBookingId);
  const [reason, setReason] = useState('SERVICE_NOT_COMPLETED');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listBookings();
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.items || [];
        setBookings(items);
        if (!initialBookingId && items.length > 0) {
          setBookingId(items[0]._id);
        }
      } catch (_err) {
        // non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialBookingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      setError('Please select or specify a booking.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the dispute.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        bookingId,
        reason,
        description: description.trim(),
        evidenceLinks: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      };
      const dispute = await createDispute(payload);
      navigate(`/disputes/${dispute._id}`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to raise dispute.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-4">
        <Link to="/disputes" className="text-sm font-medium text-brand-700 hover:underline">
          ← Back to Disputes
        </Link>
      </div>

      <PageHeader
        title="Raise a Dispute"
        description="Submit a formal complaint or dispute for resolution by our support team."
      />

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="booking-select" className="block text-sm font-medium text-ink mb-1">
              Associated Booking <span className="text-red-500">*</span>
            </label>
            {initialBookingId ? (
              <input
                id="booking-select"
                type="text"
                value={bookingId}
                disabled
                className="w-full rounded border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-ink-muted"
              />
            ) : bookings.length > 0 ? (
              <select
                id="booking-select"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                disabled={loading}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              >
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    Booking #{b.bookingNumber || b._id.slice(-6)} ({b.status})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="booking-select"
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="Enter Booking ID"
                className="w-full rounded border border-stone-300 px-3 py-2 text-sm text-ink"
                required
              />
            )}
          </div>

          <div>
            <label htmlFor="reason-select" className="block text-sm font-medium text-ink mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dispute-desc" className="block text-sm font-medium text-ink mb-1">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="dispute-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the problem in detail so support can investigate..."
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm text-ink"
              required
            />
          </div>

          <div>
            <label htmlFor="evidence-url" className="block text-sm font-medium text-ink mb-1">
              Evidence Link <span className="text-stone-400 font-normal">(Optional URL)</span>
            </label>
            <input
              id="evidence-url"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded border border-stone-300 px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
            <Link to="/disputes">
              <Button type="button" variant="secondary" size="md">
                Cancel
              </Button>
            </Link>
            <Button type="submit" tone="danger" size="md" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Dispute'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
