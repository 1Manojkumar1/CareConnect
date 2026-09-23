const request = require('supertest');
const { createApp } = require('../src/app');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { Notification } = require('../src/models/Notification');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');

let mongo;
let app;

beforeAll(async () => {
  mongo = await startDb();
  app = createApp();
  jest.setTimeout(30000);
}, 180000);

beforeEach(clearDb);

afterAll(async () => stopDb(mongo));

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const startAt = () => new Date(Date.now() + 86400000).toISOString();
const endAt = () => new Date(Date.now() + 86400000 + 3600000).toISOString();

async function seed() {
  const cat = await ServiceCategory.create({ name: 'Elder Care', slug: 'elder-care' });
  const skill = await Skill.create({ name: 'Companionship', slug: 'companionship', categoryId: cat._id });
  return { cat, skill };
}

describe('Notifications API (Phase A)', () => {
  it('creates notifications when a booking is created and as status changes', async () => {
    const { cat, skill } = await seed();

    const cust = await apiRegister(request, app, { email: 'alice@example.com', role: 'CUSTOMER' });
    const addr = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({ label: 'Home', line1: '100 Main St', city: 'Dallas', postalCode: '75001' });

    const reqDoc = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${cust.token}`)
      .send({
        categoryId: cat._id.toString(),
        description: 'Need morning assistance',
        preferredDate: tomorrow(),
        address: { addressId: addr.body.data.id },
        submit: true,
      });

    const prov = await apiRegister(request, app, { email: 'bob@example.com', role: 'PROVIDER' });
    const prof = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${prov.token}`)
      .send({
        headline: 'Certified Companion',
        categoryIds: [cat._id.toString()],
        skillIds: [skill._id.toString()],
        hourlyRate: 50,
        coverageArea: { cities: ['Dallas'] },
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
        estimatedDurationMin: 60,
        proposedDate: tomorrow(),
        timeWindow: 'MORNING',
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

    // Customer books provider via quote
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

    // Both customer and provider should have received a notification
    const custNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(custNotifs.status).toBe(200);
    expect(custNotifs.body.data.notifications.length).toBeGreaterThan(0);
    expect(custNotifs.body.data.notifications[0].type).toBe('BOOKING_CREATED');
    expect(custNotifs.body.data.unreadCount).toBeGreaterThan(0);

    const provNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${prov.token}`);
    expect(provNotifs.status).toBe(200);
    expect(provNotifs.body.data.notifications.length).toBeGreaterThan(0);
    expect(provNotifs.body.data.notifications[0].type).toBe('BOOKING_CREATED');

    // Provider sets SCHEDULED then ON_THE_WAY
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

    // Customer receives status update notification
    const custNotifs2 = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${cust.token}`);
    const latestNotif = custNotifs2.body.data.notifications[0];
    expect(latestNotif.type).toBe('BOOKING_STATUS_CHANGED');
    expect(latestNotif.body).toContain('on the way');
  });

  it('supports unread counts, marking single read, and marking all read', async () => {
    const cust = await apiRegister(request, app, { email: 'charlie@example.com', role: 'CUSTOMER' });

    // Create 3 mock notifications
    const n1 = await Notification.create({
      userId: cust.user.id,
      title: 'Note 1',
      body: 'Body 1',
      type: 'SYSTEM',
    });
    await Notification.create({
      userId: cust.user.id,
      title: 'Note 2',
      body: 'Body 2',
      type: 'SYSTEM',
    });
    await Notification.create({
      userId: cust.user.id,
      title: 'Note 3',
      body: 'Body 3',
      type: 'SYSTEM',
    });

    // Unread count check
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(countRes.status).toBe(200);
    expect(countRes.body.data.unreadCount).toBe(3);

    // Mark single notification read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${n1._id}/read`)
      .set('Authorization', `Bearer ${cust.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.read).toBe(true);

    // Count is now 2
    const countRes2 = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(countRes2.body.data.unreadCount).toBe(2);

    // Mark all read
    const allRes = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(allRes.status).toBe(200);

    const countRes3 = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${cust.token}`);
    expect(countRes3.body.data.unreadCount).toBe(0);
  });

  it('prevents users from reading or marking another user notifications', async () => {
    const userA = await apiRegister(request, app, { email: 'usera@example.com', role: 'CUSTOMER' });
    const userB = await apiRegister(request, app, { email: 'userb@example.com', role: 'CUSTOMER' });

    const notifA = await Notification.create({
      userId: userA.user.id,
      title: 'Private A',
      body: 'Private note',
      type: 'SYSTEM',
    });

    // User B tries to mark User A's notification read
    const forbiddenRes = await request(app)
      .patch(`/api/v1/notifications/${notifA._id}/read`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(forbiddenRes.status).toBe(403);

    // User B lists notifications and gets none
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(listRes.body.data.notifications.length).toBe(0);
  });
});
