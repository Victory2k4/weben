const { query } = require('../db/setup');

/**
 * Middleware kiểm tra quyền admin
 * Phải đặt SAU authMiddleware (cần req.userId)
 */
async function adminMiddleware(req, res, next) {
  try {
    const result = await query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    req.userRole = user.role;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error checking admin permission' });
  }
}

module.exports = { adminMiddleware };
