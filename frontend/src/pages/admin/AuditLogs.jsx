import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAuditLogs } from '../../lib/admin';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { LoadingBlock, ErrorBlock, EmptyState } from '../../components/ui/States';

const ACTION_COLORS = {
  USER_STATUS_CHANGE: 'warning',
  USER_ROLE_CHANGE: 'danger',
  PROVIDER_VERIFICATION_DECISION: 'info',
  FEE_CONFIG_UPDATE: 'neutral',
  BULK_BOOKING_ACTION: 'danger',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await listAuditLogs({
        page: p,
        limit: 20,
        action: actionFilter || undefined,
      });
      setLogs(data.items || []);
      setPagination(data.pagination);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Platform Audit Trail"
          description="Tamper-resistant, immutable log of administrative actions, role changes, verification decisions, and status updates."
        />
        <div className="flex gap-2">
          <Link
            to="/admin/stats"
            className="px-3 py-1.5 bg-white border border-stone-300 text-ink rounded-lg text-sm hover:bg-stone-50"
          >
            ← Stats Overview
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-stone-200">
        <label htmlFor="action-filter" className="text-sm font-medium text-ink">Filter Action:</label>
        <select
          id="action-filter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-ink"
        >
          <option value="">All Administrative Actions</option>
          <option value="USER_STATUS_CHANGE">User Status Change</option>
          <option value="USER_ROLE_CHANGE">User Role Change</option>
          <option value="PROVIDER_VERIFICATION_DECISION">Provider Verification Decision</option>
          <option value="FEE_CONFIG_UPDATE">Fee Configuration Update</option>
          <option value="BULK_BOOKING_ACTION">Bulk Booking Action</option>
        </select>
        <button
          onClick={() => load(page)}
          className="ml-auto px-3 py-1.5 bg-stone-100 text-ink text-sm rounded-lg hover:bg-stone-200"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Log Table */}
      {loading ? (
        <LoadingBlock message="Retrieving audit records..." />
      ) : error ? (
        <ErrorBlock title="Audit Log Error" message={error} onRetry={() => load(page)} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description="There are no audit log events recorded matching the current filter."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-ink-muted text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={ACTION_COLORS[log.action] || 'neutral'} className="text-xs">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink block">{log.actor?.name || log.actor?.email || 'Admin'}</span>
                      <span className="text-xs text-ink-muted">{log.actor?.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink block">{log.target?.model}</span>
                      <span className="text-xs text-ink-muted">{log.target?.label || log.target?.id?.slice(-8)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Inspect Diff →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-sm text-ink-muted">
              <span>Page {pagination.page} of {pagination.pages} · {pagination.total} records</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={page >= pagination.pages} onClick={() => load(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Diff Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-bold text-ink">{selectedLog.action}</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Logged on {new Date(selectedLog.createdAt).toLocaleString()} by {selectedLog.actor?.name || selectedLog.actor?.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-stone-400 hover:text-ink text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-sm">
              <div>
                <span className="font-semibold text-ink">Target:</span>{' '}
                <span className="text-ink-muted">{selectedLog.target?.model} ({selectedLog.target?.label || selectedLog.target?.id})</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-800 uppercase mb-1">State Before</p>
                  <pre className="text-xs text-red-950 overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : '(none)'}
                  </pre>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-800 uppercase mb-1">State After</p>
                  <pre className="text-xs text-emerald-950 overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : '(none)'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
