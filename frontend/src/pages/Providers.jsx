import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../lib/api';
import { fetchCategories, topLevel } from '../lib/catalog';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { LoadingBlock, ErrorBlock, EmptyState } from '../components/ui/States';

async function browseProviders(params) {
  const res = await api.get('/providers', { params });
  return { items: res.data.data, pagination: res.data.pagination };
}

export default function Providers() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minHourlyRate, setMinHourlyRate] = useState('');
  const [maxHourlyRate, setMaxHourlyRate] = useState('');
  const [sortBy, setSortBy] = useState('');

  const [applied, setApplied] = useState({
    search: '',
    categoryId: '',
    city: '',
    minRating: '',
    minHourlyRate: '',
    maxHourlyRate: '',
    sortBy: '',
  });

  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (cancelled) return;
        setCategories(topLevel(cats));
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = {};
        if (applied.search) params.search = applied.search;
        if (applied.categoryId) params.categoryId = applied.categoryId;
        if (applied.city) params.city = applied.city;
        if (applied.minRating) params.minRating = applied.minRating;
        if (applied.minHourlyRate) params.minHourlyRate = applied.minHourlyRate;
        if (applied.maxHourlyRate) params.maxHourlyRate = applied.maxHourlyRate;
        if (applied.sortBy) params.sortBy = applied.sortBy;

        const { items: data } = await browseProviders(params);
        if (cancelled) return;
        setItems(data);
        setState('success');
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Could not load providers.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({
      search: search.trim(),
      categoryId,
      city: city.trim(),
      minRating,
      minHourlyRate: minHourlyRate.trim(),
      maxHourlyRate: maxHourlyRate.trim(),
      sortBy,
    });
  };

  const handleReset = () => {
    setSearch('');
    setCategoryId('');
    setCity('');
    setMinRating('');
    setMinHourlyRate('');
    setMaxHourlyRate('');
    setSortBy('');
    setApplied({
      search: '',
      categoryId: '',
      city: '',
      minRating: '',
      minHourlyRate: '',
      maxHourlyRate: '',
      sortBy: '',
    });
  };

  return (
    <div>
      <PageHeader
        title="Verified providers"
        description="Every provider here is verified and currently accepting jobs."
      />
      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-lg border border-stone-200 bg-surface p-4 shadow-subtle"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Keywords</label>
            <input
              aria-label="Search by keywords"
              placeholder="e.g. nurse, pediatric, companion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Service Category</label>
            <select
              aria-label="Filter by category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="">All services</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">City / Location</label>
            <input
              aria-label="Filter by city"
              placeholder="City..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Minimum Rating</label>
            <select
              aria-label="Filter by minimum rating"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="">Any rating</option>
              <option value="4.5">★ 4.5 & up</option>
              <option value="4.0">★ 4.0 & up</option>
              <option value="3.5">★ 3.5 & up</option>
              <option value="3.0">★ 3.0 & up</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Min Price ($/hr)</label>
            <input
              type="number"
              min="0"
              placeholder="Min $/hr"
              value={minHourlyRate}
              onChange={(e) => setMinHourlyRate(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Max Price ($/hr)</label>
            <input
              type="number"
              min="0"
              placeholder="Max $/hr"
              value={maxHourlyRate}
              onChange={(e) => setMaxHourlyRate(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Sort By</label>
            <select
              aria-label="Sort providers"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 w-full rounded border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="">Default (Rating)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Providers</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <Button type="submit">
            Apply Filters
          </Button>
        </div>
      </form>

      {state === 'loading' && <LoadingBlock title="Loading providers" />}
      {state === 'error' && <ErrorBlock title="Could not load providers" description={error} onRetry={() => setApplied({ ...applied })} />}
      {state === 'success' && items.length === 0 && (
        <EmptyState title="No providers found" description="Try broadening your search or clearing filters." />
      )}
      {state === 'success' && items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.id} className="rounded-lg border border-stone-200 bg-surface px-4 py-4 shadow-subtle">
              <p className="flex flex-wrap items-center gap-2">
                <Link to={`/providers/${p.id}`} className="font-semibold text-ink">{p.headline || p.name}</Link>
                <Badge status="VERIFIED" />
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {p.name}
                {p.ratingCount > 0 && ` · ★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})`}
                {` · ${p.experienceYears} yrs · $${p.pricing.hourlyRate}/hr`}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                {(p.skills || []).slice(0, 4).map((s) => s.name).join(' · ')}
              </p>
              <p className="mt-2">
                <Link to={`/providers/${p.id}`} className="text-sm font-medium">View profile</Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
