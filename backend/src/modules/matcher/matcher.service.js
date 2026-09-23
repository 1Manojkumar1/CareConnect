const { ServiceRequest } = require('../../models/ServiceRequest');
const { ProviderProfile } = require('../../models/ProviderProfile');
const { Skill } = require('../../models/Skill');
const { ApiError } = require('../../utils/ApiError');

const SCORE_WEIGHTS = { skills: 40, area: 20, rating: 10, experience: 10, price: 10, availability: 10 };
const DEFAULT_LIMIT = 20;

function isStaff(role) {
  return ['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role);
}

function sameCity(areaCity, requestCity) {
  return String(areaCity || '').trim().toLowerCase() === String(requestCity || '').trim().toLowerCase();
}

// Deterministic eligibility first (verified, active, accepting, area, skill),
// then transparent scoring. AI never bypasses these gates — it only feeds
// requiredSkills upstream (Phase 6).
function scoreProfile(profile, ctx) {
  const reasons = [];
  let score = 0;

  // --- Skills (40): required set, or category fallback when AI found none ---
  const profileSkillIds = new Set((profile.skillIds || []).map((s) => String(s._id || s)));
  if (ctx.requiredSkillIds.size > 0) {
    const matched = [...ctx.requiredSkillIds].filter((id) => profileSkillIds.has(id));
    if (matched.length === 0) return null;
    score += Math.round((SCORE_WEIGHTS.skills * matched.length) / ctx.requiredSkillIds.size);
    const names = (profile.skillIds || [])
      .filter((s) => matched.includes(String(s._id || s)))
      .map((s) => s.name)
      .slice(0, 3);
    reasons.push(`Matches ${matched.length} of ${ctx.requiredSkillIds.size} required skills${names.length > 0 ? ` (${names.join(', ')})` : ''}`);
  } else {
    const inCategory = (profile.skillIds || []).filter(
      (s) => String(s.categoryId?._id || s.categoryId) === String(ctx.categoryId)
    );
    if (inCategory.length === 0) {
      // Category has no skills to match on — fall back to category overlap.
      const offersCategory = (profile.categoryIds || []).some(
        (c) => String(c._id || c) === String(ctx.categoryId)
      );
      if (!offersCategory) return null;
      score += 20;
      reasons.push(`Offers ${ctx.categoryName} services`);
    } else {
      score += 25;
      reasons.push(`Offers ${ctx.categoryName} skills (${inCategory.slice(0, 3).map((s) => s.name).join(', ')})`);
    }
  }

  // --- Service area (20): request city must be served ---
  const serves = (profile.serviceAreas || []).some((a) => sameCity(a.city, ctx.city));
  if (!serves) return null;
  score += SCORE_WEIGHTS.area;
  reasons.push(`Serves ${ctx.city}`);

  // --- Rating (10) ---
  if (profile.ratingCount > 0) {
    score += Math.round((SCORE_WEIGHTS.rating * Math.min(profile.ratingAvg, 5)) / 5);
    reasons.push(`${profile.ratingAvg.toFixed(1)} rating from ${profile.ratingCount} review${profile.ratingCount === 1 ? '' : 's'}`);
  } else {
    score += 5;
  }

  // --- Experience (10) ---
  score += Math.round(SCORE_WEIGHTS.experience * Math.min(profile.experienceYears || 0, 10) / 10);
  if ((profile.experienceYears || 0) >= 2) reasons.push(`${profile.experienceYears} yrs experience`);

  // --- Price (10): relative to the customer's stated max ---
  if (ctx.budgetMax > 0 && (profile.pricing?.hourlyRate || 0) > 0) {
    const rate = profile.pricing.hourlyRate;
    if (rate <= ctx.budgetMax) {
      score += SCORE_WEIGHTS.price;
      reasons.push('Within your budget');
    } else if (rate <= ctx.budgetMax * 1.25) {
      score += 5;
      reasons.push('Near your budget');
    } else {
      score += 2;
    }
  } else {
    score += 5;
  }

  // --- Availability (10): accepting-jobs gate (deep slot checks land in Phase 9) ---
  if (!profile.acceptingJobs) return null;
  score += SCORE_WEIGHTS.availability;

  return { score: Math.min(score, 100), reasons };
}

function serializeMatch(profile, { score, reasons }) {
  return {
    id: profile._id.toString(),
    name: profile.userId?.name || '',
    headline: profile.headline,
    score,
    matchReasons: reasons,
    categories: (profile.categoryIds || []).map((c) => ({ id: c._id.toString(), name: c.name })),
    skills: (profile.skillIds || []).map((s) => ({ id: s._id.toString(), name: s.name })),
    serviceAreas: profile.serviceAreas || [],
    pricing: profile.pricing,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    jobsCompleted: profile.jobsCompleted,
    experienceYears: profile.experienceYears,
  };
}

async function findProvidersForRequest(requestId, { userId, role, limit = DEFAULT_LIMIT } = {}) {
  const doc = await ServiceRequest.findById(requestId).populate('categoryId', 'name');
  if (!doc) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  if (!isStaff(role) && String(doc.customerId) !== String(userId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  if (!['OPEN', 'QUOTED'].includes(doc.status)) {
    throw ApiError.unprocessable('REQUEST_NOT_MATCHABLE', `Providers can only be matched for open requests (now ${doc.status}).`);
  }

  // Enrich the required-skill set with the request category's skills so that
  // category-only requests still match on something meaningful.
  let requiredSkillIds = new Set((doc.requiredSkills || []).map(String));
  if (requiredSkillIds.size === 0) {
    const categorySkills = await Skill.find({ categoryId: doc.categoryId, isActive: true }).select('_id');
    requiredSkillIds = new Set(categorySkills.map((s) => String(s._id)));
  }

  const ctx = {
    requiredSkillIds,
    categoryId: String(doc.categoryId?._id || doc.categoryId),
    categoryName: doc.categoryId?.name || 'this service',
    city: doc.address?.city || '',
    budgetMax: doc.budget?.max || 0,
  };

  const candidates = await ProviderProfile.find({ verificationStatus: 'VERIFIED' })
    .populate('userId', 'name status')
    .populate('categoryIds', 'name')
    .populate({ path: 'skillIds', select: 'name categoryId' });

  const ranked = [];
  for (const profile of candidates) {
    if (!profile.userId || profile.userId.status !== 'ACTIVE') continue;
    const scored = scoreProfile(profile, ctx);
    if (scored) ranked.push(serializeMatch(profile, scored));
  }
  ranked.sort(
    (a, b) => b.score - a.score || b.ratingAvg - a.ratingAvg || b.experienceYears - a.experienceYears
  );
  const items = ranked.slice(0, Math.min(limit, 50));
  return { providers: items, meta: { total: ranked.length, requestId: String(doc._id) } };
}

module.exports = { findProvidersForRequest, scoreProfile, SCORE_WEIGHTS };
