const notificationsService = require('./notifications.service');

async function listNotifications(req, res, next) {
  try {
    const data = await notificationsService.listNotifications(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const data = await notificationsService.getUnreadCount(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const data = await notificationsService.markAsRead(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const data = await notificationsService.markAllAsRead(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
