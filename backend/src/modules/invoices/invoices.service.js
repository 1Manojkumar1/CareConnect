const { Invoice } = require('../../models/Invoice');
const { Booking } = require('../../models/Booking');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { createNotification } = require('../notifications/notifications.service');
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
async function generateInvoiceForBooking(bookingId) {
  const existing = await Invoice.findOne({ bookingId })
    .populate('customerId', 'name email phone')
    .populate('providerId', 'businessName phone ratingAvg')
    .populate('bookingId');
  if (existing) return existing;

  const booking = await Booking.findById(bookingId)
    .populate('requestId')
    .populate('quoteId');

  if (!booking) {
    throw ApiError.notFound('BOOKING_NOT_FOUND', 'Booking not found for invoice generation.');
  }

  const subtotal = Number(booking.pricing?.total || 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax + platformFee) * 100) / 100;

  const lineItems = [
    {
      description: booking.requestId?.title
        ? `Service: ${booking.requestId.title}`
        : 'CareConnect Caregiving Service',
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

  invoice.status = 'PAID';
  invoice.paidAt = new Date();
  invoice.paymentMethod = {
    type: paymentDetails.type || 'CARD',
    last4: paymentDetails.last4 || '4242',
    brand: paymentDetails.brand || 'Visa',
    transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  await invoice.save();

  // Notify customer
  await createNotification({
    userId: invoice.customerId,
    type: 'INVOICE_PAID',
    title: 'Payment Successful',
    body: `Payment of $${invoice.total.toFixed(2)} for invoice ${invoice.invoiceNumber} was successful.`,
    link: `/invoices/${invoice._id}`,
    metadata: { invoiceId: invoice._id, transactionId: invoice.paymentMethod.transactionId },
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
