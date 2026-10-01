const pool = require('../db');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Helper to determine user district and enforce district isolation
 */
function getTargetDistrict(req) {
  if (req.user && req.user.role === 'admin' && req.query.district) {
    return req.query.district;
  }
  return req.user?.district || 'Kottayam';
}

/**
 * Haversine formula to compute distance in meters between two lat/lng points
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const phi1 = toRad(parseFloat(lat1));
  const phi2 = toRad(parseFloat(lat2));
  const deltaPhi = toRad(parseFloat(lat2) - parseFloat(lat1));
  const deltaLambda = toRad(parseFloat(lon2) - parseFloat(lon1));

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 1. GET /api/collector/relief/summary
 * District-level relief summary statistics, fund allocations, and category breakdown
 */
exports.getReliefSummary = async (req, res) => {
  try {
    const district = getTargetDistrict(req);

    // District-isolated count aggregation
    const countQuery = `
      SELECT 
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS new_applications,
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED_FOR_VERIFICATION', 'UNDER_FIELD_VERIFICATION')) AS pending_verification,
        COUNT(*) FILTER (WHERE status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW')) AS field_verified,
        COUNT(*) FILTER (WHERE status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW')) AS pending_review,
        COUNT(*) FILTER (WHERE status = 'REVERIFICATION_REQUIRED') AS reverification_required,
        COUNT(*) FILTER (WHERE status = 'STATE_REVIEW' OR is_state_review_required = TRUE) AS state_review,
        COUNT(*) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')) AS approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected,
        COUNT(*) FILTER (WHERE (status = 'APPROVED' OR status = 'PAYMENT_PROCESSING') AND (payment_status IS NULL OR payment_status != 'DISBURSED')) AS payment_pending,
        COUNT(*) FILTER (WHERE status = 'DISBURSED' OR payment_status = 'DISBURSED') AS disbursed,
        
        -- Financial totals
        COALESCE(SUM(requested_amount), 0) AS total_requested,
        COALESCE(SUM(CASE WHEN status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'APPROVED', 'DISBURSED', 'STATE_REVIEW') THEN COALESCE(verified_loss, estimated_loss, requested_amount) ELSE 0 END), 0) AS total_verified,
        COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')), 0) AS total_approved,
        COALESCE(SUM(approved_amount) FILTER (WHERE status = 'DISBURSED' OR payment_status = 'DISBURSED'), 0) AS total_disbursed,
        COALESCE(SUM(approved_amount) FILTER (WHERE (status = 'APPROVED' OR status = 'PAYMENT_PROCESSING') AND (payment_status IS NULL OR payment_status != 'DISBURSED')), 0) AS pending_disbursement
      FROM relief_claims
      WHERE LOWER(district) = LOWER($1) AND status != 'DRAFT';
    `;
    const countRes = await pool.query(countQuery, [district]);
    const counts = countRes.rows[0];

    // Category-wise relief breakdown
    const categoryQuery = `
      SELECT 
        assistance_category,
        COUNT(*) AS total_claims,
        COALESCE(SUM(requested_amount), 0) AS requested_amount,
        COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')), 0) AS approved_amount,
        COALESCE(SUM(approved_amount) FILTER (WHERE status = 'DISBURSED' OR payment_status = 'DISBURSED'), 0) AS disbursed_amount
      FROM relief_claims
      WHERE LOWER(district) = LOWER($1) AND status != 'DRAFT'
      GROUP BY assistance_category
      ORDER BY total_claims DESC;
    `;
    const categoryRes = await pool.query(categoryQuery, [district]);

    // Disaster-wise distribution
    const disasterQuery = `
      SELECT 
        disaster_type,
        COUNT(*) AS claim_count,
        COALESCE(SUM(requested_amount), 0) AS total_requested,
        COALESCE(SUM(approved_amount), 0) AS total_approved
      FROM relief_claims
      WHERE LOWER(district) = LOWER($1) AND status != 'DRAFT'
      GROUP BY disaster_type
      ORDER BY claim_count DESC;
    `;
    const disasterRes = await pool.query(disasterQuery, [district]);

    return res.status(200).json({
      success: true,
      district,
      summary: {
        totalApplications: parseInt(counts.total_applications || 0, 10),
        newApplications: parseInt(counts.new_applications || 0, 10),
        pendingVerification: parseInt(counts.pending_verification || 0, 10),
        fieldVerified: parseInt(counts.field_verified || 0, 10),
        pendingReview: parseInt(counts.pending_review || 0, 10),
        reverificationRequired: parseInt(counts.reverification_required || 0, 10),
        stateReview: parseInt(counts.state_review || 0, 10),
        approved: parseInt(counts.approved || 0, 10),
        rejected: parseInt(counts.rejected || 0, 10),
        paymentPending: parseInt(counts.payment_pending || 0, 10),
        disbursed: parseInt(counts.disbursed || 0, 10),
        
        // Fund figures
        totalRequested: parseFloat(counts.total_requested || 0),
        totalVerified: parseFloat(counts.total_verified || 0),
        totalApproved: parseFloat(counts.total_approved || 0),
        totalDisbursed: parseFloat(counts.total_disbursed || 0),
        pendingDisbursement: parseFloat(counts.pending_disbursement || 0)
      },
      categoryBreakdown: categoryRes.rows.map(r => ({
        category: r.assistance_category,
        claimsCount: parseInt(r.total_claims || 0, 10),
        requestedAmount: parseFloat(r.requested_amount || 0),
        approvedAmount: parseFloat(r.approved_amount || 0),
        disbursedAmount: parseFloat(r.disbursed_amount || 0)
      })),
      disasterBreakdown: disasterRes.rows.map(r => ({
        disasterType: r.disaster_type,
        claimsCount: parseInt(r.claim_count || 0, 10),
        totalRequested: parseFloat(r.total_requested || 0),
        totalApproved: parseFloat(r.total_approved || 0)
      }))
    });
  } catch (err) {
    console.error('Collector Relief Summary Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch relief summary: ' + err.message });
  }
};

