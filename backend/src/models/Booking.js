const mongoose = require('mongoose');

const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SCHEDULED',
  'PROVIDER_ASSIGNED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CUSTOMER_CONFIRMED',
  'CLOSED',
  'CANCELLED',
  'DISPUTED',
  'REFUNDED',
];

const BOOKING_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SCHEDULED', 'PROVIDER_ASSIGNED', 'CANCELLED'],
  SCHEDULED: ['PROVIDER_ASSIGNED', 'ON_THE_WAY', 'CANCELLED'],
  PROVIDER_ASSIGNED: ['ON_THE_WAY', 'SCHEDULED', 'CANCELLED'],
  ON_THE_WAY: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['CUSTOMER_CONFIRMED', 'DISPUTED', 'CLOSED'],
  CUSTOMER_CONFIRMED: ['CLOSED', 'DISPUTED'],
  DISPUTED: ['IN_PROGRESS', 'COMPLETED', 'CLOSED', 'REFUNDED', 'CANCELLED'],
  CLOSED: ['DISPUTED', 'REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

const ROLE_ALLOWED_TRANSITIONS = {
  CUSTOMER: {
    PENDING: ['CANCELLED'],
    CONFIRMED: ['CANCELLED'],
    SCHEDULED: ['CANCELLED'],
    PROVIDER_ASSIGNED: ['CANCELLED'],
    ON_THE_WAY: ['CANCELLED'],
    ARRIVED: ['CANCELLED'],
    COMPLETED: ['CUSTOMER_CONFIRMED', 'DISPUTED'],
    CUSTOMER_CONFIRMED: ['DISPUTED'],
  },
  PROVIDER: {
    CONFIRMED: ['SCHEDULED', 'PROVIDER_ASSIGNED'],
    SCHEDULED: ['PROVIDER_ASSIGNED', 'ON_THE_WAY'],
    PROVIDER_ASSIGNED: ['ON_THE_WAY'],
    ON_THE_WAY: ['ARRIVED'],
    ARRIVED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
    COMPLETED: ['DISPUTED'],
  },
};

const evidenceSchema = new mongoose.Schema(
  {
    phase: { type: String, enum: ['BEFORE', 'DURING', 'AFTER'], required: true },
    fileUrl: { type: String, required: true, trim: true, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: 'CONFIRMED' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    scheduledStartAt: { type: Date },
    scheduledEndAt: { type: Date },
    enRouteAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    pricing: {
      total: { type: Number, default: 0, min: 0 },
      currency: { type: String, trim: true, maxlength: 3, default: 'USD' },
    },
    address: {
      street: { type: String, trim: true, default: '' },
      unit: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
    },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: '' },
    history: { type: [historySchema], default: [] },
    evidence: { type: [evidenceSchema], default: [] },
  },
  { timestamps: true }
);

bookingSchema.index({ providerId: 1, startAt: 1, endAt: 1, status: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ requestId: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

module.exports = {
  Booking,
  BOOKING_STATUSES,
  BOOKING_TRANSITIONS,
  ROLE_ALLOWED_TRANSITIONS,
};
