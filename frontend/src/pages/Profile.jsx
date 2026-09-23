import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/authSlice';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

export default function Profile() {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/users/me')
      .then((res) => {
        if (cancelled) return;
        const u = res.data.data.user;
        setForm({ name: u.name || '', phone: u.phone || '' });
        dispatch(setUser(u));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(getApiErrorMessage(err, 'Could not load your profile.'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { name: form.name.trim(), phone: form.phone.trim() });
      dispatch(setUser(res.data.data.user));
      dispatch(pushToast({ tone: 'success', message: 'Profile updated.' }));
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" description="How providers and support will identify you." breadcrumb="Account / Profile" />
      {loading && <LoadingBlock title="Loading your profile" />}
      {!loading && loadError && <ErrorBlock title="Could not load your profile" description={loadError} onRetry={() => window.location.reload()} />}
      {!loading && !loadError && (
        <form onSubmit={onSubmit} noValidate className="rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
          {serverError && (
            <div className="mb-4">
              <Alert tone="danger">{serverError}</Alert>
            </div>
          )}
          <div className="grid gap-4">
            <Input label="Full name" name="name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
            <Input label="Phone" name="phone" type="tel" autoComplete="tel" hint="Used for booking coordination." value={form.phone} onChange={set('phone')} error={errors.phone} />
            <div>
              <Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
