const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const { findProvidersForRequest } = require('./matcher.service');

const findProviders = asyncHandler(async (req, res) => {
  const result = await findProvidersForRequest(req.params.id, {
    userId: req.user.id,
    role: req.user.role,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
  });
  ok(res, result);
});

module.exports = { findProviders };
