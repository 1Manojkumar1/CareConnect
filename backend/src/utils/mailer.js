const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtpHost) return null;
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
  return transporter;
}

function isEmailConfigured() {
  return Boolean(env.smtpHost);
}

/**
 * Transactional email sender. Never throws: when no SMTP provider is
 * configured (local/dev) the message is logged instead so flows keep
 * working; delivery failures are logged and reported in the result.
 */
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) return { delivered: false, reason: 'missing-recipient-or-subject' };
  const body = text || (html ? html.replace(/<[^>]+>/g, ' ') : '');

  const tx = getTransporter();
  if (!tx) {
    console.log(`[mailer:dev] To: ${to}\nSubject: ${subject}\n${body}`);
    return { delivered: false, reason: 'smtp-not-configured' };
  }

  try {
    const info = await tx.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      text: body,
      html: html || undefined,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] delivery failed:', err.message);
    return { delivered: false, reason: 'delivery-failed' };
  }
}

module.exports = { sendMail, isEmailConfigured, sendUserEmail };

/**
 * Convenience wrapper: look up a user and email them. Never throws —
 * safe to call from any service without awaiting.
 */
async function sendUserEmail(userId, { subject, text }) {
  try {
    if (!userId || !subject) return { delivered: false, reason: 'missing-recipient-or-subject' };
    const { User } = require('../models/User');
    const user = await User.findById(userId).lean();
    if (!user || !user.email) return { delivered: false, reason: 'unknown-user' };
    return sendMail({ to: user.email, subject, text });
  } catch (err) {
    console.error('[mailer] lookup failed:', err.message);
    return { delivered: false, reason: 'lookup-failed' };
  }
}
