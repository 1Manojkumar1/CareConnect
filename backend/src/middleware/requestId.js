const crypto = require('crypto');

function requestId(req, _res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
}

module.exports = { requestId };
