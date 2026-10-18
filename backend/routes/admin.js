const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/setup');
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');

const router = express.Router();

// Tất cả admin routes đều cần auth + admin check
router.use(authMiddleware, adminMiddleware);

// ──────────────────────────────────────────────
// GET /api/admin/stats — Thống kê tổng quan
// ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, decksCount, cardsCount, sessionsCount] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query('SELECT COUNT(*)::int AS count FROM decks'),
      query('SELECT COUNT(*)::int AS count FROM cards'),
      query('SELECT COUNT(*)::int AS count FROM study_sessions'),
    ]);

    // Users mới trong 7 ngày gần nhất
    const recentUsers = await query(`
      SELECT DATE(created_at) AS date, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Phân bổ role
    const roleDistribution = await query(`
      SELECT role, COUNT(*)::int AS count
      FROM users
      GROUP BY role
    `);

    res.json({
      totalUsers: usersCount.rows[0].count,
      totalDecks: decksCount.rows[0].count,
      totalCards: cardsCount.rows[0].count,
      totalSessions: sessionsCount.rows[0].count,
      recentUsers: recentUsers.rows,
      roleDistribution: roleDistribution.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/users — Danh sách users (phân trang + search)
// ──────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const roleFilter = req.query.role || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Whitelist sort columns
    const allowedSorts = ['id', 'email', 'full_name', 'role', 'streak', 'created_at'];
    const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
    }

    if (roleFilter) {
      params.push(roleFilter);
      conditions.push(`role = $${params.length}`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    // Get users with deck/card counts
    const usersResult = await query(`
      SELECT
        u.id, u.email, u.full_name, u.role, u.streak, u.last_study_date, u.created_at,
        COALESCE(d.deck_count, 0)::int AS deck_count,
        COALESCE(c.card_count, 0)::int AS card_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS deck_count FROM decks GROUP BY user_id
      ) d ON d.user_id = u.id
      LEFT JOIN (
        SELECT d2.user_id, COUNT(*)::int AS card_count
        FROM cards c2
        JOIN decks d2 ON d2.id = c2.deck_id
        GROUP BY d2.user_id
      ) c ON c.user_id = u.id
      ${whereClause}
      ORDER BY u.${sortColumn} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/admin/users/:id — Chi tiết user
// ──────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const userResult = await query(
      'SELECT id, email, full_name, role, streak, last_study_date, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [decks, sessions, quizzes] = await Promise.all([
      query(`
        SELECT d.id, d.title, d.color, d.created_at, COUNT(c.id)::int AS card_count
        FROM decks d
        LEFT JOIN cards c ON c.deck_id = d.id
        WHERE d.user_id = $1
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `, [userId]),
      query(`
        SELECT COUNT(*)::int AS total_sessions,
               COALESCE(SUM(cards_studied), 0)::int AS total_cards_studied,
               COALESCE(SUM(cards_mastered), 0)::int AS total_cards_mastered,
               COALESCE(SUM(duration_seconds), 0)::int AS total_duration
        FROM study_sessions WHERE user_id = $1
      `, [userId]),
      query(`
        SELECT COUNT(*)::int AS total_quizzes,
               COALESCE(SUM(correct_answers), 0)::int AS total_correct,
               COALESCE(SUM(total_questions), 0)::int AS total_questions
        FROM quiz_results WHERE user_id = $1
      `, [userId]),
    ]);

    res.json({
      user: userResult.rows[0],
      decks: decks.rows,
      studyStats: sessions.rows[0],
      quizStats: quizzes.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PUT /api/admin/users/:id — Cập nhật user
// ──────────────────────────────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, full_name, role, password } = req.body;

    // Không cho phép admin tự thay đổi role của chính mình
    if (userId === req.userId && role && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Validate role
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    const updates = [];
    const params = [];

    if (email) {
      // Check email uniqueness
      const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      params.push(email);
      updates.push(`email = $${params.length}`);
    }

    if (full_name) {
      params.push(full_name);
      updates.push(`full_name = $${params.length}`);
    }

    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const hash = await bcrypt.hash(password, 10);
      params.push(hash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, email, full_name, role, streak, created_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PUT /api/admin/users/:id/role — Thay đổi role nhanh
// ──────────────────────────────────────────────
router.put('/users/:id/role', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/admin/users/:id — Xóa user
// ──────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Không cho phép admin tự xóa chính mình
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, full_name',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
