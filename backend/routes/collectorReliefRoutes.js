const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const collectorReliefController = require('../controllers/collectorReliefController');

// All endpoints require authenticated Collector or Admin
router.use(authenticateToken);
router.use(requireRole(['collector', 'admin']));

// 1. District Relief Summary Metrics & Fund Totals
router.get('/summary', collectorReliefController.getReliefSummary);

// 2. Filtered Claims List
router.get('/claims', collectorReliefController.getClaims);

// 3. Available Verification Officers in District
router.get('/officers', collectorReliefController.getAvailableOfficers);

// 4. Configured Relief Approval Rules & Norms
router.get('/rules', collectorReliefController.getApprovalRules);

// 5. District GIS Map Layer Data
router.get('/map', collectorReliefController.getReliefMapData);

// 6. Official Reports Generation & Export Data
router.get('/reports', collectorReliefController.getReliefReports);

// 7. Single Claim Complete Review Dossier Bundle
router.get('/claims/:claimId', collectorReliefController.getClaimDetails);

// 8. Assign Verification Officer to Claim
router.post('/claims/:claimId/assign-officer', collectorReliefController.assignVerificationOfficer);

// 9. District Collector Approve Claim
router.post('/claims/:claimId/approve', collectorReliefController.approveClaim);

// 10. District Collector Reject Claim
router.post('/claims/:claimId/reject', collectorReliefController.rejectClaim);

// 11. Request Ground Re-verification
router.post('/claims/:claimId/reverification', collectorReliefController.requestReverification);

// 12. Forward Claim to State Review
router.post('/claims/:claimId/forward-state', collectorReliefController.forwardToState);

// 13. Queue Payment Processing
router.post('/claims/:claimId/process-payment', collectorReliefController.processPayment);

// 14. Execute Simulated DBT Disbursement
router.post('/claims/:claimId/disburse', collectorReliefController.disbursePayment);

module.exports = router;
