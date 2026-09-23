import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import { fetchCategories, fetchSkills, topLevel } from '../lib/catalog';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

const MIME_OPTIONS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

async function getProviderSetup() {
  const [cats, sks] = await Promise.all([fetchCategories(), fetchSkills()]);
  let profile = null;
  try {
    const res = await api.get('/providers/profile/me');
    profile = res.data.data;
  } catch (err) {
    if (err.response?.status !== 404) throw err;
  }
  return { cats, sks, profile };
}

function CheckGroup({ legend, items, selected, onToggle }) {
  return (
    <fieldset>
      <legend className="cc-label">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-start gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => onToggle(item.id)}
              className="mt-1 h-4 w-4 accent-teal-800"
            />
            <span>
              <span className="font-medium text-ink">{item.name}</span>
              {item.hint && <span className="block text-[13px] text-ink-faint">{item.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ProviderProfile() {
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(null);
  const [areas, setAreas] = useState([]);
  const [newArea, setNewArea] = useState({ city: '', area: '', postalCode: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ fileName: '', mimeType: 'application/pdf', size: '', storageKey: '' });
  const dispatch = useDispatch();

  function applyProfile(p) {
    setProfile(p);
    if (p) {
      setForm({
        headline: p.headline || '',
        bio: p.bio || '',
        experienceYears: p.experienceYears || 0,
        categoryIds: (p.categories || []).map((c) => c.id),
        skillIds: (p.skills || []).map((s) => s.id),
        hourlyRate: p.pricing?.hourlyRate || 0,
        visitFee: p.pricing?.visitFee || 0,
        acceptingJobs: p.acceptingJobs !== false,
      });
      setAreas(p.serviceAreas || []);
    } else {
      setForm({
        headline: '', bio: '', experienceYears: 0,
        categoryIds: [], skillIds: [], hourlyRate: 0, visitFee: 0, acceptingJobs: true,
      });
      setAreas([]);
    }
  }

  async function refresh() {
    setState('loading');
    try {
      const { cats, sks, profile: p } = await getProviderSetup();
      setCategories(cats);
      setSkills(sks);
      applyProfile(p);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load your provider profile.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cats, sks, profile: p } = await getProviderSetup();
        if (cancelled) return;
        setCategories(cats);
        setSkills(sks);
        applyProfile(p);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load your provider profile.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tops = useMemo(() => topLevel(categories), [categories]);
  const eligibleSkills = useMemo(
    () => skills.filter((s) => form?.categoryIds.includes(s.category?.id)),
    [skills, form]
  );

  const toggle = (key) => (id) =>
    setForm((f) => {
      const has = f[key].includes(id);
      const next = { ...f, [key]: has ? f[key].filter((x) => x !== id) : [...f[key], id] };
      if (key === 'categoryIds') {
        next.skillIds = next.skillIds.filter((sid) => {
          const s = skills.find((x) => x.id === sid);
          return s && next.categoryIds.includes(s.category?.id);
        });
      }
      return next;
    });

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function addArea() {
    if (!newArea.city.trim()) return;
    setAreas((a) => [...a, { city: newArea.city.trim(), area: newArea.area.trim(), postalCode: newArea.postalCode.trim() }]);
    setNewArea({ city: '', area: '', postalCode: '' });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    const payload = {
      headline: form.headline,
      bio: form.bio,
      experienceYears: Number(form.experienceYears) || 0,
      categoryIds: form.categoryIds,
      skillIds: form.skillIds,
      serviceAreas: areas,
      pricing: { hourlyRate: Number(form.hourlyRate) || 0, visitFee: Number(form.visitFee) || 0 },
      acceptingJobs: form.acceptingJobs,
    };
    setSaving(true);
    try {
      const res = profile
        ? await api.patch('/providers/profile/me', payload)
        : await api.post('/providers/profile', payload);
      setProfile(res.data.data);
      dispatch(pushToast({ tone: 'success', message: profile ? 'Profile updated.' : 'Profile created.' }));
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    try {
      const res = await api.post('/providers/profile/me/submit');
      setProfile(res.data.data);
      dispatch(pushToast({ tone: 'success', message: 'Submitted for verification.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not submit for verification.') }));
    }
  }

  async function handleDocAdd(e) {
    e.preventDefault();
    try {
      const res = await api.post('/providers/profile/me/documents', {
        fileName: docForm.fileName,
        mimeType: docForm.mimeType,
        size: Number(docForm.size),
        storageKey: docForm.storageKey,
      });
      setProfile(res.data.data);
      setDocModal(false);
      setDocForm({ fileName: '', mimeType: 'application/pdf', size: '', storageKey: '' });
      dispatch(pushToast({ tone: 'success', message: 'Document recorded.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not record this document.') }));
    }
  }

  async function handleDocRemove(id) {
    try {
      const res = await api.delete(`/providers/profile/me/documents/${id}`);
      setProfile(res.data.data);
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not remove this document.') }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Provider profile"
        description="What customers see when they discover you. Verification unlocks quoting and bookings."
        breadcrumb="Provider / Profile"
      />
      {state === 'loading' && <LoadingBlock title="Loading your profile" />}
      {state === 'error' && <ErrorBlock title="Could not load your profile" description={error} onRetry={refresh} />}
      {state === 'success' && form && (
        <div className="grid gap-4">
          {profile && (
            <section aria-label="Verification" className="rounded-lg border border-stone-200 bg-surface px-5 py-4 shadow-subtle">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">Verification</span>
                  <Badge status={profile.verificationStatus} />
                </div>
                {['PENDING', 'REJECTED'].includes(profile.verificationStatus) && (
                  <Button size="sm" onClick={handleSubmit}>Submit for verification</Button>
                )}
              </div>
              {profile.verificationNotes && (
                <p className="mt-2 text-[13px] text-ink-muted">Reviewer note: {profile.verificationNotes}</p>
              )}
              {profile.verificationStatus === 'PENDING' && (
                <p className="mt-2 text-[13px] text-ink-muted">Add skills, a service area, and verification documents, then submit.</p>
              )}
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-teal-950">Operating Hours & Availability</h3>
              <p className="text-xs text-teal-850">
                Configure your weekly operating days, hours, timezone, and scheduled time-off periods.
              </p>
            </div>
            <Link
              to="/provider/availability"
              className="inline-flex h-8 items-center justify-center rounded bg-teal-800 px-3 text-xs font-semibold text-white no-underline hover:bg-teal-900 hover:text-white hover:no-underline"
            >
              Manage Schedule →
            </Link>
          </div>

          <form onSubmit={handleSave} className="grid gap-5 rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <Input label="Headline" name="headline" placeholder="Licensed plumber — 8 yrs residential" value={form.headline} onChange={set('headline')} />
            <div>
              <label htmlFor="bio" className="cc-label">Professional bio</label>
              <textarea
                id="bio" rows={4} value={form.bio} onChange={set('bio')}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Experience (years)" name="experienceYears" type="number" min={0} max={60} value={form.experienceYears} onChange={set('experienceYears')} />
              <Input label="Hourly rate (USD)" name="hourlyRate" type="number" min={0} value={form.hourlyRate} onChange={set('hourlyRate')} />
              <Input label="Visit fee (USD)" name="visitFee" type="number" min={0} value={form.visitFee} onChange={set('visitFee')} />
            </div>

            <CheckGroup legend="Service categories" items={tops.map((c) => ({ id: c.id, name: c.name }))} selected={form.categoryIds} onToggle={toggle('categoryIds')} />

            {form.categoryIds.length > 0 && (
              <CheckGroup legend="Skills" items={eligibleSkills.map((s) => ({ id: s.id, name: s.name, hint: s.category?.name }))} selected={form.skillIds} onToggle={toggle('skillIds')} />
            )}

            <fieldset>
              <legend className="cc-label">Service areas</legend>
              {areas.length > 0 ? (
                <ul className="mb-3 grid gap-2">
                  {areas.map((a, i) => (
                    <li key={`${a.city}-${i}`} className="flex items-center justify-between gap-3 rounded border border-stone-200 bg-white px-3 py-2 text-sm">
                      <span>{a.city}{a.area ? ` — ${a.area}` : ''}{a.postalCode ? ` (${a.postalCode})` : ''}</span>
                      <button type="button" onClick={() => setAreas((list) => list.filter((_, j) => j !== i))} className="text-[13px] font-medium text-red-700 hover:underline">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mb-3"><EmptyState title="No service areas" description="Add at least one city you serve. Required for verification." /></div>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input aria-label="City" placeholder="City" value={newArea.city} onChange={(e) => setNewArea((n) => ({ ...n, city: e.target.value }))} className="h-10 rounded border border-stone-300 px-3 text-sm" />
                <input aria-label="Area" placeholder="Area (optional)" value={newArea.area} onChange={(e) => setNewArea((n) => ({ ...n, area: e.target.value }))} className="h-10 rounded border border-stone-300 px-3 text-sm" />
                <input aria-label="Postal code" placeholder="Postal (optional)" value={newArea.postalCode} onChange={(e) => setNewArea((n) => ({ ...n, postalCode: e.target.value }))} className="h-10 rounded border border-stone-300 px-3 text-sm" />
                <button type="button" onClick={addArea} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm font-medium hover:bg-stone-50">Add</button>
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.acceptingJobs} onChange={set('acceptingJobs')} className="h-4 w-4 accent-teal-800" />
              Accepting new jobs
            </label>

            <div>
              <Button type="submit" loading={saving}>{saving ? 'Saving…' : profile ? 'Save changes' : 'Create profile'}</Button>
            </div>
          </form>

          {profile && (
            <section aria-label="Verification documents" className="rounded-lg border border-stone-200 bg-surface px-5 py-4 shadow-subtle">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px]">Verification documents</h2>
                <Button size="sm" tone="secondary" onClick={() => setDocModal(true)}>Record document</Button>
              </div>
              {(profile.documents || []).length === 0 ? (
                <EmptyState title="No documents yet" description="Licenses, certifications, or insurance. Upload storage lands in a later phase — record metadata for now." />
              ) : (
                <ul className="grid gap-2">
                  {profile.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 rounded border border-stone-200 bg-white px-3 py-2 text-sm">
                      <span>{d.fileName} <span className="text-ink-faint">· {Math.round(d.size / 1024)} KB</span></span>
                      <button type="button" onClick={() => handleDocRemove(d.id)} className="text-[13px] font-medium text-red-700 hover:underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {docModal && (
        <Modal title="Record verification document" description="PDF, JPEG, PNG, or WebP up to 25 MB." onClose={() => setDocModal(false)}>
          <form onSubmit={handleDocAdd} className="grid gap-4">
            <Input label="File name" required value={docForm.fileName} onChange={(e) => setDocForm((f) => ({ ...f, fileName: e.target.value }))} />
            <div>
              <label htmlFor="doc-mime" className="cc-label">File type</label>
              <select id="doc-mime" value={docForm.mimeType} onChange={(e) => setDocForm((f) => ({ ...f, mimeType: e.target.value }))} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm">
                {MIME_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Input label="Size (bytes)" type="number" min={1} max={26214400} required value={docForm.size} onChange={(e) => setDocForm((f) => ({ ...f, size: e.target.value }))} />
            <Input label="Storage key" hint="Object-storage key from your upload step." required value={docForm.storageKey} onChange={(e) => setDocForm((f) => ({ ...f, storageKey: e.target.value }))} />
            <div><Button type="submit">Record document</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
