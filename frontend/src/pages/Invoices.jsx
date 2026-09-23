import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { listInvoices } from '../lib/invoices';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { STATUS_TONE, formatStatus } from '../lib/status';

export default function Invoices() {
  const user = useSelector((s) => s.auth.user);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInvoices({
        status: statusFilter || undefined,
      });
      setInvoices(res?.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Invoices & Payments
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {user?.role === 'PROVIDER'
              ? 'View billing and customer payment history for completed jobs.'
              : 'Review your service invoices, payment receipts, and outstanding balances.'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        {[
          { label: 'All Invoices', value: '' },
          { label: 'Unpaid (Issued)', value: 'ISSUED' },
          { label: 'Paid', value: 'PAID' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-8">
          <svg
            className="w-12 h-12 mx-auto text-neutral-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            No invoices found
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
            {statusFilter
              ? `There are no ${statusFilter.toLowerCase()} invoices matching your filter.`
              : 'Invoices will be automatically generated once service bookings are confirmed.'}
          </p>
          <div className="mt-6">
            <Link to="/bookings">
              <Button variant="secondary" size="sm">
                View Bookings
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">
                    {user?.role === 'PROVIDER' ? 'Customer' : 'Provider'}
                  </th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      <Link
                        to={`/invoices/${inv._id}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                      {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-800 dark:text-neutral-200">
                      {user?.role === 'PROVIDER'
                        ? inv.customerId?.name || 'Customer'
                        : inv.providerId?.businessName || 'CareConnect Pro'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone={STATUS_TONE[inv.status] || 'neutral'}>
                        {formatStatus(inv.status)}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      ${Number(inv.total || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link to={`/invoices/${inv._id}`}>
                        <Button
                          variant={inv.status === 'ISSUED' && user?.role === 'CUSTOMER' ? 'primary' : 'outline'}
                          size="sm"
                        >
                          {inv.status === 'ISSUED' && user?.role === 'CUSTOMER' ? 'Pay Now' : 'View'}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
