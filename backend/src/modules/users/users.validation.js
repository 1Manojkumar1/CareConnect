const { body, param, query } = require('express-validator');

const PHONE_RE = /^[+\d][\d\s\-()]{5,23}$/;

const updateMeValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 120 }),
  body('phone')
    .optional()
    .trim()
    .matches(PHONE_RE)
    .withMessage('Enter a valid phone number.'),
];

const addressValidation = [
  body('label').trim().notEmpty().withMessage('Label is required.').isLength({ max: 60 }),
  body('line1').trim().notEmpty().withMessage('Street address is required.').isLength({ max: 160 }),
  body('line2').optional().trim().isLength({ max: 160 }),
  body('city').trim().notEmpty().withMessage('City is required.').isLength({ max: 100 }),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required.').isLength({ max: 20 }),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean.'),
];

const addressUpdateValidation = [
  body('label').optional().trim().notEmpty().withMessage('Label cannot be empty.').isLength({ max: 60 }),
  body('line1').optional().trim().notEmpty().withMessage('Street address cannot be empty.').isLength({ max: 160 }),
  body('line2').optional().trim().isLength({ max: 160 }),
  body('city').optional().trim().notEmpty().withMessage('City cannot be empty.').isLength({ max: 100 }),
  body('postalCode').optional().trim().notEmpty().withMessage('Postal code cannot be empty.').isLength({ max: 20 }),
];

const addressIdValidation = [param('addressId').isMongoId().withMessage('Invalid address id.')];

const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN']),
  query('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'DISABLED']),
];

const setStatusValidation = [
  param('id').isMongoId().withMessage('Invalid user id.'),
  body('status').isIn(['ACTIVE', 'SUSPENDED', 'DISABLED']).withMessage('Invalid status.'),
];

const setRoleValidation = [
  param('id').isMongoId().withMessage('Invalid user id.'),
  body('role').isIn(['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN']).withMessage('Invalid role.'),
];

module.exports = {
  updateMeValidation,
  addressValidation,
  addressUpdateValidation,
  addressIdValidation,
  listUsersValidation,
  setStatusValidation,
  setRoleValidation,
};
