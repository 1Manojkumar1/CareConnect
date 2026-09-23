const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./admin.controller');
const v = require('./admin.validation');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Platform stats — accessible by ADMIN and OPERATIONS
router.get('/stats', authorize('ADMIN', 'OPERATIONS'), controller.getPlatformStats);

// Operations dispatch/escalation queue
router.get('/operations/queue', authorize('ADMIN', 'OPERATIONS'), controller.getOperationsQueue);

// Platform fee configuration
router.get('/fee-config', authorize('ADMIN', 'OPERATIONS'), controller.getFeeConfig);
router.put('/fee-config', authorize('ADMIN'), v.updateFeeConfigValidation, validate, controller.updateFeeConfig);

// Bulk booking operations
router.post('/bookings/bulk-action', authorize('ADMIN', 'OPERATIONS'), v.bulkActionValidation, validate, controller.bulkActionBookings);

// Platform audit logs — accessible by ADMIN only
router.get('/audit-logs', authorize('ADMIN'), controller.listAuditLogs);

module.exports = router;
