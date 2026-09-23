const { ok, paginated } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./providers.service');

const getOwnProfile = asyncHandler(async (req, res) => {
  ok(res, await service.getOwnProfile(req.user.id));
});

const createProfile = asyncHandler(async (req, res) => {
  ok(res, await service.createProfile(req.user.id, req.body), 201);
});

const updateOwnProfile = asyncHandler(async (req, res) => {
  ok(res, await service.updateOwnProfile(req.user.id, req.body));
});

const submitForVerification = asyncHandler(async (req, res) => {
  ok(res, await service.submitForVerification(req.user.id));
});

const addDocument = asyncHandler(async (req, res) => {
  ok(res, await service.addDocument(req.user.id, req.body), 201);
});

const removeDocument = asyncHandler(async (req, res) => {
  ok(res, await service.removeDocument(req.user.id, req.params.docId));
});

const decideVerification = asyncHandler(async (req, res) => {
  ok(res, await service.decideVerification(req.user.id, req.params.id, req.body));
});

const listProviders = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listProviders({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    skillId: req.query.skillId,
    categoryId: req.query.categoryId,
    city: req.query.city,
    verificationStatus: req.query.verificationStatus,
    search: req.query.search,
    minRating: req.query.minRating,
    minHourlyRate: req.query.minHourlyRate,
    maxHourlyRate: req.query.maxHourlyRate,
    acceptingJobs: req.query.acceptingJobs,
    sortBy: req.query.sortBy,
  });
  paginated(res, items, pagination);
});

const getPublicProfile = asyncHandler(async (req, res) => {
  ok(res, await service.getPublicProfile(req.params.id));
});

module.exports = {
  getOwnProfile,
  createProfile,
  updateOwnProfile,
  submitForVerification,
  addDocument,
  removeDocument,
  decideVerification,
  listProviders,
  getPublicProfile,
};
