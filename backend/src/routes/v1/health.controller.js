const { asyncHandler } = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');

const getHealth = asyncHandler(async (_req, res) => {
  ok(res, {
    service: 'careconnect-api',
    version: 'v1',
    status: 'ok',
    time: new Date().toISOString(),
  });
});

module.exports = { getHealth };
