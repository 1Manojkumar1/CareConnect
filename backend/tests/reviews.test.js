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

async function setupCompletedBooking() {
  const cat = await ServiceCategory.create({ name: 'Cleaning', slug: 'cleaning' });
  const skill = await Skill.create({ name: 'Deep Clean', slug: 'deep-clean', categoryId: cat._id });

  const cust = await apiRegister(request, app, { email: `cust-${Date.now()}@ex.com`, role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({ label: 'Home', line1: '1 Main St', city: 'Austin', postalCode: '78701' });

  const reqDoc = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({
      categoryId: cat._id.toString(),
      description: 'Full house deep clean needed',
      preferredDate: tomorrow(),
      address: { addressId: addr.body.data.id },
      submit: true,
    });

  const prov = await apiRegister(request, app, { email: `prov-${Date.now()}@ex.com`, role: 'PROVIDER' });
  const prof = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${prov.token}`)
    .send({
      headline: 'Pro Cleaner',
      categoryIds: [cat._id.toString()],
      skillIds: [skill._id.toString()],
      hourlyRate: 50,
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
      pricing: { labor: 100, materials: 20, tax: 10, discount: 0 },
      estimatedDurationMin: 120,
      proposedDate: tomorrow(),
      timeWindow: 'MORNING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

  const bRes = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({
      quoteId: qRes.body.data.id,
      startAt: startAt(),
      endAt: endAt(),
    });

  expect(bRes.status).toBe(201);
  const bookingId = bRes.body.data._id || bRes.body.data.id;

  // Advance booking to COMPLETED state
  for (const toStatus of ['SCHEDULED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus })
      .expect(200);
  }

  // Customer confirms
  await request(app)
    .patch(`/api/v1/bookings/${bookingId}/status`)
    .set('Authorization', `Bearer ${cust.token}`)
    .send({ toStatus: 'CUSTOMER_CONFIRMED' })
    .expect(200);

  return { cust, prov, bookingId, provProfileId: prof.body.data.id };
}

describe('Reviews API (Phase B)', () => {
  it('customer can post a review for a CUSTOMER_CONFIRMED booking', async () => {
    const { cust, bookingId } = await setupCompletedBooking();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 5, body: 'Excellent service, very professional!' });

    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.publishedAt).toBeTruthy();
  });

  it('prevents duplicate review for the same booking', async () => {
    const { cust, bookingId } = await setupCompletedBooking();

    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 4, body: 'Great' })
      .expect(201);

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 3, body: 'Changed my mind' });

    expect(res.status).toBe(409);
  });

  it('prevents review on non-reviewable booking status', async () => {
    const cat = await ServiceCategory.create({ name: 'Elec', slug: 'elec' });
    const skill = await Skill.create({ name: 'Wiring', slug: 'wiring', categoryId: cat._id });

    const cust = await apiRegister(request, app, { email: `c2-${Date.now()}@ex.com`, role: 'CUSTOMER' });
    const prov = await apiRegister(request, app, { email: `p2-${Date.now()}@ex.com`, role: 'PROVIDER' });

    const addr = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ label: 'Home', line1: '5 Oak Ave', city: 'Austin', postalCode: '78702' });

    const reqDoc = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        categoryId: cat._id.toString(),
        description: 'Rewire the living room outlets',
        preferredDate: tomorrow(),
        address: { addressId: addr.body.data.id },
        submit: true,
      });

    const prof = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${prov.token}`)
      .send({
        headline: 'Electrician',
        categoryIds: [cat._id.toString()],
        skillIds: [skill._id.toString()],
        hourlyRate: 80,
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
        pricing: { labor: 200, materials: 50, tax: 20, discount: 0 },
        estimatedDurationMin: 90,
        proposedDate: tomorrow(),
        timeWindow: 'AFTERNOON',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

    const bRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ quoteId: qRes.body.data.id, startAt: startAt(), endAt: endAt() });

    expect(bRes.status).toBe(201);
    const bookingId = bRes.body.data._id || bRes.body.data.id;

    // Booking is still CONFIRMED — not reviewable
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 5, body: 'Too early' });

    expect(res.status).toBe(422);
  });

  it('public can view provider reviews', async () => {
    const { cust, bookingId, provProfileId } = await setupCompletedBooking();

    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 4, body: 'Good job!' })
      .expect(201);

    const res = await request(app)
      .get(`/api/v1/reviews/providers/${provProfileId}/reviews`)
      .expect(200);

    expect(res.body.data.reviews.length).toBeGreaterThan(0);
    expect(res.body.data.reviews[0].rating).toBe(4);
  });

  it('rating denormalization updates provider ratingAvg', async () => {
    const { cust, prov, bookingId } = await setupCompletedBooking();

    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 4, body: 'Solid work' })
      .expect(201);

    // Verify via the provider's own profile endpoint
    const profileRes = await request(app)
      .get('/api/v1/providers/profile/me')
      .set('Authorization', `Bearer ${prov.token}`)
      .expect(200);

    expect(profileRes.body.data.ratingAvg).toBe(4);
    expect(profileRes.body.data.ratingCount).toBe(1);
  });

  it('SUPPORT staff can moderate (flag) a review', async () => {
    const { cust, bookingId } = await setupCompletedBooking();

    const createRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ bookingId, rating: 1, body: 'Terrible service!' })
      .expect(201);

    const reviewId = createRes.body.data._id || createRes.body.data.id;

    const supportEmail = `support-${Date.now()}@ex.com`;
    await apiRegister(request, app, { email: supportEmail, role: 'CUSTOMER' });
    await setRole(supportEmail, 'SUPPORT');
    const supportLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: supportEmail, password: 'TestPass1!' })
      .expect(200);

    const modRes = await request(app)
      .patch(`/api/v1/reviews/${reviewId}/moderate`)
      .set('Authorization', `Bearer ${supportLogin.body.data.token}`)
      .send({ status: 'FLAGGED', moderationNote: 'Violates terms of service' });

    expect(modRes.status).toBe(200);
    expect(modRes.body.data.status).toBe('FLAGGED');
  });

  it('provider cannot post a review', async () => {
    const { prov, bookingId } = await setupCompletedBooking();

    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ bookingId, rating: 5, body: 'Self-review attempt' });

    expect(res.status).toBe(403);
  });
});
