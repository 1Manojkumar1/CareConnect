const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const invoicesController = require('./invoices.controller');

const router = Router();

// All invoice routes require authentication
router.use(authenticate);

router.get('/', invoicesController.listInvoices);
router.get('/by-booking/:bookingId', invoicesController.getInvoiceByBooking);
router.post(
  '/generate/:bookingId',
  authorize('PROVIDER', 'OPERATIONS', 'ADMIN'),
  invoicesController.generateInvoice
);
router.get('/:id', invoicesController.getInvoice);
router.post('/:id/pay', invoicesController.payInvoice);

module.exports = router;
