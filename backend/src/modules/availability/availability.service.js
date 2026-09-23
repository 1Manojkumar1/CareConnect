const { ProviderProfile, DEFAULT_WORKING_HOURS } = require('../../models/ProviderProfile');
const { AvailabilitySlot } = require('../../models/AvailabilitySlot');
const { Booking } = require('../../models/Booking');
const { ApiError } = require('../../utils/ApiError');

function getZonedParts(date, timeZone = 'UTC') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      dayOfWeek: dayMap[map.weekday],
      timeString: `${map.hour}:${map.minute}`,
      dateString: `${map.year}-${map.month}-${map.day}`,
      hour: parseInt(map.hour, 10),
      minute: parseInt(map.minute, 10),
    };
  } catch {
    // Fallback to UTC if timezone is unrecognized
    return {
      dayOfWeek: d.getUTCDay(),
      timeString: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
      dateString: d.toISOString().slice(0, 10),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
    };
  }
}

// Convert "HH:mm" to minutes from midnight
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

// Check whether candidate time [startMin, endMin] is enclosed in any open range
function isEnclosedInRanges(startMin, endMin, ranges = []) {
  for (const r of ranges) {
    const rStart = toMinutes(r.start);
    const rEnd = toMinutes(r.end);
    if (startMin >= rStart && endMin <= rEnd) {
      return true;
    }
  }
  return false;
}

async function getProviderProfileOrThrow(providerId) {
  const profile = await ProviderProfile.findById(providerId).populate('userId', 'name status');
  if (!profile) throw ApiError.notFound('PROVIDER_NOT_FOUND', 'Provider profile not found.');
  return profile;
}

async function getOwnProfileOrThrow(userId) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('PROVIDER_NOT_FOUND', 'Provider profile not found for this account.');
  return profile;
}

/**
 * Check whether a requested time interval [startAt, endAt) conflicts with:
 * 1. Provider availability / accepting status
 * 2. Provider weekly working hours (unless covered by EXTRA slot)
 * 3. Unavailable / BLOCKED periods
 * 4. Existing active Bookings
 *
 * Conflict rule: newStart < existingEnd && newEnd > existingStart
 */
