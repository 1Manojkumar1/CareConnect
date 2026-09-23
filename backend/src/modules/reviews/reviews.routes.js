const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const ctrl = require('./reviews.controller');
const v = require('./reviews.validation');

// Public: provider review list
router.get('/providers/:providerId/reviews', ctrl.getProviderReviews);

// Authenticated routes
router.use(authenticate);

// Customer: create review
router.post('/', authorize('CUSTOMER'), v.createReview, validate, ctrl.createReview);

// Anyone: get own review
router.get('/:id', ctrl.getReview);

// Staff: list all reviews
router.get(
  '/',
  authorize('SUPPORT', 'ADMIN', 'OPERATIONS'),
  v.listReviews,
  validate,
  ctrl.listReviews
);

// Staff: moderate a review
router.patch(
  '/:id/moderate',
  authorize('SUPPORT', 'ADMIN'),
  v.moderateReview,
  validate,
  ctrl.moderateReview
);

module.exports = router;
