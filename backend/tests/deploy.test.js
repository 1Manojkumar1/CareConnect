const request = require('supertest');
const { startDb, stopDb, clearDb } = require('./helpers');

/**
 * Deployment readiness: CORS allowlist behavior, production boot guards,
 * and the admin bootstrap script. These protect the Vercel + Render setup
 * described in docs/DEPLOYMENT.md.
 */

describe('Render health-check compatibility', () => {
  let app;
  let mongo;

  beforeAll(async () => {
    mongo = await startDb();
    app = require('../src/app').createApp();
  });

  afterAll(async () => {
    await stopDb(mongo);
  });

  beforeEach(async () => {
    await clearDb();
  });

  test('GET /api/v1/health answers 200 with no Origin header (like a load-balancer probe)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'ok' }) })
    );
  });
});

describe('CORS allowlist', () => {
  let mongo;

  beforeAll(async () => {
    mongo = await startDb();
  });

  afterAll(async () => {
    await stopDb(mongo);
  });

  function loadAppWithEnv(envOverrides) {
    jest.resetModules();
    const saved = {};
    for (const [key, value] of Object.entries(envOverrides)) {
      saved[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const app = require('../src/app').createApp();
    return {
      app,
      restore() {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
        jest.resetModules();
      },
    };
  }

  test('preflight from an allowlisted origin is reflected with credentials', async () => {
    const { app, restore } = loadAppWithEnv({
      CLIENT_URLS: 'https://careconnect.vercel.app, https://www.example.com/',
    });
    try {
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://www.example.com')
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBe('https://www.example.com');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    } finally {
      restore();
    }
  });

  test('preflight from an unknown origin gets no allow-origin header', async () => {
    const { app, restore } = loadAppWithEnv({
      CLIENT_URLS: 'https://careconnect.vercel.app',
    });
    try {
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://evil.example.com')
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      restore();
    }
  });

  test('suffix allowlist covers https previews but not lookalikes or http', async () => {
    const { app, restore } = loadAppWithEnv({
      CLIENT_URLS: 'https://careconnect.vercel.app',
      CLIENT_URL_SUFFIXES: '.vercel.app',
    });
    try {
      const good = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://careconnect-git-main-acme.vercel.app')
        .set('Access-Control-Request-Method', 'POST');
      expect(good.headers['access-control-allow-origin']).toBe(
        'https://careconnect-git-main-acme.vercel.app'
      );

      const lookalike = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'https://careconnectvercel.app.evil.com')
        .set('Access-Control-Request-Method', 'POST');
      expect(lookalike.headers['access-control-allow-origin']).toBeUndefined();

      const insecure = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://careconnect-git-main-acme.vercel.app')
        .set('Access-Control-Request-Method', 'POST');
      expect(insecure.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      restore();
    }
  });
});

describe('production boot guards', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
    jest.resetModules();
  });

  function loadEnv() {
    jest.resetModules();
    return require('../src/config/env');
  }

  test('refuses to boot in production without secrets, naming each gap', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.CLIENT_URLS;
    delete process.env.CLIENT_URL;
    const { assertProdSecrets } = loadEnv();
    expect(() => assertProdSecrets()).toThrow(/MONGODB_URI.*JWT_SECRET.*CLIENT_URLS/s);
  });

  test('rejects short JWT secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://example.invalid/db';
    process.env.JWT_SECRET = 'too-short';
    process.env.CLIENT_URLS = 'https://app.example.com';
    const { assertProdSecrets } = loadEnv();
    expect(() => assertProdSecrets()).toThrow(/JWT_SECRET/);
  });

  test('passes with a complete production environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://example.invalid/db';
    process.env.JWT_SECRET = 'a'.repeat(48);
    process.env.CLIENT_URLS = 'https://app.example.com';
    const { assertProdSecrets } = loadEnv();
    expect(() => assertProdSecrets()).not.toThrow();
  });

  test('parses comma-separated origins, trimming slashes and blanks', () => {
    delete process.env.CLIENT_URLS;
    process.env.CLIENT_URL = 'http://localhost:5173';
    const { parseList, isOriginAllowed } = loadEnv();
    expect(parseList(' https://a.example.com/, ,https://b.example.com ')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('not-a-url')).toBe(false);
    expect(isOriginAllowed('')).toBe(false);
  });
});

describe('create-admin script validation', () => {
  test('rejects invalid email and short passwords before touching the database', async () => {
    const { main } = require('../scripts/create-admin');
    const savedArgv = [...process.argv];
    const savedEmail = process.env.ADMIN_EMAIL;
    const savedPassword = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    try {
      process.argv = ['node', 'create-admin.js', '--email=not-an-email', '--password=long-enough-secret'];
      await expect(main()).rejects.toThrow(/valid email/i);
      process.argv = ['node', 'create-admin.js', '--email=admin@example.com', '--password=short'];
      await expect(main()).rejects.toThrow(/at least 12 characters/);
    } finally {
      process.argv = savedArgv;
      if (savedEmail === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = savedEmail;
      if (savedPassword === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = savedPassword;
    }
  });
});
