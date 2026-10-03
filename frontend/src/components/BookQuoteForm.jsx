import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Alert from './ui/Alert';

const WINDOW_START = { MORNING: '09:00', AFTERNOON: '13:00', EVENING: '17:00', FLEXIBLE: '10:00' };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * BookQuoteForm — pick a final time slot for an accepted quote.
 * Defaults come from the quote (proposed date, time window, duration);
 * the customer confirms the exact start time before the booking is created.
 */
export default function BookQuoteForm({ quote, onSubmit, saving, serverError }) {
  const [form, setForm] = useState({
    date: quote?.proposedDate ? new Date(quote.proposedDate).toISOString().slice(0, 10) : todayISO(),
    startTime: WINDOW_START[quote?.timeWindow] || '10:00',
    durationMin: quote?.estimatedDurationMin || 60,
  });
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.date) next.date = 'Choose a service date.';
    else if (form.date < todayISO()) next.date = 'The service date cannot be in the past.';
    if (!/^\d{2}:\d{2}$/.test(form.startTime)) next.startTime = 'Enter a valid start time.';
    const duration = Number(form.durationMin);
    if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
      next.durationMin = 'Duration must be between 15 and 480 minutes.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const startAt = new Date(`${form.date}T${form.startTime}:00`);
    const endAt = new Date(startAt.getTime() + duration * 60000);
    onSubmit({ quoteId: quote.id, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
  }

  const summary =
    form.date && /^\d{2}:\d{2}$/.test(form.startTime)
      ? `${new Date(`${form.date}T${form.startTime}:00`).toLocaleString()} · ${form.durationMin || 0} min`
      : null;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Service date"
          type="date"
          min={todayISO()}
          required
          value={form.date}
          onChange={set('date')}
          error={errors.date}
        />
        <Input
          label="Start time"
          type="time"
          required
          value={form.startTime}
          onChange={set('startTime')}
          error={errors.startTime}
        />
      </div>
      <Input
        label="Duration (minutes)"
        type="number"
        min={15}
        max={480}
        value={form.durationMin}
        onChange={set('durationMin')}
        error={errors.durationMin}
      />
      {summary && (
        <p className="text-[13px] text-ink-muted">
          Booking window: <span className="font-medium text-ink">{summary}</span>. The server
          verifies the provider is free before confirming.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Confirm booking · ${Number(quote?.pricing?.total || 0).toFixed(2)}
        </Button>
      </div>
    </form>
  );
}
