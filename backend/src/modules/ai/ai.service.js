const { ServiceRequest } = require('../../models/ServiceRequest');
const { ServiceCategory } = require('../../models/ServiceCategory');
const { Skill } = require('../../models/Skill');
const { env } = require('../../config/env');
const { ApiError } = require('../../utils/ApiError');
const { CONFIDENCE_THRESHOLD } = require('./ai.constants');
const { heuristicClassify, llmClassify } = require('./ai.provider');

function isStaff(role) {
  return ['OPERATIONS', 'SUPPORT', 'ADMIN'].includes(role);
}

async function loadCatalog() {
  const [tops, subs, skills] = await Promise.all([
    ServiceCategory.find({ parentId: null, isActive: true }).sort({ name: 1 }),
    ServiceCategory.find({ parentId: { $ne: null }, isActive: true }),
    Skill.find({ isActive: true }),
  ]);
  return {
    categories: tops.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      subcategories: subs
        .filter((s) => String(s.parentId) === String(t._id))
        .map((s) => s.name),
    })),
    skills: skills.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      categoryId: String(s.categoryId),
    })),
  };
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Normalize untrusted model output against the live catalog.
// Unknown categories/skills are dropped, never stored.
function normalize(raw, catalog) {
  const urgency = ['LOW', 'MEDIUM', 'HIGH'].includes(raw?.urgency) ? raw.urgency : 'MEDIUM';
  const confidence = clampConfidence(raw?.confidence);
  const categoryName = String(raw?.category || '').trim().toLowerCase();
  const category = catalog.categories.find((c) => c.name.toLowerCase() === categoryName) || null;
  const subName = String(raw?.subcategory || '').trim().toLowerCase();
  const subcategory =
    (category && (category.subcategories || []).find((s) => s.toLowerCase() === subName)) || '';
  const wanted = Array.isArray(raw?.skills) ? raw.skills.map((s) => String(s).toLowerCase()) : [];
  const skills = catalog.skills.filter((s) => wanted.includes(s.name.toLowerCase())).map((s) => s.name);
  const status = !category || confidence < CONFIDENCE_THRESHOLD ? 'NEEDS_REVIEW' : 'DONE';
  return { category: category ? category.name : '', subcategory, skills, urgency, confidence, status };
}

// Runs synchronously (awaited). Never throws for AI reasons —
// provider failures degrade to the heuristic, then to NEEDS_REVIEW.
async function runClassification(requestId, { actorId = null, role = 'CUSTOMER', provider = null } = {}) {
  const doc = await ServiceRequest.findById(requestId);
  if (!doc) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  if (actorId && !isStaff(role) && String(doc.customerId) !== String(actorId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Service request not found.');
  }
  const catalog = await loadCatalog();
  const input = {
    description: doc.description,
    notes: doc.notes,
    categories: catalog.categories,
    skills: catalog.skills,
  };
  let raw;
  try {
    if (provider) {
      raw = await provider(input);
    } else if (env.aiApiKey) {
      try {
        raw = await llmClassify({ ...input, apiKey: env.aiApiKey });
      } catch (err) {
        console.error(`[ai] LLM classification failed, using heuristic: ${err.message}`);
        raw = await heuristicClassify(input);
      }
    } else {
      raw = await heuristicClassify(input);
    }
  } catch (err) {
    console.error(`[ai] classification providers failed: ${err.message}`);
    raw = null;
  }
  let normalized;
  try {
    normalized = normalize(raw, catalog);
  } catch (err) {
    console.error(`[ai] classification normalization failed: ${err.message}`);
    normalized = { category: '', subcategory: '', skills: [], urgency: 'MEDIUM', confidence: 0, status: 'FAILED' };
  }
  let requiredSkills = [];
  if (normalized.status === 'DONE') {
    const wanted = new Set(normalized.skills.map((s) => s.toLowerCase()));
    requiredSkills = catalog.skills.filter((s) => wanted.has(s.name.toLowerCase())).map((s) => s.id);
  }
  await ServiceRequest.updateOne(
    { _id: requestId },
    {
      $set: {
        aiClassification: normalized,
        requiredSkills,
      },
    }
  );
  return normalized;
}

// Fire-and-forget hook for the request lifecycle. Request flow never waits for AI.
function classifyAsync(requestId, actorId = null) {
  setImmediate(() => {
    runClassification(requestId, { actorId }).catch(async (err) => {
      console.error(`[ai] background classification failed for ${requestId}: ${err.message}`);
      try {
        await ServiceRequest.updateOne({ _id: requestId }, { 'aiClassification.status': 'FAILED' });
      } catch (_) {
        // best effort only
      }
    });
  });
}

module.exports = { loadCatalog, normalize, clampConfidence, runClassification, classifyAsync };
