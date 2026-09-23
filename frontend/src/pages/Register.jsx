import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const ROLES = [
  { value: 'CUSTOMER', label: 'Customer — request services' },
  { value: 'PROVIDER', label: 'Provider — offer services' },
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    if (!form.email) next.email = 'Email is required.';
    if (!form.password || form.password.length < 8) next.password = 'Use at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      dispatch(setCredentials({ token: res.data.data.token, user: res.data.data.user }));
      dispatch(pushToast({ tone: 'success', message: 'Account created. Welcome to CareConnect.' }));
      navigate('/dashboard');
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Registration failed. Try a different email.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Create your account" description="One account for customers and providers. Staff accounts are provisioned by an admin." />
      <form onSubmit={onSubmit} noValidate className="rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
        {serverError && (
          <div className="mb-4">
            <Alert tone="danger">{serverError}</Alert>
          </div>
        )}
        <div className="grid gap-4">
          <Input label="Full name" name="name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters." value={form.password} onChange={set('password')} error={errors.password} />
          <div>
            <label htmlFor="role" className="cc-label">
              I am joining as
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={set('role')}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
