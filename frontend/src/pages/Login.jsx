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

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
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
    if (!form.email) next.email = 'Email is required.';
    if (!form.password) next.password = 'Password is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      dispatch(setCredentials({ token: res.data.data.token, user: res.data.data.user }));
      dispatch(pushToast({ tone: 'success', message: 'Signed in successfully.' }));
      navigate('/dashboard');
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Sign-in failed. Check your details and try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Sign in" description="Access your requests, bookings, jobs, or operations queues." />
      <form onSubmit={onSubmit} noValidate className="rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
        {serverError && (
          <div className="mb-4">
            <Alert tone="danger">{serverError}</Alert>
          </div>
        )}
        <div className="grid gap-4">
          <Input label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} error={errors.password} />
          <Button type="submit" loading={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-sm">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </div>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
  );
}
