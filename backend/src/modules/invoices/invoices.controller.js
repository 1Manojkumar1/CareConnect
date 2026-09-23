const invoicesService = require('./invoices.service');

async function listInvoices(req, res, next) {
  try {
    const data = await invoicesService.listInvoices(req.user.id, req.user.role, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const data = await invoicesService.getInvoice(req.user.id, req.user.role, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getInvoiceByBooking(req, res, next) {
  try {
    const data = await invoicesService.getInvoiceByBooking(
      req.user.id,
      req.user.role,
      req.params.bookingId
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function payInvoice(req, res, next) {
  try {
    const data = await invoicesService.payInvoice(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function generateInvoice(req, res, next) {
  try {
    const data = await invoicesService.generateInvoiceForBooking(req.params.bookingId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoice,
  getInvoiceByBooking,
  payInvoice,
  generateInvoice,
};
