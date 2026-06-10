const { query } = require('../config/database');
const { sendEmail, buildNotificationEmail } = require('../config/mailer');

async function createNotification({
  userId,
  title,
  message,
  type,
  relatedId = null,
  relatedType = null,
  actionUrl = null,
  createdBy = null,
  sendEmailNotification = true,
}) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type, action_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, title, message, type, relatedId, relatedType, actionUrl, createdBy]
    );

    const notification = result.rows[0];

    if (global.io) {
      global.io.to(`user:${userId}`).emit('notification', notification);
    }

    if (sendEmailNotification) {
      const userResult = await query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const absoluteUrl = actionUrl
          ? actionUrl.startsWith('http') ? actionUrl : `${process.env.FRONTEND_URL || 'http://localhost:5173'}${actionUrl}`
          : null;
        const { html, text } = buildNotificationEmail({
          title,
          message,
          actionUrl: absoluteUrl,
          recipientName: user.name,
        });
        sendEmail({ to: user.email, subject: title, html, text }).catch(() => {});
      }
    }

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
    return null;
  }
}

async function createBulkNotifications(notifications) {
  return Promise.all(notifications.map((n) => createNotification(n)));
}

async function logActivity({ userId, action, entityType, entityId, metadata = {} }) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
}

module.exports = { createNotification, createBulkNotifications, logActivity };
