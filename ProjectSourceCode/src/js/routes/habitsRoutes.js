const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/habitsController');

router.use(auth);

// View all habits
router.get('/habits', ctrl.getHabitsPage);

// Create a new habit
router.post('/habits/create', ctrl.createHabit);

// Update an existing habit
router.post('/habits/update', ctrl.updateHabit);

// Delete a habit
router.post('/habits/delete', ctrl.deleteHabit);

// Pin a habit to dashboard
router.post('/habits/pin-to-dashboard', ctrl.pinToDashboard);

// API routes
router.get('/api/habits/date/:date', ctrl.getHabitsByDate);
router.get('/api/habits/:habitId', ctrl.getHabitDetails);

module.exports = router; 