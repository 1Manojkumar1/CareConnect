import api from './api';

export async function listRequests(params = {}) {
  const res = await api.get('/service-requests', { params });
  return { items: res.data.data, pagination: res.data.pagination };
}

export async function getRequest(id) {
  const res = await api.get(`/service-requests/${id}`);
  return res.data.data;
}

export async function createRequest(payload) {
  const res = await api.post('/service-requests', payload);
  return res.data.data;
}

export async function updateRequest(id, payload) {
  const res = await api.patch(`/service-requests/${id}`, payload);
  return res.data.data;
}

export async function submitRequest(id) {
  const res = await api.post(`/service-requests/${id}/submit`);
  return res.data.data;
}

export async function cancelRequest(id) {
  const res = await api.post(`/service-requests/${id}/cancel`);
  return res.data.data;
}

export async function classifyRequest(id) {
  const res = await api.post(`/service-requests/${id}/classify`);
  return res.data.data;
}

export async function findProviders(requestId, params = {}) {
  const res = await api.get(`/service-requests/${requestId}/providers`, { params });
  return { providers: res.data.data.providers, meta: res.data.data.meta };
}

export async function addRequestAttachment(id, attachment) {
  const res = await api.post(`/service-requests/${id}/attachments`, attachment);
  return res.data.data;
}

export async function removeRequestAttachment(id, attachmentId) {
  const res = await api.delete(`/service-requests/${id}/attachments/${attachmentId}`);
  return res.data.data;
}

export const TIME_WINDOWS = ['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE'];
export const URGENCIES = ['LOW', 'MEDIUM', 'HIGH'];
