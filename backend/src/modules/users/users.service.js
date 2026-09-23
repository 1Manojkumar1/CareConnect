const { User } = require('../../models/User');
const { ApiError } = require('../../utils/ApiError');
const { recordAuditLog } = require('../../utils/auditLogger');

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  return user.toSafeJSON();
}

async function updateMe(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  await user.save();
  return user.toSafeJSON();
}

function serializeAddress(a) {
  return {
    id: a._id.toString(),
    label: a.label,
    line1: a.line1,
    line2: a.line2 || '',
    city: a.city,
    postalCode: a.postalCode,
    isDefault: Boolean(a.isDefault),
  };
}

async function listAddresses(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  return user.addresses.map(serializeAddress);
}

async function addAddress(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const isFirst = user.addresses.length === 0;
  const address = {
    label: data.label.trim(),
    line1: data.line1.trim(),
    line2: (data.line2 || '').trim(),
    city: data.city.trim(),
    postalCode: data.postalCode.trim(),
    isDefault: data.isDefault === true || isFirst,
  };
  if (address.isDefault) user.addresses.forEach((a) => { a.isDefault = false; });
  user.addresses.push(address);
  await user.save();
  return serializeAddress(user.addresses[user.addresses.length - 1]);
}

function findAddress(user, addressId) {
  const address = user.addresses.id(addressId);
  if (!address) throw ApiError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
  return address;
}

async function updateAddress(userId, addressId, data) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const address = findAddress(user, addressId);
  for (const key of ['label', 'line1', 'line2', 'city', 'postalCode']) {
    if (data[key] !== undefined) address[key] = data[key].trim();
  }
  await user.save();
  return serializeAddress(address);
}

async function removeAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const address = findAddress(user, addressId);
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  return { removed: true };
}

async function setDefaultAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const address = findAddress(user, addressId);
  user.addresses.forEach((a) => { a.isDefault = a._id.equals(address._id); });
  await user.save();
  return serializeAddress(address);
}

// --- Admin ---

async function listUsers({ page = 1, limit = 20, role, status, search }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  return {
    items: items.map((u) => u.toSafeJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function setUserStatus(actorId, userId, status) {
  if (actorId === userId) {
    throw ApiError.unprocessable('SELF_STATUS_CHANGE', 'You cannot change your own account status.');
  }
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const prevStatus = user.status;
  user.status = status;
  await user.save();

  recordAuditLog({
    actor: { userId: actorId, role: 'ADMIN' },
    action: 'USER_STATUS_CHANGE',
    target: { model: 'User', id: user._id, label: user.email },
    before: { status: prevStatus },
    after: { status },
  });

  return user.toSafeJSON();
}

async function setUserRole(actorId, userId, role) {
  if (actorId === userId) {
    throw ApiError.unprocessable('SELF_ROLE_CHANGE', 'You cannot change your own role.');
  }
  const allowedRoles = ['CUSTOMER', 'PROVIDER', 'OPERATIONS', 'SUPPORT', 'ADMIN'];
  if (!allowedRoles.includes(role)) {
    throw ApiError.unprocessable('INVALID_ROLE', `Role must be one of: ${allowedRoles.join(', ')}`);
  }
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found.');
  const prevRole = user.role;
  user.role = role;
  await user.save();

  recordAuditLog({
    actor: { userId: actorId, role: 'ADMIN' },
    action: 'USER_ROLE_CHANGE',
    target: { model: 'User', id: user._id, label: user.email },
    before: { role: prevRole },
    after: { role },
  });

  return user.toSafeJSON();
}

module.exports = {
  getMe,
  updateMe,
  listAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  listUsers,
  setUserStatus,
  setUserRole,
};
