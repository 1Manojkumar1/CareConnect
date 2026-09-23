const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ServiceRequest } = require('../src/models/ServiceRequest');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');
const { scoreProfile } = require('../src/modules/matcher/matcher.service');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const tomorrow = () => new Date(Date.now() + 86400000);

async function seed() {
  const plumbing = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });
  const leak = await Skill.create({ name: 'Leak Detection', slug: 'leak-detection', categoryId: plumbing._id });
  const pipe = await Skill.create({ name: 'Pipe Repair', slug: 'pipe-repair', categoryId: plumbing._id });
  const electrical = await ServiceCategory.create({ name: 'Electrical', slug: 'electrical' });
  const wiring = await Skill.create({ name: 'Wiring', slug: 'wiring', categoryId: electrical._id });
  return { plumbing, leak, pipe, electrical, wiring };
}

async function makeProvider({ name, email, skillIds, catId, city = 'Austin', verified = true, active = true, accepting = true, ratingAvg = 0, ratingCount = 0, exp = 0, rate = 0 }) {
  const user = await User.create({
    name, email, passwordHash: 'hashed', role: 'PROVIDER', status: active ? 'ACTIVE' : 'SUSPENDED',
  });
  const profile = await ProviderProfile.create({
    userId: user._id,
    headline: `${name} headline`,
    skillIds,
    categoryIds: [catId],
    serviceAreas: [{ city }],
    verificationStatus: verified ? 'VERIFIED' : 'PENDING',
    acceptingJobs: accepting,
    ratingAvg,
    ratingCount,
    experienceYears: exp,
    pricing: { hourlyRate: rate, visitFee: 0 },
  });
  return { user, profile };
}

async function makeCustomer() {
  const reg = await apiRegister(request, app, { role: 'CUSTOMER' });
  return reg;
}

async function makeRequest(customerId, catId, skillIds, city = 'Austin', status = 'OPEN') {
  return ServiceRequest.create({
    customerId,
    categoryId: catId,
    description: 'Leaking sink needs repair.',
    urgency: 'MEDIUM',
    budget: { min: 50, max: 200 },
    address: { label: 'Home', line1: '1 Main St', city, postalCode: '78701' },
    preferredDate: tomorrow(),
    timeWindow: 'MORNING',
    requiredSkills: skillIds,
    status,
    history: [{ status }],
  });
}

describe('eligibility gates', () => {
  test.each([
    ['unverified', { verified: false }],
    ['suspended account', { active: false }],
    ['not accepting jobs', { accepting: false }],
    ['wrong city', { city: 'Denver' }],
  ])('%s providers are excluded', async (_label, overrides) => {
    const { plumbing, leak } = await seed();
    const { user } = await makeCustomer();
    await makeProvider({
      name: 'Pro', email: 'pro@example.com', skillIds: [leak._id], catId: plumbing._id, ...overrides,
    });
    const req = await makeRequest(user.id, plumbing._id, [leak._id]);
    const customer = await User.findById(user.id);
    const login = await request(app).post('/api/v1/auth/login').send({ email: customer.email, password: 'TestPass1!' });
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.providers).toHaveLength(0);
    expect(res.body.data.meta.total).toBe(0);
  });

  test('provider missing all required skills is excluded', async () => {
    const { plumbing, leak, electrical, wiring } = await seed();
    const { user, token } = await makeCustomer();
    await makeProvider({ name: 'Spark', email: 'spark@example.com', skillIds: [wiring._id], catId: electrical._id });
    const req = await makeRequest(user.id, plumbing._id, [leak._id]);
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.providers).toHaveLength(0);
  });
});

describe('ranking and scoring', () => {
  test('better match ranks first with reasons and bounded score', async () => {
    const { plumbing, leak, pipe } = await seed();
    const { user, token } = await makeCustomer();
    await makeProvider({
      name: 'Average Alex', email: 'alex@example.com', skillIds: [leak._id], catId: plumbing._id,
      exp: 2, rate: 150, ratingAvg: 3.5, ratingCount: 2,
    });
    await makeProvider({
      name: 'Super Sam', email: 'sam@example.com', skillIds: [leak._id, pipe._id], catId: plumbing._id,
      exp: 9, rate: 90, ratingAvg: 4.8, ratingCount: 20,
    });
    const req = await makeRequest(user.id, plumbing._id, [leak._id, pipe._id]);
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const [first, second] = res.body.data.providers;
    expect(first.name).toBe('Super Sam');
    expect(first.score).toBeGreaterThan(second.score);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.matchReasons.join(' ')).toMatch(/required skills|Serves Austin|budget/i);
  });

  test('empty requiredSkills enriches from category skills', async () => {
    const { plumbing, leak } = await seed();
    const { user, token } = await makeCustomer();
    await makeProvider({ name: 'Cat Pro', email: 'cat@example.com', skillIds: [leak._id], catId: plumbing._id });
    const req = await makeRequest(user.id, plumbing._id, []);
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.providers).toHaveLength(1);
    expect(res.body.data.providers[0].matchReasons.join(' ')).toMatch(/required skills/);
  });

  test('skill-less categories match on category overlap', async () => {
    const odd = await ServiceCategory.create({ name: 'Odd Jobs', slug: 'odd-jobs' });
    const { user, token } = await makeCustomer();
    await makeProvider({ name: 'Odd Pro', email: 'odd@example.com', skillIds: [], catId: odd._id });
    const req = await makeRequest(user.id, odd._id, []);
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.providers).toHaveLength(1);
    expect(res.body.data.providers[0].matchReasons.join(' ')).toMatch(/Odd Jobs services/);
  });

  test('limit param caps results', async () => {
    const { plumbing, leak } = await seed();
    const { user, token } = await makeCustomer();
    for (let i = 0; i < 3; i++) {
      await makeProvider({ name: `Pro ${i}`, email: `pro${i}@example.com`, skillIds: [leak._id], catId: plumbing._id });
    }
    const req = await makeRequest(user.id, plumbing._id, [leak._id]);
    const res = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers?limit=2`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.providers).toHaveLength(2);
    expect(res.body.data.meta.total).toBe(3);
  });
});

describe('guards', () => {
  test('strangers get 404, anonymous gets 401, DRAFT gets 422', async () => {
    const { plumbing, leak } = await seed();
    const { user, token } = await makeCustomer();
    await makeProvider({ name: 'Pro', email: 'pro@example.com', skillIds: [leak._id], catId: plumbing._id });
    const req = await makeRequest(user.id, plumbing._id, [leak._id], 'Austin', 'DRAFT');

    const draft = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${token}`);
    expect(draft.status).toBe(422);

    await ServiceRequest.updateOne({ _id: req._id }, { status: 'OPEN' });
    const stranger = await makeCustomer();
    const denied = await request(app)
      .get(`/api/v1/service-requests/${req._id}/providers`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(denied.status).toBe(404);

    const anon = await request(app).get(`/api/v1/service-requests/${req._id}/providers`);
    expect(anon.status).toBe(401);
  });
});

describe('scoreProfile unit', () => {
  test('returns null when city is not served', () => {
    const out = scoreProfile(
      { skillIds: [{ _id: 'a', name: 'S', categoryId: 'c' }], serviceAreas: [{ city: 'Denver' }], acceptingJobs: true, ratingCount: 0, experienceYears: 1, pricing: {} },
      { requiredSkillIds: new Set(['a']), categoryId: 'c', categoryName: 'Cat', city: 'Austin', budgetMax: 0 }
    );
    expect(out).toBeNull();
  });
});
