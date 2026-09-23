import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { EmptyState, SkeletonCard } from '../components/ui/States';
import { listBookings } from '../lib/bookings';
import { listRequests } from '../lib/requests';
import { listInvoices } from '../lib/invoices';
import { getAdminStats } from '../lib/admin';
import api from '../lib/api';

const ROLE_HEADER = {
  CUSTOMER: {
    title: 'Dashboard',
    description: 'Track your active requests, confirmed appointments, and service updates.',
  },
  PROVIDER: {
    title: 'Provider Dashboard',
    description: 'Manage active jobs, upcoming appointments, and service availability.',
  },
  OPERATIONS: {
    title: 'Operations Dashboard',
    description: 'Monitor active bookings, dispatch queues, and platform escalations.',
  },
  SUPPORT: {
    title: 'Support Dashboard',
    description: 'Review open customer inquiries, disputes, and account statuses.',
  },
  ADMIN: {
    title: 'Platform Overview',
    description: 'Platform health, marketplace metrics, user growth, and configuration.',
  },
};

function MetricCard({ title, value, subtitle, tone = 'brand' }) {
  const borderTone = {
    brand: 'border-l-brand-600',
    emerald: 'border-l-emerald-600',
    amber: 'border-l-amber-500',
    sky: 'border-l-sky-600',
  }[tone] || 'border-l-brand-600';

  return (
    <div className={`rounded-xl border border-stone-200 border-l-4 ${borderTone} bg-surface p-4 shadow-subtle transition-shadow hover:shadow-card`}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {subtitle && <p className="mt-1 text-[12px] text-ink-faint truncate">{subtitle}</p>}
    </div>
  );
}

