const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadIncidentMedia } = require('../middleware/upload');
const incidentController = require('../controllers/incidentController');

// 1. Submit incident report (Authenticated citizens)
router.post(
  '/',
  authenticateToken,
  uploadIncidentMedia.array('media', 3),
  incidentController.submitIncident
);

// 2. Fetch my submitted reports (Citizen)
router.get(
  '/my',
  authenticateToken,
  incidentController.getMyIncidents
);

// 3. PostGIS Nearby spatial incidents query
router.get(
  '/nearby',
  authenticateToken,
  incidentController.getNearbyIncidents
);

// 4. Live map markers (Privacy filtered)
router.get(
  '/map',
  authenticateToken,
  incidentController.getMapIncidents
);

// 5. Official dashboard list & statistics (Officials / Admins)
router.get(
  '/',
  authenticateToken,
  requireRole(['official', 'station', 'collector', 'admin']),
  incidentController.getAllIncidents
);

// 6. Get single incident detail (Owner citizen or Official)
router.get(
  '/:id',
  authenticateToken,
  incidentController.getIncidentById
);

// 7. Update incident status & add official remarks (Officials / Admins)
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['official', 'station', 'collector', 'admin']),
  incidentController.updateIncidentStatus
);

module.exports = router;
