const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');
const controller = require('./auth.controller');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('./auth.validation');

const router = Router();

router.post('/register', authLimiter, registerValidation, validate, controller.register);
router.post('/login', authLimiter, loginValidation, validate, controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, controller.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, controller.resetPassword);

module.exports = router;
