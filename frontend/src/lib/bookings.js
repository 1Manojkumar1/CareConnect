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

export async function rescheduleBooking(id, payload) {
  const { data } = await api.patch(`/bookings/${id}/reschedule`, payload);
  return data.data;
}

export async function addEvidence(id, payload) {
  // Device files go multipart; { phase, fileUrl, note } keeps the URL path.
  let body = payload;
  if (payload && typeof File !== 'undefined' && payload.file instanceof File) {
    body = new FormData();
    body.append('file', payload.file);
    body.append('phase', payload.phase);
    if (payload.note) body.append('note', payload.note);
  }
  const { data } = await api.post(`/bookings/${id}/evidence`, body);
  return data.data;
}
