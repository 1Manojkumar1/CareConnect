const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { env, isOriginAllowed } = require('./config/env');
const { requestId } = require('./middleware/requestId');
const { mongoSanitize } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const v1Routes = require('./routes/v1');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmet());
  // CORS allowlist: exact origins from CLIENT_URLS (+ legacy CLIENT_URL),
  // plus https suffix matches from CLIENT_URL_SUFFIXES (e.g. ".vercel.app"
  // for preview deployments). Requests without an Origin header (curl,
  // health checks, server-to-server) are always allowed.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 86400,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize);
  app.use(cookieParser());
  app.use(
    morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
      skip: (req) => req.path === '/api/v1/health',
    })
  );

  // Root — no business logic, just discovery.
  app.get('/', (_req, res) => {
    res.json({ success: true, data: { service: 'careconnect-api', api: '/api/v1' } });
  });

  app.use('/api/v1', apiLimiter, v1Routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
