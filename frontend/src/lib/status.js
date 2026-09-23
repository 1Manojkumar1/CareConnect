// Single source of truth for lifecycle status colors — reuse everywhere.
// Badge.jsx renders these; tables, timelines, and dashboards must use the same map.

export const STATUS_TONE = {
  REQUESTED: 'info',
  QUOTED: 'info',
  BOOKED: 'info',
  SCHEDULED: 'info',
  PROVIDER_ASSIGNED: 'info',
  ON_THE_WAY: 'warning',
  ARRIVED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CUSTOMER_CONFIRMED: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'neutral',
  DISPUTED: 'danger',
  REFUNDED: 'warning',
  PENDING: 'warning',
  CONFIRMED: 'info',
  OPEN: 'warning',
  DRAFT: 'neutral',
  UNDER_REVIEW: 'warning',
  WAITING_FOR_CUSTOMER: 'warning',
  WAITING_FOR_PROVIDER: 'warning',
  RESOLVED: 'success',
  REJECTED: 'danger',
  VERIFIED: 'success',
  ACTIVE: 'success',
  ISSUED: 'info',
  PAID: 'success',
  VOID: 'neutral',
};

export function formatStatus(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
