const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User } = require('../src/models/User');
const { ServiceCategory } = require('../src/models/ServiceCategory');
const { Skill } = require('../src/models/Skill');
const { ProviderProfile } = require('../src/models/ProviderProfile');

async function startDb() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  return mongo;
}

async function stopDb(mongo, timeoutMs = 20000) {
  // mongodb-memory-server teardown occasionally hangs under full-suite load.
  // Disconnect first, then bound the binary shutdown so afterAll can't time out.
  await mongoose.disconnect().catch(() => {});
  if (!mongo) return;
  await Promise.race([
    mongo.stop().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function clearDb() {
  const { ServiceRequest } = require('../src/models/ServiceRequest');
  const { Quote } = require('../src/models/Quote');
  const { AvailabilitySlot } = require('../src/models/AvailabilitySlot');
  const { Booking } = require('../src/models/Booking');
  const { Invoice } = require('../src/models/Invoice');
  const { Notification } = require('../src/models/Notification');
  const { Review } = require('../src/models/Review');
  const { Dispute } = require('../src/models/Dispute');
  const { SystemConfig } = require('../src/models/SystemConfig');
  const { AuditLog } = require('../src/models/AuditLog');
  await Promise.all([
    User.deleteMany({}),
    ServiceCategory.deleteMany({}),
    Skill.deleteMany({}),
    ProviderProfile.deleteMany({}),
    ServiceRequest.deleteMany({}),
    Quote.deleteMany({}),
    AvailabilitySlot.deleteMany({}),
    Booking.deleteMany({}),
    Invoice.deleteMany({}),
    Notification.deleteMany({}),
    Review.deleteMany({}),
    Dispute.deleteMany({}),
    SystemConfig.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
}

async function apiRegister(request, app, overrides = {}) {
  const base = {
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    password: 'TestPass1!',
    role: 'CUSTOMER',
  };
  const res = await request(app).post('/api/v1/auth/register').send({ ...base, ...overrides });
  if (res.status !== 201) throw new Error(`setup register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function setRole(email, role) {
  await User.updateOne({ email }, { role });
}

module.exports = { startDb, stopDb, clearDb, apiRegister, setRole };
