const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const weatherAlertController = require('../controllers/weatherAlertController');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

/**
 * Optional Auth Middleware: If authorization header exists, decodes user, otherwise proceeds as guest citizen.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = { role: 'citizen', district: 'Ernakulam' };
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await pool.query('SELECT id, name, phone, email, role, status, district FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length > 0) {
      req.user = userRes.rows[0];
    } else {
      req.user = { role: 'citizen', district: 'Ernakulam' };
    }
  } catch {
    req.user = { role: 'citizen', district: 'Ernakulam' };
  }
  next();
};

/**
 * Require Admin Middleware
 */
const requireAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (['admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin role required.' });
};

/**
 * Require Collector or Admin Middleware
 */
const requireCollectorOrAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (['collector', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Collector or Admin role required.' });
};

// 1. Current Weather Alert (Role-aware & location-aware)
router.get('/current', optionalAuth, weatherAlertController.getCurrentWeatherAlert);

// 2. Manual Refresh Request
router.post('/refresh', optionalAuth, weatherAlertController.refreshWeatherAlert);

// 3. Collector Manual Local Advisory Broadcast
router.post('/collector/advisory', authenticateToken, requireCollectorOrAdmin, weatherAlertController.createCollectorAdvisory);

// 4. Collector District Jurisdiction Overview
router.get('/collector/district-view', authenticateToken, requireCollectorOrAdmin, weatherAlertController.getCollectorDistrictView);

// 5. 30-day / 90-day Alert History
router.get('/history', optionalAuth, weatherAlertController.getAlertHistory);

// 6. Admin Data Source Management
router.get('/admin/sources', authenticateToken, requireAdmin, weatherAlertController.getAdminDataSources);
router.post('/admin/sources', authenticateToken, requireAdmin, weatherAlertController.saveAdminDataSource);

// 7. Admin Severity Mapping Table Management
router.get('/admin/mappings', authenticateToken, requireAdmin, weatherAlertController.getAdminSeverityMappings);
router.put('/admin/mappings', authenticateToken, requireAdmin, weatherAlertController.updateAdminSeverityMapping);

// 8. Admin System Health Metrics
router.get('/admin/system-health', authenticateToken, requireAdmin, weatherAlertController.getAdminSystemHealth);

// 9. Admin Audit Logs
router.get('/admin/audit-logs', authenticateToken, requireAdmin, weatherAlertController.getAdminAuditLogs);

module.exports = router;
