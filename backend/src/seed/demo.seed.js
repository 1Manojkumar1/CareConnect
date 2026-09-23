/**
 * demo.seed.js — CareConnect Demo Environment
 *
 * Seeds a complete, realistic demo dataset covering all user roles and
 * the full service lifecycle for capstone presentation.
 *
 * Idempotent: identifies existing entities by stable filters, skips
 * creation if already present. Safe to re-run.
 *
 * Demo Accounts (password for all: 123456789)
 * ─────────────────────────────────────────────
 *  admin1@gmail.com        ADMIN
 *  ops1@gmail.com          OPERATIONS
 *  user1@gmail.com         CUSTOMER
 *  user2@gmail.com         CUSTOMER
 *  provider1@gmail.com     PROVIDER  (Plumbing + Electrical, Austin TX)
 *  provider2@gmail.com     PROVIDER  (Cleaning + Pest Control, Austin TX)
 *  provider3@gmail.com     PROVIDER  (Appliance Repair + HVAC, Austin TX)
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { ProviderProfile } = require('../models/ProviderProfile');
const { ServiceCategory } = require('../models/ServiceCategory');
const { Skill } = require('../models/Skill');
const { ServiceRequest } = require('../models/ServiceRequest');
const { Quote } = require('../models/Quote');
const { Booking } = require('../models/Booking');
const { Invoice } = require('../models/Invoice');
const { Review } = require('../models/Review');
const { Notification } = require('../models/Notification');
const { Dispute } = require('../models/Dispute');
const { SystemConfig } = require('../models/SystemConfig');

// ─── Helpers ───────────────────────────────────────────────────────────────

const PASSWORD_HASH = bcrypt.hashSync('123456789', 10);

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}
function minsAgo(m) {
  return new Date(Date.now() - m * 60 * 1000);
}
function padInvoiceNum(n) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${ym}-DEMO${String(n).padStart(3, '0')}`;
}

async function upsertUser({ email, name, role, phone, addresses }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name,
      role,
      phone,
      passwordHash: PASSWORD_HASH,
      status: 'ACTIVE',
      addresses: addresses || [],
    });
  } else if (addresses && (!user.addresses || user.addresses.length === 0)) {
    user.addresses = addresses;
    await user.save();
  }
  return user;
}

async function upsertProviderProfile(userId, profileData) {
  let p = await ProviderProfile.findOne({ userId });
  if (!p) p = await ProviderProfile.create({ userId, ...profileData });
  return p;
}

async function findOrCreate(Model, filter, data) {
  const existing = await Model.findOne(filter);
  if (existing) return { doc: existing, created: false };
  const doc = await Model.create(data);
  return { doc, created: true };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function seedDemo() {
  const summary = {
    users: 0, providers: 0, requests: 0, quotes: 0,
    bookings: 0, invoices: 0, reviews: 0, disputes: 0,
    notifications: 0, systemConfig: false,
  };

  // ── 1. System config ─────────────────────────────────────────────────────
  const { created: cfgCreated } = await findOrCreate(
    SystemConfig,
    { key: 'PLATFORM_CONFIG' },
    {
      key: 'PLATFORM_CONFIG',
      platformCommissionPercent: 12,
      minimumBookingFee: 25,
      taxRatePercent: 8.5,
      currency: 'USD',
      supportEmail: 'support@careconnect.demo',
      maintenanceMode: false,
    }
  );
  summary.systemConfig = cfgCreated;

  // ── 2. Ensure catalog exists ──────────────────────────────────────────────
  const categoryCount = await ServiceCategory.countDocuments({ parentId: null });
  if (categoryCount === 0) {
    console.warn('  ⚠ No categories found — run `npm run seed` first.');
    return summary;
  }

  const [plumbing, electrical, cleaning, pestControl, applianceRepair, hvac] = await Promise.all([
    ServiceCategory.findOne({ name: 'Plumbing', parentId: null }),
    ServiceCategory.findOne({ name: 'Electrical', parentId: null }),
    ServiceCategory.findOne({ name: 'Cleaning', parentId: null }),
    ServiceCategory.findOne({ name: 'Pest Control', parentId: null }),
    ServiceCategory.findOne({ name: 'Appliance Repair', parentId: null }),
    ServiceCategory.findOne({ name: 'Heating & Cooling', parentId: null }),
  ]);

  if (!plumbing || !electrical || !cleaning) {
    console.warn('  ⚠ Required categories not found — run `npm run seed` first.');
    return summary;
  }

  const [leakDetection, pipeRepair, fixtureInstall, wiring, lightingInstall,
    deepCleaning, floorCare, applianceDiag, motorReplacement] = await Promise.all([
    Skill.findOne({ name: 'Leak Detection' }),
    Skill.findOne({ name: 'Pipe Repair' }),
    Skill.findOne({ name: 'Fixture Installation' }),
    Skill.findOne({ name: 'Wiring' }),
    Skill.findOne({ name: 'Lighting Installation' }),
    Skill.findOne({ name: 'Deep Cleaning' }),
    Skill.findOne({ name: 'Floor Care' }),
    Skill.findOne({ name: 'Appliance Diagnostics' }),
    Skill.findOne({ name: 'Motor Replacement' }),
  ]);

  // ── 3. Users ──────────────────────────────────────────────────────────────
  const addrUser1 = { label: 'Home', line1: '412 Barton Springs Rd', city: 'Austin', postalCode: '78704', isDefault: true };
  const addrUser2 = { label: 'Home', line1: '1836 Lamar Blvd', city: 'Austin', postalCode: '78701', isDefault: true };

  const users = {};
  for (const spec of [
    { key: 'admin', email: 'admin1@gmail.com', name: 'admin1', role: 'ADMIN', phone: '5550000001' },
    { key: 'ops', email: 'ops1@gmail.com', name: 'ops1', role: 'OPERATIONS', phone: '5550000002' },
    { key: 'user1', email: 'user1@gmail.com', name: 'user1', role: 'CUSTOMER', phone: '5550000003', addresses: [addrUser1] },
    { key: 'user2', email: 'user2@gmail.com', name: 'user2', role: 'CUSTOMER', phone: '5550000004', addresses: [addrUser2] },
    { key: 'provider1', email: 'provider1@gmail.com', name: 'provider1', role: 'PROVIDER', phone: '5550000005' },
    { key: 'provider2', email: 'provider2@gmail.com', name: 'provider2', role: 'PROVIDER', phone: '5550000006' },
    { key: 'provider3', email: 'provider3@gmail.com', name: 'provider3', role: 'PROVIDER', phone: '5550000007' },
  ]) {
    users[spec.key] = await upsertUser(spec);
  }
  const { ops, user1, user2, provider1: provider1User, provider2: provider2User, provider3: provider3User } = users;
  summary.users = 7;

  // ── 4. Provider profiles ──────────────────────────────────────────────────
  const toIds = (arr) => arr.filter(Boolean).map((x) => x._id);

  const provider1 = await upsertProviderProfile(provider1User._id, {
    headline: 'Licensed plumber & electrician — 12 years in Austin',
    bio: 'Residential plumbing and electrical. Fully insured and licensed. Available weekdays and most Saturdays.',
    experienceYears: 12,
    categoryIds: toIds([plumbing, electrical]),
    skillIds: toIds([leakDetection, pipeRepair, fixtureInstall, wiring, lightingInstall]),
    serviceAreas: [
      { city: 'Austin', area: 'Downtown', postalCode: '78701' },
      { city: 'Austin', area: 'North Austin', postalCode: '78758' },
      { city: 'Austin', area: 'South Austin', postalCode: '78704' },
    ],
    pricing: { hourlyRate: 85, visitFee: 40, currency: 'USD' },
    acceptingJobs: true,
    timezone: 'America/Chicago',
    verificationStatus: 'VERIFIED',
    verificationNotes: 'License and insurance verified 2026-06-15.',
    ratingAvg: 4.8,
    reviewCount: 47,
    jobsCompleted: 52,
  });

  const provider2 = await upsertProviderProfile(provider2User._id, {
    headline: 'Professional cleaner & pest control specialist',
    bio: 'Eco-friendly deep cleaning and pest control. Serving Austin 8 years. Products safe for children and pets.',
    experienceYears: 8,
    categoryIds: toIds([cleaning, pestControl]),
    skillIds: toIds([deepCleaning, floorCare]),
    serviceAreas: [
      { city: 'Austin', area: 'Central Austin', postalCode: '78702' },
      { city: 'Austin', area: 'North Austin', postalCode: '78752' },
    ],
    pricing: { hourlyRate: 55, visitFee: 25, currency: 'USD' },
    acceptingJobs: true,
    timezone: 'America/Chicago',
    verificationStatus: 'VERIFIED',
    verificationNotes: 'Business license and references verified.',
    ratingAvg: 4.6,
    reviewCount: 31,
    jobsCompleted: 38,
  });

  const provider3 = await upsertProviderProfile(provider3User._id, {
    headline: 'Appliance repair & HVAC technician — certified',
    bio: 'Factory-certified for all major appliance brands. AC and heating tune-ups and repairs. Transparent pricing.',
    experienceYears: 9,
    categoryIds: toIds([applianceRepair, hvac]),
    skillIds: toIds([applianceDiag, motorReplacement]),
    serviceAreas: [
      { city: 'Austin', area: 'East Austin', postalCode: '78702' },
      { city: 'Austin', area: 'South Austin', postalCode: '78748' },
      { city: 'Austin', area: 'Cedar Park', postalCode: '78613' },
    ],
    pricing: { hourlyRate: 75, visitFee: 50, currency: 'USD' },
    acceptingJobs: true,
    timezone: 'America/Chicago',
    verificationStatus: 'VERIFIED',
    verificationNotes: 'HVAC certification and manufacturer auth verified.',
    ratingAvg: 4.9,
    reviewCount: 23,
    jobsCompleted: 27,
  });
  summary.providers = 3;

  // ── 5. Service requests ───────────────────────────────────────────────────
  // [A] CLOSED — user1 plumbing (kitchen sink leak)
  const { doc: reqA, created: rA } = await findOrCreate(
    ServiceRequest,
    { customerId: user1._id, description: /kitchen sink.*leak/i },
    {
      customerId: user1._id, categoryId: plumbing._id,
      description: 'Kitchen sink has a slow leak under the cabinet. Water dripping from the P-trap area. Need inspection and fix — possibly replace the trap and supply lines.',
      notes: 'Dog-friendly home. Knock before entering the backyard.',
      urgency: 'HIGH', budget: { min: 80, max: 200 },
      address: { ...addrUser1, label: 'Home' },
      preferredDate: daysAgo(15), timeWindow: 'MORNING',
      status: 'CLOSED',
      aiClassification: { category: 'Plumbing', subcategory: 'Leak Repair', skills: ['Leak Detection', 'Pipe Repair'], confidence: 0.91, status: 'DONE' },
      history: [
        { status: 'OPEN', at: daysAgo(16) }, { status: 'QUOTED', at: daysAgo(14) },
        { status: 'BOOKED', at: daysAgo(13) }, { status: 'CLOSED', at: daysAgo(10) },
      ],
    }
  );
  if (rA) summary.requests += 1;

  // [B] OPEN — user1 electrical (ceiling fan, has pending quote)
  const { doc: reqB, created: rB } = await findOrCreate(
    ServiceRequest,
    { customerId: user1._id, description: /ceiling fan/i },
    {
      customerId: user1._id, categoryId: electrical._id,
      description: 'Need a ceiling fan installed in the master bedroom. I have the fan. Existing light fixture box — not sure if it can handle the fan weight.',
      urgency: 'LOW', budget: { min: 60, max: 150 },
      address: { ...addrUser1, label: 'Home' },
      preferredDate: daysFromNow(5), timeWindow: 'AFTERNOON',
      status: 'OPEN',
      aiClassification: { category: 'Electrical', subcategory: 'Lighting Installation', skills: ['Lighting Installation', 'Wiring'], confidence: 0.83, status: 'DONE' },
      history: [{ status: 'OPEN', at: daysAgo(2) }],
    }
  );
  if (rB) summary.requests += 1;

  // [C] BOOKED — user1 cleaning (upcoming deep clean)
  const { doc: reqC, created: rC } = await findOrCreate(
    ServiceRequest,
    { customerId: user1._id, description: /move-in.*clean/i },
    {
      customerId: user1._id, categoryId: cleaning._id,
      description: 'Move-in deep clean for a 3-bedroom house. Previous tenants left it dirty. Full clean including oven, refrigerator interior, bathrooms, all floors.',
      urgency: 'MEDIUM', budget: { min: 150, max: 350 },
      address: { ...addrUser1, label: 'New Home' },
      preferredDate: daysFromNow(3), timeWindow: 'MORNING',
      status: 'BOOKED',
      aiClassification: { category: 'Cleaning', subcategory: 'Deep Cleaning', skills: ['Deep Cleaning', 'Kitchen & Bath Detailing'], confidence: 0.88, status: 'DONE' },
      history: [
        { status: 'OPEN', at: daysAgo(5) }, { status: 'QUOTED', at: daysAgo(4) },
        { status: 'BOOKED', at: daysAgo(3) },
      ],
    }
  );
  if (rC) summary.requests += 1;

  // [D] BOOKED — user2 appliance repair (refrigerator, active today)
  const fallbackCat = applianceRepair || plumbing;
  const { doc: reqD, created: rD } = await findOrCreate(
    ServiceRequest,
    { customerId: user2._id, description: /refrigerator.*cooling/i },
    {
      customerId: user2._id, categoryId: fallbackCat._id,
      description: 'Refrigerator not cooling properly. Ice maker stopped last week and now main compartment is at 60°F. Samsung model RF28R7351SR.',
      urgency: 'HIGH', budget: { min: 100, max: 400 },
      address: { ...addrUser2, label: 'Home' },
      preferredDate: new Date(), timeWindow: 'MORNING',
      status: 'BOOKED',
      aiClassification: { category: 'Appliance Repair', subcategory: 'Refrigerator Repair', skills: ['Appliance Diagnostics'], confidence: 0.95, status: 'DONE' },
      history: [
        { status: 'OPEN', at: daysAgo(2) }, { status: 'QUOTED', at: daysAgo(1) },
        { status: 'BOOKED', at: daysAgo(1) },
      ],
    }
  );
  if (rD) summary.requests += 1;

  // [E] CLOSED — user2 plumbing (bathroom faucet, now disputed)
  const { doc: reqE, created: rE } = await findOrCreate(
    ServiceRequest,
    { customerId: user2._id, description: /bathroom faucet/i },
    {
      customerId: user2._id, categoryId: plumbing._id,
      description: 'Bathroom faucet dripping and sink draining slowly. Need both fixed. Drip getting worse over 2 weeks.',
      urgency: 'MEDIUM', budget: { min: 50, max: 200 },
      address: { ...addrUser2, label: 'Home' },
      preferredDate: daysAgo(20), timeWindow: 'FLEXIBLE',
      status: 'CLOSED',
      history: [
        { status: 'OPEN', at: daysAgo(22) }, { status: 'QUOTED', at: daysAgo(21) },
        { status: 'BOOKED', at: daysAgo(20) }, { status: 'CLOSED', at: daysAgo(18) },
      ],
    }
  );
  if (rE) summary.requests += 1;

  // ── 6. Quotes ─────────────────────────────────────────────────────────────
  // Quote schema: pricing.{ labor, materials, tax, discount, total }, estimatedDurationMin, expiresAt

  // [qA] ACCEPTED — user1 / provider1 (plumbing, reqA)
  const { doc: quoteA, created: qaC } = await findOrCreate(
    Quote,
    { requestId: reqA._id, providerId: provider1._id },
    {
      requestId: reqA._id, providerId: provider1._id, customerId: user1._id,
      pricing: { labor: 125, materials: 30, tax: 0, discount: 0, total: 155, currency: 'USD' },
      estimatedDurationMin: 90,
      proposedDate: daysAgo(14),
      expiresAt: daysAgo(7),
      status: 'ACCEPTED',
      notes: 'Fixed price. Includes parts and 30-day labor warranty.',
      decidedAt: daysAgo(14),
    }
  );
  if (qaC) summary.quotes += 1;

  // [qC] ACCEPTED — user1 / provider2 (cleaning, reqC)
  const { doc: quoteC, created: qcC } = await findOrCreate(
    Quote,
    { requestId: reqC._id, providerId: provider2._id },
    {
      requestId: reqC._id, providerId: provider2._id, customerId: user1._id,
      pricing: { labor: 220, materials: 60, tax: 0, discount: 0, total: 280, currency: 'USD' },
      estimatedDurationMin: 300,
      proposedDate: daysFromNow(3),
      expiresAt: daysFromNow(10),
      status: 'ACCEPTED',
      notes: 'Eco-friendly products. Team of 2 cleaners.',
      decidedAt: daysAgo(3),
    }
  );
  if (qcC) summary.quotes += 1;

  // [qD] ACCEPTED — user2 / provider3 (appliance repair, reqD)
  const { doc: quoteD, created: qdC } = await findOrCreate(
    Quote,
    { requestId: reqD._id, providerId: provider3._id },
    {
      requestId: reqD._id, providerId: provider3._id, customerId: user2._id,
      pricing: { labor: 165, materials: 50, tax: 0, discount: 0, total: 215, currency: 'USD' },
      estimatedDurationMin: 120,
      proposedDate: new Date(),
      expiresAt: daysFromNow(7),
      status: 'ACCEPTED',
      notes: 'Estimate may change if compressor is also faulty.',
      decidedAt: daysAgo(1),
    }
  );
  if (qdC) summary.quotes += 1;

  // [qE] ACCEPTED — user2 / provider1 (plumbing dispute case, reqE)
  const { doc: quoteE, created: qeC } = await findOrCreate(
    Quote,
    { requestId: reqE._id, providerId: provider1._id },
    {
      requestId: reqE._id, providerId: provider1._id, customerId: user2._id,
      pricing: { labor: 110, materials: 0, tax: 0, discount: 0, total: 110, currency: 'USD' },
      estimatedDurationMin: 60,
      proposedDate: daysAgo(20),
      expiresAt: daysAgo(13),
      status: 'ACCEPTED',
      decidedAt: daysAgo(20),
    }
  );
  if (qeC) summary.quotes += 1;

  // [qB] PENDING — user1 / provider1 (ceiling fan, reqB — awaiting decision)
  const { created: qbC } = await findOrCreate(
    Quote,
    { requestId: reqB._id, providerId: provider1._id },
    {
      requestId: reqB._id, providerId: provider1._id, customerId: user1._id,
      pricing: { labor: 125, materials: 0, tax: 0, discount: 0, total: 125, currency: 'USD' },
      estimatedDurationMin: 90,
      proposedDate: daysFromNow(5),
      expiresAt: daysFromNow(12),
      status: 'PENDING',
      notes: 'Will verify box load rating before installation.',
    }
  );
  if (qbC) summary.quotes += 1;

  // ── 7. Bookings ───────────────────────────────────────────────────────────
  const bookingAddr = (addr) => ({ street: addr.line1, city: addr.city, postalCode: addr.postalCode });

  // [bA] CLOSED — user1 / provider1 (plumbing job, fully done)
  const { doc: bookingA, created: baC } = await findOrCreate(
    Booking,
    { requestId: reqA._id, customerId: user1._id },
    {
      requestId: reqA._id, quoteId: quoteA._id,
      customerId: user1._id, providerId: provider1._id,
      status: 'CLOSED',
      startAt: daysAgo(14),
      endAt: new Date(daysAgo(14).getTime() + 2 * 3600000),
      scheduledStartAt: daysAgo(14),
      scheduledEndAt: new Date(daysAgo(14).getTime() + 2 * 3600000),
      enRouteAt: new Date(daysAgo(14).getTime() - 30 * 60000),
      arrivedAt: daysAgo(14),
      startedAt: daysAgo(14),
      completedAt: new Date(daysAgo(14).getTime() + 90 * 60000),
      confirmedAt: daysAgo(13),
      closedAt: daysAgo(10),
      pricing: { total: 155, currency: 'USD' },
      address: bookingAddr(addrUser1),
      history: [
        { fromStatus: 'CONFIRMED', toStatus: 'SCHEDULED', changedBy: provider1User._id, createdAt: daysAgo(14) },
        { fromStatus: 'SCHEDULED', toStatus: 'ON_THE_WAY', changedBy: provider1User._id, createdAt: new Date(daysAgo(14).getTime() - 30 * 60000) },
        { fromStatus: 'ON_THE_WAY', toStatus: 'ARRIVED', changedBy: provider1User._id, createdAt: daysAgo(14) },
        { fromStatus: 'ARRIVED', toStatus: 'IN_PROGRESS', changedBy: provider1User._id, createdAt: daysAgo(14) },
        { fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedBy: provider1User._id, createdAt: new Date(daysAgo(14).getTime() + 90 * 60000) },
        { fromStatus: 'COMPLETED', toStatus: 'CUSTOMER_CONFIRMED', changedBy: user1._id, createdAt: daysAgo(13) },
        { fromStatus: 'CUSTOMER_CONFIRMED', toStatus: 'CLOSED', changedBy: ops._id, createdAt: daysAgo(10) },
      ],
    }
  );
  if (baC) summary.bookings += 1;

  // [bC] CONFIRMED — user1 / provider2 (cleaning in 3 days)
  const { doc: bookingC, created: bcC } = await findOrCreate(
    Booking,
    { requestId: reqC._id, customerId: user1._id },
    {
      requestId: reqC._id, quoteId: quoteC._id,
      customerId: user1._id, providerId: provider2._id,
      status: 'CONFIRMED',
      startAt: daysFromNow(3),
      endAt: hoursFromNow(3 * 24 + 5),
      scheduledStartAt: daysFromNow(3),
      pricing: { total: 280, currency: 'USD' },
      address: bookingAddr(addrUser1),
      history: [
        { fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: user1._id, createdAt: daysAgo(3) },
      ],
    }
  );
  if (bcC) summary.bookings += 1;

  // [bD] IN_PROGRESS — user2 / provider3 (refrigerator active right now)
  const { created: bdC } = await findOrCreate(
    Booking,
    { requestId: reqD._id, customerId: user2._id },
    {
      requestId: reqD._id, quoteId: quoteD._id,
      customerId: user2._id, providerId: provider3._id,
      status: 'IN_PROGRESS',
      startAt: minsAgo(60),
      endAt: hoursFromNow(1),
      enRouteAt: minsAgo(90),
      arrivedAt: minsAgo(75),
      startedAt: minsAgo(60),
      pricing: { total: 215, currency: 'USD' },
      address: bookingAddr(addrUser2),
      history: [
        { fromStatus: 'CONFIRMED', toStatus: 'SCHEDULED', changedBy: provider3User._id, createdAt: daysAgo(1) },
        { fromStatus: 'SCHEDULED', toStatus: 'ON_THE_WAY', changedBy: provider3User._id, createdAt: minsAgo(90) },
        { fromStatus: 'ON_THE_WAY', toStatus: 'ARRIVED', changedBy: provider3User._id, createdAt: minsAgo(75) },
        { fromStatus: 'ARRIVED', toStatus: 'IN_PROGRESS', changedBy: provider3User._id, createdAt: minsAgo(60) },
      ],
    }
  );
  if (bdC) summary.bookings += 1;

  // [bE] DISPUTED — user2 / provider1 (plumbing quality dispute)
  const { doc: bookingE, created: beC } = await findOrCreate(
    Booking,
    { requestId: reqE._id, customerId: user2._id },
    {
      requestId: reqE._id, quoteId: quoteE._id,
      customerId: user2._id, providerId: provider1._id,
      status: 'DISPUTED',
      startAt: daysAgo(20),
      endAt: new Date(daysAgo(20).getTime() + 90 * 60000),
      completedAt: new Date(daysAgo(20).getTime() + 90 * 60000),
      pricing: { total: 110, currency: 'USD' },
      address: bookingAddr(addrUser2),
      history: [
        { fromStatus: 'CONFIRMED', toStatus: 'IN_PROGRESS', changedBy: provider1User._id, createdAt: daysAgo(20) },
        { fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', changedBy: provider1User._id, createdAt: new Date(daysAgo(20).getTime() + 90 * 60000) },
        { fromStatus: 'COMPLETED', toStatus: 'DISPUTED', changedBy: user2._id, createdAt: daysAgo(18) },
      ],
    }
  );
  if (beC) summary.bookings += 1;

  // ── 8. Invoices ───────────────────────────────────────────────────────────
  const { created: iaC } = await findOrCreate(
    Invoice,
    { invoiceNumber: padInvoiceNum(1) },
    {
      invoiceNumber: padInvoiceNum(1),
      bookingId: bookingA._id, customerId: user1._id, providerId: provider1._id,
      requestId: reqA._id, quoteId: quoteA._id,
      lineItems: [
        { description: 'Diagnostic visit', quantity: 1, unitPrice: 40, amount: 40 },
        { description: 'P-trap replacement (parts + labor)', quantity: 1, unitPrice: 85, amount: 85 },
        { description: 'Supply line replacement × 2', quantity: 2, unitPrice: 15, amount: 30 },
      ],
      subtotal: 155, tax: 13.18, platformFee: 18.60, total: 186.78,
      currency: 'USD', status: 'PAID',
      issuedAt: daysAgo(13), paidAt: daysAgo(12),
      paymentMethod: { type: 'CARD', last4: '4242', brand: 'Visa', transactionId: 'txn_demo_001' },
      notes: 'Thank you for choosing CareConnect.',
    }
  );
  if (iaC) summary.invoices += 1;

  const { created: icC } = await findOrCreate(
    Invoice,
    { invoiceNumber: padInvoiceNum(2) },
    {
      invoiceNumber: padInvoiceNum(2),
      bookingId: bookingC._id, customerId: user1._id, providerId: provider2._id,
      requestId: reqC._id, quoteId: quoteC._id,
      lineItems: [
        { description: 'Deep clean — 3BR/2BA (base)', quantity: 1, unitPrice: 220, amount: 220 },
        { description: 'Oven interior detail', quantity: 1, unitPrice: 35, amount: 35 },
        { description: 'Refrigerator interior clean', quantity: 1, unitPrice: 25, amount: 25 },
      ],
      subtotal: 280, tax: 23.80, platformFee: 33.60, total: 337.40,
      currency: 'USD', status: 'ISSUED',
      issuedAt: daysAgo(3), dueDate: daysFromNow(4),
      notes: 'Due on service completion.',
    }
  );
  if (icC) summary.invoices += 1;

  // ── 9. Review ─────────────────────────────────────────────────────────────
  const { created: revC } = await findOrCreate(
    Review,
    { bookingId: bookingA._id, customerId: user1._id },
    {
      bookingId: bookingA._id, providerId: provider1._id, customerId: user1._id,
      rating: 5,
      body: 'provider1 was fantastic — arrived right on time, diagnosed the problem quickly, and fixed everything cleanly. No mess left behind. Highly recommend!',
      status: 'PUBLISHED',
      publishedAt: daysAgo(12),
    }
  );
  if (revC) {
    summary.reviews += 1;
    await ProviderProfile.findByIdAndUpdate(provider1._id, { $set: { ratingAvg: 4.8, reviewCount: 47 } });
  }

  // ── 10. Dispute ───────────────────────────────────────────────────────────
  const { created: disC } = await findOrCreate(
    Dispute,
    { bookingId: bookingE._id },
    {
      bookingId: bookingE._id, raisedBy: user2._id,
      reason: 'POOR_QUALITY',
      description: 'The faucet was fixed but started dripping again within 24 hours. The drain is also still slow. Requesting re-service or partial refund.',
      status: 'UNDER_REVIEW',
      evidenceLinks: [],
      resolvedAt: null, resolutionNote: '',
      timeline: [
        { actor: user2._id, action: 'RAISED', note: 'Faucet leak recurred within 24h.', createdAt: daysAgo(18) },
        { actor: ops._id, action: 'UNDER_REVIEW', note: 'Reviewing evidence from both parties.', createdAt: daysAgo(17) },
      ],
    }
  );
  if (disC) summary.disputes += 1;

  // ── 11. Notifications ─────────────────────────────────────────────────────
  async function notify(userId, type, title, body, link) {
    const { created } = await findOrCreate(
      Notification,
      { userId, type, title },
      { userId, type, title, body, link, read: false }
    );
    if (created) summary.notifications += 1;
  }

  await notify(user1._id, 'BOOKING_STATUS_CHANGED', 'Booking confirmed',
    'Your cleaning booking with provider2 is confirmed for 3 days from now.', '/bookings');
  await notify(user1._id, 'REMINDER', 'New quote received',
    'provider1 sent a quote for your ceiling fan installation.', `/requests/${reqB._id}`);
  await notify(user1._id, 'INVOICE_ISSUED', 'Invoice ready',
    `Invoice ${padInvoiceNum(2)} for your upcoming cleaning is ready.`, `/invoices/${bookingC._id}`);
  await notify(user2._id, 'BOOKING_STATUS_CHANGED', 'Provider on the way',
    'provider3 is on the way for the refrigerator repair.', '/bookings');
  await notify(user2._id, 'DISPUTE_RAISED', 'Dispute under review',
    'Your dispute is under review by our operations team.', `/bookings/${bookingE._id}`);
  await notify(provider1User._id, 'BOOKING_STATUS_CHANGED', 'New confirmed booking',
    'New booking from user1 for ceiling fan installation.', '/provider/jobs');
  await notify(provider2User._id, 'REMINDER', 'Upcoming job reminder',
    'Deep cleaning for user1 is scheduled in 3 days.', '/provider/jobs');

  return summary;
}

module.exports = { seedDemo };
