const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { Quote } = require('../src/models/Quote');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = () => new Date(Date.now() + 7 * 86400000).toISOString();

async function seed() {
  const cat = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });
  const skill = await Skill.create({ name: 'Leak Detection', slug: 'leak-detection', categoryId: cat._id });
  return { cat, skill };
}

async function customerWithOpenRequest(cat) {
  const reg = await apiRegister(request, app, { role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${reg.token}`)
    .send({ label: 'Home', line1: '14 Maple Street', city: 'Austin', postalCode: '78701' });
  const created = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${reg.token}`)
    .send({
      categoryId: cat._id.toString(),
      description: 'Kitchen sink is leaking badly.',
      preferredDate: tomorrow(),
      address: { addressId: addr.body.data.id },
      submit: true,
    });
  return { ...reg, requestId: created.body.data.id };
}

async function verifiedProvider(cat, skill, email = 'pro@example.com') {
  const reg = await apiRegister(request, app, { email, role: 'PROVIDER' });
  await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${reg.token}`)
    .send({
      headline: 'Licensed plumber',
      categoryIds: [cat._id.toString()],
      skillIds: [skill._id.toString()],
      serviceAreas: [{ city: 'Austin' }],
    });
  await ProviderProfile.updateOne({ userId: (await User.findOne({ email }))._id }, { verificationStatus: 'VERIFIED' });
  return reg;
}

const QUOTE = (requestId, extra = {}) => ({
  requestId,
  pricing: { labor: 120, materials: 40, tax: 8, discount: 10 },
  estimatedDurationMin: 90,
  proposedDate: tomorrow(),
  timeWindow: 'MORNING',
  notes: 'Includes parts and cleanup.',
  expiresAt: nextWeek(),
  ...extra,
});

describe('quote creation', () => {
  test('server computes total; client totals are ignored', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const res = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ ...QUOTE(customer.requestId), pricing: { labor: 120, materials: 40, tax: 8, discount: 10, total: 9999 } });
    expect(res.status).toBe(201);
    expect(res.body.data.pricing.total).toBe(158);
    expect(res.body.data.status).toBe('PENDING');
  });

  test('duplicate pending quote is rejected; first quote moves request to QUOTED', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const first = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('QUOTE_EXISTS');

    const detail = await request(app)
      .get(`/api/v1/service-requests/${customer.requestId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(detail.body.data.status).toBe('QUOTED');
  });

  test('unverified and non-accepting providers are blocked', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const raw = await apiRegister(request, app, { email: 'newpro@example.com', role: 'PROVIDER' });
    const blocked = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${raw.token}`)
      .send(QUOTE(customer.requestId));
    expect(blocked.status).toBe(404);

    const pro = await verifiedProvider(cat, skill, 'idle@example.com');
    const user = await User.findOne({ email: 'idle@example.com' });
    await ProviderProfile.updateOne({ userId: user._id }, { acceptingJobs: false });
    const idle = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    expect(idle.status).toBe(422);
  });

  test('past expiry and excessive discount are rejected', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const past = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId, { expiresAt: new Date(Date.now() - 1000).toISOString() }));
    expect(past.status).toBe(400);

    const greedy = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId, { pricing: { labor: 10, discount: 999 } }));
    expect(greedy.status).toBe(400);
  });
});

describe('quote decisions', () => {
  test('accept and reject enforce ownership and single decision', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const created = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    const id = created.body.data.id;

    const stranger = await apiRegister(request, app, { role: 'CUSTOMER' });
    const foreign = await request(app).post(`/api/v1/quotes/${id}/accept`).set('Authorization', `Bearer ${stranger.token}`);
    expect(foreign.status).toBe(404);

    const accepted = await request(app).post(`/api/v1/quotes/${id}/accept`).set('Authorization', `Bearer ${customer.token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('ACCEPTED');

    const again = await request(app).post(`/api/v1/quotes/${id}/reject`).set('Authorization', `Bearer ${customer.token}`);
    expect(again.status).toBe(422);
  });

  test('expired quotes cannot be accepted and read as EXPIRED', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const created = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    await Quote.updateOne({ _id: created.body.data.id }, { expiresAt: new Date(Date.now() - 1000) });

    const accept = await request(app)
      .post(`/api/v1/quotes/${created.body.data.id}/accept`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(accept.status).toBe(422);
    expect(accept.body.error.code).toBe('QUOTE_EXPIRED');

    const list = await request(app)
      .get(`/api/v1/quotes?requestId=${customer.requestId}&status=EXPIRED`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(list.body.data).toHaveLength(1);
  });

  test('withdraw locks the quote; a fresh quote is then allowed', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    const created = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    const id = created.body.data.id;

    const withdrawn = await request(app).post(`/api/v1/quotes/${id}/withdraw`).set('Authorization', `Bearer ${pro.token}`);
    expect(withdrawn.body.data.status).toBe('WITHDRAWN');

    const edit = await request(app)
      .patch(`/api/v1/quotes/${id}`)
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ notes: 'too late' });
    expect(edit.status).toBe(422);

    const fresh = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));
    expect(fresh.status).toBe(201);
  });
});

describe('quote scoping', () => {
  test('customers, providers, and staff see the right quotes', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);
    await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(QUOTE(customer.requestId));

    const mine = await request(app)
      .get(`/api/v1/quotes?requestId=${customer.requestId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(mine.body.data).toHaveLength(1);

    const proQuotes = await request(app).get('/api/v1/quotes').set('Authorization', `Bearer ${pro.token}`);
    expect(proQuotes.body.data).toHaveLength(1);

    const otherPro = await apiRegister(request, app, { email: 'other@example.com', role: 'PROVIDER' });
    const none = await request(app).get('/api/v1/quotes').set('Authorization', `Bearer ${otherPro.token}`);
    expect(none.body.data).toHaveLength(0);
  });
});

describe('provider open feed and redaction', () => {
  test('feed shows OPEN requests redacted; customers are forbidden', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);

    const feed = await request(app).get('/api/v1/service-requests/open').set('Authorization', `Bearer ${pro.token}`);
    expect(feed.status).toBe(200);
    expect(feed.body.data).toHaveLength(1);
    const item = feed.body.data[0];
    expect(item.redacted).toBe(true);
    expect(item.customer).toBeUndefined();
    expect(JSON.stringify(item)).not.toMatch(/Maple Street/);
    expect(item.city).toBe('Austin');

    const customerFeed = await request(app).get('/api/v1/service-requests/open').set('Authorization', `Bearer ${customer.token}`);
    expect(customerFeed.status).toBe(403);
  });

  test('redacted detail for OPEN; hidden once QUOTED moves on', async () => {
    const { cat, skill } = await seed();
    const customer = await customerWithOpenRequest(cat);
    const pro = await verifiedProvider(cat, skill);

    const redacted = await request(app)
      .get(`/api/v1/service-requests/${customer.requestId}`)
      .set('Authorization', `Bearer ${pro.token}`);
    expect(redacted.status).toBe(200);
    expect(redacted.body.data.redacted).toBe(true);

    // Another provider's customer must not see it.
    const stranger = await apiRegister(request, app, { role: 'CUSTOMER' });
    const hidden = await request(app)
      .get(`/api/v1/service-requests/${customer.requestId}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(hidden.status).toBe(404);
  });
});
