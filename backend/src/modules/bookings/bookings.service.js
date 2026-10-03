const { Booking, BOOKING_TRANSITIONS, ROLE_ALLOWED_TRANSITIONS } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ServiceRequest } = require('../../models/ServiceRequest');
const { Quote } = require('../../models/Quote');
const { checkConflict } = require('../availability/availability.service');
const { createNotification } = require('../notifications/notifications.service');
const { generateInvoiceForBooking } = require('../invoices/invoices.service');
const { sendUserEmail } = require('../../utils/mailer');
const { recordAuditLog } = require('../../utils/auditLogger');
const { ApiError } = require('../../utils/ApiError');

function isStaff(role) {
  return ['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role);
}

async function getProviderForUser(userId) {
  return ProviderProfile.findOne({ userId });
}

async function createBooking(customerId, payload) {
  let providerId = payload.providerId;
  let requestId = payload.requestId;
  let quoteId = payload.quoteId;
  let startAt = new Date(payload.startAt);
  let endAt = new Date(payload.endAt);
  let pricing = { total: 0, currency: 'USD' };
  let address = {};
  let quote = null;
  let reqDoc = null;

  if (quoteId) {
    quote = await Quote.findById(quoteId).populate('requestId');
    if (!quote) throw ApiError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (String(quote.customerId) !== String(customerId)) {
      throw ApiError.forbidden('FORBIDDEN', 'You can only book your own quotes.');
    }
    if (!['PENDING', 'ACCEPTED'].includes(quote.status)) {
      throw ApiError.unprocessable('QUOTE_NOT_BOOKABLE', `Cannot book quote in ${quote.status} status.`);
    }

    providerId = quote.providerId;
    requestId = quote.requestId?._id;
    pricing = { total: quote.pricing.total, currency: quote.pricing.currency || 'USD' };

    // ServiceRequest addresses use line1/line2/city/postalCode;
    // Booking addresses use street/unit/city/state/postalCode.
    if (quote.requestId?.address) {
      const a = quote.requestId.address;
      address = {
        street: a.line1 || a.street || '',
        unit: a.line2 || a.unit || '',
        city: a.city || '',
        state: a.state || '',
        postalCode: a.postalCode || '',
      };
    }
  }

  if (requestId) {
    reqDoc = await ServiceRequest.findById(requestId);
    if (reqDoc) {
      if (!quoteId && String(reqDoc.customerId) !== String(customerId) && !isStaff(payload.role)) {
        throw ApiError.forbidden('FORBIDDEN', 'Service request belongs to another account.');
      }
      if (!quoteId && reqDoc.address) {
        const a = reqDoc.address;
        address = {
          street: a.line1 || a.street || '',
          unit: a.line2 || a.unit || '',
          city: a.city || '',
          state: a.state || '',
          postalCode: a.postalCode || '',
        };
      }
    }
  }

  if (!providerId) {
    throw ApiError.badRequest('MISSING_PROVIDER', 'A provider is required to create a booking.');
  }

  // Conflict detection runs BEFORE any state is mutated, so a rejected
  // booking never leaves the quote/request half-updated.
  const conflictResult = await checkConflict({ providerId, startAt, endAt });
  if (!conflictResult.available) {
    throw ApiError.conflict(
      conflictResult.conflict?.code || 'BOOKING_CONFLICT',
      conflictResult.conflict?.message || 'Selected time window is not available.'
    );
  }

  // All gates passed — now mutate.
  if (quote && quote.status === 'PENDING') {
    quote.status = 'ACCEPTED';
    quote.decidedAt = new Date();
    await quote.save();
  }

  if (reqDoc) {
    reqDoc.status = 'BOOKED';
    // ServiceRequest history entries use { status, actorId, at }.
    reqDoc.history.push({ status: 'BOOKED', actorId: customerId });
    await reqDoc.save();
  }

  const booking = await Booking.create({
    customerId,
    providerId,
    requestId,
    quoteId,
    startAt,
    endAt,
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    status: 'CONFIRMED',
    pricing,
    address,
    notes: payload.notes || '',
    history: [
      {
        fromStatus: 'INITIAL',
        toStatus: 'CONFIRMED',
        changedBy: customerId,
        note: 'Booking created and confirmed.',
        createdAt: new Date(),
      },
    ],
  });

  recordAuditLog({
    actor: { userId: customerId, role: payload.role || 'CUSTOMER' },
    action: 'BOOKING_CREATED',
    target: { model: 'Booking', id: booking._id, label: `Booking ${booking._id}` },
    after: {
      status: 'CONFIRMED',
      providerId: String(providerId),
      requestId: requestId ? String(requestId) : null,
    },
  });

  // Notifications
  try {
    const provProfile = await ProviderProfile.findById(providerId);
    if (provProfile?.userId) {
      await createNotification({
        userId: provProfile.userId,
        type: 'BOOKING_CREATED',
        title: 'New Booking Scheduled',
        body: `You have a new booking scheduled for ${new Date(startAt).toLocaleDateString()}.`,
        link: `/bookings/${booking._id}`,
        metadata: { bookingId: booking._id },
      });
      sendUserEmail(provProfile.userId, {
        subject: 'New CareConnect booking scheduled',
        text: `You have a new booking scheduled for ${new Date(startAt).toLocaleString()}.\n\nBooking: ${booking._id}`,
      });
    }
    await createNotification({
      userId: customerId,
      type: 'BOOKING_CREATED',
      title: 'Booking Confirmed',
      body: `Your booking has been scheduled for ${new Date(startAt).toLocaleDateString()}.`,
      link: `/bookings/${booking._id}`,
      metadata: { bookingId: booking._id },
    });
  } catch (_err) {
    // Non-blocking notification emission
  }

  return getBooking(customerId, 'CUSTOMER', booking._id);
}

async function rescheduleBooking(customerId, bookingId, { startAt, endAt }) {
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(customerId)) {
    throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');
  }
  if (!['CONFIRMED', 'SCHEDULED'].includes(booking.status)) {
    throw ApiError.unprocessable('INVALID_STATE', `Only CONFIRMED or SCHEDULED bookings can be rescheduled (current: ${booking.status}).`);
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw ApiError.badRequest('INVALID_TIME_RANGE', 'A valid time range with end after start is required.');
  }
  if (start <= new Date()) {
    throw ApiError.unprocessable('INVALID_TIME_RANGE', 'The new start time must be in the future.');
  }

  const conflict = await checkConflict({
    providerId: booking.providerId,
    startAt: start,
    endAt: end,
    excludeBookingId: booking._id,
  });
  if (!conflict.available) {
    throw ApiError.conflict(
      conflict.conflict?.code || 'BOOKING_CONFLICT',
      conflict.conflict?.message || 'The provider is not available in the new time window.'
    );
  }

  const before = { startAt: booking.startAt, endAt: booking.endAt };
  booking.startAt = start;
  booking.endAt = end;
  booking.scheduledStartAt = start;
  booking.scheduledEndAt = end;
  booking.history.push({
    fromStatus: booking.status,
    toStatus: booking.status,
    changedBy: customerId,
    note: `Rescheduled from ${before.startAt.toISOString()} to ${start.toISOString()}.`,
    createdAt: new Date(),
  });
  await booking.save();

  recordAuditLog({
    actor: { userId: customerId, role: 'CUSTOMER' },
    action: 'BOOKING_RESCHEDULED',
    target: { model: 'Booking', id: booking._id, label: `Booking ${booking._id}` },
    before: { startAt: before.startAt, endAt: before.endAt },
    after: { startAt: start, endAt: end },
  });

  try {
    const provProfile = await ProviderProfile.findById(booking.providerId);
    if (provProfile?.userId) {
      await createNotification({
        userId: provProfile.userId,
        type: 'BOOKING_STATUS_CHANGED',
        title: 'Booking Rescheduled',
        body: `A booking was moved to ${start.toLocaleString()}.`,
        link: `/bookings/${booking._id}`,
        metadata: { bookingId: booking._id },
      });
    }
  } catch (_err) {
    // Non-blocking notification emission
  }

  return getBooking(customerId, 'CUSTOMER', booking._id);
}

