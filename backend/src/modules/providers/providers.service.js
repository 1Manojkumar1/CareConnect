const mongoose = require('mongoose');
const { User } = require('../../models/User');
const { ServiceCategory } = require('../../models/ServiceCategory');
const { Skill } = require('../../models/Skill');
const { ProviderProfile, VERIFICATION_TRANSITIONS } = require('../../models/ProviderProfile');
const { ApiError } = require('../../utils/ApiError');
const { recordAuditLog } = require('../../utils/auditLogger');

const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function serializePublic(profile) {
  return {
    id: profile._id.toString(),
    user: profile.userId && profile.userId.name
      ? { id: profile.userId._id.toString(), name: profile.userId.name }
      : { id: String(profile.userId), name: '' },
    headline: profile.headline,
    bio: profile.bio,
    experienceYears: profile.experienceYears,
    categories: (profile.categoryIds || []).map((c) => ({ id: c._id.toString(), name: c.name, slug: c.slug })),
    skills: (profile.skillIds || []).map((s) => ({ id: s._id.toString(), name: s.name, slug: s.slug })),
    serviceAreas: profile.serviceAreas || [],
    pricing: profile.pricing,
    acceptingJobs: profile.acceptingJobs,
    verificationStatus: profile.verificationStatus,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    jobsCompleted: profile.jobsCompleted,
  };
}

