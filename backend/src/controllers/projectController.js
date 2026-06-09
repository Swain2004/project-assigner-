const { query } = require('../config/database');
const { createNotification, createBulkNotifications, logActivity } = require('../utils/notificationHelper');

async function getAllProjects(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { status, priority, search } = req.query;

    let sql;
    const params = [];

    if (isAdmin) {
      sql = `
        SELECT p.*,
          u.name as creator_name,
          COUNT(DISTINCT pm.user_id) as member_count,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE 1=1
      `;
    } else {
      sql = `
        SELECT p.*,
          u.name as creator_name,
          COUNT(DISTINCT pm2.user_id) as member_count,
          COUNT(DISTINCT t.id) as task_count,
          COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
        LEFT JOIN project_members pm2 ON p.id = pm2.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE (p.created_by = $1 OR pm.user_id = $1)
      `;
      params.push(userId);
    }

    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      sql += ` AND p.priority = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    sql += ' GROUP BY p.id, u.name ORDER BY p.updated_at DESC';

    const result = await query(sql, params);
    res.json({ projects: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const projectResult = await query(
      `SELECT p.*, u.name as creator_name, u.email as creator_email
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    if (!isAdmin) {
      const memberCheck = await query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (memberCheck.rows.length === 0 && project.created_by !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const membersResult = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.department, pm.role as project_role, pm.created_at as joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [id]
    );

    const statsResult = await query(
      `SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review_tasks
       FROM tasks WHERE project_id = $1`,
      [id]
    );

    res.json({
      project: {
        ...project,
        members: membersResult.rows,
        stats: statsResult.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const { name, description, status, priority, due_date, color, member_ids } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO projects (name, description, status, priority, created_by, due_date, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), description, status || 'active', priority || 'medium', userId, due_date || null, color || '#007AFF']
    );

    const project = result.rows[0];

    await query(
      'INSERT INTO project_members (project_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [project.id, userId, 'manager', userId]
    );

    if (member_ids && member_ids.length > 0) {
      for (const memberId of member_ids) {
        if (memberId !== userId) {
          await query(
            'INSERT INTO project_members (project_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [project.id, memberId, 'member', userId]
          );

          await createNotification({
            userId: memberId,
            title: 'Added to Project',
            message: `You have been added to the project "${project.name}"`,
            type: 'project_assigned',
            relatedId: project.id,
            relatedType: 'project',
            actionUrl: `/projects/${project.id}`,
            createdBy: userId,
          });
        }
      }
    }

    await logActivity({ userId, action: 'created_project', entityType: 'project', entityId: project.id, metadata: { name: project.name } });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, status, priority, due_date, color } = req.body;

    const result = await query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        color = COALESCE($6, color),
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, status, priority, due_date, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await logActivity({ userId: req.user.id, action: 'updated_project', entityType: 'project', entityId: id });

    res.json({ project: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function addMember(req, res, next) {
  try {
    const { id } = req.params;
    const { user_id, role } = req.body;

    const projectResult = await query('SELECT name FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await query(
      'INSERT INTO project_members (project_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [id, user_id, role || 'member', req.user.id]
    );

    await createNotification({
      userId: user_id,
      title: 'Added to Project',
      message: `You have been added to the project "${projectResult.rows[0].name}"`,
      type: 'project_assigned',
      relatedId: id,
      relatedType: 'project',
      actionUrl: `/projects/${id}`,
      createdBy: req.user.id,
    });

    const memberResult = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.role, pm.role as project_role, pm.created_at as joined_at
       FROM project_members pm JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [id, user_id]
    );

    res.json({ member: memberResult.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllProjects, getProjectById, createProject, updateProject, deleteProject, addMember, removeMember };
