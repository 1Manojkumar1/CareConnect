const { body, param, query } = require('express-validator');

const addressInput = [
  body('address.addressId').optional().isMongoId().withMessage('Invalid address id.'),
  body('address.label').optional().trim().isLength({ max: 60 }),
  body('address.line1').optional().trim().isLength({ max: 160 }),
  body('address.line2').optional().trim().isLength({ max: 160 }),
  body('address.city').optional().trim().isLength({ max: 100 }),
  body('address.postalCode').optional().trim().isLength({ max: 20 }),
];

const createRequestValidation = [
  body('categoryId').isMongoId().withMessage('Valid categoryId is required.'),
  body('description').trim().notEmpty().withMessage('Describe the problem.').isLength({ max: 3000 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('urgency').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('budget.min').optional().isFloat({ min: 0 }).toFloat(),
  body('budget.max').optional().isFloat({ min: 0 }).toFloat(),
  body('preferredDate').notEmpty().withMessage('Preferred date is required.').isISO8601().withMessage('Preferred date is invalid.'),
  body('timeWindow').optional().isIn(['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE']),
  body('submit').optional().isBoolean(),
  ...addressInput,
];

const updateRequestValidation = [
  param('id').isMongoId().withMessage('Invalid request id.'),
  body('categoryId').optional().isMongoId().withMessage('Invalid categoryId.'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty.').isLength({ max: 3000 }),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('urgency').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  body('budget.min').optional().isFloat({ min: 0 }).toFloat(),
  body('budget.max').optional().isFloat({ min: 0 }).toFloat(),
  body('preferredDate').optional().isISO8601().withMessage('Preferred date is invalid.'),
  body('timeWindow').optional().isIn(['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE']),
  ...addressInput,
];

const attachmentValidation = [
  param('id').isMongoId().withMessage('Invalid request id.'),
  body('fileName').trim().notEmpty().withMessage('fileName is required.').isLength({ max: 200 }),
  body('mimeType').trim().notEmpty().withMessage('mimeType is required.').isLength({ max: 100 }),
  body('size').isInt({ min: 1, max: 25 * 1024 * 1024 }).withMessage('size must be 1–25MB.').toInt(),
  body('storageKey').trim().notEmpty().withMessage('storageKey is required.').isLength({ max: 300 }),
];

const listRequestsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['DRAFT', 'OPEN', 'QUOTED', 'BOOKED', 'CANCELLED', 'CLOSED']),
  query('categoryId').optional().isMongoId(),
  query('customerId').optional().isMongoId(),
  query('urgency').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
  query('search').optional().isString().trim(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

const matchProvidersValidation = [
  param('id').isMongoId().withMessage('Invalid request id.'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

module.exports = {
  createRequestValidation,
  updateRequestValidation,
  attachmentValidation,
  listRequestsValidation,
  matchProvidersValidation,
};
