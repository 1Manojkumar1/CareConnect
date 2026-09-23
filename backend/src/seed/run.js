/**
 * Seed runner.
 *
 * npm run seed        — catalog only (categories + skills, idempotent)
 * npm run seed:demo   — wipe database, then catalog + full demo environment
 *
 * WARNING: demo mode drops the entire database first so the environment is
 * always clean and professional. Never point it at a production database.
 *
 * Requires MONGODB_URI to be set in the environment (or .env).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb, disconnectDb } = require('../config/db');
const { seedCatalog } = require('./catalog.seed');
const { seedDemo } = require('./demo.seed');

const MODE = process.argv[2] || 'catalog'; // 'catalog' | 'demo'

async function run() {
  await connectDb();

  console.log('\n── CareConnect Seed ──────────────────────────');
  console.log(`Mode: ${MODE}`);

  if (MODE === 'demo') {
    console.log('\n! Wiping database for a clean demo environment…');
    await mongoose.connection.db.dropDatabase();
    console.log('✓ Database wiped clean');
  }

  const catalogSummary = await seedCatalog();
  console.log(`\n✓ Catalog: ${catalogSummary.categories} categories, ${catalogSummary.subcategories} subcategories, ${catalogSummary.skills} skills`);

  if (MODE === 'demo') {
    const demoSummary = await seedDemo();
    console.log(`\n✓ Demo data:`);
    console.log(`  Users:         ${demoSummary.users}`);
    console.log(`  Providers:     ${demoSummary.providers}`);
    console.log(`  Requests:      ${demoSummary.requests}`);
    console.log(`  Quotes:        ${demoSummary.quotes}`);
    console.log(`  Bookings:      ${demoSummary.bookings}`);
    console.log(`  Invoices:      ${demoSummary.invoices}`);
    console.log(`  Reviews:       ${demoSummary.reviews}`);
    console.log(`  Disputes:      ${demoSummary.disputes}`);
    console.log(`  Notifications: ${demoSummary.notifications}`);
    console.log(`  SystemConfig:  ${demoSummary.systemConfig ? 'created' : 'exists'}`);
    console.log('\n── Demo Accounts (password: 123456789) ─────');
    console.log('  admin1@gmail.com            ADMIN');
    console.log('  ops1@gmail.com              OPERATIONS');
    console.log('  user1@gmail.com             CUSTOMER');
    console.log('  user2@gmail.com             CUSTOMER');
    console.log('  provider1@gmail.com         PROVIDER');
    console.log('  provider2@gmail.com         PROVIDER');
    console.log('  provider3@gmail.com         PROVIDER');
  }

  console.log('\n─────────────────────────────────────────────\n');
  await disconnectDb();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('\n✗ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { run };