function serializeOwn(profile) {
  return {
    ...serializePublic(profile),
    verificationNotes: profile.verificationNotes || '',
    verifiedAt: profile.verifiedAt,
    documents: (profile.documents || []).map((d) => ({
      id: d._id.toString(),
      fileName: d.fileName,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt,
    })),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function populateRefs(query) {
  return query
    .populate('userId', 'name status')
    .populate('categoryIds', 'name slug')
    .populate('skillIds', 'name slug');
}

async function assertReferences({ categoryIds = [], skillIds = [] }) {
  const [cats, skills] = await Promise.all([
    categoryIds.length > 0
      ? ServiceCategory.find({ _id: { $in: categoryIds }, isActive: true })
      : [],
    skillIds.length > 0
      ? Skill.find({ _id: { $in: skillIds }, isActive: true }).populate('categoryId', '_id')
      : [],
  ]);
  if (cats.length !== categoryIds.length) {
    throw ApiError.badRequest('INVALID_CATEGORY', 'One or more categories are invalid or inactive.');
  }
  if (skills.length !== skillIds.length) {
    throw ApiError.badRequest('INVALID_SKILL', 'One or more skills are invalid or inactive.');
  }
  // Every skill must belong to one of the profile's categories.
  const allowed = new Set(categoryIds.map(String));
  for (const s of skills) {
    if (!allowed.has(String(s.categoryId._id || s.categoryId))) {
      throw ApiError.badRequest(
        'SKILL_CATEGORY_MISMATCH',
        `Skill "${s.name}" does not belong to the selected categories.`
      );
    }
  }
}

async function getOwnProfile(userId) {
  const profile = await populateRefs(ProviderProfile.findOne({ userId }));
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  return serializeOwn(profile);
}

async function createProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'PROVIDER') {
    throw ApiError.forbidden('PROVIDER_ONLY', 'Only provider accounts can create a provider profile.');
  }
  const existing = await ProviderProfile.findOne({ userId });
  if (existing) {
    throw ApiError.conflict('PROFILE_EXISTS', 'Provider profile already exists.');
  }
  await assertReferences(data);
  const profile = await ProviderProfile.create({
    userId,
    headline: (data.headline || '').trim(),
    bio: (data.bio || '').trim(),
    experienceYears: data.experienceYears || 0,
    categoryIds: data.categoryIds || [],
    skillIds: data.skillIds || [],
    serviceAreas: data.serviceAreas || [],
    pricing: {
      hourlyRate: data.pricing?.hourlyRate || 0,
      visitFee: data.pricing?.visitFee || 0,
      currency: (data.pricing?.currency || 'USD').toUpperCase(),
    },
    acceptingJobs: data.acceptingJobs !== false,
  });
  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function updateOwnProfile(userId, data) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  if (data.categoryIds || data.skillIds) {
    await assertReferences({
      categoryIds: data.categoryIds || profile.categoryIds.map(String),
      skillIds: data.skillIds || profile.skillIds.map(String),
    });
    if (data.categoryIds) profile.categoryIds = data.categoryIds;
    if (data.skillIds) profile.skillIds = data.skillIds;
  }
  if (data.headline !== undefined) profile.headline = data.headline.trim();
  if (data.bio !== undefined) profile.bio = data.bio.trim();
  if (data.experienceYears !== undefined) profile.experienceYears = data.experienceYears;
  if (data.serviceAreas !== undefined) profile.serviceAreas = data.serviceAreas;
  if (data.pricing !== undefined) {
    if (data.pricing.hourlyRate !== undefined) profile.pricing.hourlyRate = data.pricing.hourlyRate;
    if (data.pricing.visitFee !== undefined) profile.pricing.visitFee = data.pricing.visitFee;
    if (data.pricing.currency !== undefined) profile.pricing.currency = data.pricing.currency.toUpperCase();
  }
  if (data.acceptingJobs !== undefined) profile.acceptingJobs = data.acceptingJobs;
  await profile.save();
  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function submitForVerification(userId) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  if (!['PENDING', 'REJECTED'].includes(profile.verificationStatus)) {
    throw ApiError.unprocessable(
      'INVALID_TRANSITION',
      `Cannot submit for verification from ${profile.verificationStatus}.`
    );
  }
  if ((profile.skillIds || []).length === 0 || (profile.serviceAreas || []).length === 0) {
    throw ApiError.unprocessable(
      'PROFILE_INCOMPLETE',
      'Add at least one skill and one service area before submitting.'
    );
  }
  profile.verificationStatus = 'UNDER_REVIEW';
  await profile.save();
  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function addDocument(userId, data) {
  if (!ALLOWED_DOC_MIMES.includes(data.mimeType)) {
    throw ApiError.badRequest('INVALID_FILE_TYPE', 'Only PDF, JPEG, PNG, or WebP documents are accepted.');
  }
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  profile.documents.push({
    fileName: data.fileName.trim(),
    mimeType: data.mimeType,
    size: data.size,
    storageKey: data.storageKey.trim(),
  });
  await profile.save();
  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function removeDocument(userId, docId) {
  const profile = await ProviderProfile.findOne({ userId });
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  const doc = profile.documents.id(docId);
  if (!doc) throw ApiError.notFound('DOCUMENT_NOT_FOUND', 'Document not found.');
  doc.deleteOne();
  await profile.save();
  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function decideVerification(actorId, profileId, { status, notes }) {
  const allowed = VERIFICATION_TRANSITIONS;
  const profile = await ProviderProfile.findById(profileId);
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  if (!allowed[profile.verificationStatus].includes(status)) {
    throw ApiError.unprocessable(
      'INVALID_TRANSITION',
      `Cannot move verification from ${profile.verificationStatus} to ${status}.`
    );
  }
  const prevStatus = profile.verificationStatus;
  profile.verificationStatus = status;
  profile.verificationNotes = (notes || '').trim();
  profile.verifiedBy = status === 'VERIFIED' ? new mongoose.Types.ObjectId(actorId) : null;
  profile.verifiedAt = status === 'VERIFIED' ? new Date() : null;
  await profile.save();

  recordAuditLog({
    actor: { userId: actorId, role: 'ADMIN' },
    action: 'PROVIDER_VERIFICATION_DECISION',
    target: { model: 'ProviderProfile', id: profile._id, label: profile.headline || 'Provider Profile' },
    before: { verificationStatus: prevStatus },
    after: { verificationStatus: status, notes },
  });

  return serializeOwn(await populateRefs(ProviderProfile.findById(profile._id)));
}

async function listProviders({
  page = 1,
  limit = 20,
  skillId,
  categoryId,
  city,
  verificationStatus,
  search,
  minRating,
  minHourlyRate,
  maxHourlyRate,
  acceptingJobs,
  sortBy,
}) {
  const filter = {};
  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  } else {
    filter.verificationStatus = 'VERIFIED';
  }
  if (skillId) filter.skillIds = skillId;
  if (categoryId) filter.categoryIds = categoryId;
  if (city) filter['serviceAreas.city'] = new RegExp(`^${city}$`, 'i');
  if (search && search.trim()) {
    const q = new RegExp(search.trim(), 'i');
    filter.$or = [{ headline: q }, { bio: q }];
  }
  if (minRating !== undefined && !Number.isNaN(+minRating)) {
    filter.ratingAvg = { $gte: +minRating };
  }
  if (minHourlyRate !== undefined || maxHourlyRate !== undefined) {
    filter['pricing.hourlyRate'] = {};
    if (minHourlyRate !== undefined && !Number.isNaN(+minHourlyRate)) {
      filter['pricing.hourlyRate'].$gte = +minHourlyRate;
    }
    if (maxHourlyRate !== undefined && !Number.isNaN(+maxHourlyRate)) {
      filter['pricing.hourlyRate'].$lte = +maxHourlyRate;
    }
  }
  if (acceptingJobs !== undefined && acceptingJobs !== '') {
    filter.acceptingJobs = acceptingJobs === 'true' || acceptingJobs === true;
  }

  // Sort order mapping
  let sort = { ratingAvg: -1, createdAt: -1 };
  if (sortBy === 'price_asc') {
    sort = { 'pricing.hourlyRate': 1 };
  } else if (sortBy === 'price_desc') {
    sort = { 'pricing.hourlyRate': -1 };
  } else if (sortBy === 'newest') {
    sort = { createdAt: -1 };
  } else if (sortBy === 'rating') {
    sort = { ratingAvg: -1, createdAt: -1 };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    populateRefs(ProviderProfile.find(filter).sort(sort).skip(skip).limit(limit)),
    ProviderProfile.countDocuments(filter),
  ]);
  // Hide providers whose accounts are inactive.
  const visible = items.filter((p) => !p.userId || p.userId.status === 'ACTIVE');
  return {
    items: visible.map(serializePublic),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getPublicProfile(profileId) {
  const profile = await populateRefs(ProviderProfile.findById(profileId));
  if (!profile || profile.verificationStatus !== 'VERIFIED') {
    throw ApiError.notFound('PROVIDER_NOT_FOUND', 'Provider not found.');
  }
  if (profile.userId && profile.userId.status !== 'ACTIVE') {
    throw ApiError.notFound('PROVIDER_NOT_FOUND', 'Provider not found.');
  }
  return serializePublic(profile);
}

module.exports = {
  getOwnProfile,
  createProfile,
  updateOwnProfile,
  submitForVerification,
  addDocument,
  removeDocument,
  decideVerification,
  listProviders,
  getPublicProfile,
};
