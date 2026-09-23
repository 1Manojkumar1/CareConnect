const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
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
