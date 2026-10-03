const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { ServiceRequest } = require('../src/models/ServiceRequest');
const { Quote } = require('../src/models/Quote');
const { Booking } = require('../src/models/Booking');
const { Invoice } = require('../src/models/Invoice');
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
    expect(data.unassignedRequests).toBeDefined();
    expect(data.disputedBookings).toBeDefined();
    expect(data.urgentRequests).toBeDefined();
  });

  test('stats report real revenue from paid invoices', async () => {
    const admin = await getRoleToken('ADMIN', 'admin-rev');
    const cust = await apiRegister(request, app, { email: 'rev-cust@example.com' });
    const provUser = await User.create({
      name: 'Rev Provider', email: 'rev-prov@example.com', passwordHash: 'x', role: 'PROVIDER', status: 'ACTIVE',
    });
    const profile = await ProviderProfile.create({ userId: provUser._id, verificationStatus: 'VERIFIED' });
    const booking = await Booking.create({
      customerId: cust.user.id,
      providerId: profile._id,
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      status: 'CUSTOMER_CONFIRMED',
      pricing: { total: 200, currency: 'USD' },
    });
    await Invoice.create({
      invoiceNumber: 'INV-TEST-REV-1',
      bookingId: booking._id,
      customerId: cust.user.id,
      providerId: profile._id,
      subtotal: 200,
      tax: 17,
      platformFee: 20,
      total: 237,
      status: 'PAID',
    });

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.financials.paidInvoices).toBe(1);
    expect(res.body.data.financials.totalGMV).toBe(237);
    expect(res.body.data.financials.totalPlatformRevenue).toBe(20);
  });

  test('queue surfaces urgent and unassigned open requests', async () => {
    const ops = await getRoleToken('OPERATIONS', 'ops-queue2');
    const cust = await apiRegister(request, app, { email: 'queue-cust@example.com' });
    const cat = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });

    const mkReq = (urgency, description) =>
      ServiceRequest.create({
        customerId: cust.user.id,
        categoryId: cat._id,
        description,
        urgency,
        address: { label: 'Home', line1: '1 Main St', city: 'Austin', postalCode: '78701' },
        preferredDate: new Date(Date.now() + 86400000),
        timeWindow: 'MORNING',
        requiredSkills: [],
        status: 'OPEN',
        history: [{ status: 'OPEN' }],
      });

    // Urgent + unassigned
    await mkReq('HIGH', 'Burst pipe flooding the kitchen needs immediate repair work.');
    // Quoted (assigned) — must not appear in unassignedRequests
    const quoted = await mkReq('MEDIUM', 'Slow bathroom drain that needs professional cleaning service.');
    const provUser = await User.create({
      name: 'Q Provider', email: 'q-prov@example.com', passwordHash: 'x', role: 'PROVIDER', status: 'ACTIVE',
    });
    const profile = await ProviderProfile.create({ userId: provUser._id, verificationStatus: 'VERIFIED' });
    await Quote.create({
      requestId: quoted._id,
      providerId: profile._id,
      customerId: cust.user.id,
      pricing: { labor: 100, materials: 0, tax: 0, discount: 0, total: 100 },
      estimatedDurationMin: 60,
      proposedDate: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      status: 'PENDING',
    });

    const res = await request(app)
      .get('/api/v1/admin/operations/queue')
      .set('Authorization', `Bearer ${ops.token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.summary.urgentRequestsCount).toBe(1);
    expect(data.urgentRequests).toHaveLength(1);
    expect(data.summary.unassignedRequestsCount).toBe(1);
    expect(data.unassignedRequests).toHaveLength(1);
    expect(String(data.unassignedRequests[0]._id)).not.toBe(String(quoted._id));
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
