const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const ctrl = require('./tickets.controller');
const v = require('./tickets.validation');

router.use(authenticate);

// Anyone authenticated can raise, list (own), view, and reply to tickets
router.post('/', v.createTicket, validate, ctrl.createTicket);
router.get('/', v.listTickets, validate, ctrl.listTickets);
router.get('/:id', ctrl.getTicket);
router.post('/:id/messages', v.addMessage, validate, ctrl.addMessage);

// Staff: triage, assign, change priority/status, resolve
router.patch(
  '/:id',
  authorize('SUPPORT', 'ADMIN', 'OPERATIONS'),
  v.updateTicket,
  validate,
  ctrl.updateTicket
);

module.exports = router;
