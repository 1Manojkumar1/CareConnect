/**
 * scripts/create-admin.js — bootstrap the first platform admin.
 *
 * Registration never creates ADMIN users (by design), so a fresh production
 * database needs one admin created out-of-band. Run once per environment:
 *
 *   npm run create-admin -- --email=admin@example.com --password='<strong-secret>' [--name='Site Admin']
 *
 * or with environment variables (preferred in CI / Render Shell):
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='<strong-secret>' npm run create-admin
 *
 * - Password must be at least 12 characters (pass a generated secret).
 * - If the user already exists it is promoted to ADMIN (name updated if given).
 * - Never logs the password.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDb, disconnectDb } = require('../src/config/db');
const { User } = require('../src/models/User');

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return {
    email: out.email || process.env.ADMIN_EMAIL || '',
    password: out.password || process.env.ADMIN_PASSWORD || '',
    name: out.name || process.env.ADMIN_NAME || 'Site Admin',
  };
}

async function main() {
  const { email, password, name } = parseArgs();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid email via --email= or ADMIN_EMAIL.');
  }
  if (!password || password.length < 12) {
    throw new Error('Provide a password of at least 12 characters via --password= or ADMIN_PASSWORD.');
  }

  await connectDb();
  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      user.role = 'ADMIN';
      user.status = 'ACTIVE';
      if (name) user.name = name;
      await user.save();
      console.log(`Promoted existing user to ADMIN: ${normalizedEmail}`);
    } else {
      user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      console.log(`Created ADMIN user: ${normalizedEmail}`);
    }
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`create-admin failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };
