import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { pushToast } from '../../store/uiSlice';
import api, { getApiErrorMessage } from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';

function CategoryForm({ initial, parents, onSubmit, saving, serverError }) {
  const [form, setForm] = useState(initial || { name: '', parentId: '', description: '', sortOrder: 0 });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, parentId: form.parentId || null }); }} className="grid gap-4">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Input label="Name" required value={form.name} onChange={set('name')} />
      <div>
        <label htmlFor="cat-parent" className="cc-label">Parent (empty = top-level)</label>
        <select id="cat-parent" value={form.parentId} onChange={set('parentId')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm">
          <option value="">Top-level category</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <Input label="Description" value={form.description || ''} onChange={set('description')} />
      <div><Button type="submit" loading={saving}>Save category</Button></div>
    </form>
  );
}

function SkillForm({ initial, categories, onSubmit, saving, serverError }) {
  const [form, setForm] = useState(initial || { name: '', categoryId: categories[0]?.id || '', description: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="grid gap-4">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Input label="Name" required value={form.name} onChange={set('name')} />
      <div>
        <label htmlFor="skill-cat" className="cc-label">Category</label>
        <select id="skill-cat" value={form.categoryId} onChange={set('categoryId')} className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Input label="Description" value={form.description || ''} onChange={set('description')} />
      <div><Button type="submit" loading={saving}>Save skill</Button></div>
    </form>
  );
}

async function getCatalog() {
  const [cats, sks] = await Promise.all([api.get('/categories'), api.get('/skills')]);
  return { cats: cats.data.data, sks: sks.data.data };
}

export default function CatalogAdmin() {
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {type:'category'|'skill', initial?}
  const [confirm, setConfirm] = useState(null); // {type, item}
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const dispatch = useDispatch();

  async function load() {
    setState('loading');
    try {
      const { cats, sks } = await getCatalog();
      setCategories(cats);
      setSkills(sks);
      setState('success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load catalog.'));
      setState('error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cats, sks } = await getCatalog();
        if (cancelled) return;
        setCategories(cats);
        setSkills(sks);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load catalog.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tops = categories.filter((c) => !c.parentId);
  const parentName = (id) => categories.find((c) => c.id === id)?.name || '—';

  async function handleSave(form) {
    setSaving(true);
    setModalError('');
    try {
      if (modal.type === 'category') {
        if (modal.initial) await api.patch(`/categories/${modal.initial.id}`, form);
        else await api.post('/categories', form);
      } else {
        if (modal.initial) await api.patch(`/skills/${modal.initial.id}`, form);
        else await api.post('/skills', form);
      }
      setModal(null);
      dispatch(pushToast({ tone: 'success', message: 'Saved.' }));
      load();
    } catch (err) {
      setModalError(getApiErrorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/${confirm.type === 'category' ? 'categories' : 'skills'}/${confirm.item.id}`);
      dispatch(pushToast({ tone: 'success', message: 'Removed.' }));
      setConfirm(null);
      load();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not remove — it may be in use.') }));
    }
  }

  async function toggleActive(kind, item) {
    try {
      await api.patch(`/${kind}/${item.id}`, { isActive: !item.isActive });
      load();
    } catch (err) {
      dispatch(pushToast({ tone: 'danger', message: getApiErrorMessage(err, 'Could not update.') }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Service catalog"
        description="Categories, subcategories, and the skills providers offer."
        breadcrumb="Admin / Catalog"
        actions={
          <>
            <Button size="sm" tone="secondary" onClick={() => { setModalError(''); setModal({ type: 'skill' }); }}>New skill</Button>
            <Button size="sm" onClick={() => { setModalError(''); setModal({ type: 'category' }); }}>New category</Button>
          </>
        }
      />
      {state === 'loading' && <LoadingBlock title="Loading catalog" />}
      {state === 'error' && <ErrorBlock title="Could not load catalog" description={error} onRetry={load} />}
      {state === 'success' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Categories">
            <h2 className="mb-2 text-base">Categories ({categories.length})</h2>
            {categories.length === 0 ? (
              <EmptyState title="No categories" description="Create the first top-level category to get started." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
                    <tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Parent</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 text-right font-medium">Actions</th></tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2 font-medium text-ink">{c.name}</td>
                        <td className="px-4 py-2 text-ink-muted">{c.parentId ? parentName(c.parentId) : '—'}</td>
                        <td className="px-4 py-2"><Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => toggleActive('categories', c)} className="text-[13px] font-medium text-brand-700 hover:underline">{c.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" onClick={() => { setModalError(''); setModal({ type: 'category', initial: c }); }} className="text-[13px] font-medium text-brand-700 hover:underline">Edit</button>
                            <button type="button" onClick={() => setConfirm({ type: 'category', item: c })} className="text-[13px] font-medium text-red-700 hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-label="Skills">
            <h2 className="mb-2 text-base">Skills ({skills.length})</h2>
            {skills.length === 0 ? (
              <EmptyState title="No skills" description="Skills attach to top-level categories." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-stone-200 bg-surface shadow-subtle">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-[13px] text-ink-faint">
                    <tr><th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Category</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 text-right font-medium">Actions</th></tr>
                  </thead>
                  <tbody>
                    {skills.map((s) => (
                      <tr key={s.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2 font-medium text-ink">{s.name}</td>
                        <td className="px-4 py-2 text-ink-muted">{s.category?.name || '—'}</td>
                        <td className="px-4 py-2"><Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => toggleActive('skills', s)} className="text-[13px] font-medium text-brand-700 hover:underline">{s.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" onClick={() => { setModalError(''); setModal({ type: 'skill', initial: { ...s, categoryId: s.category?.id } }); }} className="text-[13px] font-medium text-brand-700 hover:underline">Edit</button>
                            <button type="button" onClick={() => setConfirm({ type: 'skill', item: s })} className="text-[13px] font-medium text-red-700 hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.type === 'category' ? (modal.initial ? 'Edit category' : 'New category') : (modal.initial ? 'Edit skill' : 'New skill')}
          onClose={() => setModal(null)}
        >
          {modal.type === 'category' ? (
            <CategoryForm initial={modal.initial} parents={tops.filter((t) => t.id !== modal.initial?.id)} onSubmit={handleSave} saving={saving} serverError={modalError} />
          ) : (
            <SkillForm initial={modal.initial} categories={tops} onSubmit={handleSave} saving={saving} serverError={modalError} />
          )}
        </Modal>
      )}

      {confirm && (
        <Modal
          title={`Delete ${confirm.type}?`}
          description={`“${confirm.item.name}”. In-use items cannot be deleted — deactivate them instead.`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button tone="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button tone="danger" size="sm" onClick={handleDelete}>Delete</Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
