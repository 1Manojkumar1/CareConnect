const { Dispute } = require('../../models/Dispute');
const { Booking } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { createNotification } = require('../notifications/notifications.service');
const { sendUserEmail } = require('../../utils/mailer');
const { recordAuditLog } = require('../../utils/auditLogger');
const { ApiError } = require('../../utils/ApiError');


const DISPUTE_TRANSITIONS = {
  OPEN: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['WAITING_FOR_CUSTOMER', 'WAITING_FOR_PROVIDER', 'RESOLVED', 'REJECTED'],
  WAITING_FOR_CUSTOMER: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
  WAITING_FOR_PROVIDER: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
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
      .populate('resolvedBy', 'name email')
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
    .populate('resolvedBy', 'name email role')
    .populate('messages.sender', 'name email role')
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
async function updateDispute(disputeId, actorId, { status, resolutionNote, refundAmount, assignedTo, note }, actorRole = 'SUPPORT') {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');

  const fromStatus = dispute.status;

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
      dispute.resolvedBy = actorId;
    }
  }

  // Refunds are part of a resolution only — never standalone.
  if (refundAmount !== undefined && refundAmount !== null && refundAmount !== '') {
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw ApiError.unprocessable('INVALID_REFUND', 'Refund amount must be a non-negative number.');
    }
    if (dispute.status !== 'RESOLVED') {
      throw ApiError.unprocessable('INVALID_REFUND', 'Refund amounts can only be set when resolving a dispute.');
    }
    dispute.refundAmount = Math.round(amount * 100) / 100;
  }

  if (assignedTo !== undefined) dispute.assignedTo = assignedTo || null;

  const newlyAssigned = assignedTo && String(dispute.assignedTo) !== String(actorId);

  dispute.timeline.push({
    actor: actorId,
    action: status || 'NOTE',
    note: note || resolutionNote || '',
  });

  await dispute.save();

  if (status && status !== fromStatus) {
    recordAuditLog({
      actor: { userId: actorId, role: actorRole },
      action: 'DISPUTE_STATUS_CHANGE',
      target: { model: 'Dispute', id: dispute._id, label: `Dispute ${dispute._id}` },
      before: { status: fromStatus },
      after: { status, resolutionNote: dispute.resolutionNote || '', refundAmount: dispute.refundAmount || 0 },
    });
  }

  // First assignment notifies the owning agent (DISPUTE_RAISED was
  // previously defined but never emitted anywhere).
  if (newlyAssigned) {
    try {
      await createNotification({
        userId: dispute.assignedTo,
        type: 'DISPUTE_RAISED',
        title: 'Dispute assigned to you',
        body: `Dispute ${dispute._id} (${dispute.reason}) needs your review.`,
        link: `/disputes/${dispute._id}`,
        metadata: { disputeId: dispute._id },
      });
      sendUserEmail(dispute.assignedTo, {
        subject: 'CareConnect dispute assigned to you',
        text: `Dispute ${dispute._id} (${dispute.reason}) needs your review.`,
      });
    } catch (_err) {
      // Non-blocking notification emission
    }
  }

  if (status === 'RESOLVED') {
    sendUserEmail(dispute.raisedBy, {
      subject: 'Your CareConnect dispute was resolved',
      text: `Your dispute (${dispute.reason}) has been resolved.\n\n${dispute.resolutionNote || ''}${dispute.refundAmount ? `\nRefund amount: $${Number(dispute.refundAmount).toFixed(2)}` : ''}`,
    });
  }

  return dispute;
}

/**
 * Conversation on a dispute: the raiser or any staff member may post
 * while the dispute is not closed out (RESOLVED/REJECTED).
 */
async function addDisputeMessage(disputeId, userId, userRole, { body }) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');

  const staff = ['SUPPORT', 'ADMIN', 'OPERATIONS'].includes(userRole);
  const isOwner = String(dispute.raisedBy) === String(userId);
  if (!isOwner && !staff) throw ApiError.notFound('NOT_FOUND', 'Dispute not found');
  if (['RESOLVED', 'REJECTED'].includes(dispute.status)) {
    throw ApiError.unprocessable('DISPUTE_CLOSED', 'This dispute is closed and no longer accepts messages.');
  }

  dispute.messages.push({ sender: userId, body });
  await dispute.save();

  const updated = await Dispute.findById(dispute._id)
    .populate('raisedBy', 'name email role')
    .populate('assignedTo', 'name email')
    .populate('resolvedBy', 'name email role')
    .populate('messages.sender', 'name email role')
    .populate('bookingId')
    .lean();
  return updated;
}

module.exports = { createDispute, listDisputes, getDispute, updateDispute, addDisputeMessage };
