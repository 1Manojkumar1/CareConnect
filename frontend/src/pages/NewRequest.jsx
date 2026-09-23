import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import { fetchCategories, topLevel, subcategoriesOf } from '../lib/catalog';
import { createRequest, addRequestAttachment, submitRequest, TIME_WINDOWS, URGENCIES } from '../lib/requests';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

const STEPS = ['Service', 'Details', 'Schedule', 'Review'];
const ATTACHMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];

async function getWizardData() {
  const [cats, me] = await Promise.all([
    fetchCategories(),
    api.get('/users/me').then((r) => r.data.data.user),
  ]);
  return { cats, addresses: me.addresses || [] };
}

function localTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewRequest() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [categories, setCategories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({
    topCategoryId: '', subcategoryId: '', description: '', urgency: 'MEDIUM',
    budgetMin: '', budgetMax: '', notes: '',
    addressMode: 'saved', savedAddressId: '',
    customLabel: '', customLine1: '', customLine2: '', customCity: '', customPostal: '',
    preferredDate: '', timeWindow: 'FLEXIBLE',
    attachments: [],
  });
  const [attachDraft, setAttachDraft] = useState({ fileName: '', mimeType: 'image/jpeg', size: '', storageKey: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cats, addresses: addrs } = await getWizardData();
        if (cancelled) return;
        setCategories(cats);
        setAddresses(addrs);
        setForm((f) => ({
          ...f,
          savedAddressId: addrs.find((a) => a.isDefault)?.id || addrs[0]?.id || '',
          addressMode: addrs.length > 0 ? 'saved' : 'custom',
        }));
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setLoadError(getApiErrorMessage(err, 'Could not load request options.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tops = useMemo(() => topLevel(categories), [categories]);
  const subs = useMemo(() => subcategoriesOf(categories, form.topCategoryId), [categories, form.topCategoryId]);
  const effectiveCategoryId = form.subcategoryId || form.topCategoryId;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validateStep(s) {
    const next = {};
    if (s === 0 && !effectiveCategoryId) next.category = 'Choose a service category.';
    if (s === 1) {
      if (form.description.trim().length < 10) next.description = 'Describe the problem in at least 10 characters.';
      const min = form.budgetMin ? Number(form.budgetMin) : null;
      const max = form.budgetMax ? Number(form.budgetMax) : null;
      if (min !== null && max !== null && min > max) next.budget = 'Minimum budget cannot exceed the maximum.';
    }
    if (s === 2) {
      if (form.addressMode === 'saved') {
        if (!form.savedAddressId) next.address = 'Select a service address.';
      } else {
        if (!form.customLine1.trim() || !form.customCity.trim() || !form.customPostal.trim()) {
          next.address = 'Street, city, and postal code are required.';
        }
      }
      if (!form.preferredDate) next.preferredDate = 'Choose a preferred date.';
      else if (form.preferredDate < localTodayISO()) next.preferredDate = 'Preferred date cannot be in the past.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addAttachment(e) {
    e.preventDefault();
    if (!attachDraft.fileName.trim() || !attachDraft.size || !attachDraft.storageKey.trim()) return;
    setForm((f) => ({
      ...f,
      attachments: [...f.attachments, {
        fileName: attachDraft.fileName.trim(),
        mimeType: attachDraft.mimeType,
        size: Number(attachDraft.size),
        storageKey: attachDraft.storageKey.trim(),
      }],
    }));
    setAttachDraft({ fileName: '', mimeType: 'image/jpeg', size: '', storageKey: '' });
  }

  function buildPayload(submit) {
    const address = form.addressMode === 'saved'
      ? { addressId: form.savedAddressId }
      : {
          label: form.customLabel.trim(),
          line1: form.customLine1.trim(),
          line2: form.customLine2.trim(),
          city: form.customCity.trim(),
          postalCode: form.customPostal.trim(),
        };
    const minBudget = form.budgetMin ? Number(form.budgetMin) : 0;
    const maxBudget = form.budgetMax ? Number(form.budgetMax) : (minBudget > 0 ? minBudget : 0);
    return {
      categoryId: effectiveCategoryId,
      description: form.description.trim(),
      notes: form.notes.trim(),
      urgency: form.urgency,
      budget: { min: minBudget, max: maxBudget },
      address,
      preferredDate: form.preferredDate,
      timeWindow: form.timeWindow,
      submit,
    };
  }

  async function handleFinish(submit) {
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    setServerError('');
    setSaving(true);
    try {
      const created = await createRequest(buildPayload(false));
      for (const att of form.attachments) {
        await addRequestAttachment(created.id, att);
      }
      const final = submit ? await submitRequest(created.id) : created;
      dispatch(pushToast({
        tone: 'success',
        message: submit ? 'Request submitted — providers can now quote.' : 'Draft saved.',
      }));
      navigate(`/requests/${final.id}`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Could not save this request.');
      setServerError(msg);
      dispatch(pushToast({ tone: 'danger', message: msg }));
    } finally {
      setSaving(false);
    }
  }

  const categoryName = categories.find((c) => c.id === effectiveCategoryId)?.name || '—';
  const addressSummary = form.addressMode === 'saved'
    ? addresses.find((a) => a.id === form.savedAddressId)
    : { label: form.customLabel || 'Custom', line1: form.customLine1, city: form.customCity, postalCode: form.customPostal };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New service request" description="Four short steps. Save a draft anytime before submitting." breadcrumb="Requests / New" />
      {state === 'loading' && <LoadingBlock title="Loading request options" />}
      {state === 'error' && <ErrorBlock title="Could not start a request" description={loadError} onRetry={() => window.location.reload()} />}
      {state === 'success' && (
        <div>
          <ol aria-label="Request progress" className="mb-6 flex gap-1">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`block rounded px-2 py-1.5 text-center text-[13px] font-medium ${i < step ? 'bg-brand-100 text-brand-800' : i === step ? 'bg-brand-700 text-white' : 'bg-stone-100 text-ink-faint'}`}>
                  {i + 1}. {label}
                </span>
              </li>
            ))}
          </ol>

          {serverError && <div className="mb-4"><Alert tone="danger">{serverError}</Alert></div>}

          {step === 0 && (
            <section aria-label="Service" className="grid gap-4 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
              {tops.length === 0 ? (
                <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-medium">No service categories available</p>
                  <p className="mt-1 text-[13px] text-amber-800">
                    The service catalog is currently empty. Please ensure the database has been seeded.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="req-cat" className="cc-label">Service category</label>
                    <select
                      id="req-cat"
                      name="topCategoryId"
                      value={form.topCategoryId}
                      onChange={(e) => setForm((f) => ({ ...f, topCategoryId: e.target.value, subcategoryId: '' }))}
                      className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                    >
                      <option value="">Select a service…</option>
                      {tops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {subs.length > 0 && (
                    <div>
                      <label htmlFor="req-sub" className="cc-label">Specific service (optional)</label>
                      <select
                        id="req-sub"
                        name="subcategoryId"
                        value={form.subcategoryId}
                        onChange={set('subcategoryId')}
                        className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      >
                        <option value="">General — {tops.find((c) => c.id === form.topCategoryId)?.name}</option>
                        {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
              {errors.category && <p role="alert" className="cc-error-text">{errors.category}</p>}
            </section>
          )}

          {step === 1 && (
            <section aria-label="Details" className="grid gap-4 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
              <div>
                <label htmlFor="req-desc" className="cc-label">What needs to be done? <span aria-hidden="true" className="text-red-700">*</span></label>
                <textarea
                  id="req-desc"
                  name="description"
                  rows={5}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="e.g. Kitchen sink drains slowly, gurgles, and sometimes backs up…"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
                {errors.description && <p role="alert" className="cc-error-text">{errors.description}</p>}
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
                <Input id="req-budget-min" name="budgetMin" label="Budget min (USD)" type="number" min={0} value={form.budgetMin} onChange={set('budgetMin')} />
                <Input id="req-budget-max" name="budgetMax" label="Budget max (USD)" type="number" min={0} value={form.budgetMax} onChange={set('budgetMax')} error={errors.budget} />
              </div>
              <div>
                <label htmlFor="req-notes" className="cc-label">Notes for the provider (optional)</label>
                <textarea
                  id="req-notes"
                  name="notes"
                  rows={2}
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Gate code, parking, pets…"
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div>
                <span className="cc-label">Photos or documents (optional)</span>
                {form.attachments.length > 0 && (
                  <ul className="mb-2 grid gap-2">
                    {form.attachments.map((a, i) => (
                      <li key={`${a.fileName}-${i}`} className="flex items-center justify-between rounded border border-stone-200 bg-white px-3 py-2 text-sm">
                        <span>{a.fileName} <span className="text-ink-faint">· {Math.round(a.size / 1024)} KB</span></span>
                        <button type="button" onClick={() => setForm((f) => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))} className="text-[13px] font-medium text-red-700 hover:underline">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-2 rounded border border-dashed border-stone-300 p-3 sm:grid-cols-[1fr_130px_110px_1fr_auto]">
                  <input aria-label="File name" placeholder="sink-photo.jpg" value={attachDraft.fileName} onChange={(e) => setAttachDraft((d) => ({ ...d, fileName: e.target.value }))} className="h-9 rounded border border-stone-300 px-2 text-sm" />
                  <select aria-label="File type" value={attachDraft.mimeType} onChange={(e) => setAttachDraft((d) => ({ ...d, mimeType: e.target.value }))} className="h-9 rounded border border-stone-300 bg-white px-2 text-sm">
                    {ATTACHMENT_MIMES.map((m) => <option key={m} value={m}>{m.split('/')[1]}</option>)}
                  </select>
                  <input aria-label="Size in bytes" type="number" min={1} placeholder="Bytes" value={attachDraft.size} onChange={(e) => setAttachDraft((d) => ({ ...d, size: e.target.value }))} className="h-9 rounded border border-stone-300 px-2 text-sm" />
                  <input aria-label="Storage key" placeholder="Storage key" value={attachDraft.storageKey} onChange={(e) => setAttachDraft((d) => ({ ...d, storageKey: e.target.value }))} className="h-9 rounded border border-stone-300 px-2 text-sm" />
                  <button type="button" onClick={addAttachment} className="h-9 rounded border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50">Add</button>
                </div>
                <p className="cc-hint">Reference files already in your storage. Device upload arrives in a later phase.</p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-label="Schedule" className="grid gap-4 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
              <div>
                <span className="cc-label">Service address</span>
                {addresses.length > 0 ? (
                  <>
                    <div className="mb-2 flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="addressMode"
                          checked={form.addressMode === 'saved'}
                          onChange={() => setForm((f) => ({ ...f, addressMode: 'saved' }))}
                          className="accent-teal-800"
                        />
                        Saved address
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="addressMode"
                          checked={form.addressMode === 'custom'}
                          onChange={() => setForm((f) => ({ ...f, addressMode: 'custom' }))}
                          className="accent-teal-800"
                        />
                        Different address
                      </label>
                    </div>
                    {form.addressMode === 'saved' ? (
                      <select
                        id="req-saved-address"
                        name="savedAddressId"
                        value={form.savedAddressId}
                        onChange={set('savedAddressId')}
                        className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                        aria-label="Saved address"
                      >
                        {addresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label} — {a.line1}, {a.city} {a.postalCode}{a.isDefault ? ' (default)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input id="req-custom-label" name="customLabel" label="Label" placeholder="e.g. Home, Office, Rental" value={form.customLabel} onChange={set('customLabel')} />
                          <Input id="req-custom-line1" name="customLine1" label="Street" required value={form.customLine1} onChange={set('customLine1')} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input id="req-custom-city" name="customCity" label="City" required value={form.customCity} onChange={set('customCity')} />
                          <Input id="req-custom-postal" name="customPostal" label="Postal code" required value={form.customPostal} onChange={set('customPostal')} />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="mb-3 text-[13px] text-ink-muted">Enter the address where the service is needed.</p>
                    <div className="grid gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input id="req-custom-label" name="customLabel" label="Label" placeholder="e.g. Home, Office, Rental" value={form.customLabel} onChange={set('customLabel')} />
                        <Input id="req-custom-line1" name="customLine1" label="Street" required value={form.customLine1} onChange={set('customLine1')} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input id="req-custom-city" name="customCity" label="City" required value={form.customCity} onChange={set('customCity')} />
                        <Input id="req-custom-postal" name="customPostal" label="Postal code" required value={form.customPostal} onChange={set('customPostal')} />
                      </div>
                    </div>
                  </div>
                )}
                {errors.address && <p role="alert" className="cc-error-text mt-1">{errors.address}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="req-preferred-date"
                  name="preferredDate"
                  label="Preferred date"
                  type="date"
                  min={localTodayISO()}
                  required
                  value={form.preferredDate}
                  onChange={set('preferredDate')}
                  error={errors.preferredDate}
                />
                <div>
                  <label htmlFor="req-window" className="cc-label">Time window</label>
                  <select
                    id="req-window"
                    name="timeWindow"
                    value={form.timeWindow}
                    onChange={set('timeWindow')}
                    className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {TIME_WINDOWS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-label="Review" className="grid gap-4 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-ink-faint">Service</dt><dd className="font-medium text-ink">{categoryName}</dd></div>
                <div><dt className="text-ink-faint">Problem</dt><dd className="text-ink">{form.description}</dd></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><dt className="text-ink-faint">Urgency</dt><dd className="text-ink">{form.urgency}</dd></div>
                  <div>
                    <dt className="text-ink-faint">Budget</dt>
                    <dd className="text-ink">
                      {form.budgetMin || form.budgetMax
                        ? `$${form.budgetMin || 0} – $${form.budgetMax || form.budgetMin || 0}`
                        : 'Flexible'}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-ink-faint">Address</dt>
                  <dd className="text-ink">
                    {addressSummary?.line1 ? `${addressSummary.line1}, ${addressSummary.city} ${addressSummary.postalCode}` : 'Not provided'}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><dt className="text-ink-faint">Date</dt><dd className="text-ink">{form.preferredDate}</dd></div>
                  <div><dt className="text-ink-faint">Window</dt><dd className="text-ink">{form.timeWindow.toLowerCase()}</dd></div>
                </div>
                <div><dt className="text-ink-faint">Attachments</dt><dd className="text-ink">{form.attachments.length} file(s)</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => handleFinish(false)} loading={saving} tone="secondary">{saving ? 'Saving…' : 'Save draft'}</Button>
                <Button onClick={() => handleFinish(true)} loading={saving}>{saving ? 'Submitting…' : 'Submit request'}</Button>
              </div>
            </section>
          )}

          {step < 3 && (
            <div className="mt-4 flex justify-between">
              <Button tone="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
              <Button onClick={next}>Continue</Button>
            </div>
          )}
          {step === 3 && (
            <div className="mt-4">
              <Button tone="secondary" onClick={() => setStep(2)}>Back</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
