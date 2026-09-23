const { Quote } = require('../../models/Quote');
const { ServiceRequest } = require('../../models/ServiceRequest');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { ApiError } = require('../../utils/ApiError');

function computeTotal({ labor, materials = 0, tax = 0, discount = 0 }) {
  return Math.round((labor + materials + tax - discount) * 100) / 100;
}

function isLive(status) {
  return status === 'PENDING';
}

function isExpired(doc) {
  return isLive(doc.status) && doc.expiresAt.getTime() < Date.now();
}

// Display status: PENDING past expiry reads as EXPIRED without a write.
function effectiveStatus(doc) {
  if (isExpired(doc)) return 'EXPIRED';
  return doc.status;
}

function serialize(doc) {
  const status = effectiveStatus(doc);
  return {
    id: doc._id.toString(),
    requestId: String(doc.requestId?._id || doc.requestId),
    provider: doc.providerId && doc.providerId.headline !== undefined
      ? {
        id: doc.providerId._id.toString(),
        headline: doc.providerId.headline,
        experienceYears: doc.providerId.experienceYears,
        ratingAvg: doc.providerId.ratingAvg,
        ratingCount: doc.providerId.ratingCount,
      }
      : { id: String(doc.providerId) },
    customerId: String(doc.customerId),
    pricing: doc.pricing,
    estimatedDurationMin: doc.estimatedDurationMin,
    proposedDate: doc.proposedDate,
    timeWindow: doc.timeWindow,
    notes: doc.notes,
    expiresAt: doc.expiresAt,
    status,
    decidedAt: doc.decidedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function populate(query) {
  return query.populate('providerId', 'headline experienceYears ratingAvg ratingCount');
}

async function assertProviderEligible(userId) {
  const profile = await ProviderProfile.findOne({ userId }).populate('userId', 'status');
  if (!profile) throw ApiError.notFound('PROFILE_NOT_FOUND', 'Provider profile not found.');
  if (!profile.userId || profile.userId.status !== 'ACTIVE') {
    throw ApiError.forbidden('ACCOUNT_INACTIVE', 'This provider account is not active.');
  }
  if (profile.verificationStatus !== 'VERIFIED') {
    throw ApiError.forbidden('PROVIDER_UNVERIFIED', 'Only verified providers can quote.');
  }
  if (!profile.acceptingJobs) {
    throw ApiError.unprocessable('NOT_ACCEPTING_JOBS', 'This provider is not accepting new jobs.');
  }
  return profile;
}

async function assertQuotableRequest(requestId) {
  const req = await ServiceRequest.findById(requestId);
  if (!req) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  if (!['OPEN', 'QUOTED'].includes(req.status)) {
    throw ApiError.unprocessable('REQUEST_NOT_QUOTABLE', `Requests in ${req.status} cannot receive quotes.`);
  }
  return req;
}

async function createQuote(userId, data) {
  const profile = await assertProviderEligible(userId);
  const req = await assertQuotableRequest(data.requestId);

  const existing = await Quote.findOne({ requestId: req._id, providerId: profile._id, status: 'PENDING' });
  if (existing) {
    throw ApiError.conflict('QUOTE_EXISTS', 'You already have a pending quote for this request.');
  }

  const labor = data.pricing.labor;
  const materials = data.pricing.materials || 0;
  const tax = data.pricing.tax || 0;
  const discount = data.pricing.discount || 0;
  if (discount > labor + materials + tax) {
    throw ApiError.badRequest('INVALID_PRICING', 'Discount cannot exceed the subtotal.');
  }
  const expiresAt = new Date(data.expiresAt);
  if (expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('INVALID_EXPIRY', 'Quote expiry must be in the future.');
  }
  const proposedDate = new Date(data.proposedDate);
  if (Number.isNaN(proposedDate.getTime())) {
    throw ApiError.badRequest('INVALID_DATE', 'Proposed date is invalid.');
  }

  const quote = await Quote.create({
    requestId: req._id,
    providerId: profile._id,
    customerId: req.customerId,
    pricing: {
      labor,
      materials,
      tax,
      discount,
      total: computeTotal({ labor, materials, tax, discount }),
      currency: (data.pricing.currency || 'USD').toUpperCase(),
    },
    estimatedDurationMin: data.estimatedDurationMin || 60,
    proposedDate,
    timeWindow: data.timeWindow || 'FLEXIBLE',
    notes: (data.notes || '').trim(),
    expiresAt,
    status: 'PENDING',
  });

  // First quote moves the request into the quoted stage (PRD lifecycle).
  if (req.status === 'OPEN') {
    req.status = 'QUOTED';
    req.history.push({ status: 'QUOTED', actorId: userId });
    await req.save();
  }
  return serialize(await populate(Quote.findById(quote._id)));
}

async function updateQuote(userId, quoteId, data) {
  const profile = await ProviderProfile.findOne({ userId });
  const quote = await Quote.findById(quoteId);
  if (!profile || !quote || String(quote.providerId) !== String(profile._id)) {
    throw ApiError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
  }
  if (!isLive(quote.status) || isExpired(quote)) {
    throw ApiError.unprocessable('QUOTE_LOCKED', `Quotes in ${effectiveStatus(quote)} cannot change.`);
  }
  if (data.pricing) {
    const next = {
      labor: data.pricing.labor ?? quote.pricing.labor,
      materials: data.pricing.materials ?? quote.pricing.materials,
      tax: data.pricing.tax ?? quote.pricing.tax,
      discount: data.pricing.discount ?? quote.pricing.discount,
    };
    if (next.discount > next.labor + next.materials + next.tax) {
      throw ApiError.badRequest('INVALID_PRICING', 'Discount cannot exceed the subtotal.');
    }
    quote.pricing = {
      ...next,
      total: computeTotal(next),
      currency: (data.pricing.currency || quote.pricing.currency || 'USD').toUpperCase(),
    };
  }
  if (data.estimatedDurationMin !== undefined) quote.estimatedDurationMin = data.estimatedDurationMin;
  if (data.proposedDate !== undefined) quote.proposedDate = new Date(data.proposedDate);
  if (data.timeWindow !== undefined) quote.timeWindow = data.timeWindow;
  if (data.notes !== undefined) quote.notes = data.notes.trim();
  if (data.expiresAt !== undefined) {
    const expiresAt = new Date(data.expiresAt);
    if (expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('INVALID_EXPIRY', 'Quote expiry must be in the future.');
    }
    quote.expiresAt = expiresAt;
  }
  await quote.save();
  return serialize(await populate(Quote.findById(quote._id)));
}

async function decideQuote(quoteId, { customerId = null, userId = null, to }) {
  const quote = await Quote.findById(quoteId);
  if (!quote) throw ApiError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');

  if (to === 'WITHDRAWN') {
    const profile = await ProviderProfile.findOne({ userId });
    if (!profile || String(quote.providerId) !== String(profile._id)) {
      throw ApiError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    }
  } else {
    if (String(quote.customerId) !== String(customerId)) {
      throw ApiError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    }
  }
  if (!isLive(quote.status)) {
    throw ApiError.unprocessable('QUOTE_DECIDED', `This quote is already ${quote.status}.`);
  }
  if (isExpired(quote)) {
    throw ApiError.unprocessable('QUOTE_EXPIRED', 'This quote has expired.');
  }
  quote.status = to;
  quote.decidedAt = new Date();
  await quote.save();
  return serialize(await populate(Quote.findById(quote._id)));
}

async function listQuotes({ role, userId, requestId, status, providerId, page = 1, limit = 20 }) {
  const filter = {};
  if (role === 'CUSTOMER') {
    filter.customerId = userId;
  } else if (role === 'PROVIDER') {
    const profile = await ProviderProfile.findOne({ userId });
    if (!profile) return { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    filter.providerId = profile._id;
  } else if (providerId) {
    filter.providerId = providerId;
  }
  if (requestId) filter.requestId = requestId;
  if (status) {
    if (status === 'EXPIRED') {
      filter.status = 'PENDING';
      filter.expiresAt = { $lt: new Date() };
    } else {
      filter.status = status;
      if (status === 'PENDING') filter.expiresAt = { $gte: new Date() };
    }
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    populate(Quote.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Quote.countDocuments(filter),
  ]);
  return { items: items.map(serialize), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

module.exports = { createQuote, updateQuote, decideQuote, listQuotes, computeTotal, effectiveStatus };
