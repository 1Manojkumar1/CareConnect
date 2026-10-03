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
  body('status').optional().isIn(['UNDER_REVIEW', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PROVIDER', 'RESOLVED', 'REJECTED']),
  body('resolutionNote').optional().isString().trim().isLength({ max: 2000 }),
  body('refundAmount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be a non-negative number'),
  body('assignedTo').optional({ nullable: true }).isMongoId(),
  body('note').optional().isString().trim().isLength({ max: 2000 }),
];

const addMessage = [
  param('id').isMongoId(),
  body('body').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 chars'),
];

const listDisputes = [
  query('status').optional().isIn(['OPEN', 'UNDER_REVIEW', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_PROVIDER', 'RESOLVED', 'REJECTED']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { createDispute, updateDispute, addMessage, listDisputes };
