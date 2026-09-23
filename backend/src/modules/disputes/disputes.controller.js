const { asyncHandler } = require('../../utils/asyncHandler');
const disputesService = require('./disputes.service');

const createDispute = asyncHandler(async (req, res) => {
  const dispute = await disputesService.createDispute(req.user.id, req.body);
  res.status(201).json({ success: true, data: dispute });
});

const listDisputes = asyncHandler(async (req, res) => {
  const data = await disputesService.listDisputes(req.user.id, req.user.role, req.query);
  res.json({ success: true, data });
});

const getDispute = asyncHandler(async (req, res) => {
  const dispute = await disputesService.getDispute(req.params.id, req.user.id, req.user.role);
  res.json({ success: true, data: dispute });
});

const updateDispute = asyncHandler(async (req, res) => {
  const dispute = await disputesService.updateDispute(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: dispute });
});

module.exports = { createDispute, listDisputes, getDispute, updateDispute };
