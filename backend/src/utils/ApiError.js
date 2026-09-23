class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(code = 'BAD_REQUEST', message = 'Invalid request.', details) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required.') {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'You do not have permission.') {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found.') {
    return new ApiError(404, code, message);
  }

  static conflict(code = 'CONFLICT', message = 'Resource conflict.') {
    return new ApiError(409, code, message);
  }

  static unprocessable(code = 'INVALID_STATE', message = 'Invalid state transition.') {
    return new ApiError(422, code, message);
  }
}

module.exports = { ApiError };
