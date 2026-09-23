const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const ctrl = require('./disputes.controller');
const v = require('./disputes.validation');

router.use(authenticate);

// Anyone authenticated can raise or view their disputes
router.post('/', v.createDispute, validate, ctrl.createDispute);
router.get('/', v.listDisputes, validate, ctrl.listDisputes);
router.get('/:id', ctrl.getDispute);

// Staff: update dispute status / resolution
router.patch(
  '/:id',
  authorize('SUPPORT', 'ADMIN', 'OPERATIONS'),
  v.updateDispute,
  validate,
  ctrl.updateDispute
);

module.exports = router;
