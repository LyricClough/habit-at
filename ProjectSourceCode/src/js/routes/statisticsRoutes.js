const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/statisticsController');

// Apply authentication to all statistics routes
router.use(auth);

// View statistics page
router.get('/statistics', ctrl.getStatisticsPage);

// Export statistics data as JSON
router.get('/statistics/export', ctrl.exportStatisticsData);

module.exports = router; 