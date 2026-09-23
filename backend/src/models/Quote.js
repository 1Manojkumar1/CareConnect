const mongoose = require('mongoose');

const QUOTE_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'];

const quoteSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pricing: {
      labor: { type: Number, required: true, min: 0 },
      materials: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      // Authoritative server-computed total. Never accepted from clients.
      total: { type: Number, required: true, min: 0 },
      currency: { type: String, trim: true, maxlength: 3, default: 'USD' },
    },
    estimatedDurationMin: { type: Number, min: 15, max: 20160, default: 60 },
    proposedDate: { type: Date, required: true },
    timeWindow: { type: String, enum: ['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE'], default: 'FLEXIBLE' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: QUOTE_STATUSES, default: 'PENDING' },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quoteSchema.index({ requestId: 1, status: 1 });
quoteSchema.index({ providerId: 1, createdAt: -1 });
quoteSchema.index({ customerId: 1, createdAt: -1 });
// One live quote per provider per request.
quoteSchema.index(
  { requestId: 1, providerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);

module.exports = { Quote, QUOTE_STATUSES };
