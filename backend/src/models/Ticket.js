const mongoose = require('mongoose');

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'RESOLVED', 'CLOSED'];

const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const TICKET_CATEGORIES = [
  'BOOKING_ISSUE',
  'PAYMENT_ISSUE',
  'ACCOUNT_ISSUE',
  'PROVIDER_ISSUE',
  'TECHNICAL',
  'OTHER',
];

const TICKET_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_USER', 'RESOLVED', 'CLOSED'],
  WAITING_ON_USER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true, required: true, maxlength: 200 },
    description: { type: String, trim: true, required: true, maxlength: 3000 },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'OTHER' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'MEDIUM' },
    status: { type: String, enum: TICKET_STATUSES, default: 'OPEN' },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    relatedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    messages: { type: [ticketMessageSchema], default: [] },
    resolutionNote: { type: String, trim: true, maxlength: 2000, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ raisedBy: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ priority: 1, status: 1 });

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

module.exports = { Ticket, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, TICKET_TRANSITIONS };
