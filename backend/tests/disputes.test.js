const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
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
const startAt = () => new Date(Date.now() + 86400000).toISOString();
const endAt = () => new Date(Date.now() + 86400000 + 3600000).toISOString();

async function setupBookingInProgress() {
  const cat = await ServiceCategory.create({ name: 'Roofing', slug: 'roofing' });
  const skill = await Skill.create({ name: 'Shingle Repair', slug: 'shingle-repair', categoryId: cat._id });

  const cust = await apiRegister(request, app, { email: `cust-${Date.now()}@ex.com`, role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({ label: 'Home', line1: '7 Elm St', city: 'Austin', postalCode: '78703' });

  const reqDoc = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({
      categoryId: cat._id.toString(),
      description: 'Fix several missing shingles on the roof',
      preferredDate: tomorrow(),
      address: { addressId: addr.body.data.id },
      submit: true,
    });

  const prov = await apiRegister(request, app, { email: `prov-${Date.now()}@ex.com`, role: 'PROVIDER' });
  const prof = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${prov.token}`)
    .send({
      headline: 'Roofing Expert',
      categoryIds: [cat._id.toString()],
      skillIds: [skill._id.toString()],
      hourlyRate: 90,
      coverageArea: { cities: ['Austin'] },
    });

  await ProviderProfile.findByIdAndUpdate(prof.body.data.id, {
    verificationStatus: 'VERIFIED',
    acceptingJobs: true,
    workingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      isOpen: true,
      ranges: [{ start: '00:00', end: '23:59' }],
    })),
  });

  const qRes = await request(app)
    .post('/api/v1/quotes')
    .set('Authorization', `Bearer ${prov.token}`)
    .send({
      requestId: reqDoc.body.data.id,
      pricing: { labor: 300, materials: 100, tax: 30, discount: 0 },
      estimatedDurationMin: 240,
      proposedDate: tomorrow(),
      timeWindow: 'MORNING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

  const bRes = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({ quoteId: qRes.body.data.id, startAt: startAt(), endAt: endAt() });

  expect(bRes.status).toBe(201);
  const bookingId = bRes.body.data._id || bRes.body.data.id;

  // Advance to IN_PROGRESS
  for (const toStatus of ['SCHEDULED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']) {
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus })
      .expect(200);
  }

  return { cust, prov, bookingId };
}

async function getStaffToken() {
  const email = `staff-${Date.now()}@ex.com`;
  await apiRegister(request, app, { email, role: 'CUSTOMER' });
  await setRole(email, 'SUPPORT');
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'TestPass1!' })
    .expect(200);
  return login.body.data.token;
}

describe('Disputes API (Phase B)', () => {
  it('customer can raise a dispute on an in-progress booking', async () => {
    const { cust, bookingId } = await setupBookingInProgress();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'POOR_QUALITY',
        description: 'The technician did not complete the job properly and left debris everywhere.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.reason).toBe('POOR_QUALITY');
    expect(res.body.data.timeline.length).toBe(1);
  });

  it('provider can raise a dispute on a booking they are party to', async () => {
    const { prov, bookingId } = await setupBookingInProgress();

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${prov.token}`)
      .send({
        bookingId,
        reason: 'BILLING_ISSUE',
        description: 'Customer is refusing to pay for additional materials that were required.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('stranger cannot raise a dispute on someone else booking', async () => {
    const { bookingId } = await setupBookingInProgress();
    const stranger = await apiRegister(request, app, { email: `str-${Date.now()}@ex.com`, role: 'CUSTOMER' });

    const res = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({
        bookingId,
        reason: 'OTHER',
        description: 'This is a fraudulent dispute attempt from an unrelated user account.',
      });

    expect(res.status).toBe(404);
  });

  it('dispute lifecycle: OPEN -> UNDER_REVIEW -> RESOLVED', async () => {
    const { cust, bookingId } = await setupBookingInProgress();
    const staffToken = await getStaffToken();

    // Raise dispute
    const createRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'SERVICE_NOT_COMPLETED',
        description: 'The service was not completed as agreed in the original quote and booking details.',
      })
      .expect(201);

    const disputeId = createRes.body.data._id || createRes.body.data.id;

    // Staff moves to UNDER_REVIEW
    await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'UNDER_REVIEW', note: 'Reviewing customer and provider evidence' })
      .expect(200);

    // Staff resolves
    const resolveRes = await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Partial refund issued. Provider to redo incomplete work.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
    expect(resolveRes.body.data.resolutionNote).toBeTruthy();
    expect(resolveRes.body.data.resolvedAt).toBeTruthy();
    expect(resolveRes.body.data.timeline.length).toBe(3);
  });

  it('invalid transition is rejected', async () => {
    const { cust, bookingId } = await setupBookingInProgress();
    const staffToken = await getStaffToken();

    const createRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'DAMAGE_OR_LOSS',
        description: 'Provider damaged the roof tiles that were in good condition before the work began.',
      })
      .expect(201);

    const disputeId = createRes.body.data._id || createRes.body.data.id;

    // Can't jump from OPEN directly to RESOLVED
    const res = await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'RESOLVED', resolutionNote: 'Skipping review' });

    expect(res.status).toBe(422);
  });

  it('customer can only see their own disputes', async () => {
    const { cust, bookingId } = await setupBookingInProgress();

    await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'OTHER',
        description: 'General concern about the safety procedures followed during the work.',
      })
      .expect(201);

    const listRes = await request(app)
      .get('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .expect(200);

    expect(listRes.body.data.disputes.length).toBe(1);
    expect(listRes.body.data.disputes[0].status).toBe('OPEN');
  });

  it('staff can see all disputes', async () => {
    const { cust, bookingId } = await setupBookingInProgress();
    const staffToken = await getStaffToken();

    await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'PROVIDER_NO_SHOW',
        description: 'The provider never arrived and did not contact us to reschedule the appointment.',
      })
      .expect(201);

    const listRes = await request(app)
      .get('/api/v1/disputes')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(listRes.body.data.disputes.length).toBe(1);
  });

  it('non-staff cannot update a dispute', async () => {
    const { cust, bookingId } = await setupBookingInProgress();

    const createRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        bookingId,
        reason: 'FRAUD',
        description: 'The provider submitted fraudulent receipts for materials that were never purchased.',
      })
      .expect(201);

    const disputeId = createRes.body.data._id || createRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ status: 'UNDER_REVIEW' });

    expect(res.status).toBe(403);
  });
});
