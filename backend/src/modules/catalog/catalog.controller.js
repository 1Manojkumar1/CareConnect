const { ok } = require('../../utils/ApiResponse');
const { asyncHandler } = require('../../utils/asyncHandler');
const service = require('./catalog.service');

const listCategories = asyncHandler(async (req, res) => {
  ok(res, await service.listCategories());
});

const listSkills = asyncHandler(async (req, res) => {
  ok(res, await service.listSkills({ categoryId: req.query.categoryId }));
});

const createCategory = asyncHandler(async (req, res) => {
  ok(res, await service.createCategory(req.body), 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  ok(res, await service.updateCategory(req.params.id, req.body));
});

const deleteCategory = asyncHandler(async (req, res) => {
  ok(res, await service.deleteCategory(req.params.id));
});

const createSkill = asyncHandler(async (req, res) => {
  ok(res, await service.createSkill(req.body), 201);
});

const updateSkill = asyncHandler(async (req, res) => {
  ok(res, await service.updateSkill(req.params.id, req.body));
});

const deleteSkill = asyncHandler(async (req, res) => {
  ok(res, await service.deleteSkill(req.params.id));
});

module.exports = {
  listCategories,
  listSkills,
  createCategory,
  updateCategory,
  deleteCategory,
  createSkill,
  updateSkill,
  deleteSkill,
};
