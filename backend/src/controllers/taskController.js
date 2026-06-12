const { query } = require('../config/database');
const { createNotification, logActivity } = require('../utils/notificationHelper');
const { sendEmail, buildTaskAssignmentEmail } = require('../config/mailer');

async function sendTaskAssignmentEmail({ assignedToId, taskTitle, taskDescription, projectName, priority, dueDate, assignedById }) {
  try {
    const [recipientResult, assignerResult] = await Promise.all([
      query('SELECT name, email FROM users WHERE id = $1', [assignedToId]),
      assignedById ? query('SELECT name FROM users WHERE id = $1', [assignedById]) : Promise.resolve({ rows: [] }),
    ]);
    if (recipientResult.rows.length === 0) return;
    const recipient = recipientResult.rows[0];
    const assignerName = assignerResult.rows[0]?.name || null;
    const { html, text } = buildTaskAssignmentEmail({
      recipientName: recipient.name,
      taskTitle,
      taskDescription,
      projectName,
      priority,
      dueDate,
      assignedByName: assignerName,
    });
    await sendEmail({ to: recipient.email, subject: `New Task Assigned: ${taskTitle}`, html, text });
  } catch (err) {
    console.error('Task assignment email error:', err.message);
  }
}

async function notifyMentions(description, taskId, taskTitle, projectId, createdBy) {
  if (!description) return;
  const mentions = [...new Set(description.match(/@([A-Za-z][\w]*(?:\s+[A-Za-z][\w]*)*)/g) || [])];
  for (const mention of mentions) {
    const name = mention.slice(1).trim();
    try {
      const userResult = await query(
        `SELECT id FROM users WHERE name ILIKE $1 AND is_active = true LIMIT 1`,
        [name]
      );
      if (userResult.rows.length > 0) {
        const mentionedUserId = userResult.rows[0].id;
        if (mentionedUserId !== createdBy) {
          await createNotification({
            userId: mentionedUserId,
            title: 'You were mentioned',
            message: `You were mentioned in task "${taskTitle}"`,
            type: 'mention',
            relatedId: taskId,
            relatedType: 'task',
            actionUrl: `/projects/${projectId}`,
            createdBy,
          });
        }
      }
    } catch {}
  }
}