/**
 * 2. GET /api/collector/relief/claims
 * Paginated and filtered claims list for the Collector's district
 */
exports.getClaims = async (req, res) => {
  try {
    const district = getTargetDistrict(req);
    const {
      tab = 'overview',
      status,
      category,
      disaster,
      taluk,
      village,
      search,
      officerId,
      page = 1,
      limit = 25
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const conditions = ['LOWER(c.district) = LOWER($1)', "c.status != 'DRAFT'"];
    const params = [district];

    // Tab-based status mapping
    if (tab === 'new') {
      conditions.push("c.status = 'SUBMITTED'");
    } else if (tab === 'under_verification') {
      conditions.push("c.status IN ('ASSIGNED_FOR_VERIFICATION', 'UNDER_FIELD_VERIFICATION')");
    } else if (tab === 'verified') {
      conditions.push("c.status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW')");
    } else if (tab === 'review') {
      conditions.push("c.status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW')");
    } else if (tab === 'reverification') {
      conditions.push("c.status = 'REVERIFICATION_REQUIRED'");
    } else if (tab === 'state_review') {
      conditions.push("(c.status = 'STATE_REVIEW' OR c.is_state_review_required = TRUE)");
    } else if (tab === 'approved') {
      conditions.push("c.status IN ('APPROVED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')");
    } else if (tab === 'rejected') {
      conditions.push("c.status = 'REJECTED'");
    } else if (tab === 'payments') {
      conditions.push("(c.status IN ('APPROVED', 'PAYMENT_PROCESSING') AND (c.payment_status IS NULL OR c.payment_status != 'DISBURSED'))");
    } else if (tab === 'disbursed') {
      conditions.push("(c.status = 'DISBURSED' OR c.payment_status = 'DISBURSED')");
    }

    if (status && tab === 'overview') {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`LOWER(c.assistance_category) = LOWER($${params.length})`);
    }

    if (disaster) {
      params.push(disaster);
      conditions.push(`LOWER(c.disaster_type) = LOWER($${params.length})`);
    }

    if (taluk) {
      params.push(taluk);
      conditions.push(`LOWER(c.taluk) = LOWER($${params.length})`);
    }

    if (village) {
      params.push(village);
      conditions.push(`LOWER(c.village) = LOWER($${params.length})`);
    }

    if (officerId) {
      params.push(officerId);
      conditions.push(`c.assigned_officer_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(
        LOWER(c.claim_id) LIKE $${params.length} OR 
        LOWER(u.name) LIKE $${params.length} OR 
        LOWER(c.damage_type) LIKE $${params.length} OR 
        LOWER(c.taluk) LIKE $${params.length} OR 
        LOWER(c.village) LIKE $${params.length}
      )`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching
    const countSql = `
      SELECT COUNT(*) AS total
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      ${whereClause};
    `;
    const countRes = await pool.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Fetch matching claims
    const dataSql = `
      SELECT 
        c.id,
        c.claim_id,
        c.citizen_id,
        u.name AS applicant_name,
        u.phone AS applicant_phone,
        c.disaster_type,
        c.disaster_date,
        c.assistance_category,
        c.damage_type,
        c.damage_severity,
        c.estimated_loss,
        c.verified_loss,
        c.requested_amount,
        c.approved_amount,
        c.district,
        c.taluk,
        c.village,
        c.status,
        c.priority,
        c.payment_status,
        c.transaction_reference,
        c.disbursed_at,
        c.submitted_at,
        c.updated_at,
        c.created_at,
        c.assigned_officer_id,
        vo.name AS verification_officer_name,
        vo.phone AS verification_officer_phone,
        
        -- Check if field verification is complete
        EXISTS(SELECT 1 FROM relief_verifications v WHERE v.claim_id = c.id AND v.verification_status = 'VERIFIED') AS is_field_verified,
        
        -- Evidence counts
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id AND (e.source = 'CITIZEN' OR e.source IS NULL)) AS citizen_evidence_count,
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id AND e.source = 'FIELD_OFFICER') AS officer_evidence_count,
        
        -- Days pending calculation
        EXTRACT(DAY FROM (NOW() - COALESCE(c.submitted_at, c.created_at)))::INTEGER AS days_pending
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN users vo ON c.assigned_officer_id = vo.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN c.priority = 'CRITICAL' THEN 1
          WHEN c.priority = 'HIGH' THEN 2
          WHEN c.priority = 'MEDIUM' THEN 3
          ELSE 4
        END,
        c.submitted_at DESC NULLS LAST,
        c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const dataParams = [...params, parseInt(limit, 10), offset];
    const result = await pool.query(dataSql, dataParams);

    return res.status(200).json({
      success: true,
      district,
      total: totalCount,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      claims: result.rows
    });
  } catch (err) {
    console.error('Collector Get Claims Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claims: ' + err.message });
  }
};

/**
 * 3. GET /api/collector/relief/claims/:claimId
 * Comprehensive claim review dossier bundle
 */
exports.getClaimDetails = async (req, res) => {
  try {
    const district = getTargetDistrict(req);
    const { claimId } = req.params;

    // Fetch claim base
    const claimRes = await pool.query(`
      SELECT 
        c.*,
        u.name AS applicant_name,
        u.phone AS applicant_phone,
        u.email AS applicant_email,
        u.panchayat AS applicant_panchayat,
        i.incident_code,
        i.description AS incident_description,
        i.severity AS incident_severity,
        i.created_at AS incident_date,
        vo.name AS assigned_officer_name,
        vo.phone AS assigned_officer_phone,
        vo.designation AS assigned_officer_designation
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN incidents i ON c.incident_id = i.id
      LEFT JOIN users vo ON c.assigned_officer_id = vo.id
      WHERE (c.id::text = $1 OR c.claim_id = $1);
    `, [claimId]);

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Relief claim not found' });
    }

    const claim = claimRes.rows[0];

    // District authorization check (Admins can view any district)
    if (req.user && req.user.role !== 'admin' && claim.district.toLowerCase() !== district.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: Claim belongs to ${claim.district} District. Your jurisdiction is ${district} District.`
      });
    }

    // Citizen uploaded evidence
    const citizenEvidenceRes = await pool.query(`
      SELECT id, file_path, file_name, file_type, file_size, evidence_type, description, source, uploaded_at
      FROM relief_claim_evidence
      WHERE claim_id = $1 AND (source = 'CITIZEN' OR source IS NULL)
      ORDER BY uploaded_at ASC;
    `, [claim.id]);

    // Field officer uploaded evidence
    const officerEvidenceRes = await pool.query(`
      SELECT id, file_path, file_name, file_type, file_size, evidence_type, description, source, latitude, longitude, captured_at, officer_name
      FROM relief_claim_evidence
      WHERE claim_id = $1 AND source = 'FIELD_OFFICER'
      ORDER BY captured_at ASC, uploaded_at ASC;
    `, [claim.id]);

    // Field Verification Report
    const verificationRes = await pool.query(`
      SELECT 
        v.*,
        u.name AS officer_name,
        u.phone AS officer_phone,
        u.designation AS officer_designation
      FROM relief_verifications v
      LEFT JOIN users u ON v.officer_id = u.id
      WHERE v.claim_id = $1
      ORDER BY v.created_at DESC
      LIMIT 1;
    `, [claim.id]);
    const verificationReport = verificationRes.rows[0] || null;

    // GPS location comparison calculation
    let gpsVerification = null;
    if (verificationReport && verificationReport.officer_latitude && verificationReport.officer_longitude) {
      const distanceM = calculateDistanceMeters(
        claim.latitude,
        claim.longitude,
        verificationReport.officer_latitude,
        verificationReport.officer_longitude
      );

      gpsVerification = {
        reportedLatitude: parseFloat(claim.latitude),
        reportedLongitude: parseFloat(claim.longitude),
        reportedLocationName: `${claim.village || ''}, ${claim.taluk || ''}, ${claim.district}`,
        officerLatitude: parseFloat(verificationReport.officer_latitude),
        officerLongitude: parseFloat(verificationReport.officer_longitude),
        distanceMeters: distanceM,
        gpsAccuracyMeters: parseFloat(verificationReport.gps_accuracy_meters || 5.0),
        isLocationVerified: verificationReport.location_verified && distanceM <= 250,
        statusText: distanceM <= 250 ? '✓ LOCATION VERIFIED (Within Tolerance)' : '⚠ GPS DISCREPANCY DETECTED'
      };
    }

    // AI Damage Assessment
    const aiRes = await pool.query(`
      SELECT id, assessment_type, predicted_damage, confidence_score, model_version, result, created_at
      FROM relief_claim_ai_assessment
      WHERE claim_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `, [claim.id]);

    // Status progression audit history
    const historyRes = await pool.query(`
      SELECT 
        h.id, h.status, h.old_status, h.remarks, h.created_at,
        u.name AS updated_by_name,
        u.role AS updated_by_role
      FROM relief_claim_status_history h
      LEFT JOIN users u ON h.updated_by = u.id
      WHERE h.claim_id = $1
      ORDER BY h.created_at ASC;
    `, [claim.id]);

    // Collector decision & approval history
    const approvalHistoryRes = await pool.query(`
      SELECT 
        ah.id, ah.decision, ah.amount, ah.remarks, ah.metadata, ah.created_at,
        u.name AS approver_name,
        u.role AS approver_role
      FROM relief_approval_history ah
      LEFT JOIN users u ON ah.approver_id = u.id
      WHERE ah.claim_id = $1
      ORDER BY ah.created_at DESC;
    `, [claim.id]);

    // Disbursement / DBT Payment record
    const disbursementRes = await pool.query(`
      SELECT *
      FROM relief_disbursements
      WHERE claim_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `, [claim.id]);

    // Applicable Configured Approval Rules for this category
    const rulesRes = await pool.query(`
      SELECT *
      FROM relief_approval_rules
      WHERE is_active = TRUE 
        AND (LOWER(assistance_category) = LOWER($1) OR assistance_category = 'ALL')
      ORDER BY authority_level ASC, maximum_amount DESC;
    `, [claim.assistance_category]);

    // Applicable Official SDRF/NDRF Relief Norms
    const normsRes = await pool.query(`
      SELECT *
      FROM relief_norms
      WHERE is_active = TRUE
        AND LOWER(assistance_category) = LOWER($1)
      ORDER BY maximum_amount DESC;
    `, [claim.assistance_category]);

    return res.status(200).json({
      success: true,
      claim: {
        ...claim,
        citizenEvidence: citizenEvidenceRes.rows,
        officerEvidence: officerEvidenceRes.rows,
        verificationReport,
        gpsVerification,
        aiAssessment: aiRes.rows[0] || null,
        statusHistory: historyRes.rows,
        approvalHistory: approvalHistoryRes.rows,
        disbursement: disbursementRes.rows[0] || null,
        applicableRules: rulesRes.rows,
        applicableNorms: normsRes.rows
      }
    });
  } catch (err) {
    console.error('Collector Get Claim Details Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claim details: ' + err.message });
  }
};

