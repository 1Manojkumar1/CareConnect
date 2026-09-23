const ROLES = ['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'];
const SELF_REGISTER_ROLES = ['CUSTOMER', 'PROVIDER'];
const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'];

// Reset tokens are single-use, hashed at rest, short-lived.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

module.exports = { ROLES, SELF_REGISTER_ROLES, ACCOUNT_STATUSES, PASSWORD_RESET_TTL_MS };
