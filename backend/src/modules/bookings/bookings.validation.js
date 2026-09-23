const { body, param, query } = require('express-validator');
const { BOOKING_STATUSES } = require('../../models/Booking');

const createBookingValidation = [
  body('quoteId').optional().isMongoId().withMessage('quoteId must be a valid id.'),
  body('providerId').optional().isMongoId().withMessage('providerId must be a valid id.'),
  body('requestId').optional().isMongoId().withMessage('requestId must be a valid id.'),
  body('startAt').notEmpty().withMessage('startAt is required.').isISO8601().withMessage('startAt must be ISO8601.'),
  body('endAt').notEmpty().withMessage('endAt is required.').isISO8601().withMessage('endAt must be ISO8601.'),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid booking id.'),
  body('toStatus').isIn(BOOKING_STATUSES).withMessage('Invalid toStatus value.'),
  body('note').optional().trim().isLength({ max: 1000 }),
  body('reason').optional().trim().isLength({ max: 500 }),
];

const assignProviderValidation = [
  param('id').isMongoId().withMessage('Invalid booking id.'),
  body('providerId').isMongoId().withMessage('Valid providerId is required.'),
  body('note').optional().trim().isLength({ max: 1000 }),
];

const addEvidenceValidation = [
  param('id').isMongoId().withMessage('Invalid booking id.'),
  body('phase').isIn(['BEFORE', 'DURING', 'AFTER']).withMessage('phase must be BEFORE, DURING, or AFTER.'),
  body('fileUrl').notEmpty().withMessage('fileUrl is required.').isString().trim(),
  body('note').optional().trim().isLength({ max: 1000 }),
];

const listBookingsValidation = [
  query('status').optional().isIn(BOOKING_STATUSES).withMessage('Invalid status filter.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  createBookingValidation,
  updateStatusValidation,
  assignProviderValidation,
  addEvidenceValidation,
  listBookingsValidation,
};
