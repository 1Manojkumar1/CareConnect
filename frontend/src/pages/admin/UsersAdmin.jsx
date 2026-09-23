import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { pushToast } from '../../store/uiSlice';
import api, { getApiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';
import Button from '../../components/ui/Button';

export default function UsersAdmin() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const currentUser = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  async function load(p = 1) {
    setState('loading');
    try {
      const res = await api.get('/users', {
        params: { page: p, limit: 20, ...(search ? { search } : {}), ...(role ? { role } : {}), ...(status ? { status } : {}) },
      });
      setItems(res.data.data);
      setPagination(res.data.pagination);
      setPage(p);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load users.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/users', { params: { page: 1, limit: 20 } });
        if (cancelled) return;
        setItems(res.data.data);
        setPagination(res.data.pagination);
        setPage(1);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load users.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeStatus(user, next) {
    try {
      await api.patch(`/users/${user.id}/status`, { status: next });
      dispatch(pushToast({ tone: 'success', message: `${user.name} is now ${next.toLowerCase()}.` }));
      load(page);
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not change status.') }));
    }
  }

  async function changeRole(user, nextRole) {
    try {
      await api.patch(`/users/${user.id}/role`, { role: nextRole });
      dispatch(pushToast({ tone: 'success', message: `${user.name} role changed to ${nextRole}.` }));
      load(page);
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not change role.') }));
    }
  }

  return (
    <div>
      <PageHeader title="Users" description="Accounts across all roles. Status changes take effect on next login." breadcrumb="Admin / Users" />
      <form
        onSubmit={(e) => { e.preventDefault(); load(1); }}
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]"
      >
        <input aria-label="Search users" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm" />
        <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm">
          <option value="">All roles</option>
          {['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded border border-stone-300 bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {['ACTIVE', 'SUSPENDED', 'DISABLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" size="md">Search</Button>
      </form>

      {state === 'loading' && <LoadingBlock title="Loading users" />}
      {state === 'error' && <ErrorBlock title="Could not load users" description={error} onRetry={() => load(page)} />}
      {state === 'success' && items.length === 0 && <EmptyState title="No users found" description="Adjust search or filters." />}
      {state === 'success' && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
                <tr>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Change Role</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Set status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-medium text-ink">{u.name}</span>
                      <span className="block text-[13px] text-ink-faint">{u.email}</span>
                    </td>
                    <td className="px-4 py-2"><Badge tone="info">{u.role}</Badge></td>
                    <td className="px-4 py-2">
                      <select
                        aria-label={`Change role for ${u.name}`}
                        value={u.role}
                        disabled={currentUser && u.id === currentUser.id}
                        title={currentUser && u.id === currentUser.id ? 'You cannot change your own role' : undefined}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="h-8 rounded border border-stone-300 bg-white px-2 text-[13px] disabled:opacity-50"
                      >
                        {['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2"><Badge status={u.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} /></td>
                    <td className="px-4 py-2 text-right">
                      <select
                        aria-label={`Set status for ${u.name}`}
                        value={u.status}
                        disabled={currentUser && u.id === currentUser.id}
                        title={currentUser && u.id === currentUser.id ? 'You cannot change your own status' : undefined}
                        onChange={(e) => changeStatus(u, e.target.value)}
                        className="h-8 rounded border border-stone-300 bg-white px-2 text-[13px] disabled:opacity-50"
                      >
                        {['ACTIVE', 'SUSPENDED', 'DISABLED'].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-ink-muted">
              <span>Page {pagination.page} of {pagination.pages} · {pagination.total} users</span>
              <div className="flex gap-2">
                <Button size="sm" tone="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
                <Button size="sm" tone="secondary" disabled={page >= pagination.pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
