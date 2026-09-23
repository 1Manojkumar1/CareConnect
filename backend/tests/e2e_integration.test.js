const request = require('supertest');
const { createApp } = require('../src/app');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function dayAfterTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function dayAfterTomorrowEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe('Comprehensive E2E Integration Workflows (Phase 19)', () => {
  let app;
  let mongo;

  beforeAll(async () => {
    mongo = await startDb();
    app = createApp();
  });

  afterAll(async () => {
    await stopDb(mongo);
  });

  beforeEach(async () => {
    await clearDb();
  });

  it('runs complete lifecycle: request -> quote -> booking -> job completion -> invoice -> review -> notifications', async () => {
    // 1. Setup category and skill
    const cat = await ServiceCategory.create({
      name: 'Home Nursing',
      slug: 'home-nursing',
      description: 'Professional in-home clinical care',
    });
    const skill = await Skill.create({
      categoryId: cat._id,
      name: 'Wound Care',
      slug: 'wound-care',
      description: 'Dressing and wound treatment',
    });

    // 2. Register Customer and address
    const customer = await apiRegister(request, app, { role: 'CUSTOMER' });
    const addrRes = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        label: 'Home',
        line1: '100 Main St',
        city: 'Austin',
        postalCode: '78701',
      });
    const addressId = addrRes.body.data.id;

    // 3. Register Provider and complete verification
    const provider = await apiRegister(request, app, { role: 'PROVIDER' });
    const provProfileCreated = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider.token}`)
      .send({
        headline: 'Certified Wound Care Specialist',
        bio: 'Over 8 years experience in acute wound care.',
        experienceYears: 8,
        categoryIds: [cat._id.toString()],
        skillIds: [skill._id.toString()],
        serviceAreas: [{ city: 'Austin', area: 'Downtown', postalCode: '78701' }],
        pricing: { hourlyRate: 65, visitFee: 25, currency: 'USD' },
      });
    expect(provProfileCreated.status).toBe(201);
    const providerProfileId = provProfileCreated.body.data.id;

    await ProviderProfile.findByIdAndUpdate(providerProfileId, {
      verificationStatus: 'VERIFIED',
      acceptingJobs: true,
      workingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        isOpen: true,
        ranges: [{ start: '00:00', end: '23:59' }],
      })),
    });

    // 4. Customer submits service request
    const reqRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        categoryId: cat._id.toString(),
        description: 'Assistance with surgical dressing changes following hospital discharge.',
        urgency: 'HIGH',
        preferredDate: tomorrow(),
        address: { addressId },
        submit: true,
      });
    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data.id;

    // 5. Provider submits quote
    const quoteRes = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${provider.token}`)
      .send({
        requestId,
        pricing: { labor: 130, materials: 20, tax: 10, discount: 0 },
        estimatedDurationMin: 120,
        proposedDate: dayAfterTomorrow(),
        timeWindow: 'MORNING',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    expect(quoteRes.status).toBe(201);
    const quoteId = quoteRes.body.data.id;

    // 6. Customer accepts quote and creates booking
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        quoteId,
        startAt: dayAfterTomorrow(),
        endAt: dayAfterTomorrowEnd(),
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data._id || bookingRes.body.data.id;

    // 7. Provider moves booking through job statuses
    const steps = ['SCHEDULED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
    for (const toStatus of steps) {
      const res = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${provider.token}`)
        .send({ toStatus });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(toStatus);
    }

    // Customer confirms completion
    const confirmRes = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CUSTOMER_CONFIRMED');

    // 8. Verify invoice was generated upon completion
    const invoiceRes = await request(app)
      .get(`/api/v1/invoices/by-booking/${bookingId}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(invoiceRes.status).toBe(200);
    const invoice = invoiceRes.body.data;
    expect(invoice.total).toBeGreaterThan(0);
    expect(invoice.status).toBe('ISSUED');

    // Customer pays invoice
    const payRes = await request(app)
      .post(`/api/v1/invoices/${invoice._id}/pay`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ type: 'CARD', last4: '1234', brand: 'Mastercard' });
    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('PAID');

    // 9. Customer submits review
    const revRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        bookingId,
        rating: 5,
        comment: 'Outstanding care and gentle wound dressing. Highly recommended!',
      });
    expect(revRes.status).toBe(201);

    // Verify provider's average rating updated
    const updatedProv = await request(app).get(`/api/v1/providers/${providerProfileId}`);
    expect(updatedProv.body.data.ratingCount).toBe(1);
    expect(updatedProv.body.data.ratingAvg).toBe(5);

    // 10. Verify notifications created for both users
    const custNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(custNotifs.body.data.notifications.length).toBeGreaterThan(0);

    const provNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${provider.token}`);
    expect(provNotifs.body.data.notifications.length).toBeGreaterThan(0);
  });

  it('runs complete dispute and admin resolution workflow', async () => {
    // 1. Setup category and skill
    const cat = await ServiceCategory.create({ name: 'Elderly Care', slug: 'elderly-care' });
    const skill = await Skill.create({ name: 'Senior Assistance', slug: 'senior-assistance', categoryId: cat._id });

    // 2. Customer and address
    const customer = await apiRegister(request, app, { role: 'CUSTOMER' });
    const addr = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ label: 'Home', line1: '42 Oak St', city: 'Austin', postalCode: '78702' });

    // 3. Provider
    const provider = await apiRegister(request, app, { role: 'PROVIDER' });
    const provProfileCreated = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${provider.token}`)
      .send({
        headline: 'Senior Companion',
        categoryIds: [cat._id.toString()],
        skillIds: [skill._id.toString()],
        serviceAreas: [{ city: 'Austin', area: 'Downtown', postalCode: '78702' }],
        pricing: { hourlyRate: 50, visitFee: 20, currency: 'USD' },
      });
    expect(provProfileCreated.status).toBe(201);
    const providerProfileId = provProfileCreated.body.data.id;

    await ProviderProfile.findByIdAndUpdate(providerProfileId, {
      verificationStatus: 'VERIFIED',
      acceptingJobs: true,
      workingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        isOpen: true,
        ranges: [{ start: '00:00', end: '23:59' }],
      })),
    });

    // 4. Admin setup
    const admin = await apiRegister(request, app, { role: 'CUSTOMER' });
    await User.updateOne({ _id: admin.user.id }, { role: 'ADMIN' });
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.user.email, password: 'TestPass1!' });
    const adminToken = adminLogin.body.data.token;

    // 5. Request & Quote & Booking
    const reqRes = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        categoryId: cat._id.toString(),
        description: 'Morning companion care and mobility support',
        urgency: 'MEDIUM',
        preferredDate: tomorrow(),
        address: { addressId: addr.body.data.id },
        submit: true,
      });
    expect(reqRes.status).toBe(201);

    const quoteRes = await request(app)
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${provider.token}`)
      .send({
        requestId: reqRes.body.data.id,
        pricing: { labor: 100, materials: 0, tax: 0, discount: 0 },
        estimatedDurationMin: 120,
        proposedDate: dayAfterTomorrow(),
        timeWindow: 'MORNING',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    expect(quoteRes.status).toBe(201);

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        quoteId: quoteRes.body.data.id,
        startAt: dayAfterTomorrow(),
        endAt: dayAfterTomorrowEnd(),
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data._id || bookingRes.body.data.id;

    // Move to COMPLETED
    const steps = ['SCHEDULED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
    for (const toStatus of steps) {
      await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${provider.token}`)
        .send({ toStatus });
    }

    // Customer opens dispute
    const disputeRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        bookingId,
        reason: 'SERVICE_NOT_COMPLETED',
        description: 'Provider arrived late and left 45 minutes early without completing the agreed tasks.',
      });
    expect(disputeRes.status).toBe(201);
    const disputeId = disputeRes.body.data._id || disputeRes.body.data.id;

    // Admin moves to UNDER_REVIEW
    await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REVIEW', note: 'Investigating customer and provider claims' });

    // Admin resolves dispute
    const resolveRes = await request(app)
      .patch(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Customer claims verified with timestamps. Partial refund granted to customer.',
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
    expect(resolveRes.body.data.resolutionNote).toBeTruthy();
  });
});