async function updateStatus(userId, role, bookingId, { toStatus, note = '', reason = '' }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');

  // Access check
  if (role === 'CUSTOMER') {
    if (String(booking.customerId) !== String(userId)) {
      throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');
    }
  } else if (role === 'PROVIDER') {
    const provProfile = await getProviderForUser(userId);
    if (!provProfile || String(booking.providerId) !== String(provProfile._id)) {
      throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not assigned to this provider.');
    }
  } else if (!isStaff(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Unauthorized to modify booking.');
  }

  const currentStatus = booking.status;

  // Check state machine transition validity
  const allowedNext = BOOKING_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    throw ApiError.badRequest(
      'INVALID_TRANSITION',
      `Cannot transition booking from ${currentStatus} to ${toStatus}.`
    );
  }

  // Role authorization on transition
  if (role === 'CUSTOMER') {
    const roleAllowed = ROLE_ALLOWED_TRANSITIONS.CUSTOMER[currentStatus] || [];
    if (!roleAllowed.includes(toStatus)) {
      throw ApiError.forbidden(
        'FORBIDDEN_TRANSITION',
        `Customers cannot change booking from ${currentStatus} to ${toStatus}.`
      );
    }
  } else if (role === 'PROVIDER') {
    const roleAllowed = ROLE_ALLOWED_TRANSITIONS.PROVIDER[currentStatus] || [];
    if (!roleAllowed.includes(toStatus)) {
      throw ApiError.forbidden(
        'FORBIDDEN_TRANSITION',
        `Providers cannot change booking from ${currentStatus} to ${toStatus}.`
      );
    }
  }

  const now = new Date();

  // Timestamp and lifecycle side-effects
  if (toStatus === 'ON_THE_WAY') booking.enRouteAt = now;
  if (toStatus === 'ARRIVED') booking.arrivedAt = now;
  if (toStatus === 'IN_PROGRESS') booking.startedAt = now;
  if (toStatus === 'COMPLETED') booking.completedAt = now;
  if (toStatus === 'CUSTOMER_CONFIRMED') booking.confirmedAt = now;
  if (toStatus === 'CLOSED') {
    booking.closedAt = now;
    // Increment provider's jobsCompleted counter
    await ProviderProfile.findByIdAndUpdate(booking.providerId, {
      $inc: { jobsCompleted: 1 },
    });
  }
  if (toStatus === 'CANCELLED') {
    booking.cancelledAt = now;
    booking.cancellationReason = reason || note || 'Booking cancelled.';
  }

  booking.history.push({
    fromStatus: currentStatus,
    toStatus,
    changedBy: userId,
    note: note || reason || '',
    createdAt: now,
  });

  booking.status = toStatus;
  await booking.save();

  recordAuditLog({
    actor: { userId, role },
    action: 'BOOKING_STATUS_CHANGE',
    target: { model: 'Booking', id: booking._id, label: `Booking ${booking._id}` },
    before: { status: currentStatus },
    after: { status: toStatus },
  });

  // Notifications and Invoice auto-generation
  try {
    const provProfile = await ProviderProfile.findById(booking.providerId);
    const provUserId = provProfile?.userId;

    if (toStatus === 'CUSTOMER_CONFIRMED') {
      // Auto-generate invoice upon customer confirmation
      await generateInvoiceForBooking(booking._id);

      if (provUserId) {
        await createNotification({
          userId: provUserId,
          type: 'BOOKING_STATUS_CHANGED',
          title: 'Customer Confirmed Service',
          body: 'The customer has confirmed completion of the service.',
          link: `/bookings/${booking._id}`,
          metadata: { bookingId: booking._id, status: toStatus },
        });
      }
    } else if (toStatus === 'CANCELLED') {
      const recipientId = role === 'CUSTOMER' ? provUserId : booking.customerId;
      if (recipientId) {
        await createNotification({
          userId: recipientId,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          body: `Booking has been cancelled: ${booking.cancellationReason || 'No reason provided.'}`,
          link: `/bookings/${booking._id}`,
          metadata: { bookingId: booking._id },
        });
        sendUserEmail(recipientId, {
          subject: 'CareConnect booking cancelled',
          text: `Booking ${booking._id} has been cancelled: ${booking.cancellationReason || 'No reason provided.'}`,
        });
      }
    } else {
      const notifyUserId = role === 'PROVIDER' ? booking.customerId : provUserId;
      if (notifyUserId) {
        let statusMsg = `Booking status updated to ${toStatus.replace(/_/g, ' ').toLowerCase()}.`;
        if (toStatus === 'ON_THE_WAY') statusMsg = 'Provider is on the way to your location.';
        if (toStatus === 'ARRIVED') statusMsg = 'Provider has arrived.';
        if (toStatus === 'IN_PROGRESS') statusMsg = 'Service is now in progress.';
        if (toStatus === 'COMPLETED') statusMsg = 'Provider completed the service. Please confirm and review.';

        await createNotification({
          userId: notifyUserId,
          type: 'BOOKING_STATUS_CHANGED',
          title: `Booking Update: ${toStatus.replace(/_/g, ' ')}`,
          body: statusMsg,
          link: `/bookings/${booking._id}`,
          metadata: { bookingId: booking._id, status: toStatus },
        });
      }
    }
  } catch (_err) {
    // Non-blocking notification emission
  }

  return getBooking(userId, role, booking._id);
}

