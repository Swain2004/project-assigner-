const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, getDashboardStats } = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', getNotifications);
router.get('/dashboard-stats', getDashboardStats);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/clear-all', clearAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;
