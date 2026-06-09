const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password, department } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const countResult = await query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;
    const role = isFirstUser ? 'admin' : 'employee';

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, avatar_url, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role, department || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

    const { password_hash, ...safeUser } = user;
    const token = generateToken(user.id);

    res.json({ user: safeUser, token });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

async function updateProfile(req, res, next) {
  try {
    const { name, department, avatar_url } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE users SET name = COALESCE($1, name), department = COALESCE($2, department),
       avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, department, avatar_url, created_at`,
      [name, department, avatar_url, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe, updateProfile, changePassword };
