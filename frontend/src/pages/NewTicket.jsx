import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';
import { createTicket, TICKET_CATEGORIES, TICKET_PRIORITIES } from '../lib/tickets';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

export default function NewTicket() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('BOOKING_ISSUE');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (subject.trim().length < 5) {
      setError('Give your ticket a short subject (at least 5 characters).');
      return;
    }
    if (description.trim().length < 20) {
      setError('Describe the issue in at least 20 characters so support can act on it.');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      navigate(`/tickets/${ticket._id || ticket.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not raise this ticket.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Raise a support ticket"
        description="Tell us what went wrong. A support agent will triage it and reply here."
        breadcrumb={<span><Link to="/tickets" className="text-brand-700 hover:underline">Tickets</Link> / New</span>}
      />
      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            hint="A short summary, e.g. “Provider never arrived for the morning visit”."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (x) => x.toUpperCase())}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">What happened?</span>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
              placeholder="Include dates, booking references, and what you expected to happen."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Link to="/tickets"><Button tone="secondary" type="button">Cancel</Button></Link>
            <Button type="submit" loading={submitting}>Raise ticket</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
