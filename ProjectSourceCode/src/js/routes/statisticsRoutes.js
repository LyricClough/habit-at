const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/statisticsController');

// Apply authentication to all statistics routes
router.use(auth);

// View statistics page
router.get('/statistics', ctrl.getStatisticsPage);

// Debug statistics page - same controller but different view
router.get('/statistics/debug', (req, res) => {
  // Pass the custom view as a string parameter
  ctrl.getStatisticsPage(req, res, 'pages/debug-statistics');
});

// Export statistics data as JSON
router.get('/statistics/export', ctrl.exportStatisticsData);

module.exports = router; 