const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
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

// Build ISO timestamps 24h and 25h from now for a 1-hour booking window
const startAt = () => new Date(Date.now() + 86400000).toISOString();
const endAt = () => new Date(Date.now() + 86400000 + 3600000).toISOString();

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
  const providerUserId = (await User.findOne({ email }))._id;
  await ProviderProfile.updateOne({ userId: providerUserId }, { verificationStatus: 'VERIFIED' });
  // Open all days/hours so conflict checks don't fail on day-of-week
  await ProviderProfile.updateOne(
    { userId: providerUserId },
    {
      $set: {
        workingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          dayOfWeek: d,
          isOpen: true,
          ranges: [{ start: '00:00', end: '23:59' }],
        })),
      },
    }
  );
  return reg;
}

async function customerQuoteBooking(cat, skill) {
  const customer = await customerWithOpenRequest(cat);
  const pro = await verifiedProvider(cat, skill);

  const qRes = await request(app)
    .post('/api/v1/quotes')
    .set('Authorization', `Bearer ${pro.token}`)
    .send({
      requestId: customer.requestId,
      pricing: { labor: 100, materials: 50, tax: 10, discount: 5 },
      estimatedDurationMin: 60,
      proposedDate: tomorrow(),
      timeWindow: 'MORNING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  expect(qRes.status).toBe(201);
  return { customer, pro, quoteId: qRes.body.data.id };
}

// ---------------------------------------------------------------------------
// Booking creation
// ---------------------------------------------------------------------------
describe('booking creation', () => {
  test('customer can create a booking via quoteId', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.history[0].toStatus).toBe('CONFIRMED');
  });

  test('requires startAt and endAt — returns 400 validation error', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId });

    // validate middleware returns 400 VALIDATION_ERROR
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('provider cannot create a booking directly', async () => {
    const { cat, skill } = await seed();
    const pro = await verifiedProvider(cat, skill);
    const customer = await customerWithOpenRequest(cat);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ requestId: customer.requestId, startAt: startAt(), endAt: endAt() });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ startAt: startAt(), endAt: endAt() });
    expect(res.status).toBe(401);
  });

  test('failed booking leaves quote and request untouched (no partial update)', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    // Occupy the window first
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() })
      .expect(201);

    // Second PENDING quote on a fresh request from the same customer
    const { ServiceRequest } = require('../src/models/ServiceRequest');
    const { Quote } = require('../src/models/Quote');
    const { ProviderProfile } = require('../src/models/ProviderProfile');
    const freshReq = await ServiceRequest.create({
      customerId: customer.user.id,
      categoryId: cat._id,
      description: 'Second tap dripping in the guest bathroom needs attention.',
      urgency: 'LOW',
      budget: { min: 40, max: 120 },
      address: { label: 'Home', line1: '14 Maple Street', city: 'Austin', postalCode: '78701' },
      preferredDate: new Date(Date.now() + 86400000),
      timeWindow: 'MORNING',
      requiredSkills: [],
      status: 'OPEN',
      history: [{ status: 'OPEN' }],
    });
    const profile = await ProviderProfile.findOne({ userId: pro.user.id });
    const freshQuote = await Quote.create({
      requestId: freshReq._id,
      providerId: profile._id,
      customerId: customer.user.id,
      pricing: { labor: 60, materials: 0, tax: 0, discount: 0, total: 60 },
      estimatedDurationMin: 60,
      proposedDate: new Date(Date.now() + 86400000),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      status: 'PENDING',
    });

    // Overlapping window -> 409, and nothing is mutated
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId: freshQuote._id.toString(), startAt: startAt(), endAt: endAt() });
    expect(res.status).toBe(409);

    expect((await Quote.findById(freshQuote._id)).status).toBe('PENDING');
    expect((await ServiceRequest.findById(freshReq._id)).status).toBe('OPEN');
  });
});

// ---------------------------------------------------------------------------
// Booking listing
// ---------------------------------------------------------------------------
describe('booking list', () => {
  test('customer sees only their bookings', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });

    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`);

    // paginated() puts the array directly in data
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test('status filter works', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });

    const confirmed = await request(app)
      .get('/api/v1/bookings?status=CONFIRMED')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(confirmed.status).toBe(200);
    expect(Array.isArray(confirmed.body.data)).toBe(true);
    expect(confirmed.body.data.length).toBe(1);

    const cancelled = await request(app)
      .get('/api/v1/bookings?status=CANCELLED')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.length).toBe(0);
  });

  test('invalid status filter is rejected — returns 400', async () => {
    const { cat } = await seed();
    const customer = await customerWithOpenRequest(cat);

    const res = await request(app)
      .get('/api/v1/bookings?status=INVALID_STATUS')
      .set('Authorization', `Bearer ${customer.token}`);
    // validate middleware returns 400 VALIDATION_ERROR
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Booking detail
// ---------------------------------------------------------------------------
describe('booking detail', () => {
  test('owner can fetch booking detail', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/bookings/${id}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(id);
  });

  test('stranger gets 404', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const stranger = await apiRegister(request, app, { role: 'CUSTOMER' });
    const res = await request(app)
      .get(`/api/v1/bookings/${id}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------
describe('status transitions', () => {
  test('customer can cancel a CONFIRMED booking', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'CANCELLED', reason: 'Changed plans.' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.cancelledAt).toBeTruthy();
  });

  test('customer cannot move booking from CONFIRMED to ON_THE_WAY — invalid state machine transition', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    // CONFIRMED → ON_THE_WAY is not in the global transition map (needs SCHEDULED/PROVIDER_ASSIGNED first)
    // State machine check happens before role check, so we get 400 INVALID_TRANSITION
    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'ON_THE_WAY' });

    expect([400, 403]).toContain(res.status);
  });

  test('provider can advance through full job lifecycle', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    for (const toStatus of ['SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
      const res = await request(app)
        .patch(`/api/v1/bookings/${id}/status`)
        .set('Authorization', `Bearer ${pro.token}`)
        .send({ toStatus });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(toStatus);
    }
  });

  test('customer can confirm a COMPLETED booking', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    for (const s of ['SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
      await request(app)
        .patch(`/api/v1/bookings/${id}/status`)
        .set('Authorization', `Bearer ${pro.token}`)
        .send({ toStatus: s });
    }

    const confirm = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('CUSTOMER_CONFIRMED');
    expect(confirm.body.data.confirmedAt).toBeTruthy();
  });

  test('invalid toStatus value is rejected — returns 400 VALIDATION_ERROR', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'FLYING_TO_MOON' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('invalid state machine transition is rejected — returns 400 INVALID_TRANSITION', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    // CONFIRMED → CLOSED is not in the state machine
    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'CLOSED' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  test('provider cannot transition a customer-only action (CUSTOMER_CONFIRMED)', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    // Drive to COMPLETED
    for (const s of ['SCHEDULED', 'PROVIDER_ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
      await request(app)
        .patch(`/api/v1/bookings/${id}/status`)
        .set('Authorization', `Bearer ${pro.token}`)
        .send({ toStatus: s });
    }

    // Provider tries to confirm (customer-only)
    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/status`)
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_TRANSITION');
  });
});

// ---------------------------------------------------------------------------
// Provider assignment (Operations / Admin only)
// ---------------------------------------------------------------------------
describe('provider assignment', () => {
  test('customer cannot reassign provider', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    await verifiedProvider(cat, skill, 'pro2@example.com');
    const pro2Profile = await ProviderProfile.findOne({
      userId: (await User.findOne({ email: 'pro2@example.com' }))._id,
    });

    const res = await request(app)
      .patch(`/api/v1/bookings/${id}/assign`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ providerId: pro2Profile._id.toString() });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Evidence upload
// ---------------------------------------------------------------------------
describe('evidence upload', () => {
  test('provider can upload BEFORE evidence', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .post(`/api/v1/bookings/${id}/evidence`)
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ phase: 'BEFORE', fileUrl: 'https://example.com/photo.jpg', note: 'Initial condition.' });

    expect(res.status).toBe(201);
    expect(res.body.data.evidence).toHaveLength(1);
    expect(res.body.data.evidence[0].phase).toBe('BEFORE');
  });

  test('customer cannot upload evidence', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .post(`/api/v1/bookings/${id}/evidence`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ phase: 'BEFORE', fileUrl: 'https://example.com/photo.jpg' });

    expect(res.status).toBe(403);
  });

  test('missing phase returns 400 VALIDATION_ERROR', async () => {
    const { cat, skill } = await seed();
    const { customer, pro, quoteId } = await customerQuoteBooking(cat, skill);

    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() });
    const id = createRes.body.data._id;

    const res = await request(app)
      .post(`/api/v1/bookings/${id}/evidence`)
      .set('Authorization', `Bearer ${pro.token}`)
      .send({ fileUrl: 'https://example.com/photo.jpg' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('booking reschedule', () => {
  test('customer can move a CONFIRMED booking to a free window', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() })
      .expect(201);
    const bookingId = created.body.data._id;

    const newStart = new Date(Date.now() + 3 * 86400000).toISOString();
    const newEnd = new Date(Date.now() + 3 * 86400000 + 3600000).toISOString();
    const res = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ startAt: newStart, endAt: newEnd });

    expect(res.status).toBe(200);
    expect(new Date(res.body.data.startAt).toISOString()).toBe(newStart);
    expect(res.body.data.history.at(-1).note).toMatch(/Rescheduled/);
  });

  test('reschedule into a conflicting window fails with 409', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);
    const first = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() })
      .expect(201);

    // Second booking in a different window on the same provider
    const otherStart = new Date(Date.now() + 5 * 86400000).toISOString();
    const otherEnd = new Date(Date.now() + 5 * 86400000 + 3600000).toISOString();
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: otherStart, endAt: otherEnd })
      .expect(201);

    // Try to move the first booking onto the second booking's window
    const res = await request(app)
      .patch(`/api/v1/bookings/${first.body.data._id}/reschedule`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ startAt: otherStart, endAt: otherEnd });
    expect(res.status).toBe(409);
  });

  test('strangers, bad ranges, and terminal states are rejected', async () => {
    const { cat, skill } = await seed();
    const { customer, quoteId } = await customerQuoteBooking(cat, skill);
    const created = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ quoteId, startAt: startAt(), endAt: endAt() })
      .expect(201);
    const bookingId = created.body.data._id;

    // Stranger
    const stranger = await apiRegister(request, app, { role: 'CUSTOMER' });
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ startAt: new Date(Date.now() + 3 * 86400000).toISOString(), endAt: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString() })
      .expect(404);

    // End before start
    const bad = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ startAt: new Date(Date.now() + 3 * 86400000).toISOString(), endAt: new Date(Date.now() + 2 * 86400000).toISOString() })
      .expect(400);
    expect(bad.body.error.code).toBe('INVALID_TIME_RANGE');

    // Past start
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ startAt: new Date(Date.now() - 86400000).toISOString(), endAt: new Date(Date.now() - 86400000 + 3600000).toISOString() })
      .expect(422);

    // Terminal state
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'CANCELLED', reason: 'Changed my mind.' })
      .expect(200);
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ startAt: new Date(Date.now() + 3 * 86400000).toISOString(), endAt: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString() })
      .expect(422);
  });
});
