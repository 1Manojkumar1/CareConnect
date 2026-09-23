const { ServiceCategory, slugify } = require('../../models/ServiceCategory');
const { Skill } = require('../../models/Skill');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ApiError } = require('../../utils/ApiError');

async function uniqueSlug(Model, base, excludeId = null) {
  let slug = slugify(base);
  let candidate = slug;
  let n = 2;
  for (;;) {
    const filter = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await Model.findOne(filter).select('_id');
    if (!existing) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

// --- Public reads ---

async function listCategories({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };
  const cats = await ServiceCategory.find(filter).sort({ sortOrder: 1, name: 1 });
  return cats.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    parentId: c.parentId ? c.parentId.toString() : null,
    description: c.description,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
  }));
}

async function listSkills({ categoryId, includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (categoryId) filter.categoryId = categoryId;
  const skills = await Skill.find(filter).populate('categoryId', 'name slug').sort({ name: 1 });
  return skills.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    slug: s.slug,
    category: s.categoryId ? { id: s.categoryId._id.toString(), name: s.categoryId.name, slug: s.categoryId.slug } : null,
    description: s.description,
    isActive: s.isActive,
  }));
}

// --- Admin writes ---

async function createCategory({ name, parentId, description, sortOrder }) {
  if (parentId) {
    const parent = await ServiceCategory.findById(parentId);
    if (!parent) throw ApiError.badRequest('INVALID_PARENT', 'Parent category not found.');
    if (parent.parentId) {
      throw ApiError.badRequest('NESTING_TOO_DEEP', 'Only two category levels are supported.');
    }
  }
  const category = await ServiceCategory.create({
    name: name.trim(),
    slug: await uniqueSlug(ServiceCategory, name),
    parentId: parentId || null,
    description: (description || '').trim(),
    sortOrder: sortOrder || 0,
  });
  return listCategories({ includeInactive: true }).then((all) =>
    all.find((c) => c.id === category._id.toString())
  );
}

async function updateCategory(id, { name, parentId, description, isActive, sortOrder }) {
  const category = await ServiceCategory.findById(id);
  if (!category) throw ApiError.notFound('CATEGORY_NOT_FOUND', 'Category not found.');
  if (name !== undefined && name.trim() !== category.name) {
    category.name = name.trim();
    category.slug = await uniqueSlug(ServiceCategory, name, id);
  }
  if (parentId !== undefined) {
    if (parentId && String(parentId) === String(id)) {
      throw ApiError.badRequest('INVALID_PARENT', 'A category cannot be its own parent.');
    }
    if (parentId) {
      const parent = await ServiceCategory.findById(parentId);
      if (!parent) throw ApiError.badRequest('INVALID_PARENT', 'Parent category not found.');
      if (parent.parentId || (await ServiceCategory.exists({ parentId: id }))) {
        throw ApiError.badRequest('NESTING_TOO_DEEP', 'Only two category levels are supported.');
      }
    }
    category.parentId = parentId || null;
  }
  if (description !== undefined) category.description = description.trim();
  if (isActive !== undefined) category.isActive = isActive;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  await category.save();
  const all = await listCategories({ includeInactive: true });
  return all.find((c) => c.id === category._id.toString());
}

async function deleteCategory(id) {
  const category = await ServiceCategory.findById(id);
  if (!category) throw ApiError.notFound('CATEGORY_NOT_FOUND', 'Category not found.');
  const [childCount, skillCount, providerCount] = await Promise.all([
    ServiceCategory.countDocuments({ parentId: id }),
    Skill.countDocuments({ categoryId: id }),
    ProviderProfile.countDocuments({ categoryIds: id }),
  ]);
  if (childCount > 0 || skillCount > 0 || providerCount > 0) {
    throw ApiError.conflict(
      'CATEGORY_IN_USE',
      'This category is in use. Deactivate it instead of deleting.'
    );
  }
  await category.deleteOne();
  return { removed: true };
}

async function createSkill({ name, categoryId, description }) {
  const category = await ServiceCategory.findById(categoryId);
  if (!category || !category.isActive) {
    throw ApiError.badRequest('INVALID_CATEGORY', 'Category is invalid or inactive.');
  }
  if (category.parentId) {
    throw ApiError.badRequest('INVALID_CATEGORY', 'Skills attach to top-level categories only.');
  }
  const skill = await Skill.create({
    name: name.trim(),
    slug: await uniqueSlug(Skill, name),
    categoryId,
    description: (description || '').trim(),
  });
  return listSkills({ includeInactive: true }).then((all) =>
    all.find((s) => s.id === skill._id.toString())
  );
}

async function updateSkill(id, { name, categoryId, description, isActive }) {
  const skill = await Skill.findById(id);
  if (!skill) throw ApiError.notFound('SKILL_NOT_FOUND', 'Skill not found.');
  if (name !== undefined && name.trim() !== skill.name) {
    skill.name = name.trim();
    skill.slug = await uniqueSlug(Skill, name, id);
  }
  if (categoryId !== undefined) {
    const category = await ServiceCategory.findById(categoryId);
    if (!category || !category.isActive || category.parentId) {
      throw ApiError.badRequest('INVALID_CATEGORY', 'Category is invalid or inactive.');
    }
    skill.categoryId = categoryId;
  }
  if (description !== undefined) skill.description = description.trim();
  if (isActive !== undefined) skill.isActive = isActive;
  await skill.save();
  const all = await listSkills({ includeInactive: true });
  return all.find((s) => s.id === skill._id.toString());
}

async function deleteSkill(id) {
  const skill = await Skill.findById(id);
  if (!skill) throw ApiError.notFound('SKILL_NOT_FOUND', 'Skill not found.');
  const providerCount = await ProviderProfile.countDocuments({ skillIds: id });
  if (providerCount > 0) {
    throw ApiError.conflict('SKILL_IN_USE', 'This skill is in use. Deactivate it instead of deleting.');
  }
  await skill.deleteOne();
  return { removed: true };
}

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
