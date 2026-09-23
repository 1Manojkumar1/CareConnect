const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./quotes.controller');
const v = require('./quotes.validation');

const router = Router();

router.use(authenticate);

router.get('/', v.listQuotesValidation, validate, controller.listQuotes);
router.post('/', authorize('PROVIDER'), v.createQuoteValidation, validate, controller.createQuote);
router.patch('/:id', authorize('PROVIDER'), v.updateQuoteValidation, validate, controller.updateQuote);
router.post('/:id/accept', authorize('CUSTOMER'), controller.acceptQuote);
router.post('/:id/reject', authorize('CUSTOMER'), controller.rejectQuote);
router.post('/:id/withdraw', authorize('PROVIDER'), controller.withdrawQuote);

module.exports = router;
