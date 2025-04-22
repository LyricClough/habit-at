// src/js/routes/authRoutes.js
const router = require('express').Router();
const ctrl = require('../controllers/authController');

router.get('/register', ctrl.showRegister);
router.post('/register', ctrl.register);
router.get('/login', ctrl.showLogin);
router.post('/login', ctrl.login);
router.get('/logout', ctrl.logout);

module.exports = router;