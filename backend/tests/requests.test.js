const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { startDb, stopDb, clearDb, apiRegister, setRole } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function seedCategory(name = 'Plumbing') {
  return ServiceCategory.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
}

async function customerWithAddress() {
  const reg = await apiRegister(request, app, { role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${reg.token}`)
    .send({ label: 'Home', line1: '14 Maple Street', city: 'Austin', postalCode: '78701' });
  return { ...reg, addressId: addr.body.data.id };
}

const payload = (cat, extra = {}) => ({
  categoryId: cat._id.toString(),
  description: 'Kitchen sink drains slowly and gurgles.',
  urgency: 'MEDIUM',
  budget: { min: 50, max: 150 },
  preferredDate: tomorrow(),
  timeWindow: 'MORNING',
  ...extra,
});

describe('creation', () => {
  test('creates a DRAFT with address snapshot and history', async () => {
    const cat = await seedCategory();
    const { token, addressId } = await customerWithAddress();
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send(payload(cat, { address: { addressId } }));
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.address.city).toBe('Austin');
    expect(res.body.data.address.addressId).toBe(addressId);
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.actions).toContain('submit');
    expect(res.body.data.aiClassification.status).toBe('PENDING');
  });

  test('submit flag creates an OPEN request directly', async () => {
    const cat = await seedCategory();
    const { token, addressId } = await customerWithAddress();
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send(payload(cat, { address: { addressId }, submit: true }));
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.history).toHaveLength(2);
  });

  test('validation rejects bad input', async () => {
    const { token } = await customerWithAddress();
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'x'.repeat(4000), preferredDate: '2000-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('foreign address and inactive category are rejected', async () => {
    const cat = await seedCategory();
    const a = await customerWithAddress();
    const b = await customerWithAddress();
    const foreign = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${a.token}`)
      .send(payload(cat, { address: { addressId: b.addressId } }));
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.code).toBe('INVALID_ADDRESS');

    await ServiceCategory.updateOne({ _id: cat._id }, { isActive: false });
    const inactive = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${a.token}`)
      .send(payload(cat, { address: { addressId: a.addressId } }));
    expect(inactive.status).toBe(400);
  });

  test('non-customers cannot create requests', async () => {
    const cat = await seedCategory();
    const pro = await apiRegister(request, app, { role: 'PROVIDER' });
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${pro.token}`)
      .send(payload(cat, { address: { line1: '1 Main', city: 'Austin', postalCode: '78701' } }));
    expect(res.status).toBe(403);
  });
});

describe('ownership and scoping', () => {
  test('customers only see their own requests; staff see all', async () => {
    const cat = await seedCategory();
    const a = await customerWithAddress();
    const b = await customerWithAddress();
    for (const who of [a, b]) {
      await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${who.token}`)
        .send(payload(cat, { address: { addressId: who.addressId } }));
    }
    const mine = await request(app).get('/api/v1/service-requests').set('Authorization', `Bearer ${a.token}`);
    expect(mine.body.data).toHaveLength(1);

    const otherId = mine.body.data[0].id;
    const other = await apiRegister(request, app, {});
    // b cannot read a's request (unknown id for b would 404 — use a's id via customerId filter attempt)
    const peek = await request(app).get(`/api/v1/service-requests/${otherId}`).set('Authorization', `Bearer ${other.token}`);
    expect(peek.status).toBe(404);

    await setRole(other.user.email, 'OPERATIONS');
    const opsLogin = await request(app).post('/api/v1/auth/login').send({ email: other.user.email, password: 'TestPass1!' });
    const staff = await request(app).get('/api/v1/service-requests').set('Authorization', `Bearer ${opsLogin.body.data.token}`);
    expect(staff.body.data).toHaveLength(2);

    const provider = await apiRegister(request, app, { role: 'PROVIDER' });
    const denied = await request(app).get('/api/v1/service-requests').set('Authorization', `Bearer ${provider.token}`);
    expect(denied.status).toBe(403);
  });
});

describe('lifecycle', () => {
  test('submit and cancel follow the transition map', async () => {
    const cat = await seedCategory();
    const { token, addressId } = await customerWithAddress();
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send(payload(cat, { address: { addressId } }));
    const id = created.body.data.id;

    const submitted = await request(app).post(`/api/v1/service-requests/${id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(submitted.body.data.status).toBe('OPEN');

    const resubmit = await request(app).post(`/api/v1/service-requests/${id}/submit`).set('Authorization', `Bearer ${token}`);
    expect(resubmit.status).toBe(422);

    const cancelled = await request(app).post(`/api/v1/service-requests/${id}/cancel`).set('Authorization', `Bearer ${token}`);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect(cancelled.body.data.actions).toEqual([]);

    const afterCancel = await request(app)
      .patch(`/api/v1/service-requests/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'too late' });
    expect(afterCancel.status).toBe(422);
  });

  test('OPEN requests allow limited edits but not category changes', async () => {
    const cat = await seedCategory();
    const cat2 = await seedCategory('Electrical');
    const { token, addressId } = await customerWithAddress();
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send(payload(cat, { address: { addressId }, submit: true }));
    const id = created.body.data.id;

    const ok = await request(app)
      .patch(`/api/v1/service-requests/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Gate code 1234', urgency: 'HIGH' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.notes).toBe('Gate code 1234');

    const blocked = await request(app)
      .patch(`/api/v1/service-requests/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: cat2._id.toString() });
    expect(blocked.status).toBe(422);
  });
});

describe('attachments', () => {
  test('mime allowlist, cap, and lock after cancel', async () => {
    const cat = await seedCategory();
    const { token, addressId } = await customerWithAddress();
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${token}`)
      .send(payload(cat, { address: { addressId } }));
    const id = created.body.data.id;
    const auth = (r) => r.set('Authorization', `Bearer ${token}`);

    const bad = await auth(
      request(app).post(`/api/v1/service-requests/${id}/attachments`).send({
        fileName: 'run.exe', mimeType: 'application/x-msdownload', size: 100, storageKey: 'k',
      })
    );
    expect(bad.status).toBe(400);

    const good = await auth(
      request(app).post(`/api/v1/service-requests/${id}/attachments`).send({
        fileName: 'sink.jpg', mimeType: 'image/jpeg', size: 2048, storageKey: 'req/photo.jpg',
      })
    );
    expect(good.status).toBe(201);
    const attachmentId = good.body.data.attachments[0].id;

    await auth(request(app).post(`/api/v1/service-requests/${id}/cancel`));
    const locked = await auth(request(app).delete(`/api/v1/service-requests/${id}/attachments/${attachmentId}`));
    expect(locked.status).toBe(422);
  });
});