/**
 * 4. POST /api/collector/relief/claims/:claimId/assign-officer
 * Collector assigns a Verification Officer to a submitted claim
 */
exports.assignVerificationOfficer = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { officerId, instructions } = req.body;

    if (!officerId) {
      return res.status(400).json({ success: false, error: 'Officer ID is required' });
    }

    // Verify claim
    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    // Verify officer
    const officerRes = await pool.query("SELECT id, name, phone, district, role FROM users WHERE id = $1", [officerId]);
    if (officerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Officer not found' });
    }
    const officer = officerRes.rows[0];

    const oldStatus = claim.status;
    const newStatus = 'UNDER_FIELD_VERIFICATION';

    // Update claim
    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        assigned_officer_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [newStatus, officer.id, claim.id]);

    // Upsert verification record
    await pool.query(`
      INSERT INTO relief_verifications (
        claim_id, officer_id, assigned_at, verification_status, reverification_notes
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, 'ASSIGNED', $3)
      ON CONFLICT DO NOTHING;
    `, [claim.id, officer.id, instructions || null]);

    // Record audit status history
    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Assigned to Verification Officer: ${officer.name} (${officer.phone}). ${instructions || ''}`, collectorId]);

    // Notify Citizen
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_OFFICER_ASSIGNED',
      title: 'Verification Officer Assigned 📋',
      message: `Officer ${officer.name} has been assigned to conduct ground verification for relief application ${claim.claim_id}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    // Notify Officer
    await createNotification({
      userId: officer.id,
      type: 'RELIEF_VERIFICATION_ASSIGNED',
      title: 'New Relief Verification Duty 📍',
      message: `You have been assigned to verify relief claim ${claim.claim_id} at ${claim.village || claim.district}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_OFFICER_ASSIGNED', 'ReliefClaim', claim.claim_id, claim.district, {
      officerId: officer.id,
      officerName: officer.name
    });

    return res.status(200).json({
      success: true,
      message: `Verification Officer ${officer.name} assigned successfully.`,
      status: newStatus
    });
  } catch (err) {
    console.error('Assign Officer Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to assign officer: ' + err.message });
  }
};

/**
 * 5. POST /api/collector/relief/claims/:claimId/approve
 * Collector approves claim within authority rules and transitions to PAYMENT_PENDING
 */
exports.approveClaim = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { approvedAmount, remarks } = req.body;

    const amount = parseFloat(approvedAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Approved amount must be a positive number.' });
    }

    // Fetch claim
    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Relief claim not found' });
    }
    const claim = claimRes.rows[0];

    // District validation
    const district = getTargetDistrict(req);
    if (req.user.role !== 'admin' && claim.district.toLowerCase() !== district.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Claim does not belong to your assigned district.' });
    }

    // Check verification completion
    if (!['FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'UNDER_REVIEW'].includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot approve claim in '${claim.status}' status. Mandatory field verification must be completed first.`
      });
    }

    // Check against configured relief approval rules
    const ruleRes = await pool.query(`
      SELECT maximum_amount, requires_state_review
      FROM relief_approval_rules
      WHERE is_active = TRUE
        AND authority_level = 'COLLECTOR'
        AND (LOWER(assistance_category) = LOWER($1) OR assistance_category = 'ALL')
      ORDER BY maximum_amount DESC
      LIMIT 1;
    `, [claim.assistance_category]);

    if (ruleRes.rows.length > 0) {
      const rule = ruleRes.rows[0];
      const maxLimit = parseFloat(rule.maximum_amount);
      if (amount > maxLimit) {
        return res.status(400).json({
          success: false,
          error: `Sanctioned amount ₹${amount.toLocaleString('en-IN')} exceeds Collector authority limit of ₹${maxLimit.toLocaleString('en-IN')} for ${claim.assistance_category}. Please forward to State Review.`
        });
      }
    }

    const oldStatus = claim.status;
    const newStatus = 'APPROVED';
    const paymentStatus = 'PENDING';

    // Update claim
    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        approved_amount = $2,
        collector_remarks = $3,
        payment_status = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5;
    `, [newStatus, amount, remarks || 'Sanctioned by District Collector in accordance with official SDRF relief norms.', paymentStatus, claim.id]);

    // Record in relief_approval_history
    await pool.query(`
      INSERT INTO relief_approval_history (
        claim_id, approver_id, approver_role, decision, amount, remarks, metadata
      ) VALUES ($1, $2, 'COLLECTOR', 'APPROVED', $3, $4, $5);
    `, [claim.id, collectorId, amount, remarks || 'Approved by Collector', JSON.stringify({ sanctionedAt: new Date().toISOString() })]);

    // Record in status history
    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Assistance sanctioned: ₹${amount.toLocaleString('en-IN')}. ${remarks || ''}`, collectorId]);

    // Notify citizen
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_CLAIM_APPROVED',
      title: 'Relief Assistance Approved! 🎉',
      message: `Your relief claim ${claim.claim_id} has been approved for ₹${amount.toLocaleString('en-IN')} by the District Collector. Payment is being scheduled.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_CLAIM_APPROVED', 'ReliefClaim', claim.claim_id, claim.district, {
      approvedAmount: amount,
      remarks: remarks || ''
    });

    return res.status(200).json({
      success: true,
      message: `Relief claim approved successfully for ₹${amount.toLocaleString('en-IN')}.`,
      status: newStatus,
      approvedAmount: amount,
      paymentStatus
    });
  } catch (err) {
    console.error('Approve Claim Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to approve claim: ' + err.message });
  }
};

/**
 * 6. POST /api/collector/relief/claims/:claimId/reject
 * Collector rejects claim with mandatory reason and remarks
 */
exports.rejectClaim = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { reason, remarks } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Mandatory rejection reason must be selected.' });
    }
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ success: false, error: 'Collector official remarks are required for rejection.' });
    }

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    const oldStatus = claim.status;
    const newStatus = 'REJECTED';

    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        rejection_reason = $2,
        collector_remarks = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [newStatus, reason.trim(), remarks.trim(), claim.id]);

    await pool.query(`
      INSERT INTO relief_approval_history (
        claim_id, approver_id, approver_role, decision, amount, remarks, metadata
      ) VALUES ($1, $2, 'COLLECTOR', 'REJECTED', 0, $3, $4);
    `, [claim.id, collectorId, remarks, JSON.stringify({ reason })]);

    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Application rejected: ${reason}. Remarks: ${remarks}`, collectorId]);

    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_CLAIM_REJECTED',
      title: 'Relief Application Update',
      message: `Your relief application ${claim.claim_id} was not approved. Official Reason: ${reason}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_CLAIM_REJECTED', 'ReliefClaim', claim.claim_id, claim.district, {
      reason,
      remarks
    });

    return res.status(200).json({
      success: true,
      message: 'Claim has been marked as REJECTED with official remarks.',
      status: newStatus
    });
  } catch (err) {
    console.error('Reject Claim Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject claim: ' + err.message });
  }
};

/**
 * 7. POST /api/collector/relief/claims/:claimId/reverification
 * Collector requests ground re-verification from Verification Officer
 */
exports.requestReverification = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { reason, evidenceRequired, instructions, priority = 'HIGH' } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Reason for re-verification is required' });
    }

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    const oldStatus = claim.status;
    const newStatus = 'REVERIFICATION_REQUIRED';

    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        priority = $2,
        reverification_reason = $3,
        reverification_evidence_required = $4,
        reverification_instructions = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6;
    `, [newStatus, priority, reason.trim(), evidenceRequired || null, instructions || null, claim.id]);

    // Update verification record
    await pool.query(`
      UPDATE relief_verifications SET
        verification_status = 'REVERIFICATION_REQUESTED',
        reverification_notes = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE claim_id = $2;
    `, [`Re-verification ordered by Collector: ${reason}. Instructions: ${instructions || ''}`, claim.id]);

    await pool.query(`
      INSERT INTO relief_approval_history (
        claim_id, approver_id, approver_role, decision, amount, remarks, metadata
      ) VALUES ($1, $2, 'COLLECTOR', 'REVERIFICATION_REQUESTED', 0, $3, $4);
    `, [claim.id, collectorId, reason, JSON.stringify({ evidenceRequired, instructions, priority })]);

    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Re-verification requested: ${reason}. Instructions: ${instructions || ''}`, collectorId]);

    // Notify officer if assigned
    if (claim.assigned_officer_id) {
      await createNotification({
        userId: claim.assigned_officer_id,
        type: 'RELIEF_REVERIFICATION_REQUESTED',
        title: 'Re-verification Requested 🔄',
        message: `Collector requested re-verification for claim ${claim.claim_id}. Reason: ${reason}`,
        referenceType: 'RELIEF_CLAIM',
        referenceId: claim.claim_id
      });
    }

    // Notify citizen of additional verification
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_REVERIFICATION_NOTICE',
      title: 'Additional Field Verification Scheduled 📋',
      message: `Your relief claim ${claim.claim_id} requires supplementary field assessment. An officer will re-inspect the site.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_REVERIFICATION_ORDERED', 'ReliefClaim', claim.claim_id, claim.district, {
      reason,
      instructions
    });

    return res.status(200).json({
      success: true,
      message: 'Re-verification requested successfully. Notified verification officer.',
      status: newStatus
    });
  } catch (err) {
    console.error('Re-verification Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to request re-verification: ' + err.message });
  }
};

