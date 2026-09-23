const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./providers.controller');
const v = require('./providers.validation');

const router = Router();

// Public marketplace browsing (only VERIFIED profiles are visible by default).
router.get('/', v.listProvidersValidation, validate, controller.listProviders);
router.get('/:id', controller.getPublicProfile);

// Provider self-service
router.get(
  '/profile/me',
  authenticate,
  authorize('PROVIDER'),
  controller.getOwnProfile
);
router.post(
  '/profile',
  authenticate,
  authorize('PROVIDER'),
  v.profileValidation,
  validate,
  controller.createProfile
);
router.patch(
  '/profile/me',
  authenticate,
  authorize('PROVIDER'),
  v.profileValidation,
  validate,
  controller.updateOwnProfile
);
router.post(
  '/profile/me/submit',
  authenticate,
  authorize('PROVIDER'),
  controller.submitForVerification
);
router.post(
  '/profile/me/documents',
  authenticate,
  authorize('PROVIDER'),
  v.documentValidation,
  validate,
  controller.addDocument
);
router.delete('/profile/me/documents/:docId', authenticate, authorize('PROVIDER'), controller.removeDocument);

// Verification decisions — admin & operations
router.patch(
  '/:id/verification',
  authenticate,
  authorize('ADMIN', 'OPERATIONS'),
  v.verificationDecisionValidation,
  validate,
  controller.decideVerification
);

module.exports = router;
