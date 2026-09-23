const mongoose = require('mongoose');

const REQUEST_STATUSES = ['DRAFT', 'OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'CLOSED'];
const URGENCIES = ['LOW', 'MEDIUM', 'HIGH'];
const TIME_WINDOWS = ['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE'];

// Customer-driven transitions. System-driven (→QUOTED/BOOKED/CLOSED) land with later phases.
const REQUEST_TRANSITIONS = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['CANCELLED'],
  QUOTED: ['CANCELLED'],
  BOOKED: [],
  CANCELLED: [],
  CLOSED: [],
};

// Fields the customer may edit while the request is still workable.
const EDITABLE_IN_OPEN = ['description', 'notes', 'urgency', 'budget', 'preferredDate', 'timeWindow', 'address'];

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true, trim: true, maxlength: 100 },
    size: { type: Number, required: true, min: 1, max: 25 * 1024 * 1024 },
    storageKey: { type: String, required: true, trim: true, maxlength: 300 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    addressId: { type: mongoose.Schema.Types.ObjectId, default: null },
    label: { type: String, trim: true, maxlength: 60, default: '' },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    urgency: { type: String, enum: URGENCIES, default: 'MEDIUM' },
    budget: {
      min: { type: Number, min: 0, default: 0 },
      max: { type: Number, min: 0, default: 0 },
    },
    address: { type: addressSnapshotSchema, required: true },
    preferredDate: { type: Date, required: true },
    timeWindow: { type: String, enum: TIME_WINDOWS, default: 'FLEXIBLE' },
    attachments: { type: [attachmentSchema], default: [] },
    // Phase 6 (AI classification) fills this; requests work without it.
    aiClassification: {
      category: { type: String, default: '' },
      subcategory: { type: String, default: '' },
      skills: { type: [String], default: [] },
      urgency: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      status: { type: String, enum: ['PENDING', 'DONE', 'NEEDS_REVIEW', 'FAILED'], default: 'PENDING' },
    },
    requiredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    status: { type: String, enum: REQUEST_STATUSES, default: 'DRAFT' },
    history: {
      type: [
        {
          status: { type: String, required: true },
          actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          at: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ customerId: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });
serviceRequestSchema.index({ categoryId: 1, status: 1 });
serviceRequestSchema.index({ urgency: 1 });

const ServiceRequest =
  mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);

module.exports = { ServiceRequest, REQUEST_STATUSES, URGENCIES, TIME_WINDOWS, REQUEST_TRANSITIONS, EDITABLE_IN_OPEN };
