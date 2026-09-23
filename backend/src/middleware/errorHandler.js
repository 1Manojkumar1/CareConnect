const { ApiError } = require('../utils/ApiError');

function notFound(_req, _res, next) {
  next(ApiError.notFound('NOT_FOUND', 'The requested resource was not found.'));
}

// Centralized error handler — never leaks stack traces, DB internals, or secrets.
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details;

  // Mongoose validation → 400 without leaking internals
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: 'Invalid value.',
    }));
  }

  // Duplicate key → 409 with safe message
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    details = undefined;
  }

  const isServerError = statusCode >= 500;
  if (isServerError) {
    // Safe server-side log only (no passwords/tokens — callers must sanitize).
    console.error(`[${req.requestId || '-'}]`, err);
  }

  const message = isServerError ? 'Something went wrong. Please try again.' : err.message;

  const body = { success: false, error: { code, message } };
  if (details && !isServerError) body.error.details = details;
  if (req.requestId) body.requestId = req.requestId;
  return res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