/**
 * 8. POST /api/collector/relief/claims/:claimId/forward-state
 * Collector forwards high-value or state-mandated claim to State Review
 */
exports.forwardToState = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { remarks } = req.body;

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    const oldStatus = claim.status;
    const newStatus = 'STATE_REVIEW';

    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        is_state_review_required = TRUE,
        forwarded_to_state_at = CURRENT_TIMESTAMP,
        collector_remarks = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [newStatus, remarks || 'Recommended for State Disaster Management Authority review.', claim.id]);

    await pool.query(`
      INSERT INTO relief_approval_history (
        claim_id, approver_id, approver_role, decision, amount, remarks, metadata
      ) VALUES ($1, $2, 'COLLECTOR', 'FORWARDED_TO_STATE', $3, $4, $5);
    `, [claim.id, collectorId, claim.verified_loss || claim.requested_amount, remarks || 'Forwarded to State Level Authority', JSON.stringify({ forwardedAt: new Date().toISOString() })]);

    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Forwarded to State Review: ${remarks || 'High-value claim clearance'}`, collectorId]);

    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_FORWARDED_STATE',
      title: 'Claim Forwarded for State Review 🏛️',
      message: `Your relief claim ${claim.claim_id} has been recommended by the District Collector and forwarded for State Government review.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    return res.status(200).json({
      success: true,
      message: 'Claim forwarded to State Disaster Management Authority review.',
      status: newStatus
    });
  } catch (err) {
    console.error('Forward to State Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to forward claim: ' + err.message });
  }
};

