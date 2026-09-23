const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./availability.service');

const getOwnSchedule = asyncHandler(async (req, res) => {
  const data = await service.getProviderSchedule(req.user.id);
  ok(res, data);
});

const updateOwnSchedule = asyncHandler(async (req, res) => {
  const data = await service.updateProviderSchedule(req.user.id, req.body);
  ok(res, data);
});

const listOwnSlots = asyncHandler(async (req, res) => {
  const data = await service.listSlots(req.user.id, req.query);
  ok(res, data);
});

const createOwnSlot = asyncHandler(async (req, res) => {
  const data = await service.createSlot(req.user.id, req.body);
  ok(res, data, 201);
});

const deleteOwnSlot = asyncHandler(async (req, res) => {
  const data = await service.deleteSlot(req.user.id, req.params.id);
  ok(res, data);
});

const getPublicSchedule = asyncHandler(async (req, res) => {
  const data = await service.getPublicProviderSchedule(req.params.providerId);
  ok(res, data);
});

const getAvailableSlots = asyncHandler(async (req, res) => {
  const data = await service.getAvailableSlots(req.params.providerId, req.query);
  ok(res, data);
});

const checkConflict = asyncHandler(async (req, res) => {
  const data = await service.checkConflict(req.body);
  ok(res, data);
});

const reserveSlot = asyncHandler(async (req, res) => {
  const data = await service.reserveSlot({
    ...req.body,
    customerId: req.user.id,
  });
  ok(res, data, 201);
});

module.exports = {
  getOwnSchedule,
  updateOwnSchedule,
  listOwnSlots,
  createOwnSlot,
  deleteOwnSlot,
  getPublicSchedule,
  getAvailableSlots,
  checkConflict,
  reserveSlot,
};
