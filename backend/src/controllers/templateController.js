const { query } = require('../config/database');
const { logActivity } = require('../utils/notificationHelper');

async function getTemplates(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { project_id, template_type } = req.query;

    let sql = `
      SELECT t.*,
        u.name as creator_name,
        p.name as project_name,
        COUNT(ts.id) as submission_count
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN template_submissions ts ON t.id = ts.template_id
      WHERE (t.is_public = true OR t.created_by = $1)
    `;

    const params = [userId];

    if (!isAdmin && project_id) {
      params.push(project_id);
      sql += ` AND (t.project_id = $${params.length} OR t.project_id IS NULL)`;
    } else if (project_id) {
      params.push(project_id);
      sql += ` AND (t.project_id = $${params.length} OR t.project_id IS NULL)`;
    }

    if (template_type) {
      params.push(template_type);
      sql += ` AND t.template_type = $${params.length}`;
    }

    sql += ' GROUP BY t.id, u.name, p.name ORDER BY t.created_at DESC';

    const result = await query(sql, params);
    res.json({ templates: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getTemplateById(req, res, next) {
  try {
    const result = await query(
      `SELECT t.*, u.name as creator_name, p.name as project_name
       FROM templates t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { name, description, template_type, fields, is_public, project_id } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: 'At least one field is required' });
    }

    const result = await query(
      `INSERT INTO templates (name, description, template_type, fields, created_by, is_public, project_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), description, template_type || 'custom', JSON.stringify(fields), userId, is_public || false, project_id || null]
    );

    const template = result.rows[0];
    await logActivity({ userId, action: 'created_template', entityType: 'template', entityId: template.id, metadata: { name } });

    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, template_type, fields, is_public } = req.body;

    const result = await query(
      `UPDATE templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        template_type = COALESCE($3, template_type),
        fields = COALESCE($4, fields),
        is_public = COALESCE($5, is_public),
        updated_at = NOW()
       WHERE id = $6 AND (created_by = $7 OR $8 = 'admin')
       RETURNING *`,
      [name, description, template_type, fields ? JSON.stringify(fields) : null, is_public, id, req.user.id, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found or access denied' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const result = await query(
      'DELETE FROM templates WHERE id = $1 AND (created_by = $2 OR $3 = $4) RETURNING id',
      [req.params.id, req.user.id, req.user.role, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found or access denied' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function submitTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { project_id, task_id, data, title } = req.body;
    const userId = req.user.id;

    const templateResult = await query('SELECT id, name FROM templates WHERE id = $1', [id]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const result = await query(
      `INSERT INTO template_submissions (template_id, project_id, task_id, submitted_by, data, title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, project_id, task_id || null, userId, JSON.stringify(data), title]
    );

    await logActivity({ userId, action: 'submitted_template', entityType: 'template', entityId: id, metadata: { project_id, title } });

    res.status(201).json({ submission: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function getSubmissions(req, res, next) {
  try {
    const { template_id, project_id } = req.query;
    const params = [];
    let sql = `
      SELECT ts.*, t.name as template_name, u.name as submitter_name, p.name as project_name
      FROM template_submissions ts
      LEFT JOIN templates t ON ts.template_id = t.id
      LEFT JOIN users u ON ts.submitted_by = u.id
      LEFT JOIN projects p ON ts.project_id = p.id
      WHERE 1=1
    `;

    if (template_id) {
      params.push(template_id);
      sql += ` AND ts.template_id = $${params.length}`;
    }

    if (project_id) {
      params.push(project_id);
      sql += ` AND ts.project_id = $${params.length}`;
    }

    sql += ' ORDER BY ts.created_at DESC';

    const result = await query(sql, params);
    res.json({ submissions: result.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, submitTemplate, getSubmissions };
