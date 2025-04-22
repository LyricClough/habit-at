// src/js/routes/dashboardRoutes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(auth);
router.get('/dashboard', ctrl.dashboard);
router.post('/completedHabit', ctrl.completeHabit);
router.post('/decrementHabit', ctrl.decrementHabit);

module.exports = router;