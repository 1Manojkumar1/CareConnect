const { Booking, BOOKING_TRANSITIONS, ROLE_ALLOWED_TRANSITIONS } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ServiceRequest } = require('../../models/ServiceRequest');
const { Quote } = require('../../models/Quote');
const { checkConflict } = require('../availability/availability.service');
const { createNotification } = require('../notifications/notifications.service');
const { generateInvoiceForBooking } = require('../invoices/invoices.service');
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

  if (quoteId) {
    const quote = await Quote.findById(quoteId).populate('requestId');
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

    if (quote.requestId?.address) {
      address = {
        street: quote.requestId.address.street || '',
        unit: quote.requestId.address.unit || '',
        city: quote.requestId.address.city || '',
        state: quote.requestId.address.state || '',
        postalCode: quote.requestId.address.postalCode || '',
      };
    }

    if (quote.status === 'PENDING') {
      quote.status = 'ACCEPTED';
      quote.decidedAt = new Date();
      await quote.save();
    }
  }

  if (requestId) {
    const reqDoc = await ServiceRequest.findById(requestId);
    if (reqDoc) {
      if (!quoteId && String(reqDoc.customerId) !== String(customerId) && !isStaff(payload.role)) {
        throw ApiError.forbidden('FORBIDDEN', 'Service request belongs to another account.');
      }
      if (!quoteId && reqDoc.address) {
        address = {
          street: reqDoc.address.street || '',
          unit: reqDoc.address.unit || '',
          city: reqDoc.address.city || '',
          state: reqDoc.address.state || '',
          postalCode: reqDoc.address.postalCode || '',
        };
      }
      reqDoc.status = 'BOOKED';
      reqDoc.history.push({
        status: 'BOOKED',
        changedBy: customerId,
        note: 'Booking finalized.',
      });
      await reqDoc.save();
    }
  }

  if (!providerId) {
    throw ApiError.badRequest('MISSING_PROVIDER', 'A provider is required to create a booking.');
  }

  // Conflict detection
  const conflictResult = await checkConflict({ providerId, startAt, endAt });
  if (!conflictResult.available) {
    throw ApiError.conflict(
      conflictResult.conflict?.code || 'BOOKING_CONFLICT',
      conflictResult.conflict?.message || 'Selected time window is not available.'
    );
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
  if (['CONFIRMED', 'SCHEDULED'].includes(booking.status)) {
    booking.status = 'PROVIDER_ASSIGNED';
  }

  booking.history.push({
    fromStatus: booking.status,
    toStatus: booking.status,
    changedBy: staffUserId,
    note: `Provider reassigned from ${oldProviderId} to ${newProvider._id}. ${note}`.trim(),
    createdAt: new Date(),
  });

  await booking.save();

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
  assignProvider,
  addEvidence,
  getBooking,
  listBookings,
};
