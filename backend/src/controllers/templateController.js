const fs = require('fs');
const { query } = require('../config/database');
const { logActivity } = require('../utils/notificationHelper');

async function getTemplates(req, res, next) {
  try {
    const { project_id } = req.query;
    const params = [];
    let sql = `
      SELECT t.*,
        u.name as creator_name,
        COUNT(ts.id) as submission_count
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN template_submissions ts ON t.id = ts.template_id
      WHERE 1=1
    `;

    if (project_id) {
      params.push(project_id);
      sql += ` AND (t.project_id = $${params.length} OR t.project_id IS NULL)`;
    }

    sql += ' GROUP BY t.id, u.name ORDER BY t.created_at DESC';

    const result = await query(sql, params);
    res.json({ templates: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'A template file is required' });
    }
    if (!name || !name.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Template name is required' });
    }

    const file = req.file;
    const fileUrl = `/uploads/${file.filename}`;

    const result = await query(
      `INSERT INTO templates (name, description, fields, created_by, is_public, file_url, original_name, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name.trim(), description || null, '[]', userId, true, fileUrl, file.originalname, file.mimetype, file.size]
    );

    const template = result.rows[0];
    await logActivity({ userId, action: 'created_template', entityType: 'template', entityId: template.id, metadata: { name } });

    const full = await query(
      'SELECT t.*, u.name as creator_name FROM templates t LEFT JOIN users u ON t.created_by = u.id WHERE t.id = $1',
      [template.id]
    );

    res.status(201).json({ template: { ...full.rows[0], submission_count: 0 } });
  } catch (error) {
    next(error);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const result = await query(
      'DELETE FROM templates WHERE id = $1 AND (created_by = $2 OR $3 = $4) RETURNING *',
      [req.params.id, req.user.id, req.user.role, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found or access denied' });
    }

    const template = result.rows[0];
    if (template.file_url) {
      const filePath = require('path').join(__dirname, '../../uploads', require('path').basename(template.file_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function submitTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { title, note } = req.body;
    const userId = req.user.id;

    const templateResult = await query('SELECT id, name FROM templates WHERE id = $1', [id]);
    if (templateResult.rows.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload your filled file' });
    }

    const file = req.file;
    const fileUrl = `/uploads/${file.filename}`;
    const submissionTitle = title || `${templateResult.rows[0].name} - Submission`;

    const result = await query(
      `INSERT INTO template_submissions (template_id, submitted_by, data, title, file_url, original_name, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, userId, JSON.stringify({ note: note || '' }), submissionTitle, fileUrl, file.originalname, file.mimetype, file.size]
    );

    await logActivity({ userId, action: 'submitted_template', entityType: 'template', entityId: id, metadata: { title: submissionTitle } });

    const full = await query(
      `SELECT ts.*, t.name as template_name, u.name as submitter_name
       FROM template_submissions ts
       LEFT JOIN templates t ON ts.template_id = t.id
       LEFT JOIN users u ON ts.submitted_by = u.id
       WHERE ts.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ submission: full.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function getSubmissions(req, res, next) {
  try {
    const { template_id } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const params = [];
    let sql = `
      SELECT ts.*, t.name as template_name, u.name as submitter_name
      FROM template_submissions ts
      LEFT JOIN templates t ON ts.template_id = t.id
      LEFT JOIN users u ON ts.submitted_by = u.id
      WHERE 1=1
    `;

    if (!isAdmin) {
      params.push(userId);
      sql += ` AND ts.submitted_by = $${params.length}`;
    }

    if (template_id) {
      params.push(template_id);
      sql += ` AND ts.template_id = $${params.length}`;
    }

    sql += ' ORDER BY ts.created_at DESC';

    const result = await query(sql, params);
    res.json({ submissions: result.rows });
  } catch (error) {
    next(error);
  }
}

async function deleteSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM template_submissions WHERE id = $1 AND (submitted_by = $2 OR $3 = $4) RETURNING *',
      [id, req.user.id, req.user.role, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found or access denied' });
    }

    const sub = result.rows[0];
    if (sub.file_url) {
      const filePath = require('path').join(__dirname, '../../uploads', require('path').basename(sub.file_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTemplates, createTemplate, deleteTemplate, submitTemplate, getSubmissions, deleteSubmission };
