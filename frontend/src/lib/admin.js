import { api } from './api';

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats');
  return data.data;
}

export async function getOperationsQueue() {
  const { data } = await api.get('/admin/operations/queue');
  return data.data;
}

export async function getFeeConfig() {
  const { data } = await api.get('/admin/fee-config');
  return data.data.config;
}

export async function updateFeeConfig(payload) {
  const { data } = await api.put('/admin/fee-config', payload);
  return data.data.config;
}

export async function updateUserRole(userId, role) {
  const { data } = await api.patch(`/users/${userId}/role`, { role });
  return data.data.user;
}

export async function bulkActionBookings(payload) {
  const { data } = await api.post('/admin/bookings/bulk-action', payload);
  return data.data;
}

export async function listAuditLogs(params = {}) {
  const { data } = await api.get('/admin/audit-logs', { params });
  return data.data;
}
