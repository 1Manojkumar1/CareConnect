import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getInvoice, payInvoice } from '../lib/invoices';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { STATUS_TONE, formatStatus } from '../lib/status';

export default function InvoiceDetail() {
  const { id } = useParams();
  const user = useSelector((s) => s.auth.user);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4242');

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoice(id);
      setInvoice(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invoice could not be found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    setError(null);
    try {
      const updated = await payInvoice(id, {
        type: 'CARD',
        brand: cardBrand,
        last4: cardLast4,
      });
      setInvoice(updated);
      setPaySuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-6 rounded-xl border border-red-200 dark:border-red-900 inline-block">
          <h2 className="text-lg font-bold mb-2">Error Loading Invoice</h2>
          <p className="text-sm">{error}</p>
          <div className="mt-4">
            <Link to="/invoices">
              <Button variant="secondary" size="sm">
                Back to Invoices
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCustomer = user?.role === 'CUSTOMER';
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top action bar (hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/invoices"
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 font-medium"
        >
          &larr; Back to Invoices
        </Link>
        <div className="flex items-center gap-3">
          {invoice.bookingId && (
            <Link to={`/bookings/${invoice.bookingId._id || invoice.bookingId}`}>
              <Button variant="outline" size="sm">
                View Booking
              </Button>
            </Link>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Invoice
          </Button>
        </div>
      </div>

      {paySuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm font-medium print:hidden flex items-center justify-between">
          <span>Payment was successful! Your receipt is generated below.</span>
          <button
            onClick={() => setPaySuccess(false)}
            className="text-emerald-700 hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Printable Invoice Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-8 sm:p-12 space-y-8 print:shadow-none print:border-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-primary-600 dark:text-primary-400">
                CareConnect
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              On-Demand Healthcare & In-Home Assistance
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              support@careconnect.local | 1-800-CARE-NOW
            </p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
              {invoice.invoiceNumber}
            </h1>
            <div className="mt-2 flex sm:justify-end">
              <Badge tone={STATUS_TONE[invoice.status] || 'neutral'}>
                {formatStatus(invoice.status)}
              </Badge>
            </div>
            <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-0.5">
              <div>
                <span className="font-semibold">Issued:</span>{' '}
                {new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString()}
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="font-semibold">Due:</span>{' '}
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </div>
              )}
              {isPaid && invoice.paidAt && (
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Paid: {new Date(invoice.paidAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Provider columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
              Billed To
            </h4>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {invoice.customerId?.name || 'CareConnect Customer'}
            </div>
            {invoice.customerId?.email && (
              <div className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">
                {invoice.customerId.email}
              </div>
            )}
            {invoice.customerId?.phone && (
              <div className="text-neutral-600 dark:text-neutral-400 text-xs">
                {invoice.customerId.phone}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
              Service Provider
            </h4>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {invoice.providerId?.businessName || 'CareConnect Certified Professional'}
            </div>
            {invoice.providerId?.phone && (
              <div className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">
                {invoice.providerId.phone}
              </div>
            )}
            {invoice.providerId?.ratingAvg && (
              <div className="text-neutral-600 dark:text-neutral-400 text-xs">
                Rating: {invoice.providerId.ratingAvg.toFixed(1)} / 5.0
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold text-xs">
              <tr>
                <th className="py-3 px-4">Item / Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {invoice.lineItems?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-4 text-neutral-800 dark:text-neutral-200">
                    {item.description}
                  </td>
                  <td className="py-3.5 px-4 text-center text-neutral-600 dark:text-neutral-400">
                    {item.quantity || 1}
                  </td>
                  <td className="py-3.5 px-4 text-right text-neutral-600 dark:text-neutral-400">
                    ${Number(item.unitPrice || item.amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-neutral-900 dark:text-neutral-100">
                    ${Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation summary */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Subtotal</span>
              <span>${Number(invoice.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Tax (8%)</span>
              <span>${Number(invoice.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Platform Fee (5%)</span>
              <span>${Number(invoice.platformFee || 0).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between font-bold text-base text-neutral-900 dark:text-neutral-100">
              <span>Total Amount</span>
              <span className="text-primary-600 dark:text-primary-400">
                ${Number(invoice.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Confirmation Receipt (if PAID) */}
        {isPaid && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-5 text-sm">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Payment Completed
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-neutral-600 dark:text-neutral-400 mt-2">
              <div>
                <span className="block text-neutral-400 dark:text-neutral-500">Method</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {invoice.paymentMethod?.brand || 'Credit Card'} &bull;&bull;&bull;&bull; {invoice.paymentMethod?.last4 || '4242'}
                </span>
              </div>
              <div>
                <span className="block text-neutral-400 dark:text-neutral-500">Transaction ID</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {invoice.paymentMethod?.transactionId || 'TXN-SETTLED'}
                </span>
              </div>
              <div>
                <span className="block text-neutral-400 dark:text-neutral-500">Paid Date</span>
                <span className="text-neutral-900 dark:text-neutral-100">
                  {new Date(invoice.paidAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-neutral-400 dark:text-neutral-500">Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Settled in Full</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Notes:</span> {invoice.notes}
          </div>
        )}
      </div>

      {/* Pay Online Form (Only for customer when ISSUED) */}
      {!isPaid && isCustomer && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-primary-200 dark:border-primary-900/50 shadow-sm p-6 sm:p-8 space-y-6 print:hidden">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Pay Invoice Online
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
              Secure test payment simulated via CareConnect Sandbox.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Card Brand
              </label>
              <select
                value={cardBrand}
                onChange={(e) => setCardBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Amex">American Express</option>
                <option value="Discover">Discover</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Card Ending In (Mock Last 4)
              </label>
              <input
                type="text"
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm font-mono focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button type="submit" variant="primary" loading={paying} className="w-full mt-2">
              Pay ${Number(invoice.total || 0).toFixed(2)} Now
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
