const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  ok(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  ok(res, result);
});

const me = asyncHandler(async (req, res) => {
  const user = await service.getMe(req.user.id);
  ok(res, { user });
});

const logout = asyncHandler(async (_req, res) => {
  const result = await service.logout();
  ok(res, result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await service.requestPasswordReset(req.body);
  ok(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.body);
  ok(res, result);
});

module.exports = { register, login, me, logout, forgotPassword, resetPassword };
