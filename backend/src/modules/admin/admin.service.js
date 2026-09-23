const { User } = require('../../models/User');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { Booking } = require('../../models/Booking');
const { ServiceRequest } = require('../../models/ServiceRequest');
const { Invoice } = require('../../models/Invoice');
const { Dispute } = require('../../models/Dispute');
const { SystemConfig } = require('../../models/SystemConfig');
const { AuditLog } = require('../../models/AuditLog');
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
    Invoice.find({}, 'status pricing').lean(),
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
  invoices.forEach((inv) => {
    const total = inv.pricing?.total || 0;
    const fee = inv.pricing?.fee || 0;
    if (inv.status === 'PAID') {
      totalGMV += total;
      totalPlatformRevenue += fee;
      paidInvoiceCount++;
    } else if (inv.status === 'ISSUED' || inv.status === 'DRAFT') {
      pendingRevenue += total;
    }
  });

  // Disputes breakdown
  const disputesByStatus = { OPEN: 0, UNDER_REVIEW: 0, RESOLVED: 0, REJECTED: 0 };
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
      openCount: disputesByStatus.OPEN + disputesByStatus.UNDER_REVIEW,
      byStatus: disputesByStatus,
    },
  };
}

/**
 * Returns operational queues: unassigned bookings, urgent requests, and open disputes.
 */
async function getOperationsQueue() {
  const [unassignedBookings, disputedBookings, urgentRequests] = await Promise.all([
    Booking.find({
      status: { $in: ['CONFIRMED', 'SCHEDULED'] },
      $or: [{ providerId: { $exists: false } }, { providerId: null }],
    })
      .sort({ createdAt: 1 })
      .populate('customerId', 'name email phone')
      .populate('requestId', 'title description urgency')
      .lean(),
    Booking.find({ status: 'DISPUTED' })
      .sort({ updatedAt: -1 })
      .populate('customerId', 'name email phone')
      .populate('providerId')
      .lean(),
    ServiceRequest.find({
      status: { $in: ['OPEN', 'MATCHING'] },
      urgency: { $in: ['EMERGENCY', 'SAME_DAY', 'HIGH'] },
    })
      .sort({ createdAt: 1 })
      .populate('customerId', 'name email')
      .populate('categoryId', 'name')
      .lean(),
  ]);

  return {
    summary: {
      unassignedBookingsCount: unassignedBookings.length,
      disputedBookingsCount: disputedBookings.length,
      urgentRequestsCount: urgentRequests.length,
    },
    unassignedBookings,
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
async function updateFeeConfig(actorId, data) {
  let config = await SystemConfig.findOne({ key: 'PLATFORM_CONFIG' });
  if (!config) {
    config = new SystemConfig({ key: 'PLATFORM_CONFIG' });
  }

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
  return config;
}

/**
 * Perform bulk operations on bookings (e.g. reassign provider, bulk status update).
 */
async function bulkActionBookings(actorId, { bookingIds, action, providerId, note }) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw ApiError.badRequest('INVALID_PAYLOAD', 'bookingIds array is required.');
  }

  const results = [];

  for (const id of bookingIds) {
    const booking = await Booking.findById(id);
    if (!booking) continue;

    if (action === 'ASSIGN_PROVIDER' && providerId) {
      booking.providerId = providerId;
      booking.status = 'PROVIDER_ASSIGNED';
      booking.history.push({
        changedBy: actorId,
        fromStatus: booking.status,
        toStatus: 'PROVIDER_ASSIGNED',
        note: note || 'Provider assigned via Operations bulk action',
      });
      await booking.save();
      results.push({ id, status: 'SUCCESS', newStatus: 'PROVIDER_ASSIGNED' });
    } else if (action === 'CANCEL') {
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date();
      booking.cancellationReason = note || 'Cancelled by Operations';
      booking.history.push({
        changedBy: actorId,
        fromStatus: booking.status,
        toStatus: 'CANCELLED',
        note: note || 'Cancelled via Operations bulk action',
      });
      await booking.save();
      results.push({ id, status: 'SUCCESS', newStatus: 'CANCELLED' });
    }
  }

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
