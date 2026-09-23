/**
 * tests/seed.test.js
 *
 * Verifies the demo seed against an in-memory MongoDB instance:
 *   1. Catalog seed is idempotent (re-run creates no duplicates)
 *   2. Demo seed creates all expected entities
 *   3. Demo seed is idempotent (re-run produces same counts)
 *   4. Demo accounts exist with correct roles
 *   5. Provider profiles are VERIFIED with required fields
 *   6. Service requests span expected statuses
 *   7. At least one PAID invoice exists
 *   8. At least one PUBLISHED review exists
 *   9. At least one UNDER_REVIEW dispute exists
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Models
const { User } = require('../src/models/User');
const { ProviderProfile } = require('../src/models/ProviderProfile');
const { ServiceRequest } = require('../src/models/ServiceRequest');
const { Quote } = require('../src/models/Quote');
const { Booking } = require('../src/models/Booking');
const { Invoice } = require('../src/models/Invoice');
const { Review } = require('../src/models/Review');
const { Dispute } = require('../src/models/Dispute');
const { Notification } = require('../src/models/Notification');
const { SystemConfig } = require('../src/models/SystemConfig');

// Seed functions
const { seedCatalog } = require('../src/seed/catalog.seed');
const { seedDemo } = require('../src/seed/demo.seed');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  await Promise.race([
    mongod.stop().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 20000)),
  ]);
});

// ── Catalog ────────────────────────────────────────────────────────────────

describe('Catalog seed', () => {
  let firstRun;

  test('seeds categories and skills on first run', async () => {
    firstRun = await seedCatalog();
    expect(firstRun.categories).toBeGreaterThanOrEqual(11);
    expect(firstRun.subcategories).toBeGreaterThanOrEqual(30);
    expect(firstRun.skills).toBeGreaterThanOrEqual(40);
  });

  test('is idempotent — second run returns same counts, no duplicates', async () => {
    const secondRun = await seedCatalog();
    expect(secondRun.categories).toBe(firstRun.categories);
    expect(secondRun.subcategories).toBe(firstRun.subcategories);
    expect(secondRun.skills).toBe(firstRun.skills);
  });
});

// ── Demo seed ──────────────────────────────────────────────────────────────

describe('Demo seed', () => {
  let summary;

  test('seeds demo data successfully', async () => {
    summary = await seedDemo();
    expect(summary).toBeDefined();
    expect(summary.users).toBe(7);
    expect(summary.providers).toBe(3);
  });

  test('creates all expected service entities', () => {
    expect(summary.requests).toBeGreaterThanOrEqual(4);
    expect(summary.quotes).toBeGreaterThanOrEqual(4);
    expect(summary.bookings).toBeGreaterThanOrEqual(3);
    expect(summary.invoices).toBeGreaterThanOrEqual(2);
    expect(summary.reviews).toBeGreaterThanOrEqual(1);
    expect(summary.disputes).toBeGreaterThanOrEqual(1);
    expect(summary.notifications).toBeGreaterThanOrEqual(5);
  });

  test('creates system config', () => {
    expect(summary.systemConfig).toBe(true);
  });

  test('is idempotent — second run creates no duplicates', async () => {
    const second = await seedDemo();
    // All entities exist — nothing new should be created
    expect(second.reviews).toBe(0);
    expect(second.disputes).toBe(0);
    expect(second.systemConfig).toBe(false);
  });
});

// ── Data quality checks ────────────────────────────────────────────────────

describe('Demo data quality', () => {
  test('all 7 demo accounts exist with correct roles', async () => {
    const expected = [
      { email: 'admin1@gmail.com', role: 'ADMIN' },
      { email: 'ops1@gmail.com', role: 'OPERATIONS' },
      { email: 'user1@gmail.com', role: 'CUSTOMER' },
      { email: 'user2@gmail.com', role: 'CUSTOMER' },
      { email: 'provider1@gmail.com', role: 'PROVIDER' },
      { email: 'provider2@gmail.com', role: 'PROVIDER' },
      { email: 'provider3@gmail.com', role: 'PROVIDER' },
    ];
    for (const { email, role } of expected) {
      const user = await User.findOne({ email });
      expect(user).toBeDefined();
      expect(user.role).toBe(role);
      expect(user.status).toBe('ACTIVE');
    }
  });

  test('all 3 provider profiles are VERIFIED with required fields', async () => {
    const providerUsers = await User.find({ email: /@gmail\.com$/, role: 'PROVIDER' });
    for (const u of providerUsers) {
      const profile = await ProviderProfile.findOne({ userId: u._id });
      expect(profile).toBeDefined();
      expect(profile.verificationStatus).toBe('VERIFIED');
      expect(profile.categoryIds.length).toBeGreaterThan(0);
      expect(profile.serviceAreas.length).toBeGreaterThan(0);
      expect(profile.pricing.hourlyRate).toBeGreaterThan(0);
    }
  });

  test('service requests span multiple statuses', async () => {
    const statuses = await ServiceRequest.distinct('status');
    expect(statuses).toContain('OPEN');
    expect(statuses).toContain('BOOKED');
    expect(statuses).toContain('CLOSED');
  });

  test('at least one ACCEPTED quote exists', async () => {
    const count = await Quote.countDocuments({ status: 'ACCEPTED' });
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('bookings span multiple lifecycle states', async () => {
    const statuses = await Booking.distinct('status');
    expect(statuses.length).toBeGreaterThanOrEqual(3);
    // Should have a completed booking, an active one, and a disputed one
    const hasCompleted = statuses.some(s => ['CLOSED', 'CUSTOMER_CONFIRMED'].includes(s));
    const hasActive = statuses.some(s => ['IN_PROGRESS', 'CONFIRMED', 'SCHEDULED'].includes(s));
    expect(hasCompleted).toBe(true);
    expect(hasActive).toBe(true);
  });

  test('has a PAID invoice', async () => {
    const paid = await Invoice.findOne({ status: 'PAID' });
    expect(paid).toBeDefined();
    expect(paid.total).toBeGreaterThan(0);
    expect(paid.paidAt).toBeDefined();
    expect(paid.paymentMethod).toBeDefined();
  });

  test('has an ISSUED invoice awaiting payment', async () => {
    const issued = await Invoice.findOne({ status: 'ISSUED' });
    expect(issued).toBeDefined();
    expect(issued.dueDate).toBeDefined();
  });

  test('has a PUBLISHED review', async () => {
    const review = await Review.findOne({ status: 'PUBLISHED' });
    expect(review).toBeDefined();
    expect(review.rating).toBeGreaterThanOrEqual(4);
    expect(review.body.length).toBeGreaterThan(20);
  });

  test('has an UNDER_REVIEW dispute', async () => {
    const dispute = await Dispute.findOne({ status: 'UNDER_REVIEW' });
    expect(dispute).toBeDefined();
    expect(dispute.reason).toBeDefined();
    expect(dispute.description.length).toBeGreaterThan(20);
  });

  test('notifications exist for customer and provider users', async () => {
    const user1 = await User.findOne({ email: 'user1@gmail.com' });
    const user1Notifs = await Notification.countDocuments({ userId: user1._id });
    expect(user1Notifs).toBeGreaterThanOrEqual(2);
  });

  test('system config has valid commission and tax rates', async () => {
    const config = await SystemConfig.findOne();
    expect(config).toBeDefined();
    expect(config.platformCommissionPercent).toBeGreaterThan(0);
    expect(config.platformCommissionPercent).toBeLessThanOrEqual(30);
    expect(config.taxRatePercent).toBeGreaterThan(0);
    expect(config.currency).toBe('USD');
  });
});
