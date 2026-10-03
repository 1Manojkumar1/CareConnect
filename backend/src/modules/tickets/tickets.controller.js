const { asyncHandler } = require('../../utils/asyncHandler');
const ticketsService = require('./tickets.service');

const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.createTicket(req.user.id, req.body);
  res.status(201).json({ success: true, data: ticket });
});

const listTickets = asyncHandler(async (req, res) => {
  const data = await ticketsService.listTickets(req.user.id, req.user.role, req.query);
  res.json({ success: true, data });
});

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.getTicket(req.params.id, req.user.id, req.user.role);
  res.json({ success: true, data: ticket });
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.updateTicket(req.params.id, req.user.id, req.user.role, req.body);
  res.json({ success: true, data: ticket });
});

const addMessage = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.addMessage(req.params.id, req.user.id, req.user.role, req.body);
  res.json({ success: true, data: ticket });
});

module.exports = { createTicket, listTickets, getTicket, updateTicket, addMessage };
