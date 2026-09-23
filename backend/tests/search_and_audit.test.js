const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
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

describe('Phase D — Enhanced Provider Search & Filtering', () => {
  test('filters providers by text search, rating, price, and availability', async () => {
    const cat = await ServiceCategory.create({ name: 'Electrical', slug: 'electrical' });
    const skill = await Skill.create({ name: 'Wiring', slug: 'wiring', categoryId: cat._id });

    // Create provider 1: $100/hr, 4.8 rating, headline: Expert Electrician
    const p1User = await User.create({
      name: 'Alice Sparks',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    await ProviderProfile.create({
      userId: p1User._id,
      categoryIds: [cat._id],
      skillIds: [skill._id],
      headline: 'Expert Electrician & Lighting Specialist',
      bio: 'Over 10 years experience in residential wiring.',
      serviceAreas: [{ city: 'Austin', state: 'TX', postalCodes: ['78701'] }],
      pricing: { hourlyRate: 100, visitFee: 20, currency: 'USD' },
      verificationStatus: 'VERIFIED',
      acceptingJobs: true,
      ratingAvg: 4.8,
    });

    // Create provider 2: $40/hr, 3.5 rating, headline: Handyman Plumber
    const p2User = await User.create({
      name: 'Bob Fixer',
      email: 'bob@example.com',
      passwordHash: 'hash',
      role: 'PROVIDER',
      status: 'ACTIVE',
    });
    await ProviderProfile.create({
      userId: p2User._id,
      categoryIds: [cat._id],
      skillIds: [skill._id],
      headline: 'Affordable General Handyman',
      bio: 'Quick fixes for all home repairs.',
      serviceAreas: [{ city: 'Austin', state: 'TX', postalCodes: ['78701'] }],
      pricing: { hourlyRate: 40, visitFee: 10, currency: 'USD' },
      verificationStatus: 'VERIFIED',
      acceptingJobs: false,
      ratingAvg: 3.5,
    });

    // 1. Text search matching headline
    const searchRes = await request(app).get('/api/v1/providers?search=Electrician');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].headline).toContain('Expert Electrician');

    // 2. Filter by minRating >= 4.0
    const ratingRes = await request(app).get('/api/v1/providers?minRating=4.0');
    expect(ratingRes.status).toBe(200);
    expect(ratingRes.body.data.length).toBe(1);
    expect(ratingRes.body.data[0].headline).toContain('Expert Electrician');

    // 3. Filter by maxHourlyRate <= 50
    const priceRes = await request(app).get('/api/v1/providers?maxHourlyRate=50');
    expect(priceRes.status).toBe(200);
    expect(priceRes.body.data.length).toBe(1);
    expect(priceRes.body.data[0].pricing.hourlyRate).toBe(40);

    // 4. Filter by acceptingJobs = true
    const availRes = await request(app).get('/api/v1/providers?acceptingJobs=true');
    expect(availRes.status).toBe(200);
    expect(availRes.body.data.length).toBe(1);
    expect(availRes.body.data[0].headline).toContain('Expert Electrician');

    // 5. Sort by price_asc
    const sortRes = await request(app).get('/api/v1/providers?sortBy=price_asc');
    expect(sortRes.status).toBe(200);
    expect(sortRes.body.data.length).toBe(2);
    expect(sortRes.body.data[0].pricing.hourlyRate).toBe(40);
    expect(sortRes.body.data[1].pricing.hourlyRate).toBe(100);
  });
});

describe('Phase D — Extended Service Request Filtering', () => {
  test('filters service requests by urgency and search query', async () => {
    const cust = await apiRegister(request, app);
    const cat = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });

    const auth = (r) => r.set('Authorization', `Bearer ${cust.token}`);

    // Create 1 high urgency request and 1 low urgency request
    await auth(request(app).post('/api/v1/service-requests').send({
      categoryId: cat._id,
      description: 'Emergency broken pipe flooding basement',
      urgency: 'HIGH',
      preferredDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      address: { line1: '123 Main', city: 'Austin', postalCode: '78701' },
    }));

    await auth(request(app).post('/api/v1/service-requests').send({
      categoryId: cat._id,
      description: 'Replace bathroom sink faucet next week',
      urgency: 'LOW',
      preferredDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      address: { line1: '123 Main', city: 'Austin', postalCode: '78701' },
    }));

    // Filter by urgency = HIGH
    const urgencyRes = await auth(request(app).get('/api/v1/service-requests?urgency=HIGH'));
    expect(urgencyRes.status).toBe(200);
    expect(urgencyRes.body.data.length).toBe(1);
    expect(urgencyRes.body.data[0].urgency).toBe('HIGH');

    // Filter by search text
    const searchRes = await auth(request(app).get('/api/v1/service-requests?search=flooding'));
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].description).toContain('flooding basement');
  });
});

describe('Phase D — Audit Trail Logging', () => {
  test('records audit logs on user status and role changes', async () => {
    const admin = await getRoleToken('ADMIN', 'audit-admin');
    const target = await apiRegister(request, app, { email: 'audited-target@example.com' });

    // Change status
    await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'SUSPENDED' });

    // Change role
    await request(app)
      .patch(`/api/v1/users/${target.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'SUPPORT' });

    // Query audit logs as admin
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(auditRes.status).toBe(200);
    const logs = auditRes.body.data.items;
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const actions = logs.map((l) => l.action);
    expect(actions).toContain('USER_STATUS_CHANGE');
    expect(actions).toContain('USER_ROLE_CHANGE');
  });

  test('audit logs endpoint requires ADMIN role', async () => {
    const cust = await apiRegister(request, app);

    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${cust.token}`);

    expect(res.status).toBe(403);
  });
});
