const { asyncHandler } = require('../../utils/asyncHandler');
const reviewsService = require('./reviews.service');

const createReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user.id, req.body);
  res.status(201).json({ success: true, data: review });
});

const getProviderReviews = asyncHandler(async (req, res) => {
  const data = await reviewsService.getProviderReviews(req.params.providerId, req.query);
  res.json({ success: true, data });
});

const listReviews = asyncHandler(async (req, res) => {
  const data = await reviewsService.listReviews(req.query);
  res.json({ success: true, data });
});

const moderateReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.moderateReview(req.params.id, req.body, req.user.id);
  res.json({ success: true, data: review });
});

const getReview = asyncHandler(async (req, res) => {
  const review = await reviewsService.getReview(req.params.id, req.user.id, req.user.role);
  res.json({ success: true, data: review });
});

module.exports = { createReview, getProviderReviews, listReviews, moderateReview, getReview };
