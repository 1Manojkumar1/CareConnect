const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { Booking } = require('../src/models/Booking');
const { Quote } = require('../src/models/Quote');
const { Invoice } = require('../src/models/Invoice');
const { startDb, stopDb, clearDb, apiRegister, setRole } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

async function seedPlumbing() {
  const cat = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });
  const sub = await ServiceCategory.create({ name: 'Leak Repair', slug: 'leak-repair', parentId: cat._id });
  const skill = await Skill.create({ name: 'Leak Detection', slug: 'leak-detection', categoryId: cat._id });
  const otherCat = await ServiceCategory.create({ name: 'Electrical', slug: 'electrical' });
  const otherSkill = await Skill.create({ name: 'Wiring', slug: 'wiring', categoryId: otherCat._id });
  return { cat, sub, skill, otherCat, otherSkill };
}

async function providerToken(email = 'pro@example.com') {
  const reg = await apiRegister(request, app, { email, role: 'PROVIDER' });
  return reg;
}

const PROFILE = (ids) => ({
  headline: 'Licensed plumber with 8 years experience',
  bio: 'Residential repairs and installations.',
  experienceYears: 8,
  categoryIds: [ids.cat._id.toString()],
  skillIds: [ids.skill._id.toString()],
  serviceAreas: [{ city: 'Austin', area: 'Downtown', postalCode: '78701' }],
  pricing: { hourlyRate: 85, visitFee: 49, currency: 'USD' },
});

