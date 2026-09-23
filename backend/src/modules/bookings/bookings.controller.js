const { ok, paginated } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./bookings.service');

const createBooking = asyncHandler(async (req, res) => {
  const data = await service.createBooking(req.user.id, {
    ...req.body,
    role: req.user.role,
  });
  ok(res, data, 201);
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await service.updateStatus(
    req.user.id,
    req.user.role,
    req.params.id,
    req.body
  );
  ok(res, data);
});

const assignProvider = asyncHandler(async (req, res) => {
  const data = await service.assignProvider(
    req.user.id,
    req.user.role,
    req.params.id,
    req.body
  );
  ok(res, data);
});

const addEvidence = asyncHandler(async (req, res) => {
  const data = await service.addEvidence(
    req.user.id,
    req.user.role,
    req.params.id,
    req.body
  );
  ok(res, data, 201);
});

const getBooking = asyncHandler(async (req, res) => {
  const data = await service.getBooking(
    req.user.id,
    req.user.role,
    req.params.id
  );
  ok(res, data);
});

const listBookings = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listBookings({
    userId: req.user.id,
    role: req.user.role,
    status: req.query.status,
    page: req.query.page || 1,
    limit: req.query.limit || 20,
  });
  paginated(res, items, pagination);
});

module.exports = {
  createBooking,
  updateStatus,
  assignProvider,
  addEvidence,
  getBooking,
  listBookings,
};
