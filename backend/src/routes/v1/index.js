const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('../../modules/auth/auth.routes');
const usersRoutes = require('../../modules/users/users.routes');
const providersRoutes = require('../../modules/providers/providers.routes');
const catalogRoutes = require('../../modules/catalog/catalog.routes');
const requestsRoutes = require('../../modules/requests/requests.routes');
const quotesRoutes = require('../../modules/quotes/quotes.routes');
const availabilityRoutes = require('../../modules/availability/availability.routes');
const bookingsRoutes = require('../../modules/bookings/bookings.routes');
const invoicesRoutes = require('../../modules/invoices/invoices.routes');
const notificationsRoutes = require('../../modules/notifications/notifications.routes');
const reviewsRoutes = require('../../modules/reviews/reviews.routes');
const disputesRoutes = require('../../modules/disputes/disputes.routes');
const adminRoutes = require('../../modules/admin/admin.routes');

const router = Router();

// All versioned APIs mount here: /api/v1/*
router.use('/', healthRoutes);
router.use('/', catalogRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/providers', providersRoutes);
router.use('/service-requests', requestsRoutes);
router.use('/quotes', quotesRoutes);
router.use('/availability', availabilityRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/disputes', disputesRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

