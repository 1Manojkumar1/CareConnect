require('dotenv').config();

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

// CLIENT_URLS (comma-separated) is preferred for deployments with several
// frontends (production domain, Vercel previews). CLIENT_URL remains as a
// backwards-compatible single-origin fallback for local development.
const clientOrigins = parseList(process.env.CLIENT_URLS);
if (clientOrigins.length === 0 && process.env.CLIENT_URL) {
  clientOrigins.push(...parseList(process.env.CLIENT_URL));
}

// Suffix allowlist for preview deployments, e.g. ".vercel.app".
// Exact origins in clientOrigins always win; suffixes only match https hosts.
const originSuffixes = parseList(process.env.CLIENT_URL_SUFFIXES);

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (clientOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    return originSuffixes.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careconnect',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: clientOrigins[0] || 'http://localhost:5173',
  clientOrigins,
  originSuffixes,
  aiApiKey: process.env.AI_API_KEY || '',
};

function assertProdSecrets() {
  if (env.nodeEnv === 'production') {
    const missing = [];
    if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-only-secret-change-me') {
      missing.push('JWT_SECRET');
    } else if (process.env.JWT_SECRET.length < 32) {
      missing.push('JWT_SECRET (must be at least 32 characters)');
    }
    if (clientOrigins.length === 0) {
      missing.push('CLIENT_URLS (at least one frontend origin, e.g. https://app.example.com)');
    }
    if (missing.length > 0) {
      throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
    }
  }
}

module.exports = { env, assertProdSecrets, isOriginAllowed, parseList };
