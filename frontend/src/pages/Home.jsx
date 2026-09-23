import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const CATEGORIES = [
  { name: 'Plumbing', detail: 'Leaks, fixtures, installations', icon: '🔧' },
  { name: 'Electrical', detail: 'Wiring, lighting, safety checks', icon: '⚡' },
  { name: 'Appliance Repair', detail: 'Refrigerator, AC, TV, washer', icon: '🔌' },
  { name: 'Cleaning', detail: 'Deep clean, move-in, recurring', icon: '✨' },
  { name: 'Carpentry', detail: 'Furniture, doors, fittings', icon: '🪚' },
  { name: 'Painting', detail: 'Interior, exterior, touch-ups', icon: '🎨' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Describe the problem',
    detail: 'Category, photos, preferred address, and ideal time window.',
  },
  {
    step: '02',
    title: 'Get matched',
    detail: 'Verified providers with the right skills, area, and availability.',
  },
  {
    step: '03',
    title: 'Compare quotes',
    detail: 'Transparent breakdowns — labor, materials, platform fee.',
  },
  {
    step: '04',
    title: 'Book and track',
    detail: 'Live job timeline, evidence uploads, invoice, and review.',
  },
];

const TRUST_SIGNALS = [
  { label: 'Verified providers', detail: 'Background-checked and credentialed' },
  { label: 'Transparent pricing', detail: 'Line-item quotes before you commit' },
  { label: 'Lifecycle tracking', detail: 'Every step logged and auditable' },
  { label: 'Dispute resolution', detail: 'Structured support for every issue' },
];

export default function Home() {
  const token = useSelector((s) => s.auth.token);

  const primaryCTA = token
    ? { to: '/requests/new', label: 'Request a service' }
    : { to: '/register', label: 'Get started — it\'s free' };

  return (
    <div className="space-y-14">
      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section className="py-4">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-12">
          {/* Copy */}
          <div className="flex-1 space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-800">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-600" />
              Trusted home services platform
            </div>
            <h1 className="max-w-2xl text-[2.1rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.6rem]">
              Home services you can{' '}
              <span className="text-brand-700">trust</span>.
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-ink-muted">
              Describe your problem, get matched with verified local providers, compare
              transparent quotes, and book with confidence. Every step is tracked and auditable.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={primaryCTA.to}
                className="inline-flex h-11 items-center rounded-lg bg-brand-700 px-5 text-[14px] font-semibold text-white no-underline shadow-sm transition-all hover:bg-brand-800 hover:no-underline hover:shadow-md"
              >
                {primaryCTA.label}
              </Link>
              <Link
                to="/providers"
                className="inline-flex h-11 items-center rounded-lg border border-stone-300 bg-white px-5 text-[14px] font-medium text-ink no-underline transition-colors hover:bg-stone-50 hover:no-underline"
              >
                Browse providers
              </Link>
            </div>
            {/* Social proof strip */}
            <div className="flex flex-wrap gap-5 pt-1">
              {TRUST_SIGNALS.map((t) => (
                <div key={t.label} className="flex items-start gap-2">
                  <svg
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{t.label}</p>
                    <p className="text-[12px] text-ink-faint">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual card — lifecycle preview */}
          <div className="hidden lg:flex w-72 shrink-0 flex-col gap-2">
            {[
              { status: 'OPEN', label: 'Plumbing leak — kitchen sink', time: '2h ago' },
              { status: 'BOOKED', label: 'AC service — annual maintenance', time: 'Tomorrow 10 AM' },
              { status: 'COMPLETED', label: 'Electrical panel inspection', time: 'Yesterday' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-stone-200 bg-surface p-3.5 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink truncate">{item.label}</p>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-1 text-[12px] text-ink-faint">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="mb-5 text-[15px] font-semibold text-ink-muted uppercase tracking-wide">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ step, title, detail }) => (
            <li
              key={step}
              className="relative rounded-xl border border-stone-200 bg-surface px-5 py-5 shadow-subtle transition-shadow hover:shadow-card"
            >
              <span className="text-[11px] font-bold tracking-wider text-brand-500">{step}</span>
              <p className="mt-1.5 text-[14px] font-semibold text-ink">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Popular services ──────────────────────────────────────────────── */}
      <section aria-labelledby="services">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="services" className="text-[15px] font-semibold text-ink-muted uppercase tracking-wide">
            Popular services
          </h2>
          <Link to={token ? '/requests/new' : '/register'} className="text-[13px]">
            Request a service →
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <li
              key={c.name}
              className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-surface px-4 py-4 shadow-subtle transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-card"
            >
              <span aria-hidden="true" className="text-2xl">{c.icon}</span>
              <div>
                <p className="text-[14px] font-semibold text-ink group-hover:text-brand-800">{c.name}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Lifecycle accountability strip ────────────────────────────────── */}
      <section className="rounded-xl border border-brand-100 bg-brand-50/50 px-6 py-6">
        <h2 className="text-[14px] font-semibold text-brand-900 mb-2">
          Built for full accountability
        </h2>
        <p className="text-[13px] text-brand-800/80 leading-relaxed max-w-2xl">
          Every booking follows an explicit lifecycle with audit history. Cancellations,
          disputes, and refunds are handled through defined states — never silent edits.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {['Requested', 'Quoted', 'Booked', 'Scheduled', 'In progress', 'Completed', 'Confirmed', 'Closed'].map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded border border-brand-200 bg-white px-2.5 py-0.5 text-[12px] font-medium text-brand-800"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Inline status pill (avoids importing Badge to keep Home fast) ──────────
function StatusPill({ status }) {
  const map = {
    OPEN: 'bg-sky-50 text-sky-800 border-sky-200',
    BOOKED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    COMPLETED: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  const cls = map[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  return (
    <span className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
