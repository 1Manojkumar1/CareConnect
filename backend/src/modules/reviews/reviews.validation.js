const { body, query, param } = require('express-validator');

const createReview = [
  body('bookingId').isMongoId().withMessage('Valid bookingId required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('body').optional().isString().trim().isLength({ max: 2000 }),
];

const moderateReview = [
  param('id').isMongoId(),
  body('status').isIn(['PUBLISHED', 'FLAGGED']).withMessage('Status must be PUBLISHED or FLAGGED'),
  body('moderationNote').optional().isString().trim().isLength({ max: 500 }),
];

const listReviews = [
  query('status').optional().isIn(['PENDING', 'PUBLISHED', 'FLAGGED']),
  query('providerId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { createReview, moderateReview, listReviews };
