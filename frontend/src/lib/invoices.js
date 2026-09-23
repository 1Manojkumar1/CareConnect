import api from './api';

export async function listInvoices(params = {}) {
  const { data } = await api.get('/invoices', { params });
  return data.data; // { invoices, pagination }
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}`);
  return data.data;
}

export async function getInvoiceByBooking(bookingId) {
  try {
    const { data } = await api.get(`/invoices/by-booking/${bookingId}`);
    return data.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function payInvoice(id, payload = {}) {
  const { data } = await api.post(`/invoices/${id}/pay`, payload);
  return data.data;
}

export async function generateInvoice(bookingId) {
  const { data } = await api.post(`/invoices/generate/${bookingId}`);
  return data.data;
}
