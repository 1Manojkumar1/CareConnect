import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';

  async function onSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'This reset link is invalid or has expired.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Choose a new password" description="Your new password must be at least 8 characters." />
      {done ? (
        <Alert tone="success" title="Password updated">
          <Link to="/login">Sign in with your new password</Link>.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
          {error && (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          {!token && (
            <div className="mb-4">
              <Alert tone="warning" title="Missing reset token">
                Open the link from your reset email to continue.
              </Alert>
            </div>
          )}
          <div className="grid gap-4">
            <Input label="New password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" loading={loading} disabled={!token}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
