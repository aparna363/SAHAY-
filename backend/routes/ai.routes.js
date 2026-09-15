const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { aiRateLimit } = require('../middleware/aiRateLimit');
const aiController = require('../controllers/ai.controller');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

/**
 * Flexible Auth: Decodes user if token provided, allows guest citizen otherwise.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await pool.query(
      'SELECT id, name, phone, email, role, status, district, panchayat FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
    }
  } catch (err) {
    // Non-fatal, continue as guest
    req.user = null;
  }
  next();
};

// 1. Primary AI Copilot Chat Endpoint
router.post('/chat', optionalAuth, aiRateLimit, aiController.chat);

// 2. Real-time Risk Assessment Endpoint
router.post('/risk-assessment', optionalAuth, aiRateLimit, aiController.getRiskAssessment);

// 3. PostGIS Nearest Shelters
router.get('/nearby-shelters', optionalAuth, aiController.getNearbyShelters);

// 4. Copilot Emergency SOS Dispatch
router.post('/sos', optionalAuth, aiController.dispatchCopilotSOS);

// 5. Conversation History & Sessions
router.get('/conversations', optionalAuth, aiController.getConversations);
router.get('/conversations/:id/messages', optionalAuth, aiController.getConversationMessages);

module.exports = router;
