const { body, param, query } = require('express-validator');

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
  body('parentId').optional({ nullable: true }).isMongoId().withMessage('Invalid parent id.'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('sortOrder').optional().isInt().toInt(),
];

const categoryUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid category id.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 100 }),
  body('parentId').optional({ nullable: true }).isMongoId().withMessage('Invalid parent id.'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt().toInt(),
];

const skillValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
  body('categoryId').isMongoId().withMessage('Valid categoryId is required.'),
  body('description').optional().trim().isLength({ max: 500 }),
];

const skillUpdateValidation = [
  param('id').isMongoId().withMessage('Invalid skill id.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.').isLength({ max: 100 }),
  body('categoryId').optional().isMongoId().withMessage('Invalid categoryId.'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

const listSkillsValidation = [
  query('categoryId').optional().isMongoId().withMessage('Invalid categoryId.'),
  query('includeInactive').optional().isBoolean().toBoolean(),
];

module.exports = {
  categoryValidation,
  categoryUpdateValidation,
  skillValidation,
  skillUpdateValidation,
  listSkillsValidation,
};
