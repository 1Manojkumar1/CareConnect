// Confidence below this → NEEDS_REVIEW (owner confirms via normal edit flow).
const CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.55');

const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '10000', 10);
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_MAX_INPUT_CHARS = 2000;

const HIGH_URGENCY_CUES = [
  'emergency', 'urgent', 'flooding', 'flooded', 'burst pipe', 'gas smell',
  'sparking', 'sparks', 'sewage', 'no hot water', 'no heat', 'carbon monoxide',
];
const MEDIUM_URGENCY_CUES = [
  'leak', 'leaking', 'broken', 'not working', 'clogged', 'cracked',
  'noisy', 'banging', 'gurgles', 'slow drain',
];

module.exports = {
  CONFIDENCE_THRESHOLD,
  AI_TIMEOUT_MS,
  AI_BASE_URL,
  AI_MODEL,
  AI_MAX_INPUT_CHARS,
  HIGH_URGENCY_CUES,
  MEDIUM_URGENCY_CUES,
};
