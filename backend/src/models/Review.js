const mongoose = require('mongoose');

const REVIEW_STATUSES = ['PENDING', 'PUBLISHED', 'FLAGGED'];

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    body: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: REVIEW_STATUSES, default: 'PENDING' },
    publishedAt: { type: Date, default: null },
    moderationNote: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

// One review per booking
reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ providerId: 1, status: 1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

module.exports = { Review, REVIEW_STATUSES };
