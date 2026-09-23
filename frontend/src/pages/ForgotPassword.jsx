import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email) {
      setError('Email is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not process that request. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Reset your password" description="Enter your account email and we'll send reset instructions." />
      {done ? (
        <Alert tone="success" title="Check your email">
          If an account exists for <strong>{email}</strong>, reset instructions are on the way.
          The link expires in one hour.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="rounded-lg border border-stone-200 bg-surface px-5 py-5 shadow-subtle">
          {error && (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          <div className="grid gap-4">
            <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={undefined} />
            <Button type="submit" loading={loading}>
              {loading ? 'Sending…' : 'Send reset instructions'}
            </Button>
          </div>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-ink-muted">
        Remembered it? <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
