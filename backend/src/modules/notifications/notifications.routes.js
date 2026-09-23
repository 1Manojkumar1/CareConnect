const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const notificationsController = require('./notifications.controller');

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationsController.listNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/:id/read', notificationsController.markAsRead);
router.post('/mark-all-read', notificationsController.markAllAsRead);

module.exports = router;
