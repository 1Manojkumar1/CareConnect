const { ok, paginated } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./requests.service');

const createRequest = asyncHandler(async (req, res) => {
  const result = await service.createRequest(req.user.id, req.body, { submit: req.body.submit === true });
  ok(res, result, 201);
});

const getRequest = asyncHandler(async (req, res) => {
  ok(res, await service.getRequest(req.params.id, { userId: req.user.id, role: req.user.role }));
});

const listRequests = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listRequests({
    userId: req.user.id,
    role: req.user.role,
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    status: req.query.status,
    categoryId: req.query.categoryId,
    customerId: req.query.customerId,
    urgency: req.query.urgency,
    search: req.query.search,
    from: req.query.from,
    to: req.query.to,
  });
  paginated(res, items, pagination);
});

const updateRequest = asyncHandler(async (req, res) => {
  ok(res, await service.updateRequest(req.params.id, req.user.id, req.body));
});

const submitRequest = asyncHandler(async (req, res) => {
  ok(res, await service.transition(req.params.id, req.user.id, 'OPEN', req.user.role));
});

const cancelRequest = asyncHandler(async (req, res) => {
  ok(res, await service.transition(req.params.id, req.user.id, 'CANCELLED', req.user.role));
});

const addAttachment = asyncHandler(async (req, res) => {
  ok(res, await service.addAttachment(req.params.id, req.user.id, req.body), 201);
});

const removeAttachment = asyncHandler(async (req, res) => {
  ok(res, await service.removeAttachment(req.params.id, req.user.id, req.params.attachmentId));
});

const listOpenRequests = asyncHandler(async (req, res) => {
  const { items, pagination } = await service.listOpenRequests({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    categoryId: req.query.categoryId,
    city: req.query.city,
  });
  paginated(res, items, pagination);
});

module.exports = {
  createRequest,
  getRequest,
  listRequests,
  listOpenRequests,
  updateRequest,
  submitRequest,
  cancelRequest,
  addAttachment,
  removeAttachment,
};
