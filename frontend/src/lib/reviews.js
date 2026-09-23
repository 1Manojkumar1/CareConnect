import api from './api';

export async function createReview(payload) {
  const { data } = await api.post('/reviews', payload);
  return data.data;
}

export async function getProviderReviews(providerId, params = {}) {
  const { data } = await api.get(`/reviews/providers/${providerId}/reviews`, { params });
  return data.data;
}

export async function getReview(id) {
  const { data } = await api.get(`/reviews/${id}`);
  return data.data;
}

export async function listReviews(params = {}) {
  const { data } = await api.get('/reviews', { params });
  return data.data;
}

export async function moderateReview(id, payload) {
  const { data } = await api.patch(`/reviews/${id}/moderate`, payload);
  return data.data;
}
