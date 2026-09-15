const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadReliefMedia } = require('../middleware/upload');
const reliefController = require('../controllers/reliefController');

// 1. Citizen Landing Summary (Real PostgreSQL counts)
router.get('/summary/my', authenticateToken, reliefController.getMyReliefSummary);

// 2. Relief Norms (Configurable government guidelines)
router.get('/norms', authenticateToken, reliefController.getReliefNorms);

// 3. District Aggregate Transparency Stats (Public / Zero PII)
router.get('/transparency-stats', reliefController.getTransparencyStats);

// 4. Create Draft Application
router.post('/claims/draft', authenticateToken, reliefController.createDraft);

// 5. Update Draft Application
router.put('/claims/:claimId/draft', authenticateToken, reliefController.updateDraft);

// 6. Submit Application for Verification
router.post('/claims/:claimId/submit', authenticateToken, reliefController.submitClaim);

// 7. Get My Relief Applications
router.get('/claims/my', authenticateToken, reliefController.getMyClaims);

// 8. Upload Supporting Evidence / Photos
router.post(
  '/claims/:claimId/evidence',
  authenticateToken,
  uploadReliefMedia.array('evidence', 5),
  reliefController.uploadEvidence
);

// 9. Get Status History Audit Trail
router.get('/claims/:claimId/history', authenticateToken, reliefController.getClaimHistory);

// 10. Get Single Claim Detail (Citizen owner or Official)
router.get('/claims/:claimId', authenticateToken, reliefController.getClaimById);

// 11. Official / Field Officer Verification
router.patch(
  '/claims/:claimId/field-verify',
  authenticateToken,
  requireRole(['collector', 'station', 'station_admin', 'rescue_team', 'admin']),
  reliefController.fieldVerifyClaim
);

// 12. District Collector Approval / Rejection
router.patch(
  '/claims/:claimId/collector-decision',
  authenticateToken,
  requireRole(['collector', 'admin']),
  reliefController.collectorDecision
);

// 13. Simulated DBT Payment Disbursement
router.patch(
  '/claims/:claimId/disburse',
  authenticateToken,
  requireRole(['collector', 'admin']),
  reliefController.simulateDisbursement
);

module.exports = router;
