import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../../lib/api';
import Alert from '../ui/Alert';
import Badge from '../ui/Badge';
import { LoadingBlock } from '../ui/States';

export default function SlotPicker({
  providerId,
  selectedSlot,
  onSelectSlot,
  durationMin = 60,
  initialDate,
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = initialDate
    ? new Date(initialDate).toISOString().slice(0, 10)
    : tomorrow.toISOString().slice(0, 10);

  const [date, setDate] = useState(defaultDateStr);
  const [duration, setDuration] = useState(durationMin);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState('');
  const [conflictWarning, setConflictWarning] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(
          `/availability/providers/${providerId}/slots?date=${date}&durationMin=${duration}`
        );
        if (cancelled) return;
        setSlots(res.data.data.slots || []);
        setTimezone(res.data.data.timezone || 'UTC');
        setError('');
        setConflictWarning(null);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not fetch available slots for this provider.'));
        setSlots([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId, date, duration]);

  async function handleSlotClick(slot) {
    setConflictWarning(null);
    try {
      // Validate server-side conflict
      const res = await api.post('/availability/check', {
        providerId,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });

      if (!res.data.data.available) {
        setConflictWarning(res.data.data.conflict?.message || 'Slot is no longer available.');
        return;
      }

      if (onSelectSlot) {
        onSelectSlot(slot);
      }
    } catch (err) {
      setConflictWarning(getApiErrorMessage(err, 'Failed to verify slot availability.'));
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 rounded border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <label htmlFor="slotDate" className="text-xs font-semibold text-ink">
            Date:
          </label>
          <input
            type="date"
            id="slotDate"
            min={todayStr}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setLoading(true);
            }}
            className="h-8 rounded border border-stone-300 bg-surface px-2 text-xs text-ink focus:border-teal-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="slotDuration" className="text-xs font-semibold text-ink">
            Duration:
          </label>
          <select
            id="slotDuration"
            value={duration}
            onChange={(e) => {
              setDuration(parseInt(e.target.value, 10));
              setLoading(true);
            }}
            className="h-8 rounded border border-stone-300 bg-surface px-2 text-xs text-ink focus:border-teal-700 focus:outline-none"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
          </select>
          <Badge tone="neutral" className="text-[10px]">
            {timezone}
          </Badge>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      {conflictWarning && <Alert tone="warning">{conflictWarning}</Alert>}

      {loading ? (
        <LoadingBlock message="Checking open appointment windows..." />
      ) : slots.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-muted">
          No available appointment slots on this date. The provider may be closed or fully booked.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-medium text-ink-muted">
            Available Start Times ({slots.length}):
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const isSelected =
                selectedSlot?.startAt &&
                new Date(selectedSlot.startAt).getTime() === new Date(slot.startAt).getTime();

              const s = new Date(slot.startAt);
              const e = new Date(slot.endAt);
              const label = `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  className={`flex flex-col items-center justify-center rounded border px-3 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-brand-700 bg-brand-50 text-brand-900 ring-2 ring-brand-700'
                      : 'border-stone-200 bg-white text-ink hover:border-stone-400 hover:bg-stone-50'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedSlot && (
        <div className="mt-2 flex items-center justify-between rounded bg-teal-50 px-3 py-2 text-xs text-teal-900">
          <span className="font-semibold">Selected Window:</span>
          <span>
            {new Date(selectedSlot.startAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at {new Date(selectedSlot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
