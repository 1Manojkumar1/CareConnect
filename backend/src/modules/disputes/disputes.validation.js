const { body, query, param } = require('express-validator');

const DISPUTE_REASONS = [
  'SERVICE_NOT_COMPLETED', 'POOR_QUALITY', 'PROVIDER_NO_SHOW',
  'BILLING_ISSUE', 'DAMAGE_OR_LOSS', 'SAFETY_CONCERN', 'FRAUD', 'OTHER',
];

const createDispute = [
  body('bookingId').isMongoId().withMessage('Valid bookingId required'),
  body('reason').isIn(DISPUTE_REASONS).withMessage('Invalid reason'),
  body('description').isString().trim().isLength({ min: 20, max: 3000 }).withMessage('Description must be 20–3000 chars'),
  body('evidenceLinks').optional().isArray({ max: 10 }),
  body('evidenceLinks.*').optional().isURL().withMessage('Evidence links must be valid URLs'),
];

const updateDispute = [
  param('id').isMongoId(),
  body('status').optional().isIn(['UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
  body('resolutionNote').optional().isString().trim().isLength({ max: 2000 }),
  body('assignedTo').optional({ nullable: true }).isMongoId(),
  body('note').optional().isString().trim().isLength({ max: 2000 }),
];

const listDisputes = [
  query('status').optional().isIn(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { createDispute, updateDispute, listDisputes };
