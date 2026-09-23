const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { Booking } = require('../src/models/Booking');
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

async function seed() {
  const cat = await ServiceCategory.create({ name: 'Plumbing', slug: 'plumbing' });
  const skill = await Skill.create({ name: 'Leak Detection', slug: 'leak-detection', categoryId: cat._id });
  return { cat, skill };
}

async function setupBookingFixture() {
  const { cat, skill } = await seed();

  // Customer
  const cust = await apiRegister(request, app, { email: 'customer@example.com', role: 'CUSTOMER' });
  const addr = await request(app)
    .post('/api/v1/users/me/addresses')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({ label: 'Home', line1: '14 Maple Street', city: 'Austin', postalCode: '78701' });

  const reqDoc = await request(app)
    .post('/api/v1/service-requests')
    .set('Authorization', `Bearer ${cust.token}`)
    .send({
      categoryId: cat._id.toString(),
      description: 'Kitchen sink pipe repair',
      preferredDate: tomorrow(),
      address: { addressId: addr.body.data.id },
      submit: true,
    });

  // Provider
  const prov = await apiRegister(request, app, { email: 'provider@example.com', role: 'PROVIDER' });
  const prof = await request(app)
    .post('/api/v1/providers/profile')
    .set('Authorization', `Bearer ${prov.token}`)
    .send({
      headline: 'Master Plumber',
      categoryIds: [cat._id.toString()],
      skillIds: [skill._id.toString()],
      hourlyRate: 75,
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
      pricing: { labor: 120, materials: 30, tax: 12, discount: 0 },
      estimatedDurationMin: 60,
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
      notes: 'Please bring tools',
    });

  expect(bRes.status).toBe(201);
  const bookingId = bRes.body.data._id || bRes.body.data.id;

  return {
    cust,
    prov,
    provProfileId: prof.body.data.id || prof.body.data._id,
    bookingId,
    requestId: reqDoc.body.data.id || reqDoc.body.data._id,
  };
}

describe('Invoices API (Phase A)', () => {
  it('automatically generates an invoice when booking reaches CUSTOMER_CONFIRMED', async () => {
    const { cust, prov, bookingId } = await setupBookingFixture();

    // Provider advances through lifecycle: CONFIRMED -> SCHEDULED -> ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus: 'SCHEDULED' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus: 'ON_THE_WAY' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus: 'ARRIVED' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus: 'IN_PROGRESS' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${prov.token}`)
      .send({ toStatus: 'COMPLETED' })
      .expect(200);

    // Prior to customer confirmation, no invoice exists yet
    let invRes = await request(app)
      .get(`/api/v1/invoices/by-booking/${bookingId}`)
      .set('Authorization', `Bearer ${cust.token}`);
    expect(invRes.status).toBe(404);

    // Customer confirms completion
    const confRes = await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });
    expect(confRes.status).toBe(200);

    // Invoice is now generated!
    invRes = await request(app)
      .get(`/api/v1/invoices/by-booking/${bookingId}`)
      .set('Authorization', `Bearer ${cust.token}`);

    expect(invRes.status).toBe(200);
    const invoice = invRes.body.data;
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-/);
    expect(invoice.status).toBe('ISSUED');
    expect(invoice.subtotal).toBeDefined();
    expect(invoice.tax).toBeDefined();
    expect(invoice.platformFee).toBeDefined();
    expect(invoice.total).toBe(
      Math.round((invoice.subtotal + invoice.tax + invoice.platformFee) * 100) / 100
    );
    expect(invoice.lineItems.length).toBeGreaterThan(0);
  });

  it('allows customer to pay an issued invoice', async () => {
    const { cust, bookingId } = await setupBookingFixture();

    // Advance to completed and confirmed
    await Booking.findByIdAndUpdate(bookingId, { status: 'COMPLETED' });
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });

    const invRes = await request(app)
      .get(`/api/v1/invoices/by-booking/${bookingId}`)
      .set('Authorization', `Bearer ${cust.token}`);
    const invoiceId = invRes.body.data._id;

    // Customer pays
    const payRes = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/pay`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        type: 'CARD',
        last4: '1234',
        brand: 'Mastercard',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('PAID');
    expect(payRes.body.data.paidAt).toBeDefined();
    expect(payRes.body.data.paymentMethod.last4).toBe('1234');
    expect(payRes.body.data.paymentMethod.transactionId).toMatch(/^TXN-/);

    // Cannot pay twice
    const repeatPay = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/pay`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({});
    expect(repeatPay.status).toBe(422);
    expect(repeatPay.body.error.code).toBe('INVOICE_ALREADY_PAID');
  });

  it('enforces role-based isolation on invoice listings and views', async () => {
    const { cust, prov, bookingId } = await setupBookingFixture();
    await Booking.findByIdAndUpdate(bookingId, { status: 'COMPLETED' });
    await request(app)
      .patch(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ toStatus: 'CUSTOMER_CONFIRMED' });

    const invRes = await request(app)
      .get(`/api/v1/invoices/by-booking/${bookingId}`)
      .set('Authorization', `Bearer ${cust.token}`);
    const invoiceId = invRes.body.data._id;

    // Other customer cannot see invoice
    const otherCust = await apiRegister(request, app, { email: 'other@example.com', role: 'CUSTOMER' });
    const forbidRes = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${otherCust.token}`);
    expect(forbidRes.status).toBe(404);

    // Provider can see their own invoice
    const provRes = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${prov.token}`);
    expect(provRes.status).toBe(200);
    expect(provRes.body.data._id).toBe(invoiceId);

    // Staff can see any invoice
    await apiRegister(request, app, { email: 'ops@example.com' });
    await setRole('ops@example.com', 'OPERATIONS');
    const opsLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ops@example.com', password: 'TestPass1!' });
    const staffRes = await request(app)
      .get(`/api/v1/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${opsLogin.body.data.token}`);
    expect(staffRes.status).toBe(200);

    // Customer lists only own invoices
    const custList = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(custList.status).toBe(200);
    expect(custList.body.data.invoices.length).toBe(1);

    const otherList = await request(app)
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${otherCust.token}`);
    expect(otherList.status).toBe(200);
    expect(otherList.body.data.invoices.length).toBe(0);
  });
});
