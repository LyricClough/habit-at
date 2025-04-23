const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friendsController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET routes
router.get('/', friendsController.renderFriendsPage);
router.get('/api/friends', friendsController.getFriends);
router.get('/api/friends/requests', friendsController.getFriendRequests);
router.get('/api/friends/search', friendsController.searchUsers);
router.get('/api/friends/:id/stats', friendsController.getFriendStats);
router.get('/api/debug/users', friendsController.listAllUsers);

// POST routes
router.post('/api/friends/add', friendsController.addFriend);
router.post('/api/friends/remove', friendsController.removeFriend);
router.post('/api/debug/toggle-visibility', friendsController.toggleUserVisibility);

module.exports = router; 