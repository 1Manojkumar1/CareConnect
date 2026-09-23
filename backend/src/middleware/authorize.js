const { ApiError } = require('../utils/ApiError');

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('FORBIDDEN', 'You do not have permission for this action.'));
    }
    return next();
  };
}

module.exports = { authorize };