/**
 * 9. POST /api/collector/relief/claims/:claimId/process-payment
 * Move claim payment status to PROCESSING
 */
exports.processPayment = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    if (claim.status !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Only APPROVED claims can be queued for payment processing.' });
    }

    await pool.query(`
      UPDATE relief_claims SET
        payment_status = 'PROCESSING',
        payment_processing_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [claim.id]);

    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, 'PAYMENT_PROCESSING', 'APPROVED', 'Disbursement batch generated for electronic payment clearance', $2);
    `, [claim.id, req.user.id]);

    return res.status(200).json({
      success: true,
      message: 'Payment status updated to PROCESSING.',
      paymentStatus: 'PROCESSING'
    });
  } catch (err) {
    console.error('Process Payment Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update payment status: ' + err.message });
  }
};

/**
 * 10. POST /api/collector/relief/claims/:claimId/disburse
 * Execute simulated DBT payment disbursement and log transaction
 */
exports.disbursePayment = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    if (claim.status !== 'APPROVED' && claim.payment_status !== 'PROCESSING' && claim.status !== 'PAYMENT_PROCESSING') {
      return res.status(400).json({ success: false, error: 'Claim must be approved before disbursement can take place.' });
    }

    const txRef = `RLF-DBT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const approvedAmt = parseFloat(claim.approved_amount || 0);

    // Record disbursement in dedicated table
    await pool.query(`
      INSERT INTO relief_disbursements (
        claim_id, approved_amount, disbursed_amount, transaction_reference,
        payment_method, payment_status, bank_name, masked_account_number,
        ifsc_code, processed_by, processed_at
      ) VALUES ($1, $2, $3, $4, 'DIRECT_BENEFIT_TRANSFER_DBT', 'DISBURSED', $5, $6, $7, $8, CURRENT_TIMESTAMP);
    `, [
      claim.id, approvedAmt, approvedAmt, txRef,
      claim.bank_name || 'State Bank of India',
      claim.masked_account_number || 'XXXXXX4821',
      claim.ifsc_code || 'SBIN0008621',
      req.user.id
    ]);

    // Update claim record
    await pool.query(`
      UPDATE relief_claims SET
        status = 'DISBURSED',
        payment_status = 'DISBURSED',
        transaction_reference = $1,
        disbursed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [txRef, claim.id]);

    // Audit trail
    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, 'DISBURSED', $2, $3, $4);
    `, [claim.id, claim.status, `Simulated DBT Electronic Transfer completed. Ref: ${txRef} to ${claim.bank_name || 'Bank'} A/C ${claim.masked_account_number || 'XXXX'}`, req.user.id]);

    // Citizen notification
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_PAYMENT_DISBURSED',
      title: 'Relief Assistance Disbursed! 💳',
      message: `Relief assistance of ₹${approvedAmt.toLocaleString('en-IN')} has been disbursed via Direct Benefit Transfer. Ref: ${txRef}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_PAYMENT_DISBURSED', 'ReliefClaim', claim.claim_id, claim.district, {
      transactionReference: txRef,
      amount: approvedAmt
    });

    return res.status(200).json({
      success: true,
      message: `Simulated DBT disbursement completed. Transaction Ref: ${txRef}`,
      status: 'DISBURSED',
      transactionReference: txRef,
      disbursedAmount: approvedAmt,
      disbursedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Disburse Payment Error:', err);
    return res.status(500).json({ success: false, error: 'Disbursement failed: ' + err.message });
  }
};

