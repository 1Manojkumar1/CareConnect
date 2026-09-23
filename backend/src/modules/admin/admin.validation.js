const { body } = require('express-validator');

const updateFeeConfigValidation = [
  body('platformCommissionPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('platformCommissionPercent must be between 0 and 100.'),
  body('minimumBookingFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minimumBookingFee must be a positive number.'),
  body('taxRatePercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('taxRatePercent must be between 0 and 100.'),
  body('currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('currency must be a 3-letter currency code.'),
  body('maintenanceMode')
    .optional()
    .isBoolean()
    .withMessage('maintenanceMode must be a boolean.'),
  body('supportEmail')
    .optional()
    .isEmail()
    .withMessage('supportEmail must be a valid email.'),
];

const bulkActionValidation = [
  body('bookingIds')
    .isArray({ min: 1 })
    .withMessage('bookingIds must be a non-empty array of booking IDs.'),
  body('action')
    .isIn(['ASSIGN_PROVIDER', 'CANCEL'])
    .withMessage('action must be ASSIGN_PROVIDER or CANCEL.'),
  body('providerId')
    .optional()
    .isMongoId()
    .withMessage('providerId must be a valid ID.'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 500 }),
];

module.exports = {
  updateFeeConfigValidation,
  bulkActionValidation,
};
