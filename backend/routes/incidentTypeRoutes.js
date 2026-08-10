const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const incidentTypeController = require('../controllers/incidentTypeController');

// GET /api/incident-types (Public / Authenticated)
router.get('/', incidentTypeController.getIncidentTypes);

// POST /api/incident-types (Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  incidentTypeController.createIncidentType
);

module.exports = router;
