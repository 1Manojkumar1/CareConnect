const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const { runClassification } = require('./ai.service');

const classify = asyncHandler(async (req, res) => {
  const classification = await runClassification(req.params.id, {
    actorId: req.user.id,
    role: req.user.role,
  });
  ok(res, { classification });
});

module.exports = { classify };
