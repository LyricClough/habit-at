// src/js/routes/notificationsRoutes.js
const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// View notifications settings
router.get('/notifications', notificationsController.showNotificationsSettings);

// Update notification preferences
router.post('/notifications/preferences', notificationsController.updateNotificationPreferences);

// Create/update habit reminder
router.post('/notifications/habit-reminder', notificationsController.updateHabitReminder);

// Delete habit reminder
router.post('/notifications/delete-reminder', notificationsController.deleteHabitReminder);

// Toggle reminder status
router.post('/notifications/toggle-reminder', notificationsController.toggleReminderStatus);

module.exports = router; 