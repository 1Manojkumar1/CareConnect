const { User } = require('../../models/User');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { Booking } = require('../../models/Booking');
const { ServiceRequest } = require('../../models/ServiceRequest');
const { Invoice } = require('../../models/Invoice');
const { Dispute } = require('../../models/Dispute');
const { SystemConfig } = require('../../models/SystemConfig');
const { Quote } = require('../../models/Quote');
const { AuditLog } = require('../../models/AuditLog');
const { recordAuditLog } = require('../../utils/auditLogger');
const { ApiError } = require('../../utils/ApiError');

/**
 * Aggregates platform-wide metrics and stats for Operations and Platform Administration.
 */
async function getPlatformStats() {
  const [
    users,
    providers,
    bookings,
    requests,
    invoices,
    disputes,
  ] = await Promise.all([
    User.find({}, 'role status').lean(),
    ProviderProfile.find({}, 'verificationStatus acceptingJobs ratingAvg').lean(),
    Booking.find({}, 'status pricing').lean(),
    ServiceRequest.find({}, 'status urgency').lean(),
    Invoice.find({}, 'status total platformFee').lean(),
    Dispute.find({}, 'status reason').lean(),
  ]);

  // User breakdown
  const usersByRole = { CUSTOMER: 0, PROVIDER: 0, OPERATIONS: 0, SUPPORT: 0, ADMIN: 0 };
  const usersByStatus = { ACTIVE: 0, SUSPENDED: 0, DISABLED: 0 };
  users.forEach((u) => {
    if (usersByRole[u.role] !== undefined) usersByRole[u.role]++;
    if (usersByStatus[u.status] !== undefined) usersByStatus[u.status]++;
  });

  // Provider breakdown
  const providersByVerification = { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
  let acceptingJobsCount = 0;
  let totalRating = 0;
  let ratedProvidersCount = 0;
  providers.forEach((p) => {
    if (providersByVerification[p.verificationStatus] !== undefined) {
      providersByVerification[p.verificationStatus]++;
    }
    if (p.acceptingJobs) acceptingJobsCount++;
    if (p.ratingAvg > 0) {
      totalRating += p.ratingAvg;
      ratedProvidersCount++;
    }
  });
  const avgProviderRating = ratedProvidersCount > 0 ? +(totalRating / ratedProvidersCount).toFixed(2) : 0;

  // Booking breakdown
  const bookingsByStatus = {};
  bookings.forEach((b) => {
    bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;
  });
  const activeBookings = bookings.filter((b) =>
    ['CONFIRMED', 'SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)
  ).length;
  const completedBookings = bookings.filter((b) =>
    ['COMPLETED', 'CUSTOMER_CONFIRMED', 'CLOSED'].includes(b.status)
  ).length;

  // Requests breakdown
  const requestsByStatus = {};
  requests.forEach((r) => {
    requestsByStatus[r.status] = (requestsByStatus[r.status] || 0) + 1;
  });

  // Invoices & Financials
  let totalGMV = 0;
  let totalPlatformRevenue = 0;
  let pendingRevenue = 0;
  let paidInvoiceCount = 0;
  // Invoice stores server-authoritative totals at top level
  // (subtotal/tax/platformFee/total) — there is no `pricing` object.
  invoices.forEach((inv) => {
    const total = inv.total || 0;
    const fee = inv.platformFee || 0;
    if (inv.status === 'PAID') {
      totalGMV += total;
      totalPlatformRevenue += fee;
      paidInvoiceCount++;
    } else if (inv.status === 'ISSUED' || inv.status === 'DRAFT') {
      pendingRevenue += total;
    }
  });

  // Disputes breakdown
  const disputesByStatus = { OPEN: 0, UNDER_REVIEW: 0, WAITING_FOR_CUSTOMER: 0, WAITING_FOR_PROVIDER: 0, RESOLVED: 0, REJECTED: 0 };
  disputes.forEach((d) => {
    if (disputesByStatus[d.status] !== undefined) disputesByStatus[d.status]++;
  });

  return {
    users: {
      total: users.length,
      byRole: usersByRole,
      byStatus: usersByStatus,
    },
    providers: {
      total: providers.length,
      byVerification: providersByVerification,
      acceptingJobsCount,
      avgProviderRating,
    },
    bookings: {
      total: bookings.length,
      activeCount: activeBookings,
      completedCount: completedBookings,
      byStatus: bookingsByStatus,
    },
    requests: {
      total: requests.length,
      byStatus: requestsByStatus,
    },
    financials: {
      totalInvoices: invoices.length,
      paidInvoices: paidInvoiceCount,
      totalGMV: +totalGMV.toFixed(2),
      totalPlatformRevenue: +totalPlatformRevenue.toFixed(2),
      pendingRevenue: +pendingRevenue.toFixed(2),
    },
    disputes: {
      total: disputes.length,
      openCount: disputesByStatus.OPEN + disputesByStatus.UNDER_REVIEW + disputesByStatus.WAITING_FOR_CUSTOMER + disputesByStatus.WAITING_FOR_PROVIDER,
      byStatus: disputesByStatus,
    },
  };
}

/**
 * Returns operational queues: unassigned bookings, unassigned (quoteless)
 * requests, urgent requests, and open disputes.
 *
 * Note: Booking.providerId is required, so "unassigned" work is surfaced at
 * the request level (OPEN requests with no quotes yet) rather than the
 * booking level.
 */
async function getOperationsQueue() {
  const [unassignedBookings, disputedBookings, openRequests, urgentRequests] = await Promise.all([
    Booking.find({
      status: { $in: ['CONFIRMED', 'SCHEDULED'] },
      $or: [{ providerId: { $exists: false } }, { providerId: null }],
    })
      .sort({ createdAt: 1 })
      .populate('customerId', 'name email phone')
      .populate('requestId', 'description urgency status')
      .lean(),
    Booking.find({ status: 'DISPUTED' })
      .sort({ updatedAt: -1 })
      .populate('customerId', 'name email phone')
      .populate('providerId')
      .lean(),
    ServiceRequest.find({ status: 'OPEN' })
      .sort({ createdAt: 1 })
      .populate('customerId', 'name email')
      .populate('categoryId', 'name')
      .lean(),
    ServiceRequest.find({ status: 'OPEN', urgency: 'HIGH' })
      .sort({ createdAt: 1 })
      .populate('customerId', 'name email')
      .populate('categoryId', 'name')
      .lean(),
  ]);

  // Unassigned = OPEN requests that have not received any live quote yet.
  const quotedRequestIds = new Set(
    (await Quote.find({ requestId: { $in: openRequests.map((r) => r._id) } }, 'requestId').lean()).map(
      (q) => String(q.requestId)
    )
  );
  const unassignedRequests = openRequests.filter((r) => !quotedRequestIds.has(String(r._id)));

  return {
    summary: {
      unassignedBookingsCount: unassignedBookings.length,
      unassignedRequestsCount: unassignedRequests.length,
      disputedBookingsCount: disputedBookings.length,
      urgentRequestsCount: urgentRequests.length,
    },
    unassignedBookings,
    unassignedRequests,
    disputedBookings,
    urgentRequests,
  };
}

/**
 * Get or initialize system configuration (fee percentage, commission, etc.).
 */
async function getFeeConfig() {
  let config = await SystemConfig.findOne({ key: 'PLATFORM_CONFIG' });
  if (!config) {
    config = await SystemConfig.create({ key: 'PLATFORM_CONFIG' });
  }
  return config;
}

/**
 * Update system fee configuration.
 */
async function updateFeeConfig(actorId, data, actorRole = 'ADMIN') {
  let config = await SystemConfig.findOne({ key: 'PLATFORM_CONFIG' });
  if (!config) {
    config = new SystemConfig({ key: 'PLATFORM_CONFIG' });
  }

  const before = {
    platformCommissionPercent: config.platformCommissionPercent,
    minimumBookingFee: config.minimumBookingFee,
    taxRatePercent: config.taxRatePercent,
    currency: config.currency,
    maintenanceMode: config.maintenanceMode,
    supportEmail: config.supportEmail,
  };
  if (data.platformCommissionPercent !== undefined) {
    config.platformCommissionPercent = data.platformCommissionPercent;
  }
  if (data.minimumBookingFee !== undefined) {
    config.minimumBookingFee = data.minimumBookingFee;
  }
  if (data.taxRatePercent !== undefined) {
    config.taxRatePercent = data.taxRatePercent;
  }
  if (data.currency !== undefined) {
    config.currency = data.currency.toUpperCase();
  }
  if (data.maintenanceMode !== undefined) {
    config.maintenanceMode = Boolean(data.maintenanceMode);
  }
  if (data.supportEmail !== undefined) {
    config.supportEmail = data.supportEmail.trim();
  }
  config.updatedBy = actorId;

  await config.save();

  recordAuditLog({
    actor: { userId: actorId, role: actorRole },
    action: 'FEE_CONFIG_UPDATED',
    target: { model: 'SystemConfig', id: config._id, label: 'PLATFORM_CONFIG' },
    before,
    after: {
      platformCommissionPercent: config.platformCommissionPercent,
      minimumBookingFee: config.minimumBookingFee,
      taxRatePercent: config.taxRatePercent,
      currency: config.currency,
      maintenanceMode: config.maintenanceMode,
      supportEmail: config.supportEmail,
    },
  });

  return config;
}

/**
 * Perform bulk operations on bookings (e.g. reassign provider, bulk status update).
 */
async function bulkActionBookings(actorId, { bookingIds, action, providerId, note }, actorRole = 'ADMIN') {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw ApiError.badRequest('INVALID_PAYLOAD', 'bookingIds array is required.');
  }

  const results = [];

  for (const id of bookingIds) {
    const booking = await Booking.findById(id);
    if (!booking) continue;

    if (action === 'ASSIGN_PROVIDER' && providerId) {
      const fromStatus = booking.status;
      booking.providerId = providerId;
      booking.status = 'PROVIDER_ASSIGNED';
      booking.history.push({
        changedBy: actorId,
        fromStatus,
        toStatus: 'PROVIDER_ASSIGNED',
        note: note || 'Provider assigned via Operations bulk action',
      });
      await booking.save();
      results.push({ id, status: 'SUCCESS', newStatus: 'PROVIDER_ASSIGNED' });
    } else if (action === 'CANCEL') {
      const fromStatus = booking.status;
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date();
      booking.cancellationReason = note || 'Cancelled by Operations';
      booking.history.push({
        changedBy: actorId,
        fromStatus,
        toStatus: 'CANCELLED',
        note: note || 'Cancelled via Operations bulk action',
      });
      await booking.save();
      results.push({ id, status: 'SUCCESS', newStatus: 'CANCELLED' });
    }
  }

  recordAuditLog({
    actor: { userId: actorId, role: actorRole },
    action: 'BOOKINGS_BULK_ACTION',
    target: { model: 'Booking', id: null, label: `${action} × ${results.length}` },
    after: { action, processed: results.length, results },
  });

  return { processed: results.length, results };
}

/**
 * List immutable audit trail logs with filtering and pagination (ADMIN only).
 */
async function listAuditLogs({ page = 1, limit = 20, action, actorId, targetModel, from, to } = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (actorId) filter['actor.userId'] = actorId;
  if (targetModel) filter['target.model'] = targetModel;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getPlatformStats,
  getOperationsQueue,
  getFeeConfig,
  updateFeeConfig,
  bulkActionBookings,
  listAuditLogs,
};
