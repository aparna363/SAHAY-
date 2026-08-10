const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.getUserNotifications(userId, 30);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
const markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);

    const updated = await notificationService.markNotificationAsRead(notificationId, userId);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notification read' });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await notificationService.markAllNotificationsAsRead(userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notifications read' });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
