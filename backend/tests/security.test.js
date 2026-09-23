const request = require('supertest');
const { createApp } = require('../src/app');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');
const { User } = require('../src/models/User');

describe('Security & Authorization Audit (Phase 20)', () => {
  let app;
  let mongo;

  beforeAll(async () => {
    mongo = await startDb();
    app = createApp();
  });

  afterAll(async () => {
    await stopDb(mongo);
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('HTTP Security Headers', () => {
    it('enforces secure HTTP headers via helmet and disables x-powered-by', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('Input Sanitization & NoSQL Injection Protection', () => {
    it('strips MongoDB operator keys ($gt, $ne, $where) from request payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: 'TestPassword1!',
        });
      // Express validator rejects or sanitizer strips $gt so email is missing/invalid
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('prevents account enumeration by returning identical messages for missing user vs bad password', async () => {
      const resMissing = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'AnyPassword1!' });

      const registered = await apiRegister(request, app);
      const resWrongPass = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: registered.user.email, password: 'WrongPassword99!' });

      expect(resMissing.status).toBe(401);
      expect(resWrongPass.status).toBe(401);
      expect(resMissing.body.error.message).toBe(resWrongPass.body.error.message);
      expect(resMissing.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Sensitive Data Leakage Prevention', () => {
    it('never exposes password hashes or reset tokens in API responses', async () => {
      const registered = await apiRegister(request, app);
      expect(registered.user.passwordHash).toBeUndefined();
      expect(registered.user.passwordResetTokenHash).toBeUndefined();

      const profileRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registered.token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.passwordHash).toBeUndefined();
      expect(profileRes.body.data.passwordResetTokenHash).toBeUndefined();
      expect(profileRes.body.data.passwordResetExpiresAt).toBeUndefined();
    });
  });

  describe('Role-Based Access Control (RBAC) Boundaries', () => {
    it('blocks CUSTOMER from accessing ADMIN and OPERATIONS routes', async () => {
      const customer = await apiRegister(request, app, { role: 'CUSTOMER' });

      const adminStats = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${customer.token}`);
      expect(adminStats.status).toBe(403);
      expect(adminStats.body.error.code).toBe('FORBIDDEN');

      const auditLogs = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${customer.token}`);
      expect(auditLogs.status).toBe(403);

      const feeConfig = await request(app)
        .put('/api/v1/admin/fee-config')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ platformFeeRate: 0.15 });
      expect(feeConfig.status).toBe(403);
    });

    it('blocks PROVIDER from accessing administrative endpoints', async () => {
      const provider = await apiRegister(request, app, { role: 'PROVIDER' });

      const usersList = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${provider.token}`);
      expect(usersList.status).toBe(403);

      const opsQueue = await request(app)
        .get('/api/v1/admin/operations/queue')
        .set('Authorization', `Bearer ${provider.token}`);
      expect(opsQueue.status).toBe(403);
    });
  });

  describe('Account Inactivity Enforcement', () => {
    it('denies login and token generation for SUSPENDED accounts', async () => {
      const user = await apiRegister(request, app);
      await User.updateOne({ _id: user.user.id }, { status: 'SUSPENDED' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.user.email, password: 'TestPass1!' });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });
});
