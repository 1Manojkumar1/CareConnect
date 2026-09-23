function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function paginated(res, data, pagination, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, pagination });
}

function fail(res, error, requestId) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message =
    statusCode >= 500 ? 'Something went wrong. Please try again.' : error.message;
  const body = { success: false, error: { code, message } };
  if (error.details && statusCode < 500) body.error.details = error.details;
  if (requestId) body.requestId = requestId;
  return res.status(statusCode).json(body);
}

module.exports = { ok, paginated, fail };
