const { ServiceRequest, REQUEST_TRANSITIONS, EDITABLE_IN_OPEN } = require('../../models/ServiceRequest');
const { ServiceCategory } = require('../../models/ServiceCategory');
const { User } = require('../../models/User');
const { ApiError } = require('../../utils/ApiError');
const { classifyAsync } = require('../ai/ai.service');

const ALLOWED_ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
];
const MAX_ATTACHMENTS = 6;

function isStaff(role) {
  return ['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role);
}

function actionsFor(status) {
  const actions = [];
  if (['DRAFT', 'OPEN'].includes(status)) actions.push('edit');
  if (status === 'DRAFT') actions.push('submit');
  if (['DRAFT', 'OPEN', 'QUOTED'].includes(status)) actions.push('cancel');
  return actions;
}

function serialize(req) {
  return {
    id: req._id.toString(),
    customer: req.customerId && req.customerId.name
      ? { id: req.customerId._id.toString(), name: req.customerId.name }
      : { id: String(req.customerId) },
    category: req.categoryId && req.categoryId.name
      ? { id: req.categoryId._id.toString(), name: req.categoryId.name, slug: req.categoryId.slug }
      : { id: String(req.categoryId) },
    description: req.description,
    notes: req.notes,
    urgency: req.urgency,
    budget: req.budget,
    address: req.address,
    preferredDate: req.preferredDate,
    timeWindow: req.timeWindow,
    attachments: (req.attachments || []).map((a) => ({
      id: a._id.toString(),
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      uploadedAt: a.uploadedAt,
    })),
    aiClassification: req.aiClassification,
    requiredSkills: (req.requiredSkills || []).map(String),
    status: req.status,
    actions: actionsFor(req.status),
    history: (req.history || []).map((h) => ({
      status: h.status,
      actorId: h.actorId ? h.actorId.toString() : null,
      at: h.at,
    })),
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

function populate(query) {
  return query.populate('customerId', 'name').populate('categoryId', 'name slug');
}

// Providers see OPEN requests without customer identity or exact address
// until a booking exists. Enough to quote accurately, nothing more.
function serializeRedacted(req) {
  return {
    id: req._id.toString(),
    redacted: true,
    category: req.categoryId && req.categoryId.name
      ? { id: req.categoryId._id.toString(), name: req.categoryId.name, slug: req.categoryId.slug }
      : { id: String(req.categoryId) },
    description: req.description,
    urgency: req.urgency,
    budget: req.budget,
    city: req.address?.city || '',
    preferredDate: req.preferredDate,
    timeWindow: req.timeWindow,
    attachmentCount: (req.attachments || []).length,
    aiClassification: req.aiClassification,
    status: req.status,
    createdAt: req.createdAt,
  };
}

async function assertActiveCategory(categoryId) {
  const category = await ServiceCategory.findById(categoryId);
  if (!category || !category.isActive) {
    throw ApiError.badRequest('INVALID_CATEGORY', 'Service category is invalid or inactive.');
  }
  return category;
}

async function resolveAddress(customerId, address) {
  const user = await User.findById(customerId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  if (address.addressId) {
    const saved = user.addresses.id(address.addressId);
    if (!saved) throw ApiError.badRequest('INVALID_ADDRESS', 'Address does not belong to this account.');
    return {
      addressId: saved._id,
      label: saved.label,
      line1: saved.line1,
      line2: saved.line2,
      city: saved.city,
      postalCode: saved.postalCode,
    };
  }
  for (const key of ['line1', 'city', 'postalCode']) {
    if (!address[key] || !String(address[key]).trim()) {
      throw ApiError.badRequest('INVALID_ADDRESS', 'Provide a saved address or full address details.');
    }
  }
  return {
    addressId: null,
    label: (address.label || '').trim(),
    line1: address.line1.trim(),
    line2: (address.line2 || '').trim(),
    city: address.city.trim(),
    postalCode: address.postalCode.trim(),
  };
}

function assertFutureDate(value) {
  const day = new Date(value);
  if (Number.isNaN(day.getTime())) throw ApiError.badRequest('INVALID_DATE', 'Preferred date is invalid.');
  // Date string comparison (YYYY-MM-DD) avoids UTC-vs-local offset bugs where
  // today's date in local time is rejected by a server whose local midnight is UTC+offset.
  const inputDateStr =
    typeof value === 'string' && value.length >= 10
      ? value.slice(0, 10)
      : day.toISOString().slice(0, 10);
  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const localTodayStr = `${localYear}-${localMonth}-${localDay}`;
  const utcTodayStr = now.toISOString().slice(0, 10);
  const minTodayStr = localTodayStr < utcTodayStr ? localTodayStr : utcTodayStr;

  if (inputDateStr < minTodayStr) {
    throw ApiError.badRequest('INVALID_DATE', 'Preferred date cannot be in the past.');
  }
  return day;
}

async function createRequest(customerId, data, { submit = false } = {}) {
  await assertActiveCategory(data.categoryId);
  const resolved = await resolveAddress(customerId, data.address || {});
  const preferredDate = assertFutureDate(data.preferredDate);
  let budget = { min: 0, max: 0 };
  if (data.budget) {
    const min = Number(data.budget.min) || 0;
    const max = Number(data.budget.max) || (min > 0 ? min : 0);
    if (min > max) {
      throw ApiError.badRequest('INVALID_BUDGET', 'Budget minimum cannot exceed the maximum.');
    }
    budget = { min, max };
  }
  const doc = await ServiceRequest.create({
    customerId,
    categoryId: data.categoryId,
    description: data.description.trim(),
    notes: (data.notes || '').trim(),
    urgency: data.urgency || 'MEDIUM',
    budget,
    address: resolved,
    preferredDate,
    timeWindow: data.timeWindow || 'FLEXIBLE',
    status: 'DRAFT',
    history: [{ status: 'DRAFT', actorId: customerId }],
  });
  if (submit) return transition(doc._id, customerId, 'OPEN');
  return serialize(await populate(ServiceRequest.findById(doc._id)));
}

async function getRequest(requestId, { userId, role }) {
  const doc = await populate(ServiceRequest.findById(requestId));
  if (!doc) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  if (isStaff(role)) return serialize(doc);
  if (String(doc.customerId._id || doc.customerId) !== String(userId)) {
    if (role === 'PROVIDER' && doc.status === 'OPEN') return serializeRedacted(doc);
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  return serialize(doc);
}

async function listRequests({ userId, role, page = 1, limit = 20, status, categoryId, customerId, urgency, search, from, to }) {
  if (role === 'PROVIDER') {
    throw ApiError.forbidden('PROVIDER_READ_PENDING', 'Provider request discovery arrives in Phase 7.');
  }
  const filter = {};
  if (!isStaff(role)) {
    filter.customerId = userId;
  } else if (customerId) {
    filter.customerId = customerId;
  }
  if (status) filter.status = status;
  if (categoryId) filter.categoryId = categoryId;
  if (urgency) filter.urgency = urgency;
  if (search && search.trim()) {
    filter.description = new RegExp(search.trim(), 'i');
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    populate(ServiceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    ServiceRequest.countDocuments(filter),
  ]);
  return {
    items: items.map(serialize),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function updateRequest(requestId, customerId, data) {
  const doc = await ServiceRequest.findById(requestId);
  if (!doc || String(doc.customerId) !== String(customerId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  if (!['DRAFT', 'OPEN'].includes(doc.status)) {
    throw ApiError.unprocessable('REQUEST_LOCKED', `Requests cannot change while ${doc.status}.`);
  }
  const allowed = doc.status === 'DRAFT' ? null : EDITABLE_IN_OPEN;
  const keys = Object.keys(data).filter((k) => k !== 'addressId');
  if (allowed) {
    const blocked = keys.filter((k) => !allowed.includes(k));
    if (blocked.length > 0) {
      throw ApiError.unprocessable(
        'REQUEST_LOCKED',
        `Only ${allowed.join(', ')} can change once a request is ${doc.status}.`
      );
    }
  }
  if (data.categoryId && doc.status === 'DRAFT') {
    await assertActiveCategory(data.categoryId);
    doc.categoryId = data.categoryId;
  }
  if (data.description !== undefined) doc.description = data.description.trim();
  if (data.notes !== undefined) doc.notes = data.notes.trim();
  if (data.urgency !== undefined) doc.urgency = data.urgency;
  if (data.budget !== undefined) {
    const rawMin = data.budget.min !== undefined ? Number(data.budget.min) || 0 : (doc.budget?.min || 0);
    let rawMax = data.budget.max !== undefined ? Number(data.budget.max) || 0 : (doc.budget?.max || 0);
    if (rawMin > 0 && rawMax === 0) rawMax = rawMin;
    if (rawMin > rawMax) throw ApiError.badRequest('INVALID_BUDGET', 'Budget minimum cannot exceed the maximum.');
    doc.budget = { min: rawMin, max: rawMax };
  }
  if (data.preferredDate !== undefined) doc.preferredDate = assertFutureDate(data.preferredDate);
  if (data.timeWindow !== undefined) doc.timeWindow = data.timeWindow;
  if (data.address !== undefined) doc.address = await resolveAddress(customerId, data.address);
  await doc.save();
  return serialize(await populate(ServiceRequest.findById(doc._id)));
}

async function transition(requestId, actorId, to, role = 'CUSTOMER') {
  const doc = await ServiceRequest.findById(requestId);
  if (!doc) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  if (!isStaff(role) && String(doc.customerId) !== String(actorId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  if (!REQUEST_TRANSITIONS[doc.status].includes(to)) {
    throw ApiError.unprocessable(
      'INVALID_TRANSITION',
      `Cannot move a request from ${doc.status} to ${to}.`
    );
  }
  doc.status = to;
  doc.history.push({ status: to, actorId });
  await doc.save();
  if (to === 'OPEN') classifyAsync(doc._id, actorId);
  return serialize(await populate(ServiceRequest.findById(doc._id)));
}

async function addAttachment(requestId, customerId, data) {
  if (!ALLOWED_ATTACHMENT_MIMES.includes(data.mimeType)) {
    throw ApiError.badRequest('INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP, MP4, or PDF attachments are accepted.');
  }
  const doc = await ServiceRequest.findById(requestId);
  if (!doc || String(doc.customerId) !== String(customerId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  if (!['DRAFT', 'OPEN'].includes(doc.status)) {
    throw ApiError.unprocessable('REQUEST_LOCKED', `Attachments cannot change while a request is ${doc.status}.`);
  }
  if (doc.attachments.length >= MAX_ATTACHMENTS) {
    throw ApiError.badRequest('TOO_MANY_ATTACHMENTS', `A request supports up to ${MAX_ATTACHMENTS} attachments.`);
  }
  doc.attachments.push({
    fileName: data.fileName.trim(),
    mimeType: data.mimeType,
    size: data.size,
    storageKey: data.storageKey.trim(),
  });
  await doc.save();
  return serialize(await populate(ServiceRequest.findById(doc._id)));
}

async function removeAttachment(requestId, customerId, attachmentId) {
  const doc = await ServiceRequest.findById(requestId);
  if (!doc || String(doc.customerId) !== String(customerId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  if (!['DRAFT', 'OPEN'].includes(doc.status)) {
    throw ApiError.unprocessable('REQUEST_LOCKED', `Attachments cannot change while a request is ${doc.status}.`);
  }
  const attachment = doc.attachments.id(attachmentId);
  if (!attachment) throw ApiError.notFound('ATTACHMENT_NOT_FOUND', 'Attachment not found.');
  attachment.deleteOne();
  await doc.save();
  return serialize(await populate(ServiceRequest.findById(doc._id)));
}

// Provider feed: OPEN requests, redacted. Filterable by category and city.
async function listOpenRequests({ page = 1, limit = 20, categoryId, city } = {}) {
  const filter = { status: 'OPEN' };
  if (categoryId) filter.categoryId = categoryId;
  if (city) filter['address.city'] = new RegExp(`^${city}$`, 'i');
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ServiceRequest.find(filter)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ServiceRequest.countDocuments(filter),
  ]);
  return {
    items: items.map(serializeRedacted),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

module.exports = {
  createRequest,
  getRequest,
  listRequests,
  listOpenRequests,
  updateRequest,
  transition,
  addAttachment,
  removeAttachment,
};
