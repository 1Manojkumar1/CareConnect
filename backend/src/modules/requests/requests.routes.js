const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./requests.controller');
const aiController = require('../ai/ai.controller');
const matcherController = require('../matcher/matcher.controller');
const v = require('./requests.validation');

const router = Router();

router.use(authenticate);

router.get('/', v.listRequestsValidation, validate, controller.listRequests);
router.post('/', authorize('CUSTOMER'), v.createRequestValidation, validate, controller.createRequest);
// Static paths before ':id' so 'open' is never treated as an id.
router.get('/open', authorize('PROVIDER'), v.listRequestsValidation, validate, controller.listOpenRequests);
router.get('/:id', controller.getRequest);
router.patch('/:id', authorize('CUSTOMER'), v.updateRequestValidation, validate, controller.updateRequest);
router.post('/:id/submit', authorize('CUSTOMER'), controller.submitRequest);
router.post('/:id/cancel', authorize('CUSTOMER'), controller.cancelRequest);
router.post('/:id/classify', aiController.classify);
router.get('/:id/providers', v.matchProvidersValidation, validate, matcherController.findProviders);
router.post('/:id/attachments', authorize('CUSTOMER'), v.attachmentValidation, validate, controller.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize('CUSTOMER'), controller.removeAttachment);

module.exports = router;
