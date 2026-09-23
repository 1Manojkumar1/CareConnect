/**
 * scripts/set-password.js — rotate any account's password out-of-band.
 *
 * Used after seeding demo data to production (all seeded accounts share the
 * trivial password `123456789`), or to recover any account:
 *
 *   npm run set-password -- --email=user1@gmail.com --password='<new-secret>'
 *
 * or with environment variables (preferred in CI / Render Shell):
 *
 *   SET_PASSWORD_EMAIL=user1@gmail.com SET_PASSWORD_PASSWORD='<new-secret>' npm run set-password
 *
 * - Password must be at least 8 characters; under 12 prints a warning.
 * - Fails loudly if the user does not exist (never creates accounts).
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
    email: out.email || process.env.SET_PASSWORD_EMAIL || '',
    password: out.password || process.env.SET_PASSWORD_PASSWORD || '',
  };
}

async function main() {
  const { email, password } = parseArgs();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provide a valid email via --email= or SET_PASSWORD_EMAIL.');
  }
  if (!password || password.length < 8) {
    throw new Error('Provide a password of at least 8 characters via --password= or SET_PASSWORD_PASSWORD.');
  }
  if (password.length < 12) {
    console.warn('! Password is under 12 characters — consider a stronger secret for privileged accounts.');
  }

  await connectDb();
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new Error(`No account found for ${email.toLowerCase().trim()}.`);
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    console.log(`Password updated for: ${user.email} (${user.role})`);
  } finally {
    await disconnectDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`set-password failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };
