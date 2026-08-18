const pool = require('../db');

/**
 * Creates a notification for a specified user.
 */
async function createNotification({ userId, type, title, message, referenceType = 'INCIDENT', referenceId }) {
  try {
    const res = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [userId, type, title, message, referenceType, referenceId]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error creating notification:', err.message);
    return null;
  }
}

/**
 * Creates status transition notification for citizen when official updates report.
 */
async function notifyCitizenStatusUpdate({ userId, incidentCode, oldStatus, newStatus, remarks }) {
  const statusTitles = {
    'UNDER_REVIEW': 'Incident Report Under Review',
    'VERIFIED': 'Incident Verified by Officials 🚨',
    'REJECTED': 'Incident Report Update',
    'RESPONSE_ASSIGNED': 'Rescue Response Assigned 🚑',
    'IN_PROGRESS': 'Relief Operation In Progress ⚡',
    'RESOLVED': 'Incident Resolved ✅',
    'CLOSED': 'Incident Report Closed'
  };

  const title = statusTitles[newStatus] || `Incident ${incidentCode} Status Updated`;

  let message = `Your reported incident ${incidentCode} status has changed to ${newStatus.replace('_', ' ')}.`;
  if (remarks && remarks.trim()) {
    message += ` Official remarks: "${remarks.trim()}"`;
  }

  return await createNotification({
    userId,
    type: `STATUS_${newStatus}`,
    title,
    message,
    referenceType: 'INCIDENT',
    referenceId: incidentCode
  });
}

/**
 * Retrieves unread/recent notifications for a user.
 */
async function getUserNotifications(userId, limit = 20) {
  const res = await pool.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC LIMIT $2;`,
    [userId, limit]
  );
  return res.rows;
}

/**
 * Marks a notification as read.
 */
async function markNotificationAsRead(notificationId, userId) {
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE id = $1 AND user_id = $2 
     RETURNING *;`,
    [notificationId, userId]
  );
  return res.rows[0];
}

/**
 * Marks all notifications for a user as read.
 */
async function markAllNotificationsAsRead(userId) {
  const res = await pool.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE user_id = $1;`,
    [userId]
  );
  return true;
}

/**
 * Broadcasts a notification to users of specific roles within a target district.
 */
async function sendDistrictRoleNotification({ district, roles = ['citizen'], title, message, referenceType = 'WEATHER_ALERT', referenceId }) {
  try {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const userRes = await pool.query(
      `SELECT id FROM users WHERE LOWER(district) = LOWER($1) AND LOWER(role) = ANY($2::text[])`,
      [district, rolesArray.map(r => r.toLowerCase())]
    );

    if (!userRes.rows.length) {
      console.log(`[NotificationService] No target users found in district ${district} for roles ${rolesArray.join(', ')}`);
      return 0;
    }

    const values = userRes.rows.map(u => `(${u.id}, 'WEATHER_ALERT', '${title.replace(/'/g, "''")}', '${message.replace(/'/g, "''")}', '${referenceType}', ${referenceId ? `'${referenceId}'` : 'NULL'})`).join(',');

    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES ${values}
    `);

    console.log(`🔔 Broadcast notification sent to ${userRes.rows.length} users (${rolesArray.join(', ')}) in ${district}`);
    return userRes.rows.length;
  } catch (err) {
    console.error('Error broadcasting district notification:', err.message);
    return 0;
  }
}

module.exports = {
  createNotification,
  notifyCitizenStatusUpdate,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendDistrictRoleNotification
};

