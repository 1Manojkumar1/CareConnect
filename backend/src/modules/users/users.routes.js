const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./users.controller');
const v = require('./users.validation');

const router = Router();

router.use(authenticate);

router.get('/me', controller.getMe);
router.patch('/me', v.updateMeValidation, validate, controller.updateMe);

router.get('/me/addresses', controller.listAddresses);
router.post('/me/addresses', v.addressValidation, validate, controller.addAddress);
router.patch(
  '/me/addresses/:addressId',
  v.addressIdValidation,
  v.addressUpdateValidation,
  validate,
  controller.updateAddress
);
router.delete('/me/addresses/:addressId', v.addressIdValidation, validate, controller.removeAddress);
router.post(
  '/me/addresses/:addressId/default',
  v.addressIdValidation,
  validate,
  controller.setDefaultAddress
);

// Admin user management
router.get('/', authorize('ADMIN'), v.listUsersValidation, validate, controller.listUsers);
router.patch('/:id/status', authorize('ADMIN'), v.setStatusValidation, validate, controller.setUserStatus);
router.patch('/:id/role', authorize('ADMIN'), v.setRoleValidation, validate, controller.setUserRole);

module.exports = router;
