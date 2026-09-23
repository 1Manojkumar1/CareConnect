const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ServiceRequest } = require('../src/models/ServiceRequest');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');
const { normalize, runClassification } = require('../src/modules/ai/ai.service');
const { heuristicClassify, llmClassify } = require('../src/modules/ai/ai.provider');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function seedCatalog() {
  const plumbing = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });
  await ServiceCategory.create({ name: 'Leak Repair', slug: 'leak-repair', parentId: plumbing._id });
  const skill = await Skill.create({ name: 'Leak Detection', slug: 'leak-detection', categoryId: plumbing._id });
  const electrical = await ServiceCategory.create({ name: 'Electrical', slug: 'electrical' });
  return { plumbing, skill, electrical };
}

async function openRequest(description = 'Kitchen sink is leaking badly, water pooling under the cabinet.') {
  const { plumbing } = await seedCatalog();
  const { token } = await apiRegister(request, app, { role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${token}`)
    .send({ label: 'Home', line1: '14 Maple Street', city: 'Austin', postalCode: '78701' });
  const created = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryId: plumbing._id.toString(),
      description,
      preferredDate: tomorrow(),
      address: { addressId: addr.body.data.id },
      submit: true,
    });
  return { id: created.body.data.id, token, plumbing };
}

const catalogOf = (plumbing, skill, electrical) => ({
  categories: [
    { id: plumbing._id.toString(), name: 'Plumbing', subcategories: ['Leak Repair'] },
    { id: electrical._id.toString(), name: 'Electrical', subcategories: [] },
  ],
  skills: [{ id: skill._id.toString(), name: 'Leak Detection', categoryId: plumbing._id.toString() }],
});

describe('heuristic provider', () => {
  test('plumbing leak classifies with confidence and skills', async () => {
    const { plumbing, skill, electrical } = await seedCatalog();
    const raw = await heuristicClassify({
      description: 'Kitchen sink is leaking badly, water pooling under the cabinet.',
      notes: '',
      ...catalogOf(plumbing, skill, electrical),
    });
    expect(raw.category).toBe('Plumbing');
    expect(raw.subcategory).toBe('Leak Repair');
    expect(raw.skills).toContain('Leak Detection');
    expect(raw.confidence).toBeGreaterThanOrEqual(0.55);
  });

  test('vague text yields low confidence', async () => {
    const { plumbing, skill, electrical } = await seedCatalog();
    const raw = await heuristicClassify({
      description: 'Something at home needs attention sometime.',
      notes: '',
      ...catalogOf(plumbing, skill, electrical),
    });
    expect(raw.confidence).toBeLessThan(0.55);
  });
});

describe('normalize', () => {
  test('malformed output degrades to NEEDS_REVIEW without crashing', async () => {
    const { plumbing, skill, electrical } = await seedCatalog();
    const out = normalize({ category: 123, skills: 'nope', confidence: 'high', urgency: 'URGENT' }, catalogOf(plumbing, skill, electrical));
    expect(out.status).toBe('NEEDS_REVIEW');
    expect(out.skills).toEqual([]);
    expect(out.urgency).toBe('MEDIUM');
    expect(out.confidence).toBe(0);
  });

  test('unknown category is dropped, never stored', async () => {
    const { plumbing, skill, electrical } = await seedCatalog();
    const out = normalize(
      { category: 'Spaceship Repair', subcategory: '', skills: [], urgency: 'LOW', confidence: 0.99 },
      catalogOf(plumbing, skill, electrical)
    );
    expect(out.status).toBe('NEEDS_REVIEW');
    expect(out.category).toBe('');
  });

  test('low confidence valid category still needs review', async () => {
    const { plumbing, skill, electrical } = await seedCatalog();
    const out = normalize(
      { category: 'Plumbing', subcategory: '', skills: [], urgency: 'LOW', confidence: 0.1 },
      catalogOf(plumbing, skill, electrical)
    );
    expect(out.status).toBe('NEEDS_REVIEW');
    expect(out.category).toBe('Plumbing');
  });
});

describe('runClassification', () => {
  test('fills aiClassification and requiredSkills, never changes categoryId', async () => {
    const { id, plumbing } = await openRequest();
    const out = await runClassification(id, {});
    expect(out.status).toBe('DONE');
    expect(out.category).toBe('Plumbing');
    const doc = await ServiceRequest.findById(id);
    expect(String(doc.categoryId)).toBe(String(plumbing._id));
    expect(doc.requiredSkills).toHaveLength(1);
    expect(doc.aiClassification.status).toBe('DONE');
  });

  test('suggested category stays advisory when it differs', async () => {
    const { id, plumbing } = await openRequest();
    const out = await runClassification(id, {
      provider: async () => ({ category: 'Electrical', subcategory: '', skills: [], urgency: 'LOW', confidence: 0.9 }),
    });
    expect(out.category).toBe('Electrical');
    const doc = await ServiceRequest.findById(id);
    expect(String(doc.categoryId)).toBe(String(plumbing._id));
  });

  test('throwing provider degrades instead of failing', async () => {
    const { id } = await openRequest();
    const out = await runClassification(id, {
      provider: async () => {
        throw new Error('provider down');
      },
    });
    // Heuristic fallback still classifies this clear-cut description.
    expect(['DONE', 'NEEDS_REVIEW']).toContain(out.status);
  });
});

describe('llmClassify', () => {
  test('timeout aborts the request', async () => {
    const hanging = (url, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    await expect(
      llmClassify({
        description: 'Leaking sink',
        notes: '',
        categories: [],
        skills: [],
        apiKey: 'test',
        fetchImpl: hanging,
        timeoutMs: 50,
      })
    ).rejects.toThrow();
  }, 15000);

  test('non-2xx responses throw for the fallback path', async () => {
    const bad = async () => ({ ok: false, status: 500 });
    await expect(
      llmClassify({ description: 'x', notes: '', categories: [], skills: [], apiKey: 'test', fetchImpl: bad })
    ).rejects.toThrow('status 500');
  });
});

describe('classify endpoint + background hook', () => {
  test('owner can re-run; strangers get 404; anonymous gets 401', async () => {
    const { id, token } = await openRequest();
    const ok = await request(app).post(`/api/v1/service-requests/${id}/classify`).set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.classification.status).toBe('DONE');

    const stranger = await apiRegister(request, app, { role: 'CUSTOMER' });
    const denied = await request(app)
      .post(`/api/v1/service-requests/${id}/classify`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(denied.status).toBe(404);

    const anon = await request(app).post(`/api/v1/service-requests/${id}/classify`);
    expect(anon.status).toBe(401);
  });

  test('submit never blocks on AI and background fills classification', async () => {
    const { plumbing } = await seedCatalog();
    const { token } = await apiRegister(request, app, { role: 'CUSTOMER' });
    const addr = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Home', line1: '1 Main St', city: 'Austin', postalCode: '78701' });
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: plumbing._id.toString(),
        description: 'Shower drain is clogged and smells bad.',
        preferredDate: tomorrow(),
        address: { addressId: addr.body.data.id },
        submit: true,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('OPEN');

    const id = created.body.data.id;
    let status = 'PENDING';
    for (let i = 0; i < 50 && status === 'PENDING'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const doc = await ServiceRequest.findById(id);
      status = doc.aiClassification.status;
    }
    expect(status).not.toBe('PENDING');
  }, 30000);
});
