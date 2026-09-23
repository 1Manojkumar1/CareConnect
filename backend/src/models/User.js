const mongoose = require('mongoose');

const ROLES = ['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'];
const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'];
const SELF_REGISTER_ROLES = ['CUSTOMER', 'PROVIDER'];

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 60 },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'ACTIVE' },
    phone: { type: String, trim: true, maxlength: 24, default: '' },
    addresses: { type: [addressSchema], default: [] },
    emailVerifiedAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Never leak credentials — the single serialization boundary for users.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    phone: this.phone || '',
    addresses: (this.addresses || []).map((a) => ({
      id: a._id.toString(),
      label: a.label,
      line1: a.line1,
      line2: a.line2 || '',
      city: a.city,
      postalCode: a.postalCode,
      isDefault: Boolean(a.isDefault),
    })),
    emailVerified: Boolean(this.emailVerifiedAt),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = { User, ROLES, ACCOUNT_STATUSES, SELF_REGISTER_ROLES };
