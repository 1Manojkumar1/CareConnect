const { body, param, query } = require('express-validator');

const pricingFields = [
  body('pricing.labor').isFloat({ min: 0 }).withMessage('Labor must be 0 or more.').toFloat(),
  body('pricing.materials').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.tax').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.discount').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.currency').optional().trim().isLength({ min: 3, max: 3 }),
  // NOTE: pricing.total is never accepted — the server always recomputes it.
];

const createQuoteValidation = [
  body('requestId').isMongoId().withMessage('Valid requestId is required.'),
  ...pricingFields,
  body('estimatedDurationMin').optional().isInt({ min: 15, max: 20160 }).toInt(),
  body('proposedDate').notEmpty().withMessage('Proposed date is required.').isISO8601().withMessage('Proposed date is invalid.'),
  body('timeWindow').optional().isIn(['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE']),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('expiresAt').notEmpty().withMessage('Expiry is required.').isISO8601().withMessage('Expiry is invalid.'),
];

const updateQuoteValidation = [
  param('id').isMongoId().withMessage('Invalid quote id.'),
  body('pricing.labor').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.materials').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.tax').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.discount').optional().isFloat({ min: 0 }).toFloat(),
  body('pricing.currency').optional().trim().isLength({ min: 3, max: 3 }),
  body('estimatedDurationMin').optional().isInt({ min: 15, max: 20160 }).toInt(),
  body('proposedDate').optional().isISO8601().withMessage('Proposed date is invalid.'),
  body('timeWindow').optional().isIn(['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE']),
  body('notes').optional().trim().isLength({ max: 2000 }),
  body('expiresAt').optional().isISO8601().withMessage('Expiry is invalid.'),
];

const listQuotesValidation = [
  query('requestId').optional().isMongoId(),
  query('status').optional().isIn(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED']),
  query('providerId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = { createQuoteValidation, updateQuoteValidation, listQuotesValidation };
