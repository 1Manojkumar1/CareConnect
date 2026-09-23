const { ok, paginated } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./quotes.service');

const createQuote = asyncHandler(async (req, res) => {
  ok(res, await service.createQuote(req.user.id, req.body), 201);
});

const updateQuote = asyncHandler(async (req, res) => {
  ok(res, await service.updateQuote(req.user.id, req.params.id, req.body));
});

const acceptQuote = asyncHandler(async (req, res) => {
  ok(res, await service.decideQuote(req.params.id, { customerId: req.user.id, to: 'ACCEPTED' }));
});

const rejectQuote = asyncHandler(async (req, res) => {
  ok(res, await service.decideQuote(req.params.id, { customerId: req.user.id, to: 'REJECTED' }));
});

const withdrawQuote = asyncHandler(async (req, res) => {
  ok(res, await service.decideQuote(req.params.id, { userId: req.user.id, to: 'WITHDRAWN' }));
});

const listQuotes = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listQuotes({
    role: req.user.role,
    userId: req.user.id,
    requestId: req.query.requestId,
    status: req.query.status,
    providerId: req.query.providerId,
    page: req.query.page || 1,
    limit: req.query.limit || 20,
  });
  paginated(res, items, pagination);
});

module.exports = { createQuote, updateQuote, acceptQuote, rejectQuote, withdrawQuote, listQuotes };
