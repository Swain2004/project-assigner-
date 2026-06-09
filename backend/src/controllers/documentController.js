const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { createNotification, logActivity } = require('../utils/notificationHelper');

async function getDocuments(req, res, next) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { project_id, task_id, category } = req.query;

    let sql = `
      SELECT d.*,
        u.name as uploader_name, u.avatar_url as uploader_avatar,
        p.name as project_name,
        t.title as task_title
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN tasks t ON d.task_id = t.id
    `;

    const params = [];
    const conditions = [];

    if (!isAdmin) {
      const memberProjects = await query(
        'SELECT project_id FROM project_members WHERE user_id = $1',
        [userId]
      );
      const createdProjects = await query('SELECT id FROM projects WHERE created_by = $1', [userId]);
      const projectIds = [...new Set([
        ...memberProjects.rows.map((r) => r.project_id),
        ...createdProjects.rows.map((r) => r.id),
      ])];

      if (projectIds.length === 0) return res.json({ documents: [] });
      params.push(projectIds);
      conditions.push(`d.project_id = ANY($${params.length})`);
    }

    if (project_id) {
      params.push(project_id);
      conditions.push(`d.project_id = $${params.length}`);
    }

    if (task_id) {
      params.push(task_id);
      conditions.push(`d.task_id = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`d.category = $${params.length}`);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY d.created_at DESC';

    const result = await query(sql, params);
    res.json({ documents: result.rows });
  } catch (error) {
    next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { project_id, task_id, description, category, name } = req.body;
    const userId = req.user.id;
    const file = req.file;

    const fileUrl = `/uploads/${file.filename}`;

    const projectResult = await query('SELECT name FROM projects WHERE id = $1', [project_id]);
    if (projectResult.rows.length === 0) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'Project not found' });
    }

    const result = await query(
      `INSERT INTO documents (name, original_name, file_path, file_url, mime_type, file_size, category, project_id, task_id, uploaded_by, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name || file.originalname,
        file.originalname,
        file.path,
        fileUrl,
        file.mimetype,
        file.size,
        category || 'other',
        project_id,
        task_id || null,
        userId,
        description || null,
      ]
    );

    const document = result.rows[0];

    const membersResult = await query(
      'SELECT user_id FROM project_members WHERE project_id = $1 AND user_id != $2',
      [project_id, userId]
    );

    const notifications = membersResult.rows.map((m) => ({
      userId: m.user_id,
      title: 'New Document Uploaded',
      message: `${req.user.name} uploaded "${document.original_name}" in project "${projectResult.rows[0].name}"`,
      type: 'document_uploaded',
      relatedId: document.id,
      relatedType: 'document',
      actionUrl: `/projects/${project_id}`,
      createdBy: userId,
    }));

    notifications.forEach((n) => createNotification(n).catch(() => {}));

    await logActivity({ userId, action: 'uploaded_document', entityType: 'document', entityId: document.id, metadata: { name: document.original_name, project_id } });

    const fullDoc = await query(
      `SELECT d.*, u.name as uploader_name, p.name as project_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [document.id]
    );

    res.status(201).json({ document: fullDoc.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query('SELECT file_path, uploaded_by FROM documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = result.rows[0];
    if (doc.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (doc.file_path && fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    await query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function updateDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    const result = await query(
      `UPDATE documents SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name, description, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDocuments, uploadDocument, deleteDocument, updateDocument };
