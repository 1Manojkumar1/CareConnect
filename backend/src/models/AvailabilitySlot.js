const mongoose = require('mongoose');

// Date-specific overrides to the weekly schedule (time off, holidays,
// extra working windows). Weekly hours live on ProviderProfile.
const availabilitySlotSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    kind: { type: String, enum: ['BLOCKED', 'EXTRA'], default: 'BLOCKED' },
    reason: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

availabilitySlotSchema.index({ providerId: 1, startAt: 1, endAt: 1 });

const AvailabilitySlot =
  mongoose.models.AvailabilitySlot || mongoose.model('AvailabilitySlot', availabilitySlotSchema);

module.exports = { AvailabilitySlot };
