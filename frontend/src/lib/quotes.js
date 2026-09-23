import api from './api';

export async function listQuotes(params = {}) {
  const res = await api.get('/quotes', { params });
  return { items: res.data.data, pagination: res.data.pagination };
}

export async function createQuote(payload) {
  const res = await api.post('/quotes', payload);
  return res.data.data;
}

export async function updateQuote(id, payload) {
  const res = await api.patch(`/quotes/${id}`, payload);
  return res.data.data;
}

export async function acceptQuote(id) {
  const res = await api.post(`/quotes/${id}/accept`);
  return res.data.data;
}

export async function rejectQuote(id) {
  const res = await api.post(`/quotes/${id}/reject`);
  return res.data.data;
}

export async function withdrawQuote(id) {
  const res = await api.post(`/quotes/${id}/withdraw`);
  return res.data.data;
}

export async function listOpenRequests(params = {}) {
  const res = await api.get('/service-requests/open', { params });
  return { items: res.data.data, pagination: res.data.pagination };
}
