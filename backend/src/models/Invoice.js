const mongoose = require('mongoose');

const { Schema } = mongoose;

const lineItemSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const paymentMethodSchema = new Schema(
  {
    type: { type: String, default: 'CARD' },
    last4: { type: String, default: '4242' },
    brand: { type: String, default: 'Visa' },
    transactionId: { type: String },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
      index: true,
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceRequest',
    },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
    },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PAID', 'VOID'],
      default: 'ISSUED',
      index: true,
    },
    dueDate: {
      type: Date,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: paymentMethodSchema,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ customerId: 1, createdAt: -1 });
invoiceSchema.index({ providerId: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = { Invoice };
