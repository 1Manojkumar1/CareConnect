import api from './api';

export async function createTicket(payload) {
  const { data } = await api.post('/tickets', payload);
  return data.data;
}

export async function listTickets(params = {}) {
  const { data } = await api.get('/tickets', { params });
  return data.data;
}

export async function getTicket(id) {
  const { data } = await api.get(`/tickets/${id}`);
  return data.data;
}

export async function updateTicket(id, payload) {
  const { data } = await api.patch(`/tickets/${id}`, payload);
  return data.data;
}

export async function addTicketMessage(id, payload) {
  const { data } = await api.post(`/tickets/${id}/messages`, payload);
  return data.data;
}

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'];
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const TICKET_CATEGORIES = [
  'BOOKING_ISSUE',
  'PAYMENT_ISSUE',
  'ACCOUNT_ISSUE',
  'PROVIDER_ISSUE',
  'TECHNICAL',
  'OTHER',
];
