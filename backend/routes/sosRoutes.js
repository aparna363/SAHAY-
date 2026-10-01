const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadSOSMedia } = require('../middleware/upload');
const sosController = require('../controllers/sosController');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

// Optional Authentication Middleware
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, name, phone, email, role, status, district, panchayat FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      let role = (user.role || 'citizen').toLowerCase();
      if (role === 'super_admin') role = 'admin';
      if (role === 'station_admin' || role === 'rescue_team') role = 'station';
      user.role = role;
      req.user = user;
    }
  } catch (err) {
    // Continue as guest
  }
  next();
};

// 1. Citizen Endpoints
router.post('/', optionalAuth, uploadSOSMedia.single('photo'), sosController.createSOS);
router.get('/active-my', authenticateToken, sosController.getActiveCitizenSOS);
router.get('/my-history', authenticateToken, sosController.getCitizenSOSHistory);
router.patch('/:id/cancel', authenticateToken, sosController.cancelSOS);

// 2. Rescue Team Endpoints
router.get(
  '/rescue-feed',
  authenticateToken,
  requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']),
  sosController.getRescueFeed
);
router.patch(
  '/:id/accept',
  authenticateToken,
  requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']),
  sosController.acceptSOS
);
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']),
  sosController.updateStatus
);

// 3. Collector Endpoints
router.get(
  '/collector',
  authenticateToken,
  requireRole(['collector', 'admin', 'station_admin']),
  sosController.getCollectorSOS
);
router.post(
  '/:id/assign',
  authenticateToken,
  requireRole(['collector', 'admin', 'station_admin']),
  sosController.assignRescueTeam
);

// 4. Map & General Details Endpoints
router.get('/map-markers', optionalAuth, sosController.getMapSOSMarkers);
router.get('/:id', optionalAuth, sosController.getSOSById);

module.exports = router;