/**
 * 11. GET /api/collector/relief/officers
 * Returns available verification officers / stations in the Collector's district
 */
exports.getAvailableOfficers = async (req, res) => {
  try {
    const district = getTargetDistrict(req);

    const result = await pool.query(`
      SELECT 
        id, name, phone, email, district, panchayat, designation, role, status
      FROM users
      WHERE role IN ('station', 'station_admin', 'rescue_team')
        AND LOWER(district) = LOWER($1)
      ORDER BY name ASC;
    `, [district]);

    return res.status(200).json({
      success: true,
      district,
      officers: result.rows
    });
  } catch (err) {
    console.error('Get Available Officers Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch officers: ' + err.message });
  }
};

/**
 * 12. GET /api/collector/relief/rules
 * Fetch configurable approval rules and norms
 */
exports.getApprovalRules = async (req, res) => {
  try {
    const rules = await pool.query(`
      SELECT * FROM relief_approval_rules WHERE is_active = TRUE ORDER BY assistance_category ASC, authority_level ASC;
    `);

    const norms = await pool.query(`
      SELECT * FROM relief_norms WHERE is_active = TRUE ORDER BY assistance_category ASC, maximum_amount DESC;
    `);

    return res.status(200).json({
      success: true,
      rules: rules.rows,
      norms: norms.rows
    });
  } catch (err) {
    console.error('Get Approval Rules Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch rules: ' + err.message });
  }
};

