const { query } = require('../config/database');

async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { unread_only, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT n.*, u.name as creator_name, u.avatar_url as creator_avatar
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.user_id = $1
    `;

    const params = [userId];

    if (unread_only === 'true') {
      sql += ' AND n.is_read = false';
    }

    sql += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    const countResult = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
}

async function clearAllNotifications(req, res, next) {
  try {
    await query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
}

async function getDashboardStats(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectCountSQL = isAdmin
      ? 'SELECT COUNT(*) FROM projects WHERE status = $1'
      : `SELECT COUNT(DISTINCT p.id) FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id
         WHERE (p.created_by = $2 OR pm.user_id = $2) AND p.status = $1`;

    const activeProjects = isAdmin
      ? await query(projectCountSQL, ['active'])
      : await query(projectCountSQL, ['active', userId]);

    const myTasks = await query(
      `SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status != 'done'`,
      [userId]
    );

    const completedTasks = await query(
      `SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = 'done'`,
      [userId]
    );

    const recentActivity = await query(
      `SELECT al.*, u.name as user_name, u.avatar_url
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 10`
    );

    const memberCount = isAdmin
      ? await query('SELECT COUNT(*) FROM users WHERE is_active = true')
      : { rows: [{ count: 0 }] };

    res.json({
      stats: {
        active_projects: parseInt(activeProjects.rows[0].count),
        my_tasks: parseInt(myTasks.rows[0].count),
        completed_tasks: parseInt(completedTasks.rows[0].count),
        team_members: parseInt(memberCount.rows[0].count),
      },
      recent_activity: recentActivity.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, getDashboardStats };
