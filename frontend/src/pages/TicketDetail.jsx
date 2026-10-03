import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import { getApiErrorMessage } from '../lib/api';
import { getTicket, updateTicket, addTicketMessage } from '../lib/tickets';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';
import { formatStatus } from '../lib/status';

const STAFF_ROLES = ['SUPPORT', 'OPERATIONS', 'ADMIN'];
const NEXT_STATUS = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_USER', 'RESOLVED', 'CLOSED'],
  WAITING_ON_USER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export default function TicketDetail() {
  const { id } = useParams();
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [ticket, setTicket] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [triage, setTriage] = useState({ status: '', priority: '', resolutionNote: '' });
  const [triaging, setTriaging] = useState(false);

  async function load() {
    setState('loading');
    setError('');
    try {
      const data = await getTicket(id);
      setTicket(data);
      setTriage({ status: data.status, priority: data.priority, resolutionNote: data.resolutionNote || '' });
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Ticket not found.'));
      setState('error');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await addTicketMessage(id, { body: reply.trim() });
      setTicket(updated);
      setReply('');
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not send your reply.') }));
    } finally {
      setSending(false);
    }
  }

  async function handleTriage(e) {
    e.preventDefault();
    setTriaging(true);
    try {
      const payload = {};
      if (triage.status && triage.status !== ticket.status) payload.status = triage.status;
      if (triage.priority && triage.priority !== ticket.priority) payload.priority = triage.priority;
      if (triage.status === 'RESOLVED') payload.resolutionNote = triage.resolutionNote;
      if (Object.keys(payload).length === 0) {
        dispatch(pushToast({ tone: 'info', message: 'Nothing changed.' }));
        return;
      }
      const updated = await updateTicket(id, payload);
      setTicket(updated);
      setTriage({ status: updated.status, priority: updated.priority, resolutionNote: updated.resolutionNote || '' });
      dispatch(pushToast({ tone: 'success', message: 'Ticket updated.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not update this ticket.') }));
    } finally {
      setTriaging(false);
    }
  }

  if (state === 'loading') return <LoadingBlock title="Loading ticket" />;
  if (state === 'error') return <ErrorBlock title="Could not load ticket" description={error} onRetry={load} />;
  if (!ticket) return null;

  const allowedNext = NEXT_STATUS[ticket.status] || [];
  const closed = ticket.status === 'CLOSED';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`Raised by ${ticket.raisedBy?.name || 'Customer'} · ${new Date(ticket.createdAt).toLocaleString()}`}
        breadcrumb={<span><Link to="/tickets" className="text-brand-700 hover:underline">Tickets</Link> / Detail</span>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={ticket.status} />
          <Badge status={ticket.priority} />
          <Badge tone="neutral">{formatStatus(ticket.category)}</Badge>
          {ticket.assignedTo && (
            <span className="text-[13px] text-ink-muted">Owner: <span className="font-medium text-ink">{ticket.assignedTo.name}</span></span>
          )}
        </div>
        <p className="mt-3 whitespace-pre-line text-sm text-ink">{ticket.description}</p>
        {ticket.relatedBookingId && (
          <p className="mt-2 text-[13px] text-ink-muted">
            Related booking:{' '}
            <Link to={`/bookings/${ticket.relatedBookingId._id || ticket.relatedBookingId}`} className="text-brand-700 hover:underline">
              View booking
            </Link>
          </p>
        )}
        {ticket.status === 'RESOLVED' && ticket.resolutionNote && (
          <Alert tone="success">
            <span className="font-medium">Resolution: </span>{ticket.resolutionNote}
          </Alert>
        )}
      </Card>

      {isStaff && !closed && (
        <Card title="Triage" description="Assign, reprioritize, move, or resolve. Every status change is audited.">
          <form onSubmit={handleTriage} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Status</span>
              <select
                value={triage.status}
                onChange={(e) => setTriage((t) => ({ ...t, status: e.target.value }))}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              >
                <option value={ticket.status}>{formatStatus(ticket.status)} (current)</option>
                {allowedNext.filter((s) => s !== ticket.status).map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Priority</span>
              <select
                value={triage.priority}
                onChange={(e) => setTriage((t) => ({ ...t, priority: e.target.value }))}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              >
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <option key={p} value={p}>{formatStatus(p)}</option>
                ))}
              </select>
            </label>
            {triage.status === 'RESOLVED' && (
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="font-medium text-ink">Resolution note</span>
                <textarea
                  rows={3}
                  value={triage.resolutionNote}
                  onChange={(e) => setTriage((t) => ({ ...t, resolutionNote: e.target.value }))}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
                  placeholder="What was done to resolve this?"
                />
              </label>
            )}
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" size="sm" loading={triaging}>Apply triage</Button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Conversation (${ticket.messages?.length || 0})`}>
        {!ticket.messages || ticket.messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Replies between the customer and support appear here." />
        ) : (
          <ul className="grid gap-3">
            {ticket.messages.map((m) => {
              const mine = String(m.sender?._id || m.sender) === String(user?.id);
              const staffMsg = ['SUPPORT', 'OPERATIONS', 'ADMIN'].includes(m.sender?.role);
              return (
                <li key={m._id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'ml-auto bg-brand-700 text-white' : 'bg-stone-100 text-ink'}`}>
                  <p className={`mb-0.5 text-[12px] font-medium ${mine ? 'text-brand-100' : 'text-ink-faint'}`}>
                    {m.sender?.name || 'User'}{staffMsg ? ' · Support' : ''} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </li>
              );
            })}
          </ul>
        )}
        {!closed ? (
          <form onSubmit={handleReply} className="mt-4 flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              maxLength={2000}
              className="h-10 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink"
            />
            <Button type="submit" size="sm" loading={sending} disabled={!reply.trim()}>Send</Button>
          </form>
        ) : (
          <p className="mt-4 text-[13px] text-ink-faint">This ticket is closed and no longer accepts replies.</p>
        )}
      </Card>
    </div>
  );
}