function RecentBookingsList({ bookings, loading, error, role }) {
  if (loading) return <SkeletonCard />;
  if (error) return <p className="text-[13px] text-ink-faint">Could not load bookings.</p>;
  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        title="No active bookings"
        description="Confirmed appointments and upcoming work will appear here."
        action={
          role === 'CUSTOMER' && (
            <Link
              to="/requests/new"
              className="inline-flex h-8 items-center rounded-lg bg-brand-700 px-3 text-[13px] font-medium text-white no-underline hover:bg-brand-800 hover:text-white hover:no-underline"
            >
              Request a service
            </Link>
          )
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {bookings.slice(0, 4).map((b) => (
        <li key={b._id || b.id}>
          <Link
            to={`/bookings/${b._id || b.id}`}
            className="group flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50/60 px-3.5 py-3 no-underline transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:no-underline"
          >
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink group-hover:text-brand-800">
                {b.serviceRequest?.description?.slice(0, 55) ||
                  b.serviceRequest?.categoryId?.name ||
                  b.serviceTitle ||
                  'Service Appointment'}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-faint">
                {b.scheduledStartAt || b.startAt
                  ? new Date(b.scheduledStartAt || b.startAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Date TBD'}{' '}
                {b.timeWindow ? `· ${b.timeWindow.toLowerCase()}` : ''}
              </p>
            </div>
            <Badge status={b.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentRequestsList({ requests, loading, error }) {
  if (loading) return <SkeletonCard />;
  if (error) return <p className="text-[13px] text-ink-faint">Could not load requests.</p>;
  if (!requests || requests.length === 0) {
    return (
      <EmptyState
        title="No open requests"
        description="When you create a service request, it will be tracked here."
        action={
          <Link
            to="/requests/new"
            className="inline-flex h-8 items-center rounded-lg bg-brand-700 px-3 text-[13px] font-medium text-white no-underline hover:bg-brand-800 hover:no-underline"
          >
            New request
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {requests.slice(0, 4).map((r) => (
        <li key={r._id || r.id}>
          <Link
            to={`/requests/${r._id || r.id}`}
            className="group flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50/60 px-3.5 py-3 no-underline transition-all hover:border-brand-200 hover:bg-brand-50/30 hover:no-underline"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13.5px] font-semibold text-ink group-hover:text-brand-800">
                  {r.category?.name || 'Service request'}
                </p>
                {r.urgency === 'HIGH' && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-800">
                    High
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                {r.description}
              </p>
            </div>
            <Badge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const role = user?.role || 'CUSTOMER';
  const header = ROLE_HEADER[role] || ROLE_HEADER.CUSTOMER;

  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [providerProfile, setProviderProfile] = useState(null);
  const [adminStats, setAdminStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(false);
      try {
        if (role === 'CUSTOMER') {
          const [bData, rData, iData] = await Promise.all([
            listBookings({ limit: 5 }).catch(() => ({ items: [] })),
            listRequests({ limit: 5 }).catch(() => ({ items: [] })),
            listInvoices({ limit: 5 }).catch(() => ({ invoices: [] })),
          ]);
          if (cancelled) return;
          setBookings(bData.items || (Array.isArray(bData) ? bData : []));
          setRequests(rData.items || (Array.isArray(rData) ? rData : []));
          setInvoices(iData.invoices || (Array.isArray(iData) ? iData : []));
        } else if (role === 'PROVIDER') {
          const [bData, profData] = await Promise.all([
            listBookings({ limit: 5 }).catch(() => ({ items: [] })),
            api.get('/providers/profile/me').then((r) => r.data.data).catch(() => null),
          ]);
          if (cancelled) return;
          setBookings(bData.items || (Array.isArray(bData) ? bData : []));
          setProviderProfile(profData);
        } else if (['OPERATIONS', 'ADMIN', 'SUPPORT'].includes(role)) {
          const [bData, sData] = await Promise.all([
            listBookings({ limit: 5 }).catch(() => ({ items: [] })),
            getAdminStats().catch(() => null),
          ]);
          if (cancelled) return;
          setBookings(bData.items || (Array.isArray(bData) ? bData : []));
          setAdminStats(sData);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // Derived metrics
  const activeRequests = requests.filter((r) => ['DRAFT', 'OPEN', 'QUOTED'].includes(r.status));
  const activeBookings = bookings.filter((b) => !['CANCELLED', 'CLOSED'].includes(b.status));
  const unpaidInvoices = invoices.filter((i) => i.status === 'ISSUED');

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={header.title}
        description={header.description}
        breadcrumb={
          <span className="flex items-center gap-1.5">
            Dashboard
            <span aria-hidden="true" className="text-stone-300">·</span>
            <Badge tone="info">{role}</Badge>
          </span>
        }
        actions={
          role === 'CUSTOMER' ? (
            <Link
              to="/requests/new"
              className="inline-flex h-9 items-center rounded-lg bg-brand-700 px-4 text-[13.5px] font-semibold text-white no-underline shadow-sm transition-all hover:bg-brand-800 hover:text-white hover:no-underline"
            >
              Request a service
            </Link>
          ) : role === 'PROVIDER' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
                {providerProfile?.acceptingJobs ? 'Accepting jobs' : 'Available'}
              </span>
            </div>
          ) : (
            <Link
              to="/admin/operations"
              className="inline-flex h-9 items-center rounded-lg bg-brand-700 px-4 text-[13.5px] font-semibold text-white no-underline shadow-sm transition-all hover:bg-brand-800 hover:text-white hover:no-underline"
            >
              Operations queue →
            </Link>
          )
        }
        border
      />

      {/* ─── Metric KPI Cards Row ────────────────────────────────────────── */}
      {role === 'CUSTOMER' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Active Requests"
            value={activeRequests.length}
            subtitle={activeRequests.length > 0 ? 'Awaiting quotes or action' : 'None pending'}
            tone="brand"
          />
          <MetricCard
            title="Confirmed Bookings"
            value={activeBookings.length}
            subtitle={activeBookings.length > 0 ? 'Upcoming service scheduled' : 'No upcoming bookings'}
            tone="emerald"
          />
          <MetricCard
            title="Invoices"
            value={unpaidInvoices.length > 0 ? `${unpaidInvoices.length} unpaid` : 'All paid'}
            subtitle={invoices.length > 0 ? `${invoices.length} total generated` : 'No invoices yet'}
            tone={unpaidInvoices.length > 0 ? 'amber' : 'brand'}
          />
          <MetricCard
            title="Saved Addresses"
            value={user?.addresses?.length || 0}
            subtitle={defaultAddress?.city ? `${defaultAddress.label || 'Home'} (${defaultAddress.city})` : 'None added'}
            tone="sky"
          />
        </div>
      )}

      {role === 'PROVIDER' && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Active Jobs"
            value={activeBookings.length}
            subtitle="Scheduled & in progress"
            tone="brand"
          />
          <MetricCard
            title="Jobs Completed"
            value={providerProfile?.jobsCompleted ?? 0}
            subtitle="Successfully delivered"
            tone="emerald"
          />
          <MetricCard
            title="Customer Rating"
            value={providerProfile?.ratingAvg ? `${providerProfile.ratingAvg.toFixed(1)} ★` : '5.0 ★'}
            subtitle={`${providerProfile?.reviewCount || 0} customer reviews`}
            tone="amber"
          />
          <MetricCard
            title="Verification"
            value={providerProfile?.verificationStatus === 'VERIFIED' ? 'Verified Pro' : 'In Review'}
            subtitle={providerProfile?.timezone || 'Austin, TX'}
            tone="sky"
          />
        </div>
      )}

      {['OPERATIONS', 'ADMIN', 'SUPPORT'].includes(role) && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={adminStats?.users?.total ?? '—'}
            subtitle={`${adminStats?.users?.byStatus?.ACTIVE ?? 0} active accounts`}
            tone="brand"
          />
          <MetricCard
            title="Verified Pros"
            value={adminStats?.providers?.byVerification?.VERIFIED ?? '—'}
            subtitle={`${adminStats?.providers?.acceptingJobsCount ?? 0} accepting jobs`}
            tone="emerald"
          />
          <MetricCard
            title="Active Bookings"
            value={adminStats?.bookings?.activeCount ?? activeBookings.length}
            subtitle={`${adminStats?.bookings?.completedCount ?? 0} completed`}
            tone="sky"
          />
          <MetricCard
            title="Gross Volume"
            value={adminStats?.financials?.totalGMV ? `$${adminStats.financials.totalGMV.toLocaleString()}` : '$0'}
            subtitle={`${adminStats?.financials?.paidInvoices ?? 0} paid invoices`}
            tone="amber"
          />
        </div>
      )}

      {/* ─── Main Content Grid ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Bookings */}
          <Card
            title="Recent bookings"
            description="Your scheduled appointments and work in progress."
            actions={
              bookings.length > 0 ? (
                <Link to="/bookings" className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">
                  View all →
                </Link>
              ) : null
            }
          >
            <RecentBookingsList bookings={bookings} loading={loading} error={error} role={role} />
          </Card>

          {/* Customer: Active Requests */}
          {role === 'CUSTOMER' && (
            <Card
              title="Service requests"
              description="Open requests waiting for provider matching or quotes."
              actions={
                requests.length > 0 ? (
                  <Link to="/requests" className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">
                    View all →
                  </Link>
                ) : null
              }
            >
              <RecentRequestsList requests={requests} loading={loading} error={error} />
            </Card>
          )}

          {/* Provider: Schedule snapshot */}
          {role === 'PROVIDER' && (
            <Card title="Work standards" description="Tips for top performance on CareConnect.">
              <div className="grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
                <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-3">
                  <p className="font-semibold text-ink">Prompt Arrival</p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">Arrive within the selected time window to maintain a high customer rating.</p>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-3">
                  <p className="font-semibold text-ink">Photo Evidence</p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">Upload before and after photos to accelerate invoice approval.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Admin / Operations: Quick Platform Summary */}
          {['OPERATIONS', 'ADMIN', 'SUPPORT'].includes(role) && (
            <Card title="Operational priorities" description="Items requiring immediate attention.">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-3.5">
                  <p className="font-semibold text-ink">Dispute Resolution</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {adminStats?.disputes?.openCount
                      ? `${adminStats.disputes.openCount} open dispute(s) pending review.`
                      : 'All disputes are currently resolved.'}
                  </p>
                </div>
                <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-3.5">
                  <p className="font-semibold text-ink">Provider Applications</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {adminStats?.providers?.byVerification?.SUBMITTED
                      ? `${adminStats.providers.byVerification.SUBMITTED} application(s) awaiting verification.`
                      : 'No provider applications pending verification.'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column / Sidebar (1 col) */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card title="Account profile" description="Signed-in credentials & status">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{user?.name || 'Account'}</p>
                  <p className="truncate text-[12.5px] text-ink-muted">{user?.email}</p>
                </div>
              </div>

              <div className="divide-y divide-stone-100 border-t border-stone-100 text-[13px]">
                <div className="flex items-center justify-between py-2">
                  <span className="text-ink-muted">Account role</span>
                  <Badge tone="info">{role}</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-ink-muted">Status</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
                {user?.phone && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-muted">Phone</span>
                    <span className="font-medium text-ink">{user.phone}</span>
                  </div>
                )}
                {defaultAddress && (
                  <div className="py-2">
                    <span className="text-ink-muted">Primary Address</span>
                    <p className="mt-0.5 font-medium text-ink truncate">
                      {defaultAddress.line1}, {defaultAddress.city} {defaultAddress.postalCode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* CareConnect Guarantee Card (Customer) */}
          {role === 'CUSTOMER' && (
            <Card title="CareConnect Guarantee" description="Protected home services">
              <div className="space-y-2.5 text-[13px] text-ink-muted">
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Transparent quotes:</strong> Line-item breakdowns before you book.</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Verified providers:</strong> Background-checked and credentialed pros.</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Job timeline:</strong> Track status, photos, and invoices live.</span>
                </div>
              </div>
            </Card>
          )}

          {/* Provider: Quick Specs */}
          {role === 'PROVIDER' && (
            <Card title="Profile overview" description="Marketplace listing info">
              <div className="space-y-2 text-[13px] text-ink-muted">
                <div className="flex justify-between">
                  <span>Hourly rate</span>
                  <span className="font-semibold text-ink">${providerProfile?.pricing?.hourlyRate || 0}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Visit fee</span>
                  <span className="font-semibold text-ink">${providerProfile?.pricing?.visitFee || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Experience</span>
                  <span className="font-semibold text-ink">{providerProfile?.experienceYears || 0} yrs</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
