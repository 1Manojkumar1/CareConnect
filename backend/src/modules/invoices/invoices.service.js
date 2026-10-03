const { Invoice } = require('../../models/Invoice');
const { Booking } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { SystemConfig } = require('../../models/SystemConfig');
const { createNotification } = require('../notifications/notifications.service');
const { sendUserEmail } = require('../../utils/mailer');
const { recordAuditLog } = require('../../utils/auditLogger');
const { ApiError } = require('../../utils/ApiError');

function isStaff(role) {
  return ['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role);
}

async function getProviderForUser(userId) {
  return ProviderProfile.findOne({ userId });
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  const seq = (count + 1).toString().padStart(4, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `INV-${year}-${seq}-${rand}`;
}

/**
 * Generates an itemized invoice for a booking. Idempotent.
 */
async function generateInvoiceForBooking(bookingId, actor = null) {
  const booking = await Booking.findById(bookingId)
    .populate('requestId')
    .populate('quoteId');

  if (!booking) {
    throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found for invoice generation.');
  }

  // Manual generation is privileged: the assigned provider or staff only.
  // Internal lifecycle calls (e.g. customer confirmation) pass no actor.
  // Authorization runs before the idempotency check so an existing invoice
  // is never leaked to a caller who may not see it.
  if (actor) {
    const staff = ['OPERATIONS', 'ADMIN'].includes(actor.role);
    let ownsBooking = false;
    if (actor.role === 'PROVIDER') {
      const profile = await ProviderProfile.findOne({ userId: actor.userId });
      ownsBooking = !!profile && String(booking.providerId) === String(profile._id);
    }
    if (!staff && !ownsBooking) {
      throw ApiError.forbidden('FORBIDDEN', 'Only the assigned provider or staff can generate invoices.');
    }
  }

  const existing = await Invoice.findOne({ bookingId })
    .populate('customerId', 'name email phone')
    .populate('providerId', 'businessName phone ratingAvg')
    .populate('bookingId');
  if (existing) return existing;
  // Financials follow the live platform fee configuration (admin-managed
  // pricing rules) — never hardcoded, never client-supplied.
  const feeConfig = (await SystemConfig.findOne({ key: 'PLATFORM_CONFIG' }).lean()) || {};
  const taxRate = Number(feeConfig.taxRatePercent ?? 8.25) / 100;
  const commissionRate = Number(feeConfig.platformCommissionPercent ?? 10) / 100;
  const subtotal = Number(booking.pricing?.total || 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const platformFee = Math.round(subtotal * commissionRate * 100) / 100;
  const total = Math.round((subtotal + tax + platformFee) * 100) / 100;

  const lineItems = [
    {
      description: booking.requestId?.description
        ? `Service: ${String(booking.requestId.description).slice(0, 120)}`
        : 'CareConnect Home Service',
      amount: subtotal,
      quantity: 1,
      unitPrice: subtotal,
    },
  ];

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    bookingId: booking._id,
    customerId: booking.customerId,
    providerId: booking.providerId,
    requestId: booking.requestId?._id,
    quoteId: booking.quoteId?._id,
    lineItems,
    subtotal,
    tax,
    platformFee,
    total,
    currency: booking.pricing?.currency || 'USD',
    status: 'ISSUED',
    issuedAt: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    notes: 'Thank you for choosing CareConnect.',
  });

  // Notify customer
  await createNotification({
    userId: booking.customerId,
    type: 'INVOICE_ISSUED',
    title: 'New Invoice Issued',
    body: `Invoice ${invoiceNumber} for $${total.toFixed(2)} has been issued.`,
    link: `/invoices/${invoice._id}`,
    metadata: { invoiceId: invoice._id, bookingId: booking._id },
  });
  sendUserEmail(booking.customerId, {
    subject: `CareConnect invoice ${invoiceNumber} — $${total.toFixed(2)}`,
    text: `Invoice ${invoiceNumber} for $${total.toFixed(2)} has been issued and is due ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'soon'}.`,
  });

  recordAuditLog({
    // Internal lifecycle calls (customer confirmation) carry no actor;
    // attribute them to the booking's customer, who triggered generation.
    actor: actor
      ? { userId: actor.userId, role: actor.role }
      : { userId: booking.customerId, role: 'CUSTOMER' },
    action: 'INVOICE_GENERATED',
    target: { model: 'Invoice', id: invoice._id, label: invoiceNumber },
    after: { total, status: 'ISSUED', bookingId: String(booking._id) },
  });

  return Invoice.findById(invoice._id)
    .populate('customerId', 'name email phone')
    .populate('providerId', 'businessName phone ratingAvg')
    .populate('bookingId');
}

/**
 * Retrieves a single invoice with role authorization.
 */
async function getInvoice(userId, role, invoiceId) {
  const invoice = await Invoice.findById(invoiceId)
    .populate('customerId', 'name email phone')
    .populate('providerId', 'businessName phone ratingAvg userId')
    .populate('bookingId');

  if (!invoice) {
    throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found.');
  }

  // Authorization check
  if (role === 'CUSTOMER') {
    const custId = invoice.customerId?._id || invoice.customerId;
    if (String(custId) !== String(userId)) {
      throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found.');
    }
  } else if (role === 'PROVIDER') {
    const prov = await getProviderForUser(userId);
    const provId = invoice.providerId?._id || invoice.providerId;
    if (!prov || String(provId) !== String(prov._id)) {
      throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found.');
    }
  } else if (!isStaff(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Unauthorized to view this invoice.');
  }

  return invoice;
}

/**
 * Retrieves an invoice by bookingId with authorization.
 */
async function getInvoiceByBooking(userId, role, bookingId) {
  const invoice = await Invoice.findOne({ bookingId })
    .populate('customerId', 'name email phone')
    .populate('providerId', 'businessName phone ratingAvg userId')
    .populate('bookingId');

  if (!invoice) {
    throw ApiError.notFound('INVOICE_NOT_FOUND', 'No invoice found for this booking.');
  }

  if (role === 'CUSTOMER') {
    const custId = invoice.customerId?._id || invoice.customerId;
    if (String(custId) !== String(userId)) {
      throw ApiError.notFound('INVOICE_NOT_FOUND', 'No invoice found for this booking.');
    }
  } else if (role === 'PROVIDER') {
    const prov = await getProviderForUser(userId);
    const provId = invoice.providerId?._id || invoice.providerId;
    if (!prov || String(provId) !== String(prov._id)) {
      throw ApiError.notFound('INVOICE_NOT_FOUND', 'No invoice found for this booking.');
    }
  } else if (!isStaff(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Unauthorized to view this invoice.');
  }

  return invoice;
}

/**
 * Lists invoices according to role and query filters.
 */
async function listInvoices(userId, role, { status, limit = 20, page = 1 } = {}) {
  const query = {};

  if (role === 'CUSTOMER') {
    query.customerId = userId;
  } else if (role === 'PROVIDER') {
    const prov = await getProviderForUser(userId);
    if (!prov) {
      return { invoices: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
    query.providerId = prov._id;
  } else if (!isStaff(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Unauthorized to list invoices.');
  }

  if (status) {
    query.status = status;
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('customerId', 'name email phone')
      .populate('providerId', 'businessName phone ratingAvg')
      .populate('bookingId', 'status scheduledStartAt scheduledEndAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Pays an invoice (mock payment gateway).
 */
async function payInvoice(userId, role, invoiceId, paymentDetails = {}) {
  const invoice = await Invoice.findById(invoiceId).populate('providerId');
  if (!invoice) {
    throw ApiError.notFound('INVOICE_NOT_FOUND', 'Invoice not found.');
  }

  if (role === 'CUSTOMER' && String(invoice.customerId) !== String(userId)) {
    throw ApiError.forbidden('FORBIDDEN', 'Cannot pay an invoice for another customer.');
  } else if (!['CUSTOMER', ...['OPERATIONS', 'SUPPORT', 'ADMIN']].includes(role)) {
    throw ApiError.forbidden('FORBIDDEN', 'Unauthorized to settle invoices.');
  }

  if (invoice.status === 'PAID') {
    throw ApiError.unprocessable('INVOICE_ALREADY_PAID', 'This invoice is already paid.');
  }

  if (invoice.status === 'VOID') {
    throw ApiError.unprocessable('INVOICE_VOID', 'Cannot pay a void invoice.');
  }

  const prevStatus = invoice.status;
  invoice.status = 'PAID';
  invoice.paidAt = new Date();  invoice.paymentMethod = {
    type: paymentDetails.type || 'CARD',
    last4: paymentDetails.last4 || '4242',
    brand: paymentDetails.brand || 'Visa',
    transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  await invoice.save();

  recordAuditLog({
    actor: { userId, role },
    action: 'INVOICE_PAID',
    target: { model: 'Invoice', id: invoice._id, label: invoice.invoiceNumber },
    before: { status: prevStatus },
    after: { status: 'PAID', total: invoice.total },
  });

  // Notify customer
  await createNotification({
    userId: invoice.customerId,
    type: 'INVOICE_PAID',
    title: 'Payment Successful',
    body: `Payment of $${invoice.total.toFixed(2)} for invoice ${invoice.invoiceNumber} was successful.`,
    link: `/invoices/${invoice._id}`,
    metadata: { invoiceId: invoice._id, transactionId: invoice.paymentMethod.transactionId },
  });
  sendUserEmail(invoice.customerId, {
    subject: `CareConnect payment receipt — ${invoice.invoiceNumber}`,
    text: `Payment of $${invoice.total.toFixed(2)} for invoice ${invoice.invoiceNumber} was successful.\nTransaction: ${invoice.paymentMethod.transactionId}`,
  });

  // Notify provider
  if (invoice.providerId?.userId) {
    await createNotification({
      userId: invoice.providerId.userId,
      type: 'INVOICE_PAID',
      title: 'Payment Received',
      body: `Payment of $${invoice.total.toFixed(2)} received for invoice ${invoice.invoiceNumber}.`,
      link: `/invoices/${invoice._id}`,
      metadata: { invoiceId: invoice._id, bookingId: invoice.bookingId },
    });
  }

  return getInvoice(userId, role, invoice._id);
}

module.exports = {
  generateInvoiceForBooking,
  getInvoice,
  getInvoiceByBooking,
  listInvoices,
  payInvoice,
};
