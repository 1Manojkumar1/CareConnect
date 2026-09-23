import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import { getApiErrorMessage } from '../lib/api';
import { getRequest, submitRequest, cancelRequest, classifyRequest, findProviders } from '../lib/requests';
import { listQuotes, createQuote, updateQuote, acceptQuote, rejectQuote, withdrawQuote } from '../lib/quotes';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import MatchedProviders from '../components/MatchedProviders';
import QuotesCompare from '../components/QuotesCompare';
import QuoteForm from '../components/QuoteForm';
import { LoadingBlock, ErrorBlock } from '../components/ui/States';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RequestDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [working, setWorking] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [matches, setMatches] = useState(null);
  const [matchState, setMatchState] = useState('loading');
  const [quotes, setQuotes] = useState([]);
  const [quoteModal, setQuoteModal] = useState(null); // { mode: 'create' } | { mode: 'edit', quote }
  const [quoteServerError, setQuoteServerError] = useState('');
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRequest(id);
        if (cancelled) return;
        setItem(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Service request not found.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const matchable = item && ['OPEN', 'QUOTED'].includes(item.status) && !item.redacted;

  useEffect(() => {
    if (!matchable) return;
    let cancelled = false;
    (async () => {
      try {
        const { providers } = await findProviders(id);
        if (cancelled) return;
        setMatches(providers);
        setMatchState('success');
      } catch {
        if (cancelled) return;
        setMatchState('success');
        setMatches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, matchable]);

  async function handleSubmit() {
    setWorking(true);
    try {
      const updated = await submitRequest(id);
      setItem(updated);
      dispatch(pushToast({ tone: 'success', message: 'Request submitted.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not submit.') }));
    } finally {
      setWorking(false);
    }
  }

  async function handleCancel() {
    setWorking(true);
    try {
      const updated = await cancelRequest(id);
      setItem(updated);
      setConfirmCancel(false);
      dispatch(pushToast({ tone: 'success', message: 'Request cancelled.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not cancel.') }));
    } finally {
      setWorking(false);
    }
  }

  async function refreshQuotes() {
    try {
      const { items } = await listQuotes({ requestId: id });
      setQuotes(items);
    } catch {
      setQuotes([]);
    }
  }

  useEffect(() => {
    if (!item || item.status === 'DRAFT') return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await listQuotes({ requestId: id });
        if (!cancelled) setQuotes(items);
      } catch {
        if (!cancelled) setQuotes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, item]);

  async function handleClassify() {
    setClassifying(true);
    try {
      await classifyRequest(id);
      const updated = await getRequest(id);
      setItem(updated);
      dispatch(pushToast({ tone: 'success', message: 'Classification refreshed.' }));
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not classify this request.') }));
    } finally {
      setClassifying(false);
    }
  }

  async function handleQuoteSubmit(payload) {
    setQuoteSaving(true);
    setQuoteServerError('');
    try {
      if (quoteModal.mode === 'edit') await updateQuote(quoteModal.quote.id, payload);
      else await createQuote(payload);
      dispatch(pushToast({ tone: 'success', message: quoteModal.mode === 'edit' ? 'Quote updated.' : 'Quote submitted.' }));
      setQuoteModal(null);
      refreshQuotes();
    } catch (err) {
      setQuoteServerError(getApiErrorMessage(err, 'Could not save this quote.'));
    } finally {
      setQuoteSaving(false);
    }
  }

  async function handleWithdraw(quote) {
    try {
      await withdrawQuote(quote.id);
      dispatch(pushToast({ tone: 'success', message: 'Quote withdrawn.' }));
      refreshQuotes();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not withdraw this quote.') }));
    }
  }

  async function handleAccept(quote) {
    setDeciding(true);
    try {
      await acceptQuote(quote.id);
      dispatch(pushToast({ tone: 'success', message: 'Quote accepted.' }));
      refreshQuotes();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not accept this quote.') }));
    } finally {
      setDeciding(false);
    }
  }

  async function handleReject(quote) {
    setDeciding(true);
    try {
      await rejectQuote(quote.id);
      dispatch(pushToast({ tone: 'success', message: 'Quote rejected.' }));
      refreshQuotes();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not reject this quote.') }));
    } finally {
      setDeciding(false);
    }
  }

  const ownQuote = quotes.find((q) => q.status === 'PENDING') || quotes[0] || null;

  return (
    <div className="mx-auto max-w-3xl">
      {state === 'loading' && <LoadingBlock title="Loading request" />}
      {state === 'error' && <ErrorBlock title="Request unavailable" description={error} onRetry={() => navigate('/requests')} />}
      {state === 'success' && item?.redacted && (
        <div>
          <PageHeader
            title={item.category?.name || 'Open request'}
            description="Customer identity and exact address stay private until booking."
            breadcrumb={<Link to="/provider/requests">Incoming requests</Link>}
          />
          <div className="mb-4">
            <Alert tone="info">Quote based on the details below. The customer sees your headline, pricing, and schedule — never the reverse.</Alert>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge status={item.status} />
            <Badge tone={item.urgency === 'HIGH' ? 'danger' : item.urgency === 'MEDIUM' ? 'warning' : 'neutral'}>{item.urgency} urgency</Badge>
          </div>
          <div className="grid gap-4">
            <Card title="What’s needed">
              <p className="text-sm text-ink">{item.description}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-faint">Budget</dt><dd className="text-ink">${item.budget.min} – ${item.budget.max}</dd></div>
                <div><dt className="text-ink-faint">Area</dt><dd className="text-ink">{item.city}</dd></div>
                <div><dt className="text-ink-faint">Preferred</dt><dd className="text-ink">{formatDate(item.preferredDate)} · {item.timeWindow.toLowerCase()}</dd></div>
                <div><dt className="text-ink-faint">Photos</dt><dd className="text-ink">{item.attachmentCount} file(s)</dd></div>
              </dl>
              {(item.aiClassification?.skills || []).length > 0 && (
                <p className="mt-2 text-[13px] text-ink-muted">Suggested skills: {item.aiClassification.skills.join(', ')}</p>
              )}
            </Card>
            <Card
              title="Your quote"
              actions={
                ownQuote?.status === 'PENDING' && (
                  <>
                    <Button size="sm" tone="secondary" onClick={() => { setQuoteServerError(''); setQuoteModal({ mode: 'edit', quote: ownQuote }); }}>Edit</Button>
                    <Button size="sm" tone="danger" onClick={() => handleWithdraw(ownQuote)}>Withdraw</Button>
                  </>
                )
              }
            >
              {!ownQuote && (
                <div>
                  <p className="mb-3 text-sm text-ink-muted">No quote submitted yet. Transparent pricing wins — labor, materials, and fees are shown separately.</p>
                  <Button size="sm" onClick={() => { setQuoteServerError(''); setQuoteModal({ mode: 'create' }); }}>Submit quote</Button>
                </div>
              )}
              {ownQuote && (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-ink-faint">Total</dt><dd className="text-base font-semibold text-ink">${ownQuote.pricing.total.toFixed(2)}</dd></div>
                  <div><dt className="text-ink-faint">Status</dt><dd><Badge status={ownQuote.status} /></dd></div>
                  <div><dt className="text-ink-faint">Expires</dt><dd className="text-ink">{new Date(ownQuote.expiresAt).toLocaleDateString()}</dd></div>
                  <div><dt className="text-ink-faint">Proposed</dt><dd className="text-ink">{new Date(ownQuote.proposedDate).toLocaleDateString()}</dd></div>
                </dl>
              )}
            </Card>
          </div>
        </div>
      )}
      {state === 'success' && item && !item.redacted && (
        <div>
          <PageHeader
            title={item.category?.name || 'Service request'}
            description={`Created ${formatDate(item.createdAt)}`}
            breadcrumb={<Link to="/requests">Requests</Link>}
            actions={
              <>
                {item.actions.includes('edit') && (
                  <Link to={`/requests/${item.id}/edit`} className="inline-flex h-9 items-center rounded border border-stone-300 bg-white px-3 text-sm font-medium text-ink no-underline hover:bg-stone-50 hover:no-underline">
                    Edit
                  </Link>
                )}
                {item.actions.includes('submit') && (
                  <Button size="sm" onClick={handleSubmit} loading={working}>Submit</Button>
                )}
                {item.actions.includes('cancel') && (
                  <Button size="sm" tone="danger" onClick={() => setConfirmCancel(true)}>Cancel request</Button>
                )}
              </>
            }
          />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge status={item.status} />
            <Badge tone={item.urgency === 'HIGH' ? 'danger' : item.urgency === 'MEDIUM' ? 'warning' : 'neutral'}>{item.urgency} urgency</Badge>
            {item.aiClassification?.status === 'DONE' && <Badge tone="info">AI classified</Badge>}
          </div>

          <div className="grid gap-4">
            <Card
              title="AI classification"
              description="Advisory only — matching and pricing always use your confirmed details."
              actions={
                item.aiClassification?.status !== 'DONE' && (
                  <Button size="sm" tone="secondary" onClick={handleClassify} loading={classifying}>
                    {classifying ? 'Classifying…' : 'Re-run'}
                  </Button>
                )
              }
            >
              {(!item.aiClassification || item.aiClassification.status === 'PENDING') && (
                <p className="text-sm text-ink-muted">Classification is pending. It fills in automatically after submit.</p>
              )}
              {item.aiClassification?.status === 'FAILED' && (
                <p className="text-sm text-ink-muted">Classification failed. Your request is unaffected — try re-running.</p>
              )}
              {['DONE', 'NEEDS_REVIEW'].includes(item.aiClassification?.status) && (
                <div>
                  {item.aiClassification.status === 'NEEDS_REVIEW' && (
                    <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                      Low confidence — please confirm the category by editing the request if needed.
                    </p>
                  )}
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-ink-faint">Category</dt><dd className="text-ink">{item.aiClassification.category || '—'}</dd></div>
                    <div><dt className="text-ink-faint">Service</dt><dd className="text-ink">{item.aiClassification.subcategory || '—'}</dd></div>
                    <div><dt className="text-ink-faint">Skills</dt><dd className="text-ink">{item.aiClassification.skills.join(', ') || '—'}</dd></div>
                    <div><dt className="text-ink-faint">Confidence</dt><dd className="text-ink">{Math.round(item.aiClassification.confidence * 100)}%</dd></div>
                  </dl>
                </div>
              )}
            </Card>

            <Card title="Problem">
              <p className="text-sm text-ink">{item.description}</p>
              {item.notes && <p className="mt-2 text-sm text-ink-muted">Note for provider: {item.notes}</p>}
              <p className="mt-2 text-sm text-ink-muted">Budget: ${item.budget.min} – ${item.budget.max}</p>
            </Card>

            <Card title="Schedule & address">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-faint">Preferred</dt><dd className="text-ink">{formatDate(item.preferredDate)} · {item.timeWindow.toLowerCase()}</dd></div>
                <div><dt className="text-ink-faint">Address</dt><dd className="text-ink">{item.address.line1}{item.address.line2 ? `, ${item.address.line2}` : ''}, {item.address.city} {item.address.postalCode}</dd></div>
              </dl>
            </Card>

            {item.attachments.length > 0 && (
              <Card title={`Attachments (${item.attachments.length})`}>
                <ul className="grid gap-2">
                  {item.attachments.map((a) => (
                    <li key={a.id} className="text-sm text-ink">{a.fileName} <span className="text-ink-faint">· {Math.round(a.size / 1024)} KB</span></li>
                  ))}
                </ul>
              </Card>
            )}

            {matchable && (
              <Card
                title="Matched providers"
                description="Verified providers ranked by skills, area, rating, experience, and budget fit."
              >
                <MatchedProviders providers={matches} state={matchState} />
              </Card>
            )}

            {item.status !== 'DRAFT' && (
              <Card
                title={`Quotes (${quotes.length})`}
                description="Transparent pricing from verified providers. Accepting moves the request toward booking."
              >
                <QuotesCompare quotes={quotes} onAccept={handleAccept} onReject={handleReject} working={deciding} />
              </Card>
            )}

            <Card title="Timeline">
              <ol className="grid gap-2">
                {item.history.map((h, i) => (
                  <li key={`${h.status}-${i}`} className="flex items-center gap-2 text-sm">
                    <Badge status={h.status} />
                    <span className="text-ink-faint">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}

      {quoteModal && (
        <Modal
          title={quoteModal.mode === 'edit' ? 'Update quote' : 'Submit quote'}
          description="The server sets the final total from your line items."
          onClose={() => setQuoteModal(null)}
        >
          <QuoteForm
            requestId={id}
            initial={quoteModal.quote}
            onSubmit={handleQuoteSubmit}
            saving={quoteSaving}
            serverError={quoteServerError}
          />
        </Modal>
      )}

      {confirmCancel && (
        <Modal
          title="Cancel this request?"
          description="Providers will no longer see it. This cannot be undone."
          onClose={() => setConfirmCancel(false)}
          footer={
            <>
              <Button tone="secondary" size="sm" onClick={() => setConfirmCancel(false)}>Keep request</Button>
              <Button tone="danger" size="sm" onClick={handleCancel} loading={working}>Cancel request</Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">Quotes already received will be closed.</p>
        </Modal>
      )}
    </div>
  );
}
