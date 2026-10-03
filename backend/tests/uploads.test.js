// UPLOAD_DIR must be set before the app (and env) module loads.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-uploads-'));
process.env.UPLOAD_DIR = tmpUploads;

const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { ServiceRequest } = require('../src/models/ServiceRequest');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { Booking } = require('../src/models/Booking');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
}, 180000);

beforeEach(clearDb);

afterAll(async () => {
  await stopDb(mongo);
  fs.rmSync(tmpUploads, { recursive: true, force: true });
});

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

async function makeCustomerRequest() {
  const cust = await apiRegister(request, app, { email: `up-cust-${Date.now()}@ex.com`, role: 'CUSTOMER' });
  const cat = await ServiceCategory.create({ name: 'Plumbing', slug: `plumbing-${Date.now()}` });
  const reqDoc = await ServiceRequest.create({
    customerId: cust.user.id,
    categoryId: cat._id,
    description: 'Kitchen sink leak that needs a photo for the record.',
    urgency: 'MEDIUM',
    budget: { min: 50, max: 200 },
    address: { label: 'Home', line1: '1 Main St', city: 'Austin', postalCode: '78701' },
    preferredDate: new Date(Date.now() + 86400000),
    timeWindow: 'MORNING',
    requiredSkills: [],
    status: 'OPEN',
    history: [{ status: 'OPEN' }],
  });
  return { cust, reqDoc };
}

describe('File uploads (multer)', () => {
  it('stores a real request attachment on disk and serves it back', async () => {
    const { cust, reqDoc } = await makeCustomerRequest();

    const res = await request(app)
      .post(`/api/v1/service-requests/${reqDoc._id}/attachments`)
      .set('Authorization', `Bearer ${cust.token}`)
      .attach('file', pngBuffer, 'sink-photo.png');

    expect(res.status).toBe(201);
    const attachments = res.body.data.attachments;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].fileName).toBe('sink-photo.png');
    expect(attachments[0].mimeType).toBe('image/png');
    expect(attachments[0].storageKey).toMatch(/^attachments\//);
    expect(attachments[0].fileUrl).toContain('/uploads/attachments/');

    // File exists on disk under the temp upload root
    const onDisk = path.join(tmpUploads, attachments[0].storageKey);
    expect(fs.existsSync(onDisk)).toBe(true);

    // Served over HTTP
    const filePath = new URL(attachments[0].fileUrl).pathname;
    const getRes = await request(app).get(filePath);
    expect(getRes.status).toBe(200);
    expect(getRes.headers['content-type']).toBe('image/png');
  });

  it('rejects disallowed file types', async () => {
    const { cust, reqDoc } = await makeCustomerRequest();

    const res = await request(app)
      .post(`/api/v1/service-requests/${reqDoc._id}/attachments`)
      .set('Authorization', `Bearer ${cust.token}`)
      .attach('file', Buffer.from('MZ fake binary'), 'installer.exe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('still accepts JSON metadata (backward compatible)', async () => {
    const { cust, reqDoc } = await makeCustomerRequest();

    const res = await request(app)
      .post(`/api/v1/service-requests/${reqDoc._id}/attachments`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ fileName: 'external-scan.pdf', mimeType: 'application/pdf', size: 1024, storageKey: 'external/abc123' });

    expect(res.status).toBe(201);
    expect(res.body.data.attachments).toHaveLength(1);
  });

  it('stores provider verification documents', async () => {
    const prov = await apiRegister(request, app, { email: `up-prov-${Date.now()}@ex.com`, role: 'PROVIDER' });
    const user = await User.findOne({ email: prov.user.email });
    await ProviderProfile.create({ userId: user._id, headline: 'Plumber' });

    const res = await request(app)
      .post('/api/v1/providers/profile/me/documents')
      .set('Authorization', `Bearer ${prov.token}`)
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'license.pdf');

    expect(res.status).toBe(201);
    const docs = res.body.data.documents;
    expect(docs).toHaveLength(1);
    expect(docs[0].storageKey).toMatch(/^documents\//);
    expect(fs.existsSync(path.join(tmpUploads, docs[0].storageKey))).toBe(true);
  });

  it('stores job evidence with a server-generated fileUrl', async () => {
    const cust = await apiRegister(request, app, { email: `up-ev-c-${Date.now()}@ex.com`, role: 'CUSTOMER' });
    const provReg = await apiRegister(request, app, { email: `up-ev-p-${Date.now()}@ex.com`, role: 'PROVIDER' });
    const provUser = await User.findOne({ email: provReg.user.email });
    const profile = await ProviderProfile.create({ userId: provUser._id, verificationStatus: 'VERIFIED' });
    const booking = await Booking.create({
      customerId: cust.user.id,
      providerId: profile._id,
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
      status: 'IN_PROGRESS',
    });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking._id}/evidence`)
      .set('Authorization', `Bearer ${provReg.token}`)
      .field('phase', 'AFTER')
      .field('note', 'Finished faucet replacement')
      .attach('file', pngBuffer, 'finished.png');

    expect(res.status).toBe(201);
    const evidence = res.body.data.evidence;
    expect(evidence).toHaveLength(1);
    expect(evidence[0].phase).toBe('AFTER');
    expect(evidence[0].fileUrl).toContain('/uploads/evidence/');
  });

  it('removing an attachment deletes the stored file', async () => {
    const { cust, reqDoc } = await makeCustomerRequest();

    const up = await request(app)
      .post(`/api/v1/service-requests/${reqDoc._id}/attachments`)
      .set('Authorization', `Bearer ${cust.token}`)
      .attach('file', pngBuffer, 'temp.png')
      .expect(201);
    const att = up.body.data.attachments[0];
    expect(fs.existsSync(path.join(tmpUploads, att.storageKey))).toBe(true);

    await request(app)
      .delete(`/api/v1/service-requests/${reqDoc._id}/attachments/${att.id}`)
      .set('Authorization', `Bearer ${cust.token}`)
      .expect(200);
    expect(fs.existsSync(path.join(tmpUploads, att.storageKey))).toBe(false);
  });
});
