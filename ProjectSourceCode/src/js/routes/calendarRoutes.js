// src/js/routes/calendarRoutes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/calendarController');

router.use(auth);
router.get('/calendar', ctrl.calendar);
router.post('/add-habit', ctrl.addHabit);
router.post('/edit-habit', ctrl.editHabit);
router.delete('/delete-habit/:id', ctrl.deleteHabit);

module.exports = router;
