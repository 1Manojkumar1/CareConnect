import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { LoadingBlock } from '../components/ui/States';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api.post('/auth/verify-email', { token });
        if (!cancelled) setState('done');
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'This verification link is invalid or has expired.'));
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await api.post('/auth/resend-verification', { email: email.trim() });
      setResent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not resend the verification email.'));
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader title="Verify your email" description="Confirming your address unlocks full account access." />
      {state === 'verifying' && <LoadingBlock title="Verifying your email" />}
      {state === 'done' && (
        <Alert tone="success" title="Email verified">
          Your address is confirmed. <Link to="/login" className="font-medium underline">Sign in to continue.</Link>
        </Alert>
      )}
      {(state === 'error' || state === 'missing') && (
        <div className="grid gap-4">
          <Alert tone="warning" title="Verification link unavailable">
            {state === 'missing'
              ? 'This page needs a verification token. Check the link in your email.'
              : error}
          </Alert>
          <form onSubmit={handleResend} className="grid gap-3 rounded-lg border border-stone-200 bg-surface p-4">
            <p className="text-sm text-ink-muted">Enter your account email to receive a fresh link.</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink"
            />
            <Button type="submit" size="sm">Resend verification email</Button>
            {resent && <p className="text-[13px] text-emerald-700">If the address is registered, a new link is on its way.</p>}
          </form>
        </div>
      )}
    </div>
  );
}
