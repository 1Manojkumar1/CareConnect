const mongoose = require('mongoose');

const DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

const DISPUTE_REASONS = [
  'SERVICE_NOT_COMPLETED',
  'POOR_QUALITY',
  'PROVIDER_NO_SHOW',
  'BILLING_ISSUE',
  'DAMAGE_OR_LOSS',
  'SAFETY_CONCERN',
  'FRAUD',
  'OTHER',
];

const disputeEventSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, trim: true, required: true },
    note: { type: String, trim: true, maxlength: 2000, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: DISPUTE_REASONS, required: true },
    description: { type: String, trim: true, maxlength: 3000, required: true },
    evidenceLinks: [{ type: String, trim: true, maxlength: 500 }],
    status: { type: String, enum: DISPUTE_STATUSES, default: 'OPEN' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, trim: true, maxlength: 2000, default: '' },
    resolvedAt: { type: Date, default: null },
    timeline: { type: [disputeEventSchema], default: [] },
  },
  { timestamps: true }
);

disputeSchema.index({ bookingId: 1 });
disputeSchema.index({ raisedBy: 1, createdAt: -1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ assignedTo: 1, status: 1 });

const Dispute = mongoose.models.Dispute || mongoose.model('Dispute', disputeSchema);

module.exports = { Dispute, DISPUTE_STATUSES, DISPUTE_REASONS };
