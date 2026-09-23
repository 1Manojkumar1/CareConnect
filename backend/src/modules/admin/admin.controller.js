const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const adminService = require('./admin.service');

const getPlatformStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getPlatformStats();
  ok(res, stats);
});

const getOperationsQueue = asyncHandler(async (req, res) => {
  const queue = await adminService.getOperationsQueue();
  ok(res, queue);
});

const getFeeConfig = asyncHandler(async (req, res) => {
  const config = await adminService.getFeeConfig();
  ok(res, { config });
});

const updateFeeConfig = asyncHandler(async (req, res) => {
  const config = await adminService.updateFeeConfig(req.user.id, req.body);
  ok(res, { config, message: 'Platform fee configuration updated successfully.' });
});

const bulkActionBookings = asyncHandler(async (req, res) => {
  const result = await adminService.bulkActionBookings(req.user.id, req.body);
  ok(res, result);
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await adminService.listAuditLogs({
    page: parseInt(req.query.page, 10) || 1,
    limit: parseInt(req.query.limit, 10) || 20,
    action: req.query.action,
    actorId: req.query.actorId,
    targetModel: req.query.targetModel,
    from: req.query.from,
    to: req.query.to,
  });
  ok(res, data);
});

module.exports = {
  getPlatformStats,
  getOperationsQueue,
  getFeeConfig,
  updateFeeConfig,
  bulkActionBookings,
  listAuditLogs,
};
