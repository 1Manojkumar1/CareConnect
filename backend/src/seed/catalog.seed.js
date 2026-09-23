const { ServiceCategory, slugify } = require('../models/ServiceCategory');
const { Skill } = require('../models/Skill');
const { CATALOG } = require('./catalog.data');

async function upsertCategory({ name, parentId = null, description = '', sortOrder = 0 }) {
  const slug = slugify(name);
  const existing = await ServiceCategory.findOne({ slug });
  if (existing) {
    existing.name = name;
    existing.description = description;
    if (existing.parentId === undefined) existing.parentId = parentId;
    await existing.save();
    return existing;
  }
  return ServiceCategory.create({ name, slug, parentId, description, isActive: true, sortOrder });
}

async function seedCatalog() {
  const summary = { categories: 0, subcategories: 0, skills: 0 };
  let order = 0;
  for (const top of CATALOG) {
    order += 1;
    const parent = await upsertCategory({
      name: top.name,
      description: top.description,
      sortOrder: order,
    });
    summary.categories += 1;
    for (const sub of top.subcategories || []) {
      await upsertCategory({ name: sub, parentId: parent._id, description: `${sub} under ${top.name}.` });
      summary.subcategories += 1;
    }
    for (const skillName of top.skills || []) {
      const slug = slugify(skillName);
      if (!(await Skill.findOne({ slug }))) {
        await Skill.create({
          name: skillName,
          slug,
          categoryId: parent._id,
          description: `${skillName} for ${top.name.toLowerCase()} jobs.`,
          isActive: true,
        });
      }
      summary.skills += 1;
    }
  }
  return summary;
}

module.exports = { seedCatalog };
