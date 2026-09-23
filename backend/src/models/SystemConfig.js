const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'PLATFORM_CONFIG' },
    platformCommissionPercent: { type: Number, required: true, min: 0, max: 100, default: 10 },
    minimumBookingFee: { type: Number, required: true, min: 0, default: 20 },
    taxRatePercent: { type: Number, min: 0, max: 100, default: 8.25 },
    currency: { type: String, default: 'USD', uppercase: true },
    payoutHoldDays: { type: Number, default: 3 },
    maintenanceMode: { type: Boolean, default: false },
    supportEmail: { type: String, default: 'support@careconnect.local' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', systemConfigSchema);

module.exports = { SystemConfig };
