import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { pushToast } from '../../store/uiSlice';
import api, { getApiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';

const FILTERS = ['', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'];

export default function ProvidersAdmin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('UNDER_REVIEW');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [decision, setDecision] = useState(null); // { provider, status }
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();

  async function load(status) {
    setState('loading');
    try {
      const res = await api.get('/providers', { params: status ? { verificationStatus: status } : {} });
      setItems(res.data.data);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load providers.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/providers', { params: filter ? { verificationStatus: filter } : {} });
        if (cancelled) return;
        setItems(res.data.data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load providers.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function handleDecision() {
    setSaving(true);
    try {
      await api.patch(`/providers/${decision.provider.id}/verification`, {
        status: decision.status,
        notes,
      });
      dispatch(pushToast({ tone: 'success', message: `Provider ${decision.status.toLowerCase().replace('_', ' ')}.` }));
      setDecision(null);
      setNotes('');
      load(filter);
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not record decision.') }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Provider verification"
        description="Review applications and decide verification. Decisions follow an explicit lifecycle."
        breadcrumb="Admin / Providers"
      />
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="verify-filter" className="text-sm font-medium text-ink">Status</label>
        <select id="verify-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded border border-stone-300 bg-white px-3 text-sm">
          {FILTERS.map((f) => <option key={f || 'all'} value={f}>{f === '' ? 'All' : f.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {state === 'loading' && <LoadingBlock title="Loading providers" />}
      {state === 'error' && <ErrorBlock title="Could not load providers" description={error} onRetry={() => load(filter)} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState title="No providers in this state" description="New applications appear under Under Review once submitted." />
      )}
      {state === 'success' && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Categories</th>
                <th className="px-4 py-2 font-medium">Areas</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link to={`/providers/${p.id}`} className="font-medium">{p.headline || p.user.name}</Link>
                    <span className="block text-[13px] text-ink-faint">{p.user.name} · {p.experienceYears} yrs</span>
                  </td>
                  <td className="px-4 py-2 text-ink-muted">{p.categories.map((c) => c.name).join(', ') || '—'}</td>
                  <td className="px-4 py-2 text-ink-muted">{p.serviceAreas.map((a) => a.city).join(', ') || '—'}</td>
                  <td className="px-4 py-2"><Badge status={p.verificationStatus} /></td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      {p.verificationStatus !== 'VERIFIED' && (
                        <button type="button" onClick={() => { setNotes(''); setDecision({ provider: p, status: 'VERIFIED' }); }} className="text-[13px] font-medium text-emerald-700 hover:underline">Verify</button>
                      )}
                      {['PENDING', 'UNDER_REVIEW'].includes(p.verificationStatus) && (
                        <button type="button" onClick={() => { setNotes(''); setDecision({ provider: p, status: 'REJECTED' }); }} className="text-[13px] font-medium text-red-700 hover:underline">Reject</button>
                      )}
                      {['VERIFIED', 'REJECTED'].includes(p.verificationStatus) && (
                        <button type="button" onClick={() => { setNotes(''); setDecision({ provider: p, status: 'UNDER_REVIEW' }); }} className="text-[13px] font-medium text-brand-700 hover:underline">Re-review</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decision && (
        <Modal
          title={`${decision.status === 'VERIFIED' ? 'Verify' : decision.status === 'REJECTED' ? 'Reject' : 'Send to re-review'} provider?`}
          description={`${decision.provider.headline || decision.provider.user.name} — this decision is recorded and shown to the provider.`}
          onClose={() => setDecision(null)}
          footer={
            <>
              <Button tone="secondary" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
              <Button size="sm" tone={decision.status === 'REJECTED' ? 'danger' : 'primary'} onClick={handleDecision} loading={saving}>
                Confirm
              </Button>
            </>
          }
        >
          <label htmlFor="decision-notes" className="cc-label">Reviewer note</label>
          <textarea
            id="decision-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="License checked, insurance valid…"
            className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </Modal>
      )}
    </div>
  );
}
