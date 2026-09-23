const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const ctrl = require('./bookings.controller');
const {
  createBookingValidation,
  updateStatusValidation,
  assignProviderValidation,
  addEvidenceValidation,
  listBookingsValidation,
} = require('./bookings.validation');

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// List bookings (customer, provider, staff)
router.get(
  '/',
  authorize('CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'),
  listBookingsValidation,
  validate,
  ctrl.listBookings
);

// Create a booking (customer only)
router.post(
  '/',
  authorize('CUSTOMER'),
  createBookingValidation,
  validate,
  ctrl.createBooking
);

// Get a single booking
router.get(
  '/:id',
  authorize('CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'),
  ctrl.getBooking
);

// Transition status (customer, provider, staff)
router.patch(
  '/:id/status',
  authorize('CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'),
  updateStatusValidation,
  validate,
  ctrl.updateStatus
);

// Assign / reassign provider (operations, admin)
router.patch(
  '/:id/assign',
  authorize('OPERATIONS', 'ADMIN'),
  assignProviderValidation,
  validate,
  ctrl.assignProvider
);

// Upload job evidence (provider, staff)
router.post(
  '/:id/evidence',
  authorize('PROVIDER', 'OPERATIONS', 'ADMIN'),
  addEvidenceValidation,
  validate,
  ctrl.addEvidence
);

module.exports = router;
