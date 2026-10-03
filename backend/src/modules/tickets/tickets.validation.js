const { body, query, param } = require('express-validator');
const {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} = require('../../models/Ticket');

const createTicket = [
  body('subject').isString().trim().isLength({ min: 5, max: 200 }).withMessage('Subject must be 5–200 chars'),
  body('description').isString().trim().isLength({ min: 20, max: 3000 }).withMessage('Description must be 20–3000 chars'),
  body('category').optional().isIn(TICKET_CATEGORIES).withMessage('Invalid category'),
  body('priority').optional().isIn(TICKET_PRIORITIES).withMessage('Invalid priority'),
  body('relatedBookingId').optional().isMongoId().withMessage('relatedBookingId must be a valid id'),
];

const updateTicket = [
  param('id').isMongoId(),
  body('status').optional().isIn(TICKET_STATUSES),
  body('priority').optional().isIn(TICKET_PRIORITIES),
  body('assignedTo').optional({ nullable: true }).custom((v) => v === null || /^[0-9a-fA-F]{24}$/.test(v)).withMessage('assignedTo must be a valid id or null'),
  body('resolutionNote').optional().isString().trim().isLength({ max: 2000 }),
];

const addMessage = [
  param('id').isMongoId(),
  body('body').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1–2000 chars'),
];

const listTickets = [
  query('status').optional().isIn(TICKET_STATUSES),
  query('priority').optional().isIn(TICKET_PRIORITIES),
  query('category').optional().isIn(TICKET_CATEGORIES),
  query('assignedTo').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { createTicket, updateTicket, addMessage, listTickets };
