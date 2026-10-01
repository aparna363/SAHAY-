const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadReliefMedia } = require('../middleware/upload');
const fieldOfficerReliefController = require('../controllers/fieldOfficerReliefController');

// All field officer routes require authentication and field officer / station / admin role
router.use(authenticateToken);
router.use(requireRole(['field_officer', 'station', 'station_admin', 'rescue_team', 'admin']));

// 1. Dashboard summary cards metrics
router.get('/summary', fieldOfficerReliefController.getDashboardSummary);

// 2. Paginated and filtered assigned applications table
router.get('/claims', fieldOfficerReliefController.getAssignedClaims);

// 3. "My Field Visits" section (Upcoming and Completed visits)
router.get('/my-visits', fieldOfficerReliefController.getMyVisits);

// 4. Interactive GIS Map data (Assigned applicant locations and visit locations)
router.get('/map-data', fieldOfficerReliefController.getMapData);

// 4b. Configurable SDRF relief norms schedule
router.get('/sdrf-norms', fieldOfficerReliefController.getSdrfNorms);

// 5. Single application full inspection dossier
router.get('/claims/:claimId', fieldOfficerReliefController.getClaimDetails);

// 6. Schedule a ground field visit
router.post('/claims/:claimId/schedule-visit', fieldOfficerReliefController.scheduleVisit);

// 7. Mark field visit as completed
router.post('/claims/:claimId/complete-visit', fieldOfficerReliefController.completeFieldVisit);

// 8. Upload multiple geo-tagged field photos
router.post(
  '/claims/:claimId/photos',
  uploadReliefMedia.array('photos', 10),
  fieldOfficerReliefController.uploadFieldPhotos
);

// 9. Submit Verification Report (Findings & damage recommendation / Requires Correction)
router.post('/claims/:claimId/submit-report', fieldOfficerReliefController.submitVerificationReport);

// 10. Strict Security Enforcement: Prohibit approval / disbursement from Field Officer interface
router.all(['/claims/:claimId/approve', '/claims/:claimId/disburse', '/claims/:claimId/payment'], (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Access Denied: Field Visit Officers are only authorized to submit ground verification findings. Final relief approval and DBT fund disbursement remain strictly restricted to District Collector authorization.'
  });
});

module.exports = router;
