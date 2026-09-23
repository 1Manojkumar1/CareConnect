const { body, param, query } = require('express-validator');

const objectIdArray = (field) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array.`)
    .bail()
    .custom((arr) => arr.every((v) => /^[0-9a-fA-F]{24}$/.test(String(v))))
    .withMessage(`${field} contains an invalid id.`);

const serviceAreaValidation = body('serviceAreas')
  .optional()
  .isArray({ min: 1 })
  .withMessage('serviceAreas must be a non-empty array.')
  .bail()
  .custom((areas) =>
    areas.every(
      (a) =>
        a &&
        typeof a.city === 'string' &&
        a.city.trim().length > 0 &&
        a.city.trim().length <= 100
    )
  )
  .withMessage('Each service area needs a valid city.');

const profileValidation = [
  body('headline').optional().trim().isLength({ max: 140 }),
  body('bio').optional().trim().isLength({ max: 2000 }),
  body('experienceYears').optional().isInt({ min: 0, max: 60 }).toInt(),
  objectIdArray('categoryIds'),
  objectIdArray('skillIds'),
  serviceAreaValidation,
  body('pricing.hourlyRate').optional().isFloat({ min: 0 }),
  body('pricing.visitFee').optional().isFloat({ min: 0 }),
  body('pricing.currency').optional().trim().isLength({ min: 3, max: 3 }),
  body('acceptingJobs').optional().isBoolean(),
];

const documentValidation = [
  body('fileName').trim().notEmpty().withMessage('fileName is required.').isLength({ max: 200 }),
  body('mimeType').trim().notEmpty().withMessage('mimeType is required.').isLength({ max: 100 }),
  body('size').isInt({ min: 1, max: 25 * 1024 * 1024 }).withMessage('size must be 1–25MB.').toInt(),
  body('storageKey').trim().notEmpty().withMessage('storageKey is required.').isLength({ max: 300 }),
];

const verificationDecisionValidation = [
  param('id').isMongoId().withMessage('Invalid provider id.'),
  body('status')
    .isIn(['UNDER_REVIEW', 'VERIFIED', 'REJECTED'])
    .withMessage('Invalid verification status.'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const listProvidersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('skillId').optional().isMongoId(),
  query('categoryId').optional().isMongoId(),
  query('verificationStatus').optional().isIn(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']),
  query('search').optional().isString().trim(),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
  query('minHourlyRate').optional().isFloat({ min: 0 }).toFloat(),
  query('maxHourlyRate').optional().isFloat({ min: 0 }).toFloat(),
  query('acceptingJobs').optional().isBoolean(),
  query('sortBy').optional().isIn(['rating', 'price_asc', 'price_desc', 'newest']),
];

module.exports = {
  profileValidation,
  documentValidation,
  verificationDecisionValidation,
  listProvidersValidation,
};
