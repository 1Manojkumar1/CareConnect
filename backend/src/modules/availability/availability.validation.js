const { body, param, query } = require('express-validator');

const updateScheduleValidation = [
  body('timezone').optional().isString().trim(),
  body('acceptingJobs').optional().isBoolean(),
  body('workingHours').isArray({ min: 1, max: 7 }).withMessage('Working hours must be an array of days (1-7 entries).'),
  body('workingHours.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday).'),
  body('workingHours.*.isOpen').isBoolean().withMessage('isOpen must be a boolean.'),
  body('workingHours.*.ranges').optional().isArray().withMessage('ranges must be an array.'),
  body('workingHours.*.ranges.*.start')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Range start must be in HH:mm 24-hour format.'),
  body('workingHours.*.ranges.*.end')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Range end must be in HH:mm 24-hour format.'),
];

const createSlotValidation = [
  body('startAt').notEmpty().withMessage('startAt is required.').isISO8601().withMessage('startAt must be a valid ISO8601 date.'),
  body('endAt').notEmpty().withMessage('endAt is required.').isISO8601().withMessage('endAt must be a valid ISO8601 date.'),
  body('kind').optional().isIn(['BLOCKED', 'EXTRA']).withMessage('kind must be BLOCKED or EXTRA.'),
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('reason cannot exceed 200 characters.'),
];

const listSlotsValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO8601 date.'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO8601 date.'),
];

const checkConflictValidation = [
  body('providerId').isMongoId().withMessage('Valid providerId is required.'),
  body('startAt').notEmpty().withMessage('startAt is required.').isISO8601().withMessage('startAt must be a valid ISO8601 date.'),
  body('endAt').notEmpty().withMessage('endAt is required.').isISO8601().withMessage('endAt must be a valid ISO8601 date.'),
  body('excludeBookingId').optional().isMongoId().withMessage('excludeBookingId must be a valid id.'),
];

const getSlotsValidation = [
  param('providerId').isMongoId().withMessage('Valid providerId is required.'),
  query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be in YYYY-MM-DD format.'),
  query('durationMin').optional().isInt({ min: 15, max: 480 }).toInt(),
];

const reserveSlotValidation = [
  body('providerId').isMongoId().withMessage('Valid providerId is required.'),
  body('startAt').notEmpty().withMessage('startAt is required.').isISO8601().withMessage('startAt must be a valid ISO8601 date.'),
  body('endAt').notEmpty().withMessage('endAt is required.').isISO8601().withMessage('endAt must be a valid ISO8601 date.'),
  body('requestId').optional().isMongoId(),
  body('quoteId').optional().isMongoId(),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

module.exports = {
  updateScheduleValidation,
  createSlotValidation,
  listSlotsValidation,
  checkConflictValidation,
  getSlotsValidation,
  reserveSlotValidation,
};
