const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { ApiError } = require('../../utils/ApiError');
const { sendMail } = require('../../utils/mailer');
const { SELF_REGISTER_ROLES, PASSWORD_RESET_TTL_MS } = require('./auth.constants');
const { User: UserModel } = require('../../models/User');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register({ name, email, password, role }) {
  if (!SELF_REGISTER_ROLES.includes(role)) {
    throw ApiError.forbidden(
      'REGISTRATION_NOT_ALLOWED',
      'This role cannot self-register. Please contact an administrator.'
    );
  }
  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    status: 'ACTIVE',
  });

  // Email verification (PRD §7.1): issue a token and deliver it. In
  // environments without SMTP the mailer logs the link instead.
  try {
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerifyTokenHash = hashToken(token);
    user.emailVerifyExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await user.save();
    const link = `${env.clientUrl}/verify-email?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Verify your CareConnect email',
      text: `Welcome to CareConnect, ${user.name}.\n\nPlease verify your email address:\n${link}\n\nThis link expires in 24 hours.`,
    });
  } catch (_err) {
    // Non-blocking: registration succeeds even if the email step fails.
  }

  return { user: user.toSafeJSON(), token: signToken(user) };
}

async function login({ email, password }) {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash'
  );
  // Same response for unknown email vs wrong password — no account enumeration.
  if (!user) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      'ACCOUNT_INACTIVE',
      'This account is not active. Please contact support.'
    );
  }
  const safe = await UserModel.findById(user._id);
  return { user: safe.toSafeJSON(), token: signToken(safe) };
}

async function getMe(userId) {
  const user = await UserModel.findById(userId);
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.unauthorized('UNAUTHORIZED', 'Authentication required.');
  }
  return user.toSafeJSON();
}

// Stateless JWT: logout is client-side token discard. Endpoint exists for
// symmetry, future server-side denylist, and audit hooks.
async function logout() {
  return { loggedOut: true };
}

// Always resolves successfully — never reveals whether an email is registered.
async function requestPasswordReset({ email }) {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordResetTokenHash +passwordResetExpiresAt'
  );
  if (user && user.status === 'ACTIVE') {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(token);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await user.save();
    // Delivered by email when SMTP is configured; logged in dev.
    // The endpoint always resolves successfully to avoid account enumeration.
    const link = `${env.clientUrl}/reset-password?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your CareConnect password',
        text: `You requested a password reset for CareConnect.\n\nReset it here:\n${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
      });
    } catch (_err) {
      // Non-blocking email delivery
    }
  }
  return { requested: true };
}

async function resetPassword({ token, password }) {
  if (!token) {
    throw ApiError.badRequest('INVALID_TOKEN', 'Reset token is invalid or has expired.');
  }
  const user = await UserModel.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash');
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.badRequest('INVALID_TOKEN', 'Reset token is invalid or has expired.');
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();
  return { reset: true };
}

async function verifyEmail({ token }) {
  if (!token) {
    throw ApiError.badRequest('INVALID_TOKEN', 'Verification token is invalid or has expired.');
  }
  const user = await UserModel.findOne({
    emailVerifyTokenHash: hashToken(token),
    emailVerifyExpiresAt: { $gt: new Date() },
  }).select('+emailVerifyTokenHash +emailVerifyExpiresAt');
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.badRequest('INVALID_TOKEN', 'Verification token is invalid or has expired.');
  }
  user.emailVerifiedAt = new Date();
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpiresAt = null;
  await user.save();
  return { verified: true };
}

async function resendVerification({ email }) {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (user && user.status === 'ACTIVE' && !user.emailVerifiedAt) {
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerifyTokenHash = hashToken(token);
    user.emailVerifyExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await user.save();
    const link = `${env.clientUrl}/verify-email?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: 'Verify your CareConnect email',
        text: `Please verify your CareConnect email address:\n${link}\n\nThis link expires in 24 hours.`,
      });
    } catch (_err) {
      // Non-blocking email delivery
    }
  }
  return { requested: true };
}

module.exports = { register, login, getMe, logout, requestPasswordReset, resetPassword, verifyEmail, resendVerification, signToken };
