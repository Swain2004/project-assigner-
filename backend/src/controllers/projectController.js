const { query } = require('../config/database');
const { createNotification, createBulkNotifications, logActivity } = require('../utils/notificationHelper');
const { sendEmail, buildTeamLeaderEmail, buildAddedToProjectEmail } = require('../config/mailer');

async function isProjectTeamLeader(userId, projectId) {
  const r = await query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = $3',
    [projectId, userId, 'team_leader']
  );
  return r.rows.length > 0;
}

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
    const { name, description, status, priority, due_date, color, member_ids, team_leader_id } = req.body;
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
        }
      }
    }

    if (team_leader_id && team_leader_id !== userId) {
      await query(
        'INSERT INTO project_members (project_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
        [project.id, team_leader_id, 'team_leader', userId]
      );

      await createNotification({
        userId: team_leader_id,
        title: 'You are Team Leader',
        message: `You have been assigned as Team Leader for "${project.name}"`,
        type: 'project_assigned',
        relatedId: project.id,
        relatedType: 'project',
        actionUrl: `/projects/${project.id}`,
        createdBy: userId,
        sendEmailNotification: false,
      });

      const [leaderResult, creatorResult, membersResult] = await Promise.all([
        query('SELECT name, email FROM users WHERE id = $1', [team_leader_id]),
        query('SELECT name FROM users WHERE id = $1', [userId]),
        query(
          `SELECT u.name FROM project_members pm
           JOIN users u ON pm.user_id = u.id
           WHERE pm.project_id = $1 AND pm.user_id != $2`,
          [project.id, team_leader_id]
        ),
      ]);

      if (leaderResult.rows.length > 0) {
        const leader = leaderResult.rows[0];
        const assignedByName = creatorResult.rows[0]?.name || null;
        const memberNames = membersResult.rows.map((r) => r.name);
        const { html, text } = buildTeamLeaderEmail({
          recipientName: leader.name,
          projectName: project.name,
          projectUrl: `/projects/${project.id}`,
          memberNames,
          assignedByName,
        });
        sendEmail({
          to: leader.email,
          subject: `You are the Team Leader for "${project.name}"`,
          html,
          text,
        }).catch(() => {});
      }
    }

    // Send enhanced "Added to Project" emails to all members with team info
    if (member_ids && member_ids.length > 0) {
      const [leaderResult, allMembersResult, creatorResult] = await Promise.all([
        query(`SELECT u.name FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND pm.role = 'team_leader' LIMIT 1`, [project.id]),
        query(`SELECT u.id, u.name, u.email FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND pm.user_id != $2`, [project.id, userId]),
        query('SELECT name FROM users WHERE id = $1', [userId]),
      ]);

      const teamLeaderName = leaderResult.rows[0]?.name || null;
      const creatorName = creatorResult.rows[0]?.name || 'Admin';
      const allMemberNames = allMembersResult.rows.map((r) => r.name);

      for (const member of allMembersResult.rows) {
        // Skip if this is the team leader (already got team leader email)
        if (team_leader_id && member.id === team_leader_id) continue;

        const { html, text } = buildAddedToProjectEmail({
          recipientName: member.name,
          projectName: project.name,
          projectUrl: `/projects/${project.id}`,
          teamLeaderName,
          memberNames: allMemberNames,
        });

        sendEmail({
          to: member.email,
          subject: `Added to Project: "${project.name}"`,
          html,
          text,
        }).catch(() => {});

        await createNotification({
          userId: member.id,
          title: 'Added to Project',
          message: `You have been added to the project "${project.name}"${teamLeaderName ? `. ${teamLeaderName} is your team leader` : ''}`,
          type: 'project_assigned',
          relatedId: project.id,
          relatedType: 'project',
          actionUrl: `/projects/${project.id}`,
          createdBy: userId,
          sendEmailNotification: false, // Email sent above
        });
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
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const [leaderCheck, projectCheck] = await Promise.all([
        isProjectTeamLeader(userId, id),
        query('SELECT created_by FROM projects WHERE id = $1', [id]),
      ]);
      if (projectCheck.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
      if (!leaderCheck && projectCheck.rows[0].created_by !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

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
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const isLeader = await isProjectTeamLeader(req.user.id, id);
      if (!isLeader) return res.status(403).json({ message: 'Only admin or team leader can add members' });
    }

    const projectResult = await query('SELECT name FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await query(
      'INSERT INTO project_members (project_id, user_id, role, added_by) VALUES ($1, $2, $3, $4) ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3',
      [id, user_id, role || 'member', req.user.id]
    );

    // Fetch team leader and other members for email
    const [leaderResult, membersResult, addedUserResult] = await Promise.all([
      query(`SELECT u.name FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND pm.role = 'team_leader' LIMIT 1`, [id]),
      query(`SELECT u.name FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1 AND pm.user_id != $2`, [id, user_id]),
      query('SELECT name, email FROM users WHERE id = $1', [user_id]),
    ]);

    const teamLeaderName = leaderResult.rows[0]?.name || null;
    const memberNames = membersResult.rows.map((r) => r.name);
    const addedUser = addedUserResult.rows[0];

    if (addedUser) {
      const { html, text } = buildAddedToProjectEmail({
        recipientName: addedUser.name,
        projectName: projectResult.rows[0].name,
        projectUrl: `/projects/${id}`,
        teamLeaderName,
        memberNames,
      });
      sendEmail({
        to: addedUser.email,
        subject: `Added to Project: "${projectResult.rows[0].name}"`,
        html,
        text,
      }).catch(() => {});
    }

    await createNotification({
      userId: user_id,
      title: 'Added to Project',
      message: `You have been added to the project "${projectResult.rows[0].name}"${teamLeaderName ? `. ${teamLeaderName} is your team leader` : ''}`,
      type: 'project_assigned',
      relatedId: id,
      relatedType: 'project',
      actionUrl: `/projects/${id}`,
      createdBy: req.user.id,
      sendEmailNotification: false, // Email sent above
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
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const isLeader = await isProjectTeamLeader(req.user.id, id);
      if (!isLeader) return res.status(403).json({ message: 'Only admin or team leader can remove members' });
    }

    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllProjects, getProjectById, createProject, updateProject, deleteProject, addMember, removeMember };