describe('provider profile lifecycle', () => {
  test('customers cannot create provider profiles', async () => {
    const { token } = await apiRegister(request, app, { role: 'CUSTOMER' });
    const res = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'x' });
    expect(res.status).toBe(403);
  });

  test('provider creates profile; duplicate rejected; refs validated', async () => {
    const ids = await seedPlumbing();
    const { token } = await providerToken();

    const created = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(PROFILE(ids));
    expect(created.status).toBe(201);
    expect(created.body.data.verificationStatus).toBe('PENDING');
    expect(created.body.data.skills[0].name).toBe('Leak Detection');

    const dup = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(PROFILE(ids));
    expect(dup.status).toBe(409);

    const { token: token2 } = await providerToken('pro2@example.com');
    const mismatch = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token2}`)
      .send({ ...PROFILE(ids), skillIds: [ids.otherSkill._id.toString()] });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe('SKILL_CATEGORY_MISMATCH');
  });

  test('incomplete profile cannot be submitted; submit moves to UNDER_REVIEW once', async () => {
    await seedPlumbing();
    const { token } = await providerToken();
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'Bare profile' });

    const incomplete = await request(app)
      .post('/api/v1/providers/profile/me/submit')
      .set('Authorization', `Bearer ${token}`);
    expect(incomplete.status).toBe(422);

    const { token: token2 } = await providerToken('pro2@example.com');
    const ids = await ServiceCategory.findOne({ slug: 'plumbing' }).then(async (cat) => ({
      cat,
      skill: await Skill.findOne({ slug: 'leak-detection' }),
    }));
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token2}`)
      .send(PROFILE(ids));

    const submitted = await request(app)
      .post('/api/v1/providers/profile/me/submit')
      .set('Authorization', `Bearer ${token2}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.verificationStatus).toBe('UNDER_REVIEW');

    const again = await request(app)
      .post('/api/v1/providers/profile/me/submit')
      .set('Authorization', `Bearer ${token2}`);
    expect(again.status).toBe(422);
  });

  test('verification decision enforces transitions; public hides unverified', async () => {
    const ids = await seedPlumbing();
    const { token } = await providerToken();
    const created = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(PROFILE(ids));
    const profileId = created.body.data.id;

    const hidden = await request(app).get(`/api/v1/providers/${profileId}`);
    expect(hidden.status).toBe(404);

    // Admin login setup
    await apiRegister(request, app, { email: 'ops-admin@example.com' });
    await setRole('ops-admin@example.com', 'ADMIN');
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ops-admin@example.com', password: 'TestPass1!' });
    const adminToken = login.body.data.token;

    // Cannot verify directly from PENDING
    const skip = await request(app)
      .patch(`/api/v1/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED' });
    expect(skip.status).toBe(422);

    await request(app)
      .post('/api/v1/providers/profile/me/submit')
      .set('Authorization', `Bearer ${token}`);

    const verified = await request(app)
      .patch(`/api/v1/providers/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED', notes: 'License checked.' });
    expect(verified.status).toBe(200);
    expect(verified.body.data.verificationStatus).toBe('VERIFIED');

    const visible = await request(app).get(`/api/v1/providers/${profileId}`);
    expect(visible.status).toBe(200);
    expect(visible.body.data.documents).toBeUndefined();

    const list = await request(app).get('/api/v1/providers?city=Austin');
    expect(list.body.data).toHaveLength(1);
  });

  test('documents validate mime type', async () => {
    await seedPlumbing();
    const { token } = await providerToken();
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'Docs test' });

    const bad = await request(app)
      .post('/api/v1/providers/profile/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'run.exe', mimeType: 'application/x-msdownload', size: 100, storageKey: 'k' });
    expect(bad.status).toBe(400);

    const good = await request(app)
      .post('/api/v1/providers/profile/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'license.pdf', mimeType: 'application/pdf', size: 1024, storageKey: 'docs/license.pdf' });
    expect(good.status).toBe(201);
    expect(good.body.data.documents).toHaveLength(1);
  });
});

describe('provider analytics', () => {
  test('returns zeros for a fresh profile; customers forbidden', async () => {
    const { token } = await providerToken('fresh@example.com');
    await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'New plumber' })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/providers/profile/me/analytics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.jobsCompleted).toBe(0);
    expect(res.body.data.revenue).toBe(0);
    expect(res.body.data.quoteAcceptanceRate).toBe(0);

    const cust = await apiRegister(request, app, { role: 'CUSTOMER' });
    await request(app)
      .get('/api/v1/providers/profile/me/analytics')
      .set('Authorization', `Bearer ${cust.token}`)
      .expect(403);
  });

  test('aggregates jobs, quotes, and paid revenue', async () => {
    const prov = await providerToken('busy@example.com');
    const cust = await apiRegister(request, app, { email: 'a-cust@example.com', role: 'CUSTOMER' });
    const { User } = require('../src/models/User');
    const provUser = await User.findOne({ email: 'busy@example.com' });
    const profile = await ProviderProfile.create({ userId: provUser._id, verificationStatus: 'VERIFIED', ratingAvg: 4.5, ratingCount: 10 });

    const mkBooking = (status) => Booking.create({
      customerId: cust.user.id,
      providerId: profile._id,
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      status,
    });
    await mkBooking('CLOSED');
    await mkBooking('COMPLETED');
    await mkBooking('CANCELLED');
    await mkBooking('CONFIRMED');

    await Quote.create({
      requestId: new (require('mongoose').Types.ObjectId)(),
      providerId: profile._id,
      customerId: cust.user.id,
      pricing: { labor: 100, materials: 0, tax: 0, discount: 0, total: 100 },
      estimatedDurationMin: 60,
      proposedDate: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      status: 'ACCEPTED',
    });
    await Quote.create({
      requestId: new (require('mongoose').Types.ObjectId)(),
      providerId: profile._id,
      customerId: cust.user.id,
      pricing: { labor: 80, materials: 0, tax: 0, discount: 0, total: 80 },
      estimatedDurationMin: 60,
      proposedDate: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      status: 'REJECTED',
    });

    const paidBooking = await mkBooking('CLOSED');
    await Invoice.create({
      invoiceNumber: 'INV-ANALYTICS-1',
      bookingId: paidBooking._id,
      customerId: cust.user.id,
      providerId: profile._id,
      subtotal: 200,
      tax: 17,
      platformFee: 20,
      total: 237,
      status: 'PAID',
    });

    const res = await request(app)
      .get('/api/v1/providers/profile/me/analytics')
      .set('Authorization', `Bearer ${prov.token}`)
      .expect(200);
    const a = res.body.data;
    expect(a.jobsCompleted).toBe(3);
    expect(a.jobsCancelled).toBe(1);
    expect(a.activeJobs).toBe(1);
    expect(a.completionRate).toBe(75);
    expect(a.quotesSubmitted).toBe(2);
    expect(a.quoteAcceptanceRate).toBe(50);
    expect(a.revenue).toBe(237);
    expect(a.paidInvoices).toBe(1);
    expect(a.ratingAvg).toBe(4.5);
    expect(a.ratingCount).toBe(10);
  });
});
