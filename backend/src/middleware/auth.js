const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

// Phase 1 foundation: verifies JWT and attaches req.user { id, role }.
// Full user lookup / account-status checks land in Phase 3 (auth).
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('UNAUTHORIZED', 'Authentication required.'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (_err) {
    return next(ApiError.unauthorized('INVALID_TOKEN', 'Session expired. Please sign in again.'));
  }
}

// Optional auth: attaches user when token present, never rejects.
function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = { id: payload.sub, role: payload.role };
    } catch (_err) {
      // ignore — route remains public
    }
  }
  return next();
}

module.exports = { authenticate, optionalAuthenticate };
