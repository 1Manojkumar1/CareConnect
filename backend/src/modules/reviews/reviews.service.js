const { Review } = require('../../models/Review');
const { Booking } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ApiError } = require('../../utils/ApiError');

const REVIEWABLE_STATUSES = ['CUSTOMER_CONFIRMED', 'CLOSED'];

/**
 * Customer submits a review for a completed booking.
 */
async function createReview(customerId, { bookingId, rating, body }) {
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customerId) !== String(customerId)) {
    throw ApiError.notFound('NOT_FOUND', 'Booking not found');
  }
  if (!REVIEWABLE_STATUSES.includes(booking.status)) {
    throw ApiError.unprocessable('INVALID_STATE', 'Reviews can only be submitted for CUSTOMER_CONFIRMED or CLOSED bookings');
  }

  const existing = await Review.findOne({ bookingId });
  if (existing) {
    throw ApiError.conflict('DUPLICATE_RESOURCE', 'A review already exists for this booking');
  }

  const review = await Review.create({
    bookingId,
    providerId: booking.providerId,
    customerId,
    rating,
    body: body || '',
    status: 'PUBLISHED',
    publishedAt: new Date(),
  });

  // Recalculate provider rating
  await _recalcProviderRating(booking.providerId);

  return review;
}

/**
 * Get reviews for a provider (public — only PUBLISHED).
 */
async function getProviderReviews(providerId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ providerId, status: 'PUBLISHED' })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name')
      .lean(),
    Review.countDocuments({ providerId, status: 'PUBLISHED' }),
  ]);
  return { reviews, total, page, limit };
}

/**
 * List all reviews (SUPPORT/ADMIN), optionally filtered.
 */
async function listReviews({ status, providerId, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (providerId) filter.providerId = providerId;

  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name email')
      .populate('providerId', 'headline')
      .lean(),
    Review.countDocuments(filter),
  ]);
  return { reviews, total, page, limit };
}

/**
 * SUPPORT/ADMIN: moderate a review (flag or re-publish).
 */
async function moderateReview(reviewId, { status, moderationNote }, _actorId) {
  const review = await Review.findById(reviewId);
  if (!review) throw ApiError.notFound('NOT_FOUND', 'Review not found');

  const allowed = ['PUBLISHED', 'FLAGGED'];
  if (!allowed.includes(status)) {
    throw ApiError.unprocessable('INVALID_STATE', `Status must be one of: ${allowed.join(', ')}`);
  }

  review.status = status;
  review.moderationNote = moderationNote || '';
  if (status === 'PUBLISHED') review.publishedAt = review.publishedAt || new Date();
  await review.save();

  await _recalcProviderRating(review.providerId);

  return review;
}

/**
 * Get a single review (owner or staff).
 */
async function getReview(reviewId, userId, userRole) {
  const review = await Review.findById(reviewId)
    .populate('customerId', 'name email')
    .lean();
  if (!review) throw ApiError.notFound('NOT_FOUND', 'Review not found');

  const isOwner = String(review.customerId._id || review.customerId) === String(userId);
  const isStaff = ['SUPPORT', 'ADMIN', 'OPERATIONS'].includes(userRole);
  if (!isOwner && !isStaff) throw ApiError.notFound('NOT_FOUND', 'Review not found');

  return review;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _recalcProviderRating(providerId) {
  const agg = await Review.aggregate([
    { $match: { providerId: providerId, status: 'PUBLISHED' } },
    { $group: { _id: '$providerId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg.length ? Math.round(agg[0].avg * 10) / 10 : 0;
  const count = agg.length ? agg[0].count : 0;
  await ProviderProfile.findByIdAndUpdate(providerId, { ratingAvg: avg, ratingCount: count });
}

module.exports = { createReview, getProviderReviews, listReviews, moderateReview, getReview };