async function assignProvider(staffUserId, staffRole, bookingId, { providerId, note = '' }) {
  if (!isStaff(staffRole)) {
    throw ApiError.forbidden('FORBIDDEN', 'Only operations staff or admins can reassign providers.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');

  const newProvider = await ProviderProfile.findById(providerId).populate('userId');
  if (!newProvider) throw ApiError.notFound('PROVIDER_NOT_FOUND', 'Provider not found.');
  if (newProvider.verificationStatus !== 'VERIFIED' || newProvider.userId?.status !== 'ACTIVE') {
    throw ApiError.unprocessable('PROVIDER_NOT_ELIGIBLE', 'Provider is not active and verified.');
  }

  // Conflict check for new provider
  const conflict = await checkConflict({
    providerId: newProvider._id,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });
  if (!conflict.available) {
    throw ApiError.conflict(
      conflict.conflict?.code || 'PROVIDER_CONFLICT',
      conflict.conflict?.message || 'New provider is not available at the scheduled time.'
    );
  }

  const oldProviderId = booking.providerId;
  booking.providerId = newProvider._id;
  const fromStatus = booking.status;
  if (['CONFIRMED', 'SCHEDULED'].includes(booking.status)) {
    booking.status = 'PROVIDER_ASSIGNED';
  }

  booking.history.push({
    fromStatus,
    toStatus: booking.status,
    changedBy: staffUserId,
    note: `Provider reassigned from ${oldProviderId} to ${newProvider._id}. ${note}`.trim(),
    createdAt: new Date(),
  });

  await booking.save();

  recordAuditLog({
    actor: { userId: staffUserId, role: staffRole },
    action: 'BOOKING_PROVIDER_ASSIGNED',
    target: { model: 'Booking', id: booking._id, label: `Booking ${booking._id}` },
    before: { providerId: String(oldProviderId) },
    after: { providerId: String(newProvider._id) },
  });

  try {
    if (newProvider?.userId) {
      await createNotification({
        userId: newProvider.userId._id || newProvider.userId,
        type: 'BOOKING_STATUS_CHANGED',
        title: 'Assigned to Booking',
        body: 'You have been assigned to a booking by operations staff.',
        link: `/bookings/${booking._id}`,
        metadata: { bookingId: booking._id },
      });
    }
  } catch (_err) {
    // Non-blocking notification
  }

  return getBooking(staffUserId, staffRole, booking._id);
}

async function addEvidence(userId, role, bookingId, { phase, fileUrl, note = '' }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');

  if (role === 'PROVIDER') {
    const provProfile = await getProviderForUser(userId);
    if (!provProfile || String(booking.providerId) !== String(provProfile._id)) {
      throw ApiError.forbidden('FORBIDDEN', 'Only assigned provider can upload job evidence.');
    }
  } else if (!isStaff(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Only assigned provider or staff can upload job evidence.');
  }

  booking.evidence.push({
    phase,
    fileUrl,
    note,
    uploadedBy: userId,
    uploadedAt: new Date(),
  });

  await booking.save();
  return getBooking(userId, role, booking._id);
}

async function getBooking(userId, role, bookingId) {
  const booking = await Booking.findById(bookingId)
    .populate('customerId', 'name email phone')
    .populate({
      path: 'providerId',
      select: 'headline pricing serviceAreas userId ratingAvg jobsCompleted',
      populate: { path: 'userId', select: 'name email phone' },
    })
    .populate({
      path: 'requestId',
      select: 'title description address preferredDate status requiredSkills',
      populate: { path: 'categoryId', select: 'name' },
    })
    .populate('quoteId', 'pricing estimatedDurationMin proposedDate status')
    .populate('history.changedBy', 'name role')
    .populate('evidence.uploadedBy', 'name role');

  if (!booking) throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');

  // Role authorization
  if (role === 'CUSTOMER' && String(booking.customerId?._id || booking.customerId) !== String(userId)) {
    throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');
  }
  if (role === 'PROVIDER') {
    const provProfile = await getProviderForUser(userId);
    if (!provProfile || String(booking.providerId?._id || booking.providerId) !== String(provProfile._id)) {
      throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found.');
    }
  }

  return booking;
}

async function listBookings({ userId, role, status, page = 1, limit = 20 }) {
  const query = {};

  if (role === 'CUSTOMER') {
    query.customerId = userId;
  } else if (role === 'PROVIDER') {
    const provProfile = await getProviderForUser(userId);
    if (!provProfile) return { items: [], pagination: { total: 0, page, limit, pages: 0 } };
    query.providerId = provProfile._id;
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Booking.find(query)
      .sort({ startAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name email phone')
      .populate({
        path: 'providerId',
        select: 'headline pricing serviceAreas userId ratingAvg',
        populate: { path: 'userId', select: 'name' },
      })
      .populate({
        path: 'requestId',
        select: 'title description status',
        populate: { path: 'categoryId', select: 'name' },
      }),
    Booking.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  createBooking,
  updateStatus,
  rescheduleBooking,
  assignProvider,
  addEvidence,
  getBooking,
  listBookings,
};
