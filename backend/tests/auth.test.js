const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
}, 180000);

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const customer = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  password: 'S3curePass!',
  role: 'CUSTOMER',
};

async function registerAs(overrides = {}) {
  return request(app).post('/api/v1/auth/register').send({ ...customer, ...overrides });
}

describe('POST /api/v1/auth/register', () => {
  test('valid registration returns safe user + token', async () => {
    const res = await registerAs();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      name: 'Amara Okafor',
      email: 'amara@example.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|reset/i);

    const stored = await User.findOne({ email: 'amara@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe('S3curePass!');
  });

  test('duplicate email returns 409 without leaking internals', async () => {
    await registerAs();
    const res = await registerAs();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('invalid input returns 400 VALIDATION_ERROR with details', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: 'short',
      role: 'CUSTOMER',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('staff role cannot self-register', async () => {
    const res = await registerAs({ email: 'admin@example.com', role: 'ADMIN' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REGISTRATION_NOT_ALLOWED');
  });
});

describe('POST /api/v1/auth/login', () => {
  test('valid credentials return token', async () => {
    await registerAs();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: customer.password });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(customer.email);
  });

  test('wrong password and unknown email give identical 401', async () => {
    await registerAs();
    const wrongPass = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: 'WrongPass123' });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPass123' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.error).toEqual(unknown.body.error);
    expect(wrongPass.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('suspended account cannot log in', async () => {
    await registerAs();
    await User.updateOne({ email: customer.email }, { status: 'SUSPENDED' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: customer.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });
});

describe('protected routes', () => {
  test('GET /me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /me with token returns safe user', async () => {
    const reg = await registerAs();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(customer.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('GET /me with tampered token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer tampered.token.here');
    expect(res.status).toBe(401);
  });

  test('POST /logout returns ok', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);
  });
});

describe('password reset', () => {
  test('forgot-password always succeeds (no enumeration)', async () => {
    await registerAs();
    const existing = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: customer.email });
    const missing = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@example.com' });
    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(existing.body).toEqual(missing.body);
  });

  test('reset with invalid token fails safely', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bogus', password: 'NewSecure1!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('reset with valid token updates password and is single-use', async () => {
    const crypto = require('crypto');
    await registerAs();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: customer.email });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await User.updateOne(
      { email: customer.email },
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(Date.now() + 3600000) }
    );

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'BrandNew1!' });
    expect(res.status).toBe(200);

    const reuse = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'Another1!!' });
    expect(reuse.status).toBe(400);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customer.email, password: 'BrandNew1!' });
    expect(login.status).toBe(200);
  });
});
