const { Dispute } = require('../../models/Dispute');
const { Booking } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ApiError } = require('../../utils/ApiError');


const DISPUTE_TRANSITIONS = {
  OPEN: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

/**
 * Raise a new dispute for a booking. Customer or Provider can raise.
 */
async function createDispute(userId, { bookingId, reason, description, evidenceLinks }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('NOT_FOUND', 'Booking not found');

  // booking.customerId is a User ID; booking.providerId is a ProviderProfile ID
  const isCustomer = String(booking.customerId) === String(userId);
  let isProvider = false;
  if (!isCustomer) {
    const profile = await ProviderProfile.findOne({ userId });
    isProvider = profile && String(booking.providerId) === String(profile._id);
  }

  if (!isCustomer && !isProvider) throw ApiError.notFound('NOT_FOUND', 'Booking not found');

  const disputeableStatuses = ['COMPLETED', 'CUSTOMER_CONFIRMED', 'CLOSED', 'DISPUTED', 'IN_PROGRESS'];
  if (!disputeableStatuses.includes(booking.status)) {
    throw ApiError.unprocessable('INVALID_STATE', 'Disputes can only be raised on active or completed bookings');
  }

  const dispute = await Dispute.create({
    bookingId,
    raisedBy: userId,
    reason,
    description,
    evidenceLinks: evidenceLinks || [],
    timeline: [{ actor: userId, action: 'OPENED', note: description }],
  });

  return dispute;
}

/**
 * List disputes — SUPPORT/ADMIN see all, others see own.
 */
async function listDisputes(userId, userRole, { status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;

  const isStaff = ['SUPPORT', 'ADMIN', 'OPERATIONS'].includes(userRole);
  if (!isStaff) filter.raisedBy = userId;

  const skip = (page - 1) * limit;
  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('bookingId', 'status startAt')
      .lean(),
    Dispute.countDocuments(filter),
  ]);
  return { disputes, total, page, limit };
}

/**
 * Get a single dispute by ID.
 */
async function getDispute(disputeId, userId, userRole) {
  const dispute = await Dispute.findById(disputeId)
    .populate('raisedBy', 'name email role')
    .populate('assignedTo', 'name email')
    .populate('bookingId')
    .lean();
  if (!dispute) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');

  const isStaff = ['SUPPORT', 'ADMIN', 'OPERATIONS'].includes(userRole);
  const isOwner = String(dispute.raisedBy._id || dispute.raisedBy) === String(userId);
  if (!isOwner && !isStaff) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');

  return dispute;
}

/**
 * SUPPORT/ADMIN: update dispute status, assign, add note.
 */
async function updateDispute(disputeId, actorId, { status, resolutionNote, assignedTo, note }) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');

  if (status) {
    const allowed = DISPUTE_TRANSITIONS[dispute.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.unprocessable(
        'INVALID_STATE',
        `Cannot transition from ${dispute.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
      );
    }
    dispute.status = status;
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      dispute.resolvedAt = new Date();
      dispute.resolutionNote = resolutionNote || '';
    }
  }

  if (assignedTo !== undefined) dispute.assignedTo = assignedTo || null;

  dispute.timeline.push({
    actor: actorId,
    action: status || 'NOTE',
    note: note || resolutionNote || '',
  });

  await dispute.save();
  return dispute;
}

module.exports = { createDispute, listDisputes, getDispute, updateDispute };