async function getTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { project_id, status, priority, assigned_to, my_tasks } = req.query;

    let sql = `
      SELECT t.*,
        p.name as project_name, p.color as project_color,
        au.name as assignee_name, au.avatar_url as assignee_avatar,
        cu.name as creator_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users au ON t.assigned_to = au.id
      LEFT JOIN users cu ON t.created_by = cu.id
    `;

    const params = [];
    const conditions = [];

    if (!isAdmin) {
      const memberProjects = await query(
        'SELECT project_id FROM project_members WHERE user_id = $1',
        [userId]
      );
      const projectIds = memberProjects.rows.map((r) => r.project_id);
      
      const createdProjects = await query(
        'SELECT id FROM projects WHERE created_by = $1',
        [userId]
      );
      const allProjectIds = [...new Set([...projectIds, ...createdProjects.rows.map((r) => r.id)])];
      
      if (allProjectIds.length === 0) {
        return res.json({ tasks: [] });
      }

      params.push(allProjectIds);
      conditions.push(`t.project_id = ANY($${params.length})`);
    }

    if (project_id) {
      params.push(project_id);
      conditions.push(`t.project_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    if (assigned_to) {
      params.push(assigned_to);
      conditions.push(`t.assigned_to = $${params.length}`);
    }

    if (my_tasks === 'true') {
      params.push(userId);
      conditions.push(`t.assigned_to = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.created_at DESC';

    const result = await query(sql, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getTaskById(req, res, next) {
  try {
    const result = await query(
      `SELECT t.*,
        p.name as project_name, p.color as project_color,
        au.name as assignee_name, au.avatar_url as assignee_avatar, au.email as assignee_email,
        cu.name as creator_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users au ON t.assigned_to = au.id
       LEFT JOIN users cu ON t.created_by = cu.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const { project_id, title, description, status, priority, assigned_to, due_date } = req.body;
    const userId = req.user.id;

    const projectCheck = await query('SELECT name FROM projects WHERE id = $1', [project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const result = await query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title.trim(), description, status || 'todo', priority || 'medium', assigned_to || null, userId, due_date || null]
    );

    const task = result.rows[0];

    await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [project_id]);

    if (assigned_to && assigned_to !== userId) {
      await createNotification({
        userId: assigned_to,
        title: 'New Task Assigned',
        message: `You have been assigned "${title}" in project "${projectCheck.rows[0].name}"`,
        type: 'task_assigned',
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/projects/${project_id}`,
        createdBy: userId,
        sendEmailNotification: false,
      });
      sendTaskAssignmentEmail({
        assignedToId: assigned_to,
        taskTitle: title,
        taskDescription: description,
        projectName: projectCheck.rows[0].name,
        priority: priority || 'medium',
        dueDate: due_date || null,
        assignedById: userId,
      }).catch(() => {});
    }

    await notifyMentions(description, task.id, title, project_id, userId);
    await logActivity({ userId, action: 'created_task', entityType: 'task', entityId: task.id, metadata: { title, project_id } });

    const fullTask = await query(
      `SELECT t.*, p.name as project_name, p.color as project_color,
        au.name as assignee_name, au.avatar_url as assignee_avatar,
        cu.name as creator_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users au ON t.assigned_to = au.id
       LEFT JOIN users cu ON t.created_by = cu.id
       WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({ task: fullTask.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    const userId = req.user.id;

    const currentTask = await query(
      'SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = $1',
      [id]
    );

    if (currentTask.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const prev = currentTask.rows[0];
    const completedAt = status === 'done' && prev.status !== 'done' ? 'NOW()' : prev.status === 'done' && status !== 'done' ? 'NULL' : null;

    let sql = `UPDATE tasks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      status = COALESCE($3, status),
      priority = COALESCE($4, priority),
      assigned_to = $5,
      due_date = COALESCE($6, due_date),
      updated_at = NOW()`;

    if (completedAt === 'NOW()') sql += ', completed_at = NOW()';
    else if (completedAt === 'NULL') sql += ', completed_at = NULL';

    sql += ` WHERE id = $7 RETURNING *`;

    const result = await query(sql, [
      title, description, status, priority,
      assigned_to !== undefined ? assigned_to : prev.assigned_to,
      due_date, id,
    ]);

    const task = result.rows[0];
    await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [task.project_id]);

    if (assigned_to && assigned_to !== prev.assigned_to && assigned_to !== userId) {
      await createNotification({
        userId: assigned_to,
        title: 'Task Assigned to You',
        message: `You have been assigned "${task.title}" in project "${prev.project_name}"`,
        type: 'task_assigned',
        relatedId: task.id,
        relatedType: 'task',
        actionUrl: `/projects/${task.project_id}`,
        createdBy: userId,
        sendEmailNotification: false,
      });
    }

    if (status && status !== prev.status) {
      const notifyUser = prev.assigned_to && prev.assigned_to !== userId ? prev.assigned_to :
                         prev.created_by && prev.created_by !== userId ? prev.created_by : null;

      if (notifyUser) {
        await createNotification({
          userId: notifyUser,
          title: 'Task Status Updated',
          message: `Task "${task.title}" status changed to ${status.replace('_', ' ')}`,
          type: 'task_updated',
          relatedId: task.id,
          relatedType: 'task',
          actionUrl: `/projects/${task.project_id}`,
          createdBy: userId,
          sendEmailNotification: false,
        });
      }
    }

    if (global.io) {
      global.io.to(`project:${task.project_id}`).emit('task_updated', task);
    }

    if (description && description !== prev.description) {
      await notifyMentions(description, id, task.title, task.project_id, userId);
    }
    await logActivity({ userId, action: 'updated_task', entityType: 'task', entityId: id, metadata: { status, priority } });

    // Auto-complete the project if ALL tasks are now done
    if (status === 'done') {
      const remainingTasks = await query(
        `SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status != 'done'`,
        [task.project_id]
      );
      const pendingCount = parseInt(remainingTasks.rows[0].count);
      const totalTasks = await query(
        `SELECT COUNT(*) FROM tasks WHERE project_id = $1`,
        [task.project_id]
      );
      const total = parseInt(totalTasks.rows[0].count);

      if (total > 0 && pendingCount === 0) {
        // All tasks are done — mark project as completed
        await query(
          `UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1 AND status = 'active'`,
          [task.project_id]
        );
        await logActivity({ userId, action: 'completed_project', entityType: 'project', entityId: task.project_id, metadata: { auto: true } });
      }
    }

    // If a task is re-opened from done, revert project back to active if it was auto-completed
    if (prev.status === 'done' && status && status !== 'done') {
      await query(
        `UPDATE projects SET status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'completed'`,
        [task.project_id]
      );
    }

    const fullTask = await query(
      `SELECT t.*, p.name as project_name, p.color as project_color,
        au.name as assignee_name, au.avatar_url as assignee_avatar,
        cu.name as creator_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users au ON t.assigned_to = au.id
       LEFT JOIN users cu ON t.created_by = cu.id
       WHERE t.id = $1`,
      [id]
    );

    res.json({ task: fullTask.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING project_id', [req.params.id]);
    if (result.rows.length > 0) {
      await query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [result.rows[0].project_id]);
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
