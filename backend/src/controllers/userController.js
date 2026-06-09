const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function getAllUsers(req, res, next) {
  try {
    const { search, role } = req.query;
    let sql = `SELECT id, name, email, role, department, avatar_url, is_active, last_seen, created_at FROM users WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    sql += ' ORDER BY name ASC';
    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const result = await query(
      'SELECT id, name, email, role, department, avatar_url, is_active, last_seen, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, avatar_url, is_active, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role || 'employee', department || null]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, email, role, department, is_active } = req.body;
    const { id } = req.params;

    const result = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        department = COALESCE($4, department),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, role, department, avatar_url, is_active, created_at`,
      [name, email?.toLowerCase(), role, department, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
}

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }

    const result = await query(
      `SELECT id, name, email, role, avatar_url, department FROM users
       WHERE is_active = true AND (name ILIKE $1 OR email ILIKE $1)
       ORDER BY name ASC LIMIT 10`,
      [`%${q.trim()}%`]
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, searchUsers };
