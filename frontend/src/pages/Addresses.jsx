import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { pushToast } from '../store/uiSlice';
import api, { getApiErrorMessage } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

const EMPTY_FORM = { label: '', line1: '', line2: '', city: '', postalCode: '', isDefault: false };

async function getAddresses() {
  const res = await api.get('/users/me/addresses');
  return res.data.data;
}

function AddressForm({ initial, onSubmit, saving, serverError }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.label.trim()) next.label = 'Label is required.';
    if (!form.line1.trim()) next.line1 = 'Street address is required.';
    if (!form.city.trim()) next.city = 'City is required.';
    if (!form.postalCode.trim()) next.postalCode = 'Postal code is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Input label="Label" name="label" placeholder="Home, Office…" required value={form.label} onChange={set('label')} error={errors.label} />
      <Input label="Street address" name="line1" required value={form.line1} onChange={set('line1')} error={errors.line1} />
      <Input label="Apt, suite, floor (optional)" name="line2" value={form.line2} onChange={set('line2')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" name="city" required value={form.city} onChange={set('city')} error={errors.city} />
        <Input label="Postal code" name="postalCode" required value={form.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="h-4 w-4 accent-teal-800" />
        Make this my default address
      </label>
      <div>
        <Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save address'}</Button>
      </div>
    </form>
  );
}

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'add' } | { mode: 'edit', address }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const dispatch = useDispatch();

  async function refresh() {
    setState('loading');
    try {
      setAddresses(await getAddresses());
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load addresses.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAddresses();
        if (cancelled) return;
        setAddresses(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load addresses.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(form) {
    setSaving(true);
    setModalError('');
    try {
      if (modal.mode === 'add') {
        await api.post('/users/me/addresses', form);
        dispatch(pushToast({ tone: 'success', message: 'Address added.' }));
      } else {
        await api.patch(`/users/me/addresses/${modal.address.id}`, form);
        dispatch(pushToast({ tone: 'success', message: 'Address updated.' }));
      }
      setModal(null);
      refresh();
    } catch (err) {
      setModalError(getApiErrorMessage(err, 'Could not save this address.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/users/me/addresses/${confirmDelete.id}`);
      dispatch(pushToast({ tone: 'success', message: 'Address removed.' }));
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not remove this address.') }));
    }
  }

  async function handleDefault(id) {
    try {
      await api.post(`/users/me/addresses/${id}/default`);
      refresh();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not set default.') }));
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Service addresses"
        description="Where providers should come. Your default is pre-selected on new requests."
        breadcrumb="Account / Addresses"
        actions={<Button size="sm" onClick={() => { setModalError(''); setModal({ mode: 'add' }); }}>Add address</Button>}
      />
      {state === 'loading' && <LoadingBlock title="Loading addresses" />}
      {state === 'error' && <ErrorBlock title="Could not load addresses" description={error} onRetry={refresh} />}
      {state === 'success' && addresses.length === 0 && (
        <EmptyState
          title="No addresses yet"
          description="Add your home or office so providers know where to go."
          action={<Button size="sm" onClick={() => setModal({ mode: 'add' })}>Add your first address</Button>}
        />
      )}
      {state === 'success' && addresses.length > 0 && (
        <ul className="grid gap-3">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {a.label}
                    {a.isDefault && <Badge tone="success">Default</Badge>}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!a.isDefault && (
                    <button type="button" onClick={() => handleDefault(a.id)} className="h-8 rounded border border-stone-300 bg-white px-3 text-[13px] font-medium hover:bg-stone-50">
                      Set default
                    </button>
                  )}
                  <button type="button" onClick={() => { setModalError(''); setModal({ mode: 'edit', address: a }); }} className="h-8 rounded border border-stone-300 bg-white px-3 text-[13px] font-medium hover:bg-stone-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(a)} className="h-8 rounded border border-red-200 bg-white px-3 text-[13px] font-medium text-red-700 hover:bg-red-50">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add address' : `Edit ${modal.address.label}`}
          onClose={() => setModal(null)}
        >
          <AddressForm
            initial={modal.mode === 'edit' ? modal.address : EMPTY_FORM}
            onSubmit={handleSave}
            saving={saving}
            serverError={modalError}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Remove this address?"
          description={`${confirmDelete.label} — ${confirmDelete.line1}, ${confirmDelete.city}. New requests will no longer offer it.`}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <Button tone="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button tone="danger" size="sm" onClick={handleDelete}>Remove address</Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
