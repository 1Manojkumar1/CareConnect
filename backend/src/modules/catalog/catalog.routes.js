const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const controller = require('./catalog.controller');
const v = require('./catalog.validation');

const router = Router();

// Public reads
router.get('/categories', controller.listCategories);
router.get('/skills', v.listSkillsValidation, validate, controller.listSkills);

// Admin writes
router.post('/categories', authenticate, authorize('ADMIN'), v.categoryValidation, validate, controller.createCategory);
router.patch('/categories/:id', authenticate, authorize('ADMIN'), v.categoryUpdateValidation, validate, controller.updateCategory);
router.delete('/categories/:id', authenticate, authorize('ADMIN'), controller.deleteCategory);
router.post('/skills', authenticate, authorize('ADMIN'), v.skillValidation, validate, controller.createSkill);
router.patch('/skills/:id', authenticate, authorize('ADMIN'), v.skillUpdateValidation, validate, controller.updateSkill);
router.delete('/skills/:id', authenticate, authorize('ADMIN'), controller.deleteSkill);

module.exports = router;
