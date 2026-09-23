const mongoose = require('mongoose');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Top-level when parentId is null; subcategory otherwise.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', default: null },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });

const ServiceCategory =
  mongoose.models.ServiceCategory || mongoose.model('ServiceCategory', categorySchema);

module.exports = { ServiceCategory, slugify };