async function checkConflict({ providerId, startAt, endAt, excludeBookingId = null }) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ApiError.badRequest('INVALID_DATE', 'Invalid startAt or endAt date.');
  }
  if (start >= end) {
    throw ApiError.badRequest('INVALID_TIME_RANGE', 'startAt must be strictly earlier than endAt.');
  }

  const profile = await getProviderProfileOrThrow(providerId);

  // Gate 1: Provider must be verified, active, and accepting jobs
  if (profile.userId?.status !== 'ACTIVE') {
    return {
      available: false,
      conflict: {
        code: 'PROVIDER_INACTIVE',
        message: 'Provider account is not currently active.',
      },
    };
  }
  if (profile.verificationStatus !== 'VERIFIED') {
    return {
      available: false,
      conflict: {
        code: 'PROVIDER_NOT_VERIFIED',
        message: 'Provider is not verified on the marketplace.',
      },
    };
  }
  if (!profile.acceptingJobs) {
    return {
      available: false,
      conflict: {
        code: 'PROVIDER_NOT_ACCEPTING',
        message: 'Provider is currently not accepting new jobs.',
      },
    };
  }

  const tz = profile.timezone || 'UTC';
  const startZoned = getZonedParts(start, tz);
  const endZoned = getZonedParts(end, tz);

  // Gate 2: Working hours validation
  const workingHours = profile.workingHours?.length ? profile.workingHours : DEFAULT_WORKING_HOURS;
  const daySchedule = workingHours.find((d) => d.dayOfWeek === startZoned.dayOfWeek);

  let withinRegularHours = false;
  if (daySchedule && daySchedule.isOpen) {
    const startMin = startZoned.hour * 60 + startZoned.minute;
    // Calculate endMin relative to the start day
    let endMin = endZoned.hour * 60 + endZoned.minute;
    if (startZoned.dateString !== endZoned.dateString) {
      // Crossed midnight
      endMin += 24 * 60;
    }
    withinRegularHours = isEnclosedInRanges(startMin, endMin, daySchedule.ranges);
  }

  if (!withinRegularHours) {
    // Check if an EXTRA slot covers this entire requested window
    const extraSlot = await AvailabilitySlot.findOne({
      providerId: profile._id,
      kind: 'EXTRA',
      startAt: { $lte: start },
      endAt: { $gte: end },
    });

    if (!extraSlot) {
      return {
        available: false,
        conflict: {
          code: 'OUTSIDE_WORKING_HOURS',
          message: daySchedule?.isOpen
            ? `Requested time is outside provider's operating hours for ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][startZoned.dayOfWeek]}.`
            : `Provider is closed on ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][startZoned.dayOfWeek]}s.`,
          details: {
            dayOfWeek: startZoned.dayOfWeek,
            isOpen: !!daySchedule?.isOpen,
            ranges: daySchedule?.ranges || [],
            timezone: tz,
          },
        },
      };
    }
  }

  // Gate 3: Unavailable / Blocked periods
  // Overlap condition: startAt < slot.endAt && endAt > slot.startAt
  const blockedSlot = await AvailabilitySlot.findOne({
    providerId: profile._id,
    kind: 'BLOCKED',
    startAt: { $lt: end },
    endAt: { $gt: start },
  });

  if (blockedSlot) {
    return {
      available: false,
      conflict: {
        code: 'PROVIDER_UNAVAILABLE',
        message: blockedSlot.reason
          ? `Provider unavailable: ${blockedSlot.reason}`
          : 'Provider has scheduled time off during this window.',
        details: {
          startAt: blockedSlot.startAt,
          endAt: blockedSlot.endAt,
          reason: blockedSlot.reason,
        },
      },
    };
  }

  // Gate 4: Existing Bookings
  // Overlap condition: startAt < booking.endAt && endAt > booking.startAt
  const bookingQuery = {
    providerId: profile._id,
    status: { $nin: ['CANCELLED', 'DISPUTED'] },
    startAt: { $lt: end },
    endAt: { $gt: start },
  };
  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(bookingQuery);
  if (conflictingBooking) {
    return {
      available: false,
      conflict: {
        code: 'EXISTING_BOOKING',
        message: 'Provider already has a confirmed booking during this period.',
        details: {
          startAt: conflictingBooking.startAt,
          endAt: conflictingBooking.endAt,
        },
      },
    };
  }

  return {
    available: true,
    conflict: null,
  };
}

/**
 * Get available discrete slots for a provider on a specific date.
 */
