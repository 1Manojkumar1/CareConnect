import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getApiErrorMessage } from '../lib/api';
import { listTickets } from '../lib/tickets';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';
import { formatStatus } from '../lib/status';

const STAFF_ROLES = ['SUPPORT', 'OPERATIONS', 'ADMIN'];

export default function Tickets() {
  const user = useSelector((s) => s.auth.user);
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [tickets, setTickets] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  async function load() {
    setState('loading');
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await listTickets(params);
      setTickets(data.tickets || []);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load tickets.'));
      setState('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'Support ticket queue' : 'My support tickets'}
        description={isStaff
          ? 'Triage incoming requests, assign owners, track priority, and resolve with an audit trail.'
          : 'Raise an issue and track the conversation with our support team.'}
        actions={(
          <Link to="/tickets/new">
            <Button size="sm">New ticket</Button>
          </Link>
        )}
      />

      <Card>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-ink-muted">
            Status{' '}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ml-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink"
            >
              <option value="">All</option>
              {['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-muted">
            Priority{' '}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="ml-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink"
            >
              <option value="">All</option>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                <option key={p} value={p}>{formatStatus(p)}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {state === 'loading' && <LoadingBlock title="Loading tickets" />}
      {state === 'error' && <ErrorBlock title="Could not load tickets" description={error} onRetry={load} />}
      {state === 'success' && tickets.length === 0 && (
        <EmptyState
          title="No tickets here"
          description={isStaff
            ? 'The queue is clear for the selected filters.'
            : 'You have not raised any support tickets yet.'}
          action={<Link to="/tickets/new"><Button size="sm">Raise a ticket</Button></Link>}
        />
      )}
      {state === 'success' && tickets.length > 0 && (
        <Card padding="none">
          <ul className="divide-y divide-stone-200">
            {tickets.map((t) => (
              <li key={t._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link to={`/tickets/${t._id}`} className="font-medium text-ink hover:text-brand-700">
                    {t.subject}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-ink-faint">
                    {t.raisedBy?.name || 'Customer'} · {t.messages?.length || 0} messages · {new Date(t.createdAt).toLocaleDateString()}
                    {t.assignedTo && ` · Owner: ${t.assignedTo.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={t.priority} />
                  <Badge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
