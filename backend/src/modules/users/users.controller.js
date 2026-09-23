const { ok, paginated } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./users.service');

const getMe = asyncHandler(async (req, res) => {
  ok(res, { user: await service.getMe(req.user.id) });
});

const updateMe = asyncHandler(async (req, res) => {
  ok(res, { user: await service.updateMe(req.user.id, req.body) });
});

const listAddresses = asyncHandler(async (req, res) => {
  ok(res, await service.listAddresses(req.user.id));
});

const addAddress = asyncHandler(async (req, res) => {
  ok(res, await service.addAddress(req.user.id, req.body), 201);
});

const updateAddress = asyncHandler(async (req, res) => {
  ok(res, await service.updateAddress(req.user.id, req.params.addressId, req.body));
});

const removeAddress = asyncHandler(async (req, res) => {
  ok(res, await service.removeAddress(req.user.id, req.params.addressId));
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  ok(res, await service.setDefaultAddress(req.user.id, req.params.addressId));
});

const listUsers = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listUsers({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    role: req.query.role,
    status: req.query.status,
    search: req.query.search,
  });
  paginated(res, items, pagination);
});

const setUserStatus = asyncHandler(async (req, res) => {
  ok(res, { user: await service.setUserStatus(req.user.id, req.params.id, req.body.status) });
});

const setUserRole = asyncHandler(async (req, res) => {
  ok(res, { user: await service.setUserRole(req.user.id, req.params.id, req.body.role) });
});

module.exports = {
  getMe,
  updateMe,
  listAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  listUsers,
  setUserStatus,
  setUserRole,
};