async function getAvailableSlots(providerId, { date, durationMin = 60 } = {}) {
  const profile = await getProviderProfileOrThrow(providerId);

  if (!profile.acceptingJobs || profile.userId?.status !== 'ACTIVE' || profile.verificationStatus !== 'VERIFIED') {
    return { slots: [], providerId, date, timezone: profile.timezone || 'UTC' };
  }

  const targetDateStr = date || new Date().toISOString().slice(0, 10);
  const tz = profile.timezone || 'UTC';

  // Find day of week for the target date
  const [y, m, d] = targetDateStr.split('-').map((v) => parseInt(v, 10));
  // Construct noon in UTC as reference
  const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const zoned = getZonedParts(refDate, tz);
  const dayOfWeek = zoned.dayOfWeek;

  const workingHours = profile.workingHours?.length ? profile.workingHours : DEFAULT_WORKING_HOURS;
  const daySchedule = workingHours.find((item) => item.dayOfWeek === dayOfWeek);

  if (!daySchedule || !daySchedule.isOpen || !daySchedule.ranges?.length) {
    return { slots: [], providerId, date: targetDateStr, timezone: tz };
  }

  // Find day boundaries in UTC for database queries
  const dayStartUtc = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0));
  const dayEndUtc = new Date(Date.UTC(y, m - 1, d + 1, 23, 59, 59));

  // Query blocked slots and bookings in window
  const [blockedSlots, existingBookings, extraSlots] = await Promise.all([
    AvailabilitySlot.find({
      providerId: profile._id,
      kind: 'BLOCKED',
      startAt: { $lt: dayEndUtc },
      endAt: { $gt: dayStartUtc },
    }),
    Booking.find({
      providerId: profile._id,
      status: { $nin: ['CANCELLED', 'DISPUTED'] },
      startAt: { $lt: dayEndUtc },
      endAt: { $gt: dayStartUtc },
    }),
    AvailabilitySlot.find({
      providerId: profile._id,
      kind: 'EXTRA',
      startAt: { $lt: dayEndUtc },
      endAt: { $gt: dayStartUtc },
    }),
  ]);

  const candidateSlots = [];

  for (const range of daySchedule.ranges) {
    const startMins = toMinutes(range.start);
    const endMins = toMinutes(range.end);

    for (let current = startMins; current + durationMin <= endMins; current += 30) {
      const startHour = Math.floor(current / 60);
      const startMinute = current % 60;
      const endTotalMin = current + durationMin;
      const endHour = Math.floor(endTotalMin / 60);
      const endMinute = endTotalMin % 60;

      // Construct candidate UTC date assuming provider local time
      const slotStart = new Date(Date.UTC(y, m - 1, d, startHour, startMinute, 0));
      const slotEnd = new Date(Date.UTC(y, m - 1, d, endHour, endMinute, 0));

      // Check overlap with blocked slots: newStart < slot.endAt && newEnd > slot.startAt
      const isBlocked = blockedSlots.some(
        (b) => slotStart < b.endAt && slotEnd > b.startAt
      );
      if (isBlocked) continue;

      // Check overlap with existing bookings: newStart < booking.endAt && newEnd > booking.startAt
      const isBooked = existingBookings.some(
        (b) => slotStart < b.endAt && slotEnd > b.startAt
      );
      if (isBooked) continue;

      candidateSlots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
        endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      });
    }
  }

  // Also include any EXTRA slots if configured
  for (const extra of extraSlots) {
    const slotStart = extra.startAt;
    const slotEnd = extra.endAt;
    const isBlocked = blockedSlots.some((b) => slotStart < b.endAt && slotEnd > b.startAt);
    const isBooked = existingBookings.some((b) => slotStart < b.endAt && slotEnd > b.startAt);
    if (!isBlocked && !isBooked) {
      candidateSlots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        isExtra: true,
      });
    }
  }

  return {
    providerId: profile._id.toString(),
    date: targetDateStr,
    timezone: tz,
    slots: candidateSlots,
  };
}

/**
 * Provider self-service: Fetch schedule
 */
async function getProviderSchedule(userId) {
  const profile = await getOwnProfileOrThrow(userId);
  return {
    providerId: profile._id.toString(),
    timezone: profile.timezone || 'UTC',
    acceptingJobs: profile.acceptingJobs !== false,
    workingHours: profile.workingHours?.length ? profile.workingHours : DEFAULT_WORKING_HOURS,
  };
}

/**
 * Public view of provider schedule
 */
async function getPublicProviderSchedule(providerId) {
  const profile = await getProviderProfileOrThrow(providerId);
  return {
    providerId: profile._id.toString(),
    timezone: profile.timezone || 'UTC',
    acceptingJobs: profile.acceptingJobs !== false,
    workingHours: profile.workingHours?.length ? profile.workingHours : DEFAULT_WORKING_HOURS,
  };
}

/**
 * Provider self-service: Update schedule & working hours
 */
async function updateProviderSchedule(userId, { workingHours, timezone, acceptingJobs }) {
  const profile = await getOwnProfileOrThrow(userId);

  if (workingHours) {
    // Validate each day range
    for (const day of workingHours) {
      if (day.ranges?.length) {
        for (const r of day.ranges) {
          if (toMinutes(r.start) >= toMinutes(r.end)) {
            throw ApiError.badRequest(
              'INVALID_TIME_RANGE',
              `Start time (${r.start}) must be strictly earlier than end time (${r.end}).`
            );
          }
        }
      }
    }
    profile.workingHours = workingHours;
  }

  if (timezone !== undefined) {
    profile.timezone = timezone.trim() || 'UTC';
  }

  if (acceptingJobs !== undefined) {
    profile.acceptingJobs = Boolean(acceptingJobs);
  }

  await profile.save();

  return {
    providerId: profile._id.toString(),
    timezone: profile.timezone,
    acceptingJobs: profile.acceptingJobs,
    workingHours: profile.workingHours,
  };
}

