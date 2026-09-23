const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, required: true },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    target: {
      model: { type: String, required: true, index: true },
      id: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
      label: { type: String, default: '' },
    },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    diff: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // write-only, immutable
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.userId': 1, createdAt: -1 });
auditLogSchema.index({ 'target.model': 1, 'target.id': 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog };
