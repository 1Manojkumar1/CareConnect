import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

export default function Account() {
  const [user, setUser] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) {
          setUser(res.data.data.user);
          setState('success');
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load your profile.'));
          setState('error');
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    api.post('/auth/logout').catch(() => {});
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Account"
        description="Your profile and session."
        actions={<Button tone="secondary" size="sm" onClick={handleLogout}>Sign out</Button>}
      />
      {state === 'loading' && <LoadingBlock title="Loading your profile" />}
      {state === 'error' && (
        <ErrorBlock title="Could not load your profile" description={error} onRetry={() => window.location.reload()} />
      )}
      {state === 'success' && user && (
        <>
          <Card title={user.name} description={user.email}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Role</dt>
                <dd className="mt-1"><Badge tone="info">{user.role}</Badge></dd>
              </div>
              <div>
                <dt className="text-ink-faint">Status</dt>
                <dd className="mt-1"><Badge status={user.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} /></dd>
              </div>
              <div>
                <dt className="text-ink-faint">Email verified</dt>
                <dd className="mt-1 text-ink">{user.emailVerified ? 'Yes' : 'Not yet'}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Member since</dt>
                <dd className="mt-1 text-ink">{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </Card>
          <nav aria-label="Account sections" className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/account/profile" className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle no-underline hover:no-underline hover:border-brand-600">
              <span className="block text-sm font-semibold text-ink">Edit profile</span>
              <span className="mt-0.5 block text-[13px] text-ink-muted">Name and phone number</span>
            </Link>
            <Link to="/account/addresses" className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle no-underline hover:no-underline hover:border-brand-600">
              <span className="block text-sm font-semibold text-ink">Service addresses</span>
              <span className="mt-0.5 block text-[13px] text-ink-muted">Where providers should come</span>
            </Link>
            {user.role === 'PROVIDER' && (
              <Link to="/provider/profile" className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle no-underline hover:no-underline hover:border-brand-600">
                <span className="block text-sm font-semibold text-ink">Provider profile</span>
                <span className="mt-0.5 block text-[13px] text-ink-muted">Skills, areas, and verification</span>
              </Link>
            )}
            {user.role === 'ADMIN' && (
              <Link to="/admin/catalog" className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle no-underline hover:no-underline hover:border-brand-600">
                <span className="block text-sm font-semibold text-ink">Administration</span>
                <span className="mt-0.5 block text-[13px] text-ink-muted">Catalog, providers, and users</span>
              </Link>
            )}
          </nav>
        </>
      )}
      {state === 'success' && !user && (
        <EmptyState title="No profile found" description="Your session may have expired. Sign in again." />
      )}
    </div>
  );
}
