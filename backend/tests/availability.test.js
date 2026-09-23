const request = require('supertest');
const { createApp } = require('../src/app');
const { startDb, stopDb, clearDb, apiRegister } = require('./helpers');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { AvailabilitySlot } = require('../src/models/AvailabilitySlot');
const { Booking } = require('../src/models/Booking');

describe('Phase 9 — Availability and Scheduling', () => {
  let mongo;
  let app;
  let providerToken, providerProfileId;
  let customerUser, customerToken;

  beforeAll(async () => {
    mongo = await startDb();
    app = createApp();
  }, 180000);


  afterAll(async () => {
    await stopDb(mongo);
  });

  beforeEach(async () => {
    await clearDb();

    // Register a provider
    const provReg = await apiRegister(request, app, {
      name: 'Pro Schedule Fixer',
      email: 'pro-schedule@example.com',
      role: 'PROVIDER',
    });
    providerToken = provReg.token;

    // Create provider profile
    const profRes = await request(app)
      .post('/api/v1/providers/profile')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        headline: 'Master Electrician & Scheduler',
        bio: 'Always on time',
        experienceYears: 7,
        serviceAreas: [{ city: 'Austin', area: 'Downtown', postalCode: '78701' }],
        pricing: { hourlyRate: 85, visitFee: 40 },
        acceptingJobs: true,
      });
    expect(profRes.status).toBe(201);
    providerProfileId = profRes.body.data.id;

    // Mark verified
    await ProviderProfile.findByIdAndUpdate(providerProfileId, {
      verificationStatus: 'VERIFIED',
    });

    // Register a customer
    const custReg = await apiRegister(request, app, {
      name: 'Customer Alice',
      email: 'alice-schedule@example.com',
      role: 'CUSTOMER',
    });
    customerUser = custReg.user;
    customerToken = custReg.token;
  });

  describe('Provider Weekly Schedule Management', () => {
    it('returns default weekly working hours (Mon-Fri 09:00-17:00, Sat-Sun closed)', async () => {
      const res = await request(app)
        .get('/api/v1/availability/schedule')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.providerId).toBe(providerProfileId);
      expect(res.body.data.acceptingJobs).toBe(true);
      expect(res.body.data.timezone).toBe('UTC');
      expect(res.body.data.workingHours).toHaveLength(7);

      const mon = res.body.data.workingHours.find((d) => d.dayOfWeek === 1);
      expect(mon.isOpen).toBe(true);
      expect(mon.ranges[0]).toEqual({ start: '09:00', end: '17:00' });

      const sun = res.body.data.workingHours.find((d) => d.dayOfWeek === 0);
      expect(sun.isOpen).toBe(false);
    });

    it('updates working hours and timezone', async () => {
      const updatedSchedule = [
        { dayOfWeek: 1, isOpen: true, ranges: [{ start: '08:00', end: '16:00' }] },
        { dayOfWeek: 2, isOpen: true, ranges: [{ start: '08:00', end: '16:00' }] },
        { dayOfWeek: 3, isOpen: true, ranges: [{ start: '08:00', end: '16:00' }] },
        { dayOfWeek: 4, isOpen: true, ranges: [{ start: '08:00', end: '16:00' }] },
        { dayOfWeek: 5, isOpen: true, ranges: [{ start: '08:00', end: '14:00' }] },
        { dayOfWeek: 6, isOpen: true, ranges: [{ start: '10:00', end: '14:00' }] },
        { dayOfWeek: 0, isOpen: false, ranges: [] },
      ];

      const res = await request(app)
        .put('/api/v1/availability/schedule')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          workingHours: updatedSchedule,
          timezone: 'America/Chicago',
          acceptingJobs: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('America/Chicago');
      const sat = res.body.data.workingHours.find((d) => d.dayOfWeek === 6);
      expect(sat.isOpen).toBe(true);
      expect(sat.ranges[0].start).toBe('10:00');
    });

    it('rejects invalid working hours range where start >= end', async () => {
      const invalidSchedule = [
        { dayOfWeek: 1, isOpen: true, ranges: [{ start: '17:00', end: '09:00' }] },
      ];

      const res = await request(app)
        .put('/api/v1/availability/schedule')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ workingHours: invalidSchedule });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TIME_RANGE');
    });
  });

  describe('Unavailable Periods / Time-off Slots', () => {
    it('allows provider to create and list blocked periods', async () => {
      const startAt = '2026-10-10T12:00:00.000Z';
      const endAt = '2026-10-10T16:00:00.000Z';

      const createRes = await request(app)
        .post('/api/v1/availability/slots')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          startAt,
          endAt,
          kind: 'BLOCKED',
          reason: 'Doctor appointment',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.reason).toBe('Doctor appointment');
      const slotId = createRes.body.data.id;

      const listRes = await request(app)
        .get('/api/v1/availability/slots')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].id).toBe(slotId);
    });

    it('allows provider to delete their own slot', async () => {
      const slot = await AvailabilitySlot.create({
        providerId: providerProfileId,
        startAt: new Date('2026-10-12T09:00:00.000Z'),
        endAt: new Date('2026-10-12T17:00:00.000Z'),
        kind: 'BLOCKED',
        reason: 'Holiday',
      });

      const delRes = await request(app)
        .delete(`/api/v1/availability/slots/${slot._id}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(delRes.status).toBe(200);
      const remaining = await AvailabilitySlot.findById(slot._id);
      expect(remaining).toBeNull();
    });

    it('prevents another provider from deleting someone else\'s slot', async () => {
      const otherReg = await apiRegister(request, app, {
        name: 'Other Provider',
        email: 'other-prov@example.com',
        role: 'PROVIDER',
      });
      await request(app)
        .post('/api/v1/providers/profile')
        .set('Authorization', `Bearer ${otherReg.token}`)
        .send({
          headline: 'Plumber',
          serviceAreas: [{ city: 'Austin' }],
          pricing: { hourlyRate: 70 },
        });

      const slot = await AvailabilitySlot.create({
        providerId: providerProfileId,
        startAt: new Date('2026-10-12T09:00:00.000Z'),
        endAt: new Date('2026-10-12T17:00:00.000Z'),
        kind: 'BLOCKED',
      });

      const delRes = await request(app)
        .delete(`/api/v1/availability/slots/${slot._id}`)
        .set('Authorization', `Bearer ${otherReg.token}`);

      expect(delRes.status).toBe(403);
    });
  });

  describe('Server-Side Booking Conflict Detection', () => {
    beforeEach(async () => {
      // Create an existing confirmed booking: Monday Oct 5, 2026 from 10:00 to 11:00 UTC
      await Booking.create({
        customerId: customerUser.id,
        providerId: providerProfileId,
        startAt: new Date('2026-10-05T10:00:00.000Z'),
        endAt: new Date('2026-10-05T11:00:00.000Z'),
        status: 'CONFIRMED',
        pricing: { total: 125, currency: 'USD' },
      });
    });

    it('detects partial overlap with existing booking (newEnd > existingStart && newStart < existingEnd)', async () => {
      // Requested: 10:30 - 11:30 (overlaps 10:00-11:00)
      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T10:30:00.000Z',
          endAt: '2026-10-05T11:30:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.conflict.code).toBe('EXISTING_BOOKING');
    });

    it('detects completely contained booking (10:15 - 10:45 inside 10:00 - 11:00)', async () => {
      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T10:15:00.000Z',
          endAt: '2026-10-05T10:45:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.conflict.code).toBe('EXISTING_BOOKING');
    });

    it('detects enclosing booking (09:30 - 11:30 enclosing 10:00 - 11:00)', async () => {
      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T09:30:00.000Z',
          endAt: '2026-10-05T11:30:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.conflict.code).toBe('EXISTING_BOOKING');
    });

    it('permits adjacent booking before (09:00 - 10:00 touch boundary at 10:00) WITHOUT conflict', async () => {
      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T09:00:00.000Z',
          endAt: '2026-10-05T10:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.conflict).toBeNull();
    });

    it('permits adjacent booking after (11:00 - 12:00 touch boundary at 11:00) WITHOUT conflict', async () => {
      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T11:00:00.000Z',
          endAt: '2026-10-05T12:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.conflict).toBeNull();
    });

    it('detects conflict with BLOCKED unavailable periods', async () => {
      // Block Tuesday Oct 6, 14:00 - 16:00
      await AvailabilitySlot.create({
        providerId: providerProfileId,
        startAt: new Date('2026-10-06T14:00:00.000Z'),
        endAt: new Date('2026-10-06T16:00:00.000Z'),
        kind: 'BLOCKED',
        reason: 'Van repairs',
      });

      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-06T14:30:00.000Z',
          endAt: '2026-10-06T15:30:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.conflict.code).toBe('PROVIDER_UNAVAILABLE');
      expect(res.body.data.conflict.message).toContain('Van repairs');
    });

    it('detects requests outside operating hours (e.g. evening or closed days)', async () => {
      // Provider hours are 09:00 - 17:00 Mon-Fri. Request at 20:00 - 21:00
      const eveningRes = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T20:00:00.000Z',
          endAt: '2026-10-05T21:00:00.000Z',
        });

      expect(eveningRes.status).toBe(200);
      expect(eveningRes.body.data.available).toBe(false);
      expect(eveningRes.body.data.conflict.code).toBe('OUTSIDE_WORKING_HOURS');

      // Sunday request (closed day)
      const sundayRes = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-04T10:00:00.000Z',
          endAt: '2026-10-04T11:00:00.000Z',
        });

      expect(sundayRes.status).toBe(200);
      expect(sundayRes.body.data.available).toBe(false);
      expect(sundayRes.body.data.conflict.code).toBe('OUTSIDE_WORKING_HOURS');
      expect(sundayRes.body.data.conflict.message).toContain('closed on Sundays');
    });

    it('rejects booking when provider is not accepting jobs', async () => {
      await ProviderProfile.findByIdAndUpdate(providerProfileId, { acceptingJobs: false });

      const res = await request(app)
        .post('/api/v1/availability/check')
        .send({
          providerId: providerProfileId,
          startAt: '2026-10-05T13:00:00.000Z',
          endAt: '2026-10-05T14:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.conflict.code).toBe('PROVIDER_NOT_ACCEPTING');
    });
  });

  describe('Slot Discovery & Concurrency', () => {
    it('computes available slots for a given date excluding booked and blocked periods', async () => {
      // Existing booking on Mon Oct 5: 10:00 - 11:00
      await Booking.create({
        customerId: customerUser.id,
        providerId: providerProfileId,
        startAt: new Date('2026-10-05T10:00:00.000Z'),
        endAt: new Date('2026-10-05T11:00:00.000Z'),
        status: 'CONFIRMED',
      });

      // Blocked period on Mon Oct 5: 14:00 - 15:00
      await AvailabilitySlot.create({
        providerId: providerProfileId,
        startAt: new Date('2026-10-05T14:00:00.000Z'),
        endAt: new Date('2026-10-05T15:00:00.000Z'),
        kind: 'BLOCKED',
      });

      const res = await request(app)
        .get(`/api/v1/availability/providers/${providerProfileId}/slots?date=2026-10-05&durationMin=60`);

      expect(res.status).toBe(200);
      expect(res.body.data.slots.length).toBeGreaterThan(0);

      // Verify no slot overlaps 10:00-11:00 or 14:00-15:00
      for (const slot of res.body.data.slots) {
        const s = new Date(slot.startAt);
        const e = new Date(slot.endAt);

        // Check booked window
        const overlapsBooking = s < new Date('2026-10-05T11:00:00.000Z') && e > new Date('2026-10-05T10:00:00.000Z');
        expect(overlapsBooking).toBe(false);

        // Check blocked window
        const overlapsBlocked = s < new Date('2026-10-05T15:00:00.000Z') && e > new Date('2026-10-05T14:00:00.000Z');
        expect(overlapsBlocked).toBe(false);
      }
    });

    it('reserves a slot and prevents race conditions from double booking', async () => {
      const slotWindow = {
        providerId: providerProfileId,
        startAt: '2026-10-05T11:00:00.000Z',
        endAt: '2026-10-05T12:00:00.000Z',
        notes: 'Fix kitchen lighting',
      };

      // Customer 1 reserves slot
      const res1 = await request(app)
        .post('/api/v1/availability/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(slotWindow);

      expect(res1.status).toBe(201);
      expect(res1.body.data.status).toBe('CONFIRMED');

      // Attempt second reservation for the exact same slot -> 409 conflict
      const res2 = await request(app)
        .post('/api/v1/availability/reserve')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(slotWindow);

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('EXISTING_BOOKING');
    });
  });
});
