import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import { fetchCategories, topLevel, subcategoriesOf } from '../lib/catalog';
import { getRequest, updateRequest, TIME_WINDOWS, URGENCIES } from '../lib/requests';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

function localTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EditRequest() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, cats, me] = await Promise.all([
          getRequest(id),
          fetchCategories(),
          api.get('/users/me').then((r) => r.data.data.user),
        ]);
        if (cancelled) return;
        setItem(data);
        setCategories(cats);
        setAddresses(me.addresses || []);
        const topId = cats.find((c) => c.id === data.category?.id)?.parentId || data.category?.id || '';
        setForm({
          topCategoryId: topId,
          subcategoryId: cats.find((c) => c.id === data.category?.id)?.parentId ? data.category.id : '',
          description: data.description,
          notes: data.notes || '',
          urgency: data.urgency,
          budgetMin: data.budget.min || '',
          budgetMax: data.budget.max || '',
          preferredDate: new Date(data.preferredDate).toISOString().slice(0, 10),
          timeWindow: data.timeWindow,
          savedAddressId: data.address.addressId || '',
        });
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load this request.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tops = topLevel(categories);
  const subs = subcategoriesOf(categories, form?.topCategoryId);
  const isDraft = item?.status === 'DRAFT';

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const minBudget = form.budgetMin ? Number(form.budgetMin) : 0;
    const maxBudget = form.budgetMax ? Number(form.budgetMax) : (minBudget > 0 ? minBudget : 0);
    if (minBudget > maxBudget) {
      setFormError('Minimum budget cannot exceed the maximum.');
      return;
    }
    const payload = {
      description: form.description.trim(),
      notes: form.notes.trim(),
      urgency: form.urgency,
      budget: { min: minBudget, max: maxBudget },
      preferredDate: form.preferredDate,
      timeWindow: form.timeWindow,
    };
    if (isDraft) {
      payload.categoryId = form.subcategoryId || form.topCategoryId;
    }
    if (form.savedAddressId) {
      payload.address = { addressId: form.savedAddressId };
    }
    setSaving(true);
    try {
      await updateRequest(id, payload);
      dispatch(pushToast({ tone: 'success', message: 'Request updated.' }));
      navigate(`/requests/${id}`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Could not save changes.');
      setFormError(msg);
      dispatch(pushToast({ tone: 'danger', message: msg }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit request" description={item ? `Status: ${item.status}` : ''} breadcrumb="Requests / Edit" />
      {state === 'loading' && <LoadingBlock title="Loading request" />}
      {state === 'error' && <ErrorBlock title="Could not load request" description={error} onRetry={() => navigate('/requests')} />}
      {state === 'success' && !item?.actions.includes('edit') && (
        <EmptyState title="This request can no longer be edited" description={`Requests in ${item?.status} state are locked. Contact support if something must change.`} />
      )}
      {state === 'success' && form && item?.actions.includes('edit') && (
        <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
          {formError && <Alert tone="danger">{formError}</Alert>}
          {isDraft ? (
            <>
              <div>
                <label htmlFor="edit-cat" className="cc-label">Service category</label>
                <select id="edit-cat" name="topCategoryId" value={form.topCategoryId} onChange={(e) => setForm((f) => ({ ...f, topCategoryId: e.target.value, subcategoryId: '' }))} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                  {tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {subs.length > 0 && (
                <div>
                  <label htmlFor="edit-sub" className="cc-label">Specific service</label>
                  <select id="edit-sub" name="subcategoryId" value={form.subcategoryId} onChange={set('subcategoryId')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                    <option value="">General</option>
                    {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </>
          ) : (
            <Alert tone="info">Category is locked once a request is submitted. Other details can still change.</Alert>
          )}
          <div>
            <label htmlFor="edit-desc" className="cc-label">Problem description</label>
            <textarea id="edit-desc" name="description" rows={4} value={form.description} onChange={set('description')} className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
          </div>
          <fieldset>
            <legend className="cc-label">Urgency</legend>
            <div className="flex gap-2">
              {URGENCIES.map((u) => (
                <label key={u} className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm font-medium ${form.urgency === u ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-stone-300 bg-white text-ink-muted'}`}>
                  <input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={set('urgency')} className="sr-only" />
                  {u.charAt(0) + u.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="edit-budget-min" name="budgetMin" label="Budget min (USD)" type="number" min={0} value={form.budgetMin} onChange={set('budgetMin')} />
            <Input id="edit-budget-max" name="budgetMax" label="Budget max (USD)" type="number" min={0} value={form.budgetMax} onChange={set('budgetMax')} />
          </div>
          <div>
            <label htmlFor="edit-notes" className="cc-label">Notes for the provider</label>
            <textarea id="edit-notes" name="notes" rows={2} value={form.notes} onChange={set('notes')} className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="edit-preferred-date" name="preferredDate" label="Preferred date" type="date" min={localTodayISO()} value={form.preferredDate} onChange={set('preferredDate')} />
            <div>
              <label htmlFor="edit-window" className="cc-label">Time window</label>
              <select id="edit-window" name="timeWindow" value={form.timeWindow} onChange={set('timeWindow')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                {TIME_WINDOWS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          {addresses.length > 0 && (
            <div>
              <label htmlFor="edit-addr" className="cc-label">Service address</label>
              <select id="edit-addr" name="savedAddressId" value={form.savedAddressId} onChange={set('savedAddressId')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600">
                <option value="">Keep current address</option>
                {addresses.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.line1}, {a.city}</option>)}
              </select>
            </div>
          )}
          <div><Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
        </form>
      )}
    </div>
  );
}
