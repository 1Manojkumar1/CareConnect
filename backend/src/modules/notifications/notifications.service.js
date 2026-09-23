const { Notification } = require('../../models/Notification');
const { ApiError } = require('../../utils/ApiError');

/**
 * Creates an in-app notification for a given user.
 */
async function createNotification({ userId, type, title, body, link = '', metadata = {} }) {
  if (!userId || !title || !body) return null;

  return Notification.create({
    userId,
    type: type || 'SYSTEM',
    title,
    body,
    link,
    metadata,
  });
}

/**
 * Lists notifications for a user with pagination and optional read filter.
 */
async function listNotifications(userId, { read, limit = 20, page = 1 } = {}) {
  const query = { userId };
  if (typeof read === 'boolean') {
    query.read = read;
  } else if (read === 'true') {
    query.read = true;
  } else if (read === 'false') {
    query.read = false;
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return {
    notifications,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    },
    unreadCount,
  };
}

/**
 * Returns just the unread notification count for a user.
 */
async function getUnreadCount(userId) {
  const unreadCount = await Notification.countDocuments({ userId, read: false });
  return { unreadCount };
}

/**
 * Marks a single notification as read.
 */
async function markAsRead(userId, notificationId) {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found.');
  }

  if (String(notification.userId) !== String(userId)) {
    throw ApiError.forbidden('FORBIDDEN', 'Cannot access notification belonging to another user.');
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}

/**
 * Marks all unread notifications for a user as read.
 */
async function markAllAsRead(userId) {
  const now = new Date();
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: now } }
  );

  return { modifiedCount: result.modifiedCount };
}

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
