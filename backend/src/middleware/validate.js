const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');

function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));
  return next(ApiError.badRequest('VALIDATION_ERROR', 'Request validation failed.', details));
}

module.exports = { validate };
