const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// GET /api/notifications
router.get('/', authenticateToken, notificationController.getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, notificationController.markRead);

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateToken, notificationController.markAllRead);

module.exports = router;
