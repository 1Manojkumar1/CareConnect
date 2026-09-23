const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

async function getRoleToken(role = 'ADMIN', emailPrefix = 'user') {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const reg = await request(app).post('/api/v1/auth/register').send({
    name: `${role} User`,
    email,
    password: 'TestPass1!',
    role: 'CUSTOMER',
  });
  await User.updateOne({ email }, { role });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'TestPass1!' });
  return { token: login.body.data.token, user: reg.body.data.user };
}

describe('Admin & Operations — Platform Stats & Queues', () => {
  test('stats and queue require ADMIN or OPERATIONS role', async () => {
    const cust = await apiRegister(request, app);

    // Unauthenticated
    const unauth = await request(app).get('/api/v1/admin/stats');
    expect(unauth.status).toBe(401);

    // Customer forbidden
    const custRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(custRes.status).toBe(403);

    // Queue forbidden for customer
    const queueRes = await request(app)
      .get('/api/v1/admin/operations/queue')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(queueRes.status).toBe(403);
  });

  test('ADMIN can fetch platform stats with metrics breakdown', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-stats');

    // Create a customer user to show in counts
    await apiRegister(request, app, { email: 'cust-1@example.com' });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.users).toBeDefined();
    expect(data.users.total).toBeGreaterThanOrEqual(2);
    expect(data.users.byRole.ADMIN).toBeGreaterThanOrEqual(1);
    expect(data.providers).toBeDefined();
    expect(data.bookings).toBeDefined();
    expect(data.financials).toBeDefined();
    expect(data.disputes).toBeDefined();
  });

  test('OPERATIONS can fetch operations queue', async () => {
    const ops = await getRoleToken('OPERATIONS', 'ops-queue');

    const res = await request(app)
      .get('/api/v1/admin/operations/queue')
      .set('Authorization', `Bearer ${ops.token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.summary).toBeDefined();
    expect(data.unassignedBookings).toBeDefined();
    expect(data.disputedBookings).toBeDefined();
    expect(data.urgentRequests).toBeDefined();
  });
});

describe('Admin — System Fee Configuration', () => {
  test('fetches default fee configuration', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-fee');

    const res = await request(app)
      .get('/api/v1/admin/fee-config')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.config.platformCommissionPercent).toBe(10);
    expect(res.body.data.config.currency).toBe('USD');
  });

  test('ADMIN can update platform fee configuration', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-fee-upd');

    const res = await request(app)
      .put('/api/v1/admin/fee-config')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        platformCommissionPercent: 12.5,
        minimumBookingFee: 25,
        supportEmail: 'ops@careconnect.local',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.config.platformCommissionPercent).toBe(12.5);
    expect(res.body.data.config.minimumBookingFee).toBe(25);
    expect(res.body.data.config.supportEmail).toBe('ops@careconnect.local');
  });

  test('OPERATIONS cannot update fee configuration', async () => {
    const ops = await getRoleToken('OPERATIONS', 'ops-no-fee');

    const res = await request(app)
      .put('/api/v1/admin/fee-config')
      .set('Authorization', `Bearer ${ops.token}`)
      .send({ platformCommissionPercent: 15 });

    expect(res.status).toBe(403);
  });
});

describe('Admin — User Role Management', () => {
  test('ADMIN can change user role', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-roles');
    const user = await apiRegister(request, app, { email: 'target-user@example.com' });

    const res = await request(app)
      .patch(`/api/v1/users/${user.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'OPERATIONS' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('OPERATIONS');

    const dbUser = await User.findById(user.user.id);
    expect(dbUser.role).toBe('OPERATIONS');
  });

  test('ADMIN cannot change their own role (self-lockout guard)', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-self');

    const res = await request(app)
      .patch(`/api/v1/users/${admin.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'CUSTOMER' });

    expect(res.status).toBe(422);
  });
});
