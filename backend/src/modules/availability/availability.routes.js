const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./availability.controller');
const v = require('./availability.validation');

const router = Router();

// --- Provider self-service ---
router.get(
  '/schedule',
  authenticate,
  authorize('PROVIDER'),
  controller.getOwnSchedule
);

router.put(
  '/schedule',
  authenticate,
  authorize('PROVIDER'),
  v.updateScheduleValidation,
  validate,
  controller.updateOwnSchedule
);

router.get(
  '/slots',
  authenticate,
  authorize('PROVIDER'),
  v.listSlotsValidation,
  validate,
  controller.listOwnSlots
);

router.post(
  '/slots',
  authenticate,
  authorize('PROVIDER'),
  v.createSlotValidation,
  validate,
  controller.createOwnSlot
);

router.delete(
  '/slots/:id',
  authenticate,
  authorize('PROVIDER'),
  controller.deleteOwnSlot
);

// --- Public & Customer discovery / conflict checks ---
router.get(
  '/providers/:providerId/schedule',
  controller.getPublicSchedule
);

router.get(
  '/providers/:providerId/slots',
  v.getSlotsValidation,
  validate,
  controller.getAvailableSlots
);

router.post(
  '/check',
  authenticate,
  v.checkConflictValidation,
  validate,
  controller.checkConflict
);

// --- Booking Slot Reservation ---
// CUSTOMER-only: the controller binds the booking to the caller's own
// account, so other roles must not reach it.
router.post(
  '/reserve',
  authenticate,
  authorize('CUSTOMER'),
  v.reserveSlotValidation,
  validate,
  controller.reserveSlot
);

module.exports = router;
