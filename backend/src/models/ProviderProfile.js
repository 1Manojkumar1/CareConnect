const mongoose = require('mongoose');

const VERIFICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'];

// Explicit lifecycle — arbitrary jumps are rejected in the service layer.
const VERIFICATION_TRANSITIONS = {
  PENDING: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['UNDER_REVIEW'],
  REJECTED: ['UNDER_REVIEW'],
};

const documentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    mimeType: { type: String, required: true, trim: true, maxlength: 100 },
    size: { type: Number, required: true, min: 1, max: 25 * 1024 * 1024 },
    storageKey: { type: String, required: true, trim: true, maxlength: 300 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DEFAULT_WORKING_HOURS = [
  { dayOfWeek: 1, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
  { dayOfWeek: 2, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
  { dayOfWeek: 3, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
  { dayOfWeek: 4, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
  { dayOfWeek: 5, isOpen: true, ranges: [{ start: '09:00', end: '17:00' }] },
  { dayOfWeek: 6, isOpen: false, ranges: [] },
  { dayOfWeek: 0, isOpen: false, ranges: [] },
];

const workingHoursSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: true },
    ranges: [
      {
        start: { type: String, required: true },
        end: { type: String, required: true },
        _id: false,
      },
    ],
    _id: false,
  }
);

const providerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: { type: String, trim: true, maxlength: 140, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    skillIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
    serviceAreas: {
      type: [
        {
          city: { type: String, required: true, trim: true, maxlength: 100 },
          area: { type: String, trim: true, maxlength: 100, default: '' },
          postalCode: { type: String, trim: true, maxlength: 20, default: '' },
          _id: false,
        },
      ],
      default: [],
    },
    pricing: {
      hourlyRate: { type: Number, min: 0, default: 0 },
      visitFee: { type: Number, min: 0, default: 0 },
      currency: { type: String, trim: true, maxlength: 3, default: 'USD' },
    },
    acceptingJobs: { type: Boolean, default: true },
    timezone: { type: String, trim: true, default: 'UTC' },
    workingHours: {
      type: [workingHoursSchema],
      default: () => JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS)),
    },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING' },
    verificationNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    documents: { type: [documentSchema], default: [] },
    // Denormalized counters maintained by later phases (reviews, jobs).
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    jobsCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

providerProfileSchema.index({ verificationStatus: 1, acceptingJobs: 1 });
providerProfileSchema.index({ 'pricing.hourlyRate': 1 });
providerProfileSchema.index({ ratingAvg: -1 });
providerProfileSchema.index({ skillIds: 1 });
providerProfileSchema.index({ categoryIds: 1 });
providerProfileSchema.index({ 'serviceAreas.city': 1 });

const ProviderProfile =
  mongoose.models.ProviderProfile || mongoose.model('ProviderProfile', providerProfileSchema);

module.exports = { ProviderProfile, VERIFICATION_STATUSES, VERIFICATION_TRANSITIONS, DEFAULT_WORKING_HOURS };

