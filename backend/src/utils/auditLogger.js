const { AuditLog } = require('../models/AuditLog');

/**
 * Safely writes an audit entry to the database.
 * Never throws an error to ensure calling business logic is not interrupted.
 */
async function recordAuditLog({ actor, action, target, before, after, diff, ip, userAgent }) {
  try {
    if (!actor || !action || !target) return;
    await AuditLog.create({
      actor: {
        userId: actor.userId || actor._id || actor.id,
        role: actor.role || 'SYSTEM',
        name: actor.name || '',
        email: actor.email || '',
      },
      action,
      target: {
        model: target.model || 'Unknown',
        id: target.id || target._id || null,
        label: target.label || '',
      },
      before: before || null,
      after: after || null,
      diff: diff || null,
      ip: ip || '',
      userAgent: userAgent || '',
    });
  } catch (err) {
    // Audit logging failure should not crash critical transactions, but should log to server stderr
    console.error('[AuditLogger] Failed to write audit log:', err.message);
  }
}

module.exports = { recordAuditLog };
