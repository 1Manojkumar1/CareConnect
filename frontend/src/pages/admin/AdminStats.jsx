import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../lib/admin';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LoadingBlock, ErrorBlock } from '../../components/ui/States';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load platform statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingBlock message="Loading platform overview..." />;
  if (error) return <ErrorBlock title="Statistics Unavailable" message={error} onRetry={load} />;
  if (!stats) return null;

  const { users, providers, bookings, financials, disputes } = stats;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Platform Overview & Analytics"
          description="Real-time operational metrics, platform health, user activity, and marketplace financials."
        />
        <div className="flex gap-2">
          <Link
            to="/admin/operations"
            className="px-4 py-2 bg-brand-700 text-white rounded-lg text-sm font-medium hover:bg-brand-800 hover:text-white transition-colors shadow-sm"
          >
            Operations Queue →
          </Link>
          <Link
            to="/admin/fee-config"
            className="px-4 py-2 bg-white text-ink border border-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Fee Settings
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Total Users</p>
          <p className="text-2xl font-bold text-ink mt-1">{users.total}</p>
          <p className="text-xs text-emerald-600 mt-1">{users.byStatus.ACTIVE} active</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-teal-600">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Verified Pros</p>
          <p className="text-2xl font-bold text-ink mt-1">{providers.byVerification.VERIFIED}</p>
          <p className="text-xs text-ink-muted mt-1">{providers.acceptingJobsCount} accepting jobs</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-600">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Active Bookings</p>
          <p className="text-2xl font-bold text-ink mt-1">{bookings.activeCount}</p>
          <p className="text-xs text-ink-muted mt-1">{bookings.completedCount} completed</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Gross Volume (GMV)</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">${financials.totalGMV.toLocaleString()}</p>
          <p className="text-xs text-ink-muted mt-1">{financials.paidInvoices} paid invoices</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Platform Revenue</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">${financials.totalPlatformRevenue.toLocaleString()}</p>
          <p className="text-xs text-ink-muted mt-1">Commission collected</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Open Disputes</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{disputes.openCount}</p>
          <p className="text-xs text-ink-muted mt-1">{disputes.byStatus.RESOLVED} resolved</p>
        </Card>
      </div>

      {/* Grid: Breakdown Sections */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Breakdown */}
        <Card title="User Distribution by Role">
          <div className="space-y-3 pt-2">
            {Object.entries(users.byRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{role}</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">{count}</span>
                  <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full"
                      style={{ width: `${users.total ? (count / users.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 text-xs text-ink-muted flex justify-between">
            <span>Suspended: {users.byStatus.SUSPENDED}</span>
            <span>Disabled: {users.byStatus.DISABLED}</span>
          </div>
        </Card>

        {/* Provider Verification & Quality */}
        <Card title="Provider Network Health">
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span>Verified Profiles</span>
              <Badge tone="success">{providers.byVerification.VERIFIED}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Pending Verification</span>
              <Badge tone="warning">{providers.byVerification.PENDING}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Rejected / Inactive</span>
              <Badge tone="neutral">{providers.byVerification.REJECTED}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-stone-100">
              <span className="font-medium text-ink">Average Rating</span>
              <span className="font-bold text-amber-600">★ {providers.avgProviderRating || '5.0'} / 5.0</span>
            </div>
          </div>
        </Card>

        {/* Financial Summary */}
        <Card title="Marketplace Financials">
          <div className="space-y-3 pt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Gross Transaction Volume</span>
              <span className="font-semibold text-ink">${financials.totalGMV.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Platform Commission (Net)</span>
              <span className="font-semibold text-emerald-700">${financials.totalPlatformRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Pending Invoice Amount</span>
              <span className="font-semibold text-amber-600">${financials.pendingRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-stone-100">
              <span className="text-ink-muted">Total Invoices Created</span>
              <span className="font-medium">{financials.totalInvoices}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Status Distribution */}
      <Card title="Booking Lifecycle Breakdown">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
          {Object.entries(bookings.byStatus).map(([st, count]) => (
            <div key={st} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center">
              <p className="text-xs font-semibold text-ink-muted truncate">{st}</p>
              <p className="text-xl font-bold text-ink mt-1">{count}</p>
            </div>
          ))}
          {Object.keys(bookings.byStatus).length === 0 && (
            <p className="col-span-6 text-sm text-ink-muted text-center py-4">No bookings recorded yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