/**
 * Provider self-service: Create unavailable slot or extra window
 */
async function createSlot(userId, { startAt, endAt, kind = 'BLOCKED', reason = '' }) {
  const profile = await getOwnProfileOrThrow(userId);

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ApiError.badRequest('INVALID_DATE', 'Invalid date provided.');
  }
  if (start >= end) {
    throw ApiError.badRequest('INVALID_TIME_RANGE', 'startAt must be earlier than endAt.');
  }

  const slot = await AvailabilitySlot.create({
    providerId: profile._id,
    startAt: start,
    endAt: end,
    kind,
    reason: reason.trim(),
  });

  return {
    id: slot._id.toString(),
    providerId: slot.providerId.toString(),
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
    kind: slot.kind,
    reason: slot.reason,
    createdAt: slot.createdAt.toISOString(),
  };
}

/**
 * Provider self-service: Delete unavailable slot
 */
async function deleteSlot(userId, slotId) {
  const profile = await getOwnProfileOrThrow(userId);
  const slot = await AvailabilitySlot.findById(slotId);
  if (!slot) throw ApiError.notFound('SLOT_NOT_FOUND', 'Availability slot not found.');

  if (slot.providerId.toString() !== profile._id.toString()) {
    throw ApiError.forbidden('FORBIDDEN', 'You cannot delete another provider\'s slot.');
  }

  await AvailabilitySlot.findByIdAndDelete(slotId);
  return { id: slotId, deleted: true };
}

/**
 * Provider self-service: List slots (blocked / extra)
 */
async function listSlots(userId, { from, to } = {}) {
  const profile = await getOwnProfileOrThrow(userId);
  const query = { providerId: profile._id };
  if (from || to) {
    query.startAt = {};
    if (from) query.startAt.$gte = new Date(from);
    if (to) query.startAt.$lte = new Date(to);
  }

  const slots = await AvailabilitySlot.find(query).sort({ startAt: 1 });
  return slots.map((s) => ({
    id: s._id.toString(),
    providerId: s.providerId.toString(),
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    kind: s.kind,
    reason: s.reason,
    createdAt: s.createdAt.toISOString(),
  }));
}

/**
 * Atomically reserve a booking slot with conflict check and race-condition prevention.
 */
async function reserveSlot({
  customerId,
  providerId,
  startAt,
  endAt,
  requestId = null,
  quoteId = null,
  notes = '',
  pricing = {},
}) {
  const conflictResult = await checkConflict({ providerId, startAt, endAt });
  if (!conflictResult.available) {
    throw ApiError.conflict(
      conflictResult.conflict.code || 'BOOKING_CONFLICT',
      conflictResult.conflict.message
    );
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  // Concurrency guard: double-check right before insert
  const conflicting = await Booking.findOne({
    providerId,
    status: { $nin: ['CANCELLED', 'DISPUTED'] },
    startAt: { $lt: end },
    endAt: { $gt: start },
  });

  if (conflicting) {
    throw ApiError.conflict(
      'BOOKING_CONFLICT',
      'This slot has just been booked by another customer. Please select another time.'
    );
  }

  const booking = await Booking.create({
    customerId,
    providerId,
    requestId,
    quoteId,
    startAt: start,
    endAt: end,
    notes,
    pricing: {
      total: pricing.total || 0,
      currency: pricing.currency || 'USD',
    },
    status: 'CONFIRMED',
  });

  return {
    id: booking._id.toString(),
    customerId: booking.customerId.toString(),
    providerId: booking.providerId.toString(),
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    pricing: booking.pricing,
    notes: booking.notes,
  };
}

module.exports = {
  checkConflict,
  getAvailableSlots,
  getProviderSchedule,
  getPublicProviderSchedule,
  updateProviderSchedule,
  createSlot,
  deleteSlot,
  listSlots,
  reserveSlot,
  getZonedParts,
};
