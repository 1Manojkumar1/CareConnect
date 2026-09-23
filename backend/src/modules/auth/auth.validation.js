const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 120 }),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Use at least 8 characters.'),
  body('role').trim().notEmpty().withMessage('Role is required.'),
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordValidation = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Use at least 8 characters.'),
];

module.exports = { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation };
