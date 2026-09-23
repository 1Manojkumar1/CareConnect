const {
  AI_TIMEOUT_MS,
  AI_BASE_URL,
  AI_MODEL,
  AI_MAX_INPUT_CHARS,
  HIGH_URGENCY_CUES,
  MEDIUM_URGENCY_CUES,
} = require('./ai.constants');

function tokens(value) {
  return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Exact match, or inflection-tolerant substring match on words of length ≥ 4
// ("leaking" matches "leak", but "at" never matches "heating").
function wordMatches(keyword, textToken) {
  if (keyword === textToken) return true;
  const short = keyword.length < textToken.length ? keyword : textToken;
  const long = keyword.length < textToken.length ? textToken : keyword;
  return short.length >= 4 && long.includes(short);
}

function containsToken(haystackTokens, needle) {
  return haystackTokens.some((t) => wordMatches(needle, t));
}

function detectUrgency(text) {
  const lower = String(text || '').toLowerCase();
  if (HIGH_URGENCY_CUES.some((cue) => lower.includes(cue))) return 'HIGH';
  if (MEDIUM_URGENCY_CUES.some((cue) => lower.includes(cue))) return 'MEDIUM';
  return 'MEDIUM';
}

// Deterministic keyword classifier over the live catalog.
// Always available: used when no LLM key is configured and as the LLM fallback.
async function heuristicClassify({ description, notes, categories, skills }) {
  const text = `${description || ''}\n${notes || ''}`.slice(0, AI_MAX_INPUT_CHARS);
  const textTokens = tokens(text);

  let best = null;
  let bestScore = 0;
  for (const cat of categories) {
    let score = 0;
    for (const word of tokens(cat.name)) {
      if (containsToken(textTokens, word)) score += 2;
    }
    for (const sub of cat.subcategories || []) {
      for (const word of tokens(sub)) {
        if (containsToken(textTokens, word)) score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  if (!best) {
    return { category: '', subcategory: '', skills: [], urgency: detectUrgency(text), confidence: 0.2 };
  }

  const matchedSkills = [];
  for (const skill of skills.filter((s) => String(s.categoryId) === String(best.id))) {
    const words = tokens(skill.name);
    if (words.some((w) => containsToken(textTokens, w))) matchedSkills.push(skill.name);
    if (matchedSkills.length >= 4) break;
  }

  let subcategory = '';
  let subScore = 0;
  for (const sub of best.subcategories || []) {
    let score = 0;
    for (const word of tokens(sub)) {
      if (containsToken(textTokens, word)) score += 1;
    }
    if (score > subScore) {
      subScore = score;
      subcategory = sub;
    }
  }

  const confidence = Math.min(0.95, 0.45 + 0.1 * bestScore + (matchedSkills.length > 0 ? 0.1 : 0));
  return {
    category: best.name,
    subcategory,
    skills: matchedSkills,
    urgency: detectUrgency(text),
    confidence: Math.round(confidence * 100) / 100,
  };
}

function buildPrompt({ description, notes, categories, skills }) {
  const catalog = categories
    .map((c) => {
      const subs = (c.subcategories || []).join(', ');
      const catSkills = skills.filter((s) => String(s.categoryId) === String(c.id)).map((s) => s.name);
      return `- ${c.name}${subs ? ` (services: ${subs})` : ''}${catSkills.length > 0 ? ` (skills: ${catSkills.join(', ')})` : ''}`;
    })
    .join('\n');
  return {
    system:
      'You classify home-service requests. Reply with JSON only, no other text. ' +
      'Schema: {"category": string (one of the catalog names, or "" if none fits), ' +
      '"subcategory": string (or ""), "skills": string[] (names from the catalog only), ' +
      '"urgency": "LOW"|"MEDIUM"|"HIGH", "confidence": number 0..1}. ' +
      'Be conservative: low confidence when the text is vague.',
    user: `Catalog:\n${catalog}\n\nRequest:\n${`${description || ''}\n${notes || ''}`.slice(0, AI_MAX_INPUT_CHARS)}`,
  };
}

// OpenAI-compatible chat-completions adapter (works with any compatible gateway).
// Throws on timeout, non-2xx, or unparseable output — the service falls back.
async function llmClassify({ description, notes, categories, skills, apiKey, fetchImpl = fetch, timeoutMs = AI_TIMEOUT_MS }) {
  const { system, user } = buildPrompt({ description, notes, categories, skills });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LLM responded with status ${res.status}`);
    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned no content');
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { heuristicClassify, llmClassify, buildPrompt, detectUrgency };
