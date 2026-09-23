import api from './api';

export async function createDispute(payload) {
  const { data } = await api.post('/disputes', payload);
  return data.data;
}

export async function listDisputes(params = {}) {
  const { data } = await api.get('/disputes', { params });
  return data.data;
}

export async function getDispute(id) {
  const { data } = await api.get(`/disputes/${id}`);
  return data.data;
}

export async function updateDispute(id, payload) {
  const { data } = await api.patch(`/disputes/${id}`, payload);
  return data.data;
}
