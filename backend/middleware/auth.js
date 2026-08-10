const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

/**
 * Middleware to authenticate requests using JWT tokens.
 * Extracts user ID from the JWT payload and populates req.user.
 * NEVER trusts client-supplied user_id.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Access token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch active user from database to ensure up-to-date role and status
    const userResult = await pool.query(
      'SELECT id, name, phone, email, role, status, district, panchayat FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Authenticated user account no longer exists.' });
    }

    const user = userResult.rows[0];

    // Standardize role synonyms
    let role = (user.role || 'citizen').toLowerCase();
    if (role === 'super_admin') role = 'admin';
    if (role === 'station_admin' || role === 'rescue_team') role = 'station';
    user.role = role;

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Authentication Error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token. Please log in again.' });
  }
};

module.exports = { authenticateToken };
