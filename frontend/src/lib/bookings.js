import api from './api';

export async function listBookings(params = {}) {
  const { data } = await api.get('/bookings', { params });
  return data.data; // { items, pagination }
}

export async function getBooking(id) {
  const { data } = await api.get(`/bookings/${id}`);
  return data.data;
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload);
  return data.data;
}

export async function updateBookingStatus(id, payload) {
  const { data } = await api.patch(`/bookings/${id}/status`, payload);
  return data.data;
}

export async function assignProvider(id, payload) {
  const { data } = await api.patch(`/bookings/${id}/assign`, payload);
  return data.data;
}

export async function addEvidence(id, payload) {
  const { data } = await api.post(`/bookings/${id}/evidence`, payload);
  return data.data;
}
