import api from './api';

export async function listNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return data.data; // { notifications, pagination, unreadCount }
}

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.data?.unreadCount ?? 0;
}

export async function markAsRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.data;
}

export async function markAllAsRead() {
  const { data } = await api.post('/notifications/mark-all-read');
  return data.data;
}
