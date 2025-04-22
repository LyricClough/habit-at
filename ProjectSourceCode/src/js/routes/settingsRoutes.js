// src/js/routes/settingsRoutes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.use(auth);
router.get('/settings', ctrl.showSettings);
router.post('/settings/profile', ctrl.updateProfile);
router.post('/settings/preferences', ctrl.updatePreferences);
router.post('/settings/password', ctrl.changePassword);

module.exports = router;