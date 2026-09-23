import { useState } from 'react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { EmptyState } from './ui/States';

function durationLabel(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export default function QuotesCompare({ quotes, onAccept, onReject, working }) {
  const [confirm, setConfirm] = useState(null); // { quote, action }
  if (!quotes || quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes yet"
        description="Matched providers have been notified. Quotes appear here with transparent pricing as they arrive."
      />
    );
  }
  const live = quotes.filter((q) => q.status === 'PENDING' || q.status === 'EXPIRED');
  const decided = quotes.filter((q) => !['PENDING', 'EXPIRED'].includes(q.status));

  async function handleConfirm() {
    if (confirm.action === 'accept') await onAccept(confirm.quote);
    else await onReject(confirm.quote);
    setConfirm(null);
  }

  function row(q) {
    return (
      <tr key={q.id} className="border-b border-stone-100 align-top last:border-0">
        <td className="px-4 py-3">
          <span className="font-medium text-ink">{q.provider.headline || 'Provider'}</span>
          <span className="block text-[13px] text-ink-faint">
            {q.provider.experienceYears} yrs
            {q.provider.ratingCount > 0 && ` · ★ ${q.provider.ratingAvg.toFixed(1)} (${q.provider.ratingCount})`}
          </span>
          {q.notes && <span className="mt-1 block text-[13px] text-ink-muted">{q.notes}</span>}
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="font-semibold text-ink">${q.pricing.total.toFixed(2)}</span>
          <span className="block text-[13px] text-ink-faint">
            Labor ${q.pricing.labor} + materials ${q.pricing.materials}
            {q.pricing.tax > 0 && ` + tax $${q.pricing.tax}`}
            {q.pricing.discount > 0 && ` − discount $${q.pricing.discount}`}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-ink-muted">
          {durationLabel(q.estimatedDurationMin)}
          <span className="block text-[13px]">{new Date(q.proposedDate).toLocaleDateString()} · {q.timeWindow.toLowerCase()}</span>
        </td>
        <td className="px-4 py-3">
          <Badge status={q.status} />
          {q.status === 'PENDING' && (
            <span className="block text-[13px] text-ink-faint">Expires {new Date(q.expiresAt).toLocaleDateString()}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {q.status === 'PENDING' && (
            <div className="inline-flex gap-2">
              <button type="button" onClick={() => setConfirm({ quote: q, action: 'accept' })} className="text-[13px] font-medium text-emerald-700 hover:underline">Accept</button>
              <button type="button" onClick={() => setConfirm({ quote: q, action: 'reject' })} className="text-[13px] font-medium text-red-700 hover:underline">Reject</button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
            <tr>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Schedule</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {live.map(row)}
            {decided.map(row)}
          </tbody>
        </table>
      </div>

      {confirm && (
        <Modal
          title={`${confirm.action === 'accept' ? 'Accept' : 'Reject'} this quote?`}
          description={`${confirm.quote.provider.headline || 'Provider'} — $${confirm.quote.pricing.total.toFixed(2)}.`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button tone="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button size="sm" tone={confirm.action === 'accept' ? 'primary' : 'danger'} onClick={handleConfirm} loading={working}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            {confirm.action === 'accept'
              ? 'Accepting books this provider at the quoted price. Other pending quotes stay visible until scheduling.'
              : 'The provider will be notified. This cannot be undone.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
