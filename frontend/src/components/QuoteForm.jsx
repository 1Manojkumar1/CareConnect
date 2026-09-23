import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Alert from './ui/Alert';
import { TIME_WINDOWS } from '../lib/requests';

function defaultExpiry() {
  return new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function QuoteForm({ requestId, initial, onSubmit, saving, serverError }) {
  const [form, setForm] = useState({
    labor: initial?.pricing.labor || '',
    materials: initial?.pricing.materials || '',
    tax: initial?.pricing.tax || '',
    discount: initial?.pricing.discount || '',
    estimatedDurationMin: initial?.estimatedDurationMin || 60,
    proposedDate: initial?.proposedDate ? new Date(initial.proposedDate).toISOString().slice(0, 10) : '',
    timeWindow: initial?.timeWindow || 'FLEXIBLE',
    notes: initial?.notes || '',
    expiresAt: initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : defaultExpiry(),
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const preview =
    (Number(form.labor) || 0) + (Number(form.materials) || 0) + (Number(form.tax) || 0) - (Number(form.discount) || 0);

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.labor || Number(form.labor) < 0) next.labor = 'Enter labor cost (0 or more).';
    if ((Number(form.discount) || 0) > (Number(form.labor) || 0) + (Number(form.materials) || 0) + (Number(form.tax) || 0)) {
      next.discount = 'Discount cannot exceed the subtotal.';
    }
    if (!form.proposedDate) next.proposedDate = 'Choose a proposed date.';
    if (!form.expiresAt || form.expiresAt <= todayISO()) next.expiresAt = 'Expiry must be a future date.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      requestId,
      pricing: {
        labor: Number(form.labor),
        materials: Number(form.materials) || 0,
        tax: Number(form.tax) || 0,
        discount: Number(form.discount) || 0,
      },
      estimatedDurationMin: Number(form.estimatedDurationMin) || 60,
      proposedDate: form.proposedDate,
      timeWindow: form.timeWindow,
      notes: form.notes.trim(),
      expiresAt: form.expiresAt,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Labor (USD)" type="number" min={0} step="0.01" required value={form.labor} onChange={set('labor')} error={errors.labor} />
        <Input label="Materials (USD)" type="number" min={0} step="0.01" value={form.materials} onChange={set('materials')} />
        <Input label="Tax (USD)" type="number" min={0} step="0.01" value={form.tax} onChange={set('tax')} />
        <Input label="Discount (USD)" type="number" min={0} step="0.01" value={form.discount} onChange={set('discount')} error={errors.discount} />
      </div>
      <p className="rounded border border-stone-200 bg-surface-muted px-3 py-2 text-sm text-ink">
        Estimated total: <strong>${preview.toFixed(2)}</strong> <span className="text-ink-faint">(the server recomputes the final total)</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Duration (minutes)" type="number" min={15} max={20160} value={form.estimatedDurationMin} onChange={set('estimatedDurationMin')} />
        <div>
          <label htmlFor="qf-window" className="cc-label">Time window</label>
          <select id="qf-window" value={form.timeWindow} onChange={set('timeWindow')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm">
            {TIME_WINDOWS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <Input label="Proposed date" type="date" min={todayISO()} required value={form.proposedDate} onChange={set('proposedDate')} error={errors.proposedDate} />
        <Input label="Offer expires" type="date" min={todayISO()} required value={form.expiresAt} onChange={set('expiresAt')} error={errors.expiresAt} />
      </div>
      <div>
        <label htmlFor="qf-notes" className="cc-label">Notes for the customer (optional)</label>
        <textarea id="qf-notes" rows={3} value={form.notes} onChange={set('notes')} placeholder="What's included, warranties, materials…" className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm" />
      </div>
      <div>
        <Button type="submit" loading={saving}>{saving ? 'Saving…' : initial ? 'Update quote' : 'Submit quote'}</Button>
      </div>
    </form>
  );
}
