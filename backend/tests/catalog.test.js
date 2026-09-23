const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { startDb, stopDb, clearDb } = require('./helpers');
const { seedCatalog } = require('../src/seed/catalog.seed');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

async function adminToken() {
  const { User } = require('../src/models/User');
  const email = `admin-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin User',
    email,
    password: 'TestPass1!',
    role: 'CUSTOMER',
  });
  await User.updateOne({ email }, { role: 'ADMIN' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'TestPass1!' });
  return login.body.data.token;
}

describe('public catalog reads', () => {
  test('empty catalog returns empty arrays', async () => {
    const cats = await request(app).get('/api/v1/categories');
    const skills = await request(app).get('/api/v1/skills');
    expect(cats.status).toBe(200);
    expect(cats.body.data).toEqual([]);
    expect(skills.body.data).toEqual([]);
  });
});

describe('admin category management', () => {
  test('admin creates top-level category and subcategory; nesting limited to two levels', async () => {
    const token = await adminToken();
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);

    const top = await auth(request(app).post('/api/v1/categories').send({ name: 'Plumbing' }));
    expect(top.status).toBe(201);
    expect(top.body.data.slug).toBe('plumbing');

    const sub = await auth(
      request(app).post('/api/v1/categories').send({ name: 'Leak Repair', parentId: top.body.data.id })
    );
    expect(sub.status).toBe(201);

    const tooDeep = await auth(
      request(app).post('/api/v1/categories').send({ name: 'Too Deep', parentId: sub.body.data.id })
    );
    expect(tooDeep.status).toBe(400);

    const dup = await auth(request(app).post('/api/v1/categories').send({ name: 'Plumbing' }));
    expect(dup.status).toBe(201);
    expect(dup.body.data.slug).toBe('plumbing-2');
  });

  test('non-admin cannot manage catalog', async () => {
    const res = await request(app).post('/api/v1/categories').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });

  test('category in use cannot be deleted', async () => {
    const token = await adminToken();
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const top = await auth(request(app).post('/api/v1/categories').send({ name: 'Electrical' }));
    await auth(
      request(app).post('/api/v1/skills').send({ name: 'Wiring', categoryId: top.body.data.id })
    );
    const del = await auth(request(app).delete(`/api/v1/categories/${top.body.data.id}`));
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('CATEGORY_IN_USE');
  });
});

describe('admin skill management', () => {
  test('skills attach to top-level categories and filter by category', async () => {
    const token = await adminToken();
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);
    const top = await auth(request(app).post('/api/v1/categories').send({ name: 'Cleaning' }));
    const sub = await auth(
      request(app).post('/api/v1/categories').send({ name: 'Deep Cleaning', parentId: top.body.data.id })
    );

    const bad = await auth(
      request(app).post('/api/v1/skills').send({ name: 'Scrubbing', categoryId: sub.body.data.id })
    );
    expect(bad.status).toBe(400);

    const good = await auth(
      request(app).post('/api/v1/skills').send({ name: 'Deep Cleaning', categoryId: top.body.data.id })
    );
    expect(good.status).toBe(201);

    const filtered = await request(app).get(`/api/v1/skills?categoryId=${top.body.data.id}`);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].category.name).toBe('Cleaning');
  });
});

describe('seed', () => {
  test('seed is idempotent and covers the BUILD_PLAN service areas', async () => {
    const first = await seedCatalog();
    const cats = await ServiceCategory.countDocuments();
    const skills = await Skill.countDocuments();
    expect(cats).toBeGreaterThanOrEqual(10);

    const second = await seedCatalog();
    expect(await ServiceCategory.countDocuments()).toBe(cats);
    expect(await Skill.countDocuments()).toBe(skills);
    expect(second).toEqual(first);

    const names = (await ServiceCategory.find({ parentId: null })).map((c) => c.name);
    for (const expected of ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Painting', 'Pest Control']) {
      expect(names).toContain(expected);
    }
  });
});