/**
 * 13. GET /api/collector/relief/map
 * Returns spatial claim features for district Leaflet map
 */
exports.getReliefMapData = async (req, res) => {
  try {
    const district = getTargetDistrict(req);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.claim_id,
        u.name AS applicant_name,
        c.disaster_type,
        c.assistance_category,
        c.damage_type,
        c.damage_severity,
        c.requested_amount,
        c.approved_amount,
        c.status,
        c.priority,
        c.latitude,
        c.longitude,
        c.district,
        c.taluk,
        c.village,
        c.location_verified,
        c.submitted_at
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      WHERE LOWER(c.district) = LOWER($1)
        AND c.status != 'DRAFT'
        AND c.latitude IS NOT NULL
        AND c.longitude IS NOT NULL
      ORDER BY c.created_at DESC;
    `, [district]);

    return res.status(200).json({
      success: true,
      district,
      count: result.rows.length,
      claims: result.rows
    });
  } catch (err) {
    console.error('Get Relief Map Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch relief map data: ' + err.message });
  }
};

/**
 * 14. GET /api/collector/relief/reports
 * Aggregates relief data for official reports & CSV export
 */
exports.getReliefReports = async (req, res) => {
  try {
    const district = getTargetDistrict(req);
    const { category, disaster, taluk, status, fromDate, toDate } = req.query;

    const conditions = ['LOWER(c.district) = LOWER($1)', "c.status != 'DRAFT'"];
    const params = [district];

    if (category) {
      params.push(category);
      conditions.push(`LOWER(c.assistance_category) = LOWER($${params.length})`);
    }
    if (disaster) {
      params.push(disaster);
      conditions.push(`LOWER(c.disaster_type) = LOWER($${params.length})`);
    }
    if (taluk) {
      params.push(taluk);
      conditions.push(`LOWER(c.taluk) = LOWER($${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`c.submitted_at >= $${params.length}`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`c.submitted_at <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(`
      SELECT 
        c.claim_id AS "Claim ID",
        u.name AS "Applicant Name",
        u.phone AS "Contact Number",
        c.disaster_type AS "Disaster Type",
        c.assistance_category AS "Assistance Category",
        c.damage_type AS "Damage Classification",
        c.damage_severity AS "Damage Severity",
        c.taluk AS "Taluk",
        c.village AS "Revenue Village",
        c.requested_amount AS "Requested Amount",
        c.approved_amount AS "Sanctioned Amount",
        c.status AS "Workflow Status",
        c.payment_status AS "Payment Status",
        c.transaction_reference AS "Transaction Ref",
        vo.name AS "Verification Officer",
        c.submitted_at AS "Submission Date",
        c.disbursed_at AS "Disbursement Date"
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN users vo ON c.assigned_officer_id = vo.id
      ${whereClause}
      ORDER BY c.submitted_at DESC;
    `, params);

    return res.status(200).json({
      success: true,
      district,
      totalRecords: result.rows.length,
      generatedAt: new Date().toISOString(),
      records: result.rows
    });
  } catch (err) {
    console.error('Get Relief Reports Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate relief report: ' + err.message });
  }
};
