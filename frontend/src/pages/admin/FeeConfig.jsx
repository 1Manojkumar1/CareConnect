import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeeConfig, updateFeeConfig } from '../../lib/admin';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { LoadingBlock, ErrorBlock } from '../../components/ui/States';

export default function FeeConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [commission, setCommission] = useState(10);
  const [minFee, setMinFee] = useState(20);
  const [taxRate, setTaxRate] = useState(8.25);
  const [currency, setCurrency] = useState('USD');
  const [supportEmail, setSupportEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const cfg = await getFeeConfig();
      setConfig(cfg);
      setCommission(cfg.platformCommissionPercent || 10);
      setMinFee(cfg.minimumBookingFee || 20);
      setTaxRate(cfg.taxRatePercent || 8.25);
      setCurrency(cfg.currency || 'USD');
      setSupportEmail(cfg.supportEmail || 'support@careconnect.local');
      setMaintenanceMode(Boolean(cfg.maintenanceMode));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load fee configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateFeeConfig({
        platformCommissionPercent: parseFloat(commission),
        minimumBookingFee: parseFloat(minFee),
        taxRatePercent: parseFloat(taxRate),
        currency: currency.toUpperCase(),
        supportEmail: supportEmail.trim(),
        maintenanceMode,
      });
      setConfig(updated);
      setSuccess('Platform configuration updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock message="Loading fee configuration..." />;
  if (error && !config) return <ErrorBlock title="Config Error" message={error} onRetry={load} />;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="mb-2">
        <Link to="/admin/stats" className="text-sm font-medium text-brand-700 hover:underline">
          ← Back to Platform Stats
        </Link>
      </div>

      <PageHeader
        title="Platform Fee & System Configuration"
        description="Manage marketplace commission rates, minimum booking charges, and system settings."
      />

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
          ✕ {error}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="commission-rate" className="block text-sm font-medium text-ink mb-1">
                Platform Commission Rate (%)
              </label>
              <div className="relative">
                <input
                  id="commission-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-ink pr-8"
                  required
                />
                <span className="absolute right-3 top-2 text-sm text-ink-muted">%</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Platform fee taken from completed booking quotes.</p>
            </div>

            <div>
              <label htmlFor="min-fee" className="block text-sm font-medium text-ink mb-1">
                Minimum Booking Fee (${currency})
              </label>
              <div className="relative">
                <input
                  id="min-fee"
                  type="number"
                  step="1"
                  min="0"
                  value={minFee}
                  onChange={(e) => setMinFee(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-ink pl-7"
                  required
                />
                <span className="absolute left-3 top-2 text-sm text-ink-muted">$</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Floor price for any service request quote.</p>
            </div>

            <div>
              <label htmlFor="tax-rate" className="block text-sm font-medium text-ink mb-1">
                Default Sales Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-ink pr-8"
                />
                <span className="absolute right-3 top-2 text-sm text-ink-muted">%</span>
              </div>
              <p className="text-xs text-ink-muted mt-1">Estimated tax applied to invoice generation.</p>
            </div>

            <div>
              <label htmlFor="currency-select" className="block text-sm font-medium text-ink mb-1">
                Settlement Currency
              </label>
              <input
                id="currency-select"
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-ink uppercase"
                required
              />
              <p className="text-xs text-ink-muted mt-1">Three-letter ISO currency code (USD, CAD, EUR).</p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-4">
            <div>
              <label htmlFor="support-email" className="block text-sm font-medium text-ink mb-1">
                Platform Support Email
              </label>
              <input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-ink"
                required
              />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                id="maintenance-toggle"
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-4 w-4 mt-1 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <label htmlFor="maintenance-toggle" className="text-sm font-medium text-ink cursor-pointer">
                  Platform Maintenance Mode
                </label>
                <p className="text-xs text-ink-muted">
                  Temporarily display a maintenance notice for non-staff users.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-200 flex justify-end gap-3">
            <Link to="/admin/stats">
              <Button type="button" variant="secondary" size="md">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="md" disabled={saving}>
              {saving ? 'Saving Changes…' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
