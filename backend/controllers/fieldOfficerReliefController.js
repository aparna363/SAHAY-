const pool = require('../db');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Helper to compute distance in meters between two lat/lng coordinates (Haversine)
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
 * Helper to determine officer filter (claim assigned to officer OR in officer district)
 */
function getOfficerFilter(req) {
  const officerId = req.user.id;
  const district = req.user.district || 'Kottayam';
  const role = (req.user.role || '').toLowerCase();

  // If super admin or admin, they can view any or query by officerId
  if (role === 'admin') {
    return {
      sqlClause: '1=1',
      params: []
    };
  }

  // Allow claims explicitly assigned to this officer, OR if not assigned, claims within their district
  return {
    sqlClause: '(c.assigned_officer_id = $1 OR (c.assigned_officer_id IS NULL AND LOWER(c.district) = LOWER($2)) OR LOWER(c.district) = LOWER($2))',
    params: [officerId, district]
  };
}

/**
 * 1. GET /api/field-officer/relief/summary
 * Dashboard cards metrics:
 * - Assigned Applications
 * - Pending Visits
 * - Today's Visits
 * - Completed Visits
 * - Verified Applications
 * - Applications Requiring Correction
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const officerId = req.user.id;
    const district = req.user.district || 'Kottayam';

    const countQuery = `
      SELECT
        -- 1. Assigned Applications
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND c.status NOT IN ('DRAFT')
        ) AS assigned_applications,

        -- 2. Pending Visits (Assigned / Visit Scheduled but inspection not yet complete)
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND c.status IN ('SUBMITTED', 'UNDER_FIELD_VERIFICATION', 'ASSIGNED_FOR_VERIFICATION', 'VISIT_SCHEDULED')
        ) AS pending_visits,

        -- 3. Today's Visits (Scheduled for current calendar date)
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND (
              c.status = 'VISIT_SCHEDULED' 
              AND (
                c.scheduled_visit_date::date = CURRENT_DATE 
                OR (SELECT v.scheduled_visit_date::date FROM relief_verifications v WHERE v.claim_id = c.id ORDER BY v.created_at DESC LIMIT 1) = CURRENT_DATE
              )
            )
        ) AS todays_visits,

        -- 4. Completed Visits (Field inspection was performed)
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND c.status IN ('FIELD_VISIT_COMPLETED', 'FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'REQUIRES_CORRECTION', 'APPROVED', 'DISBURSED')
        ) AS completed_visits,

        -- 5. Verified Applications (Verification report submitted positively)
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND c.status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'APPROVED', 'DISBURSED')
        ) AS verified_applications,

        -- 6. Applications Requiring Correction
        COUNT(*) FILTER (
          WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
            AND c.status IN ('REQUIRES_CORRECTION', 'REVERIFICATION_REQUIRED')
        ) AS requiring_correction
      FROM relief_claims c
      WHERE c.status != 'DRAFT';
    `;

    const countRes = await pool.query(countQuery, [officerId, district]);
    const row = countRes.rows[0] || {};

    // Category breakdown for chart/quick stats
    const catQuery = `
      SELECT 
        COALESCE(c.field_damage_category, c.damage_severity, 'Partially Damaged') AS category,
        COUNT(*) AS count
      FROM relief_claims c
      WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
        AND c.status != 'DRAFT'
      GROUP BY category;
    `;
    const catRes = await pool.query(catQuery, [officerId, district]);

    return res.status(200).json({
      success: true,
      officer: {
        id: req.user.id,
        name: req.user.name,
        designation: req.user.designation || 'Field Verification Officer',
        district: req.user.district,
        role: req.user.role
      },
      summary: {
        assignedApplications: parseInt(row.assigned_applications || 0, 10),
        pendingVisits: parseInt(row.pending_visits || 0, 10),
        todaysVisits: parseInt(row.todays_visits || 0, 10),
        completedVisits: parseInt(row.completed_visits || 0, 10),
        verifiedApplications: parseInt(row.verified_applications || 0, 10),
        requiringCorrection: parseInt(row.requiring_correction || 0, 10)
      },
      damageCategories: catRes.rows
    });
  } catch (err) {
    console.error('Field Officer Summary Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch summary: ' + err.message });
  }
};

/**
 * 2. GET /api/field-officer/relief/claims
 * Paginated and filtered claims list for the Field Visit Officer
 */
exports.getAssignedClaims = async (req, res) => {
  try {
    const officerId = req.user.id;
    const district = req.user.district || 'Kottayam';
    const {
      tab = 'all',
      search,
      priority,
      category,
      disaster,
      taluk,
      page = 1,
      limit = 25
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const conditions = [
      "c.status != 'DRAFT'",
      "(c.assigned_officer_id = $1 OR (c.assigned_officer_id IS NULL AND LOWER(c.district) = LOWER($2)) OR LOWER(c.district) = LOWER($2))"
    ];
    const params = [officerId, district];

    // Tab filtering
    if (tab === 'pending') {
      conditions.push("c.status IN ('SUBMITTED', 'UNDER_FIELD_VERIFICATION', 'ASSIGNED_FOR_VERIFICATION', 'VISIT_SCHEDULED')");
    } else if (tab === 'today') {
      conditions.push(`(
        c.status = 'VISIT_SCHEDULED' 
        AND (
          c.scheduled_visit_date::date = CURRENT_DATE 
          OR (SELECT v.scheduled_visit_date::date FROM relief_verifications v WHERE v.claim_id = c.id ORDER BY v.created_at DESC LIMIT 1) = CURRENT_DATE
        )
      )`);
    } else if (tab === 'completed') {
      conditions.push("c.status IN ('FIELD_VISIT_COMPLETED', 'FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'REQUIRES_CORRECTION', 'APPROVED', 'DISBURSED')");
    } else if (tab === 'verified') {
      conditions.push("c.status IN ('FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'APPROVED', 'DISBURSED')");
    } else if (tab === 'requires_correction') {
      conditions.push("c.status IN ('REQUIRES_CORRECTION', 'REVERIFICATION_REQUIRED')");
    }

    if (priority) {
      params.push(priority.toUpperCase());
      conditions.push(`UPPER(c.priority) = $${params.length}`);
    }

    if (category) {
      params.push(category);
      conditions.push(`(LOWER(c.damage_severity) = LOWER($${params.length}) OR LOWER(c.field_damage_category) = LOWER($${params.length}))`);
    }

    if (disaster) {
      params.push(disaster);
      conditions.push(`LOWER(c.disaster_type) = LOWER($${params.length})`);
    }

    if (taluk) {
      params.push(taluk);
      conditions.push(`LOWER(c.taluk) = LOWER($${params.length})`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(
        LOWER(c.claim_id) LIKE $${params.length} OR
        LOWER(u.name) LIKE $${params.length} OR
        LOWER(c.district) LIKE $${params.length} OR
        LOWER(c.taluk) LIKE $${params.length} OR
        LOWER(c.village) LIKE $${params.length} OR
        LOWER(c.damage_type) LIKE $${params.length}
      )`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total Count
    const countSql = `
      SELECT COUNT(*) AS total
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      ${whereClause};
    `;
    const countRes = await pool.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Data query with verification info
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
        COALESCE(c.field_damage_category, c.damage_severity, 'Partially Damaged') AS damage_category,
        c.damage_severity,
        c.estimated_loss,
        c.verified_loss,
        c.requested_amount,
        c.district,
        COALESCE(c.taluk, 'General') AS taluk,
        COALESCE(c.village, c.locality, 'Main Ward') AS village,
        c.locality,
        c.latitude,
        c.longitude,
        c.status,
        c.priority,
        COALESCE(c.scheduled_visit_date, (SELECT v.scheduled_visit_date FROM relief_verifications v WHERE v.claim_id = c.id ORDER BY v.created_at DESC LIMIT 1)) AS scheduled_visit_date,
        c.correction_instructions,
        c.field_remarks,
        c.location_verified,
        c.submitted_at,
        c.created_at,
        c.assigned_officer_id,
        
        -- Verification details
        (SELECT json_build_object(
          'id', v.id,
          'status', v.verification_status,
          'scheduledDate', v.scheduled_visit_date,
          'scheduledNotes', v.scheduled_visit_notes,
          'inspectionStartedAt', v.inspection_started_at,
          'inspectionCompletedAt', v.inspection_completed_at,
          'applicantVerified', v.applicant_verified,
          'locationVerified', v.location_verified,
          'verifiedDamageCategory', v.verified_damage_category,
          'verifiedLoss', v.verified_loss_estimate,
          'recommendedAssistance', v.recommended_assistance,
          'applicantAcknowledged', v.applicant_acknowledged,
          'officerRemarks', v.officer_remarks,
          'reverificationNotes', v.reverification_notes
        ) FROM relief_verifications v WHERE v.claim_id = c.id ORDER BY v.created_at DESC LIMIT 1) AS verification_record,

        -- Officer Photo Evidence Count
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id AND e.source = 'FIELD_OFFICER') AS officer_photos_count,
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id AND (e.source = 'CITIZEN' OR e.source IS NULL)) AS citizen_evidence_count
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      ${whereClause}
      ORDER BY
        CASE 
          WHEN c.priority = 'CRITICAL' THEN 1
          WHEN c.priority = 'HIGH' THEN 2
          WHEN c.priority = 'MEDIUM' THEN 3
          ELSE 4
        END,
        c.scheduled_visit_date ASC NULLS LAST,
        c.submitted_at DESC NULLS LAST,
        c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const dataParams = [...params, parseInt(limit, 10), offset];
    const dataRes = await pool.query(dataSql, dataParams);

    return res.status(200).json({
      success: true,
      total: totalCount,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      claims: dataRes.rows
    });
  } catch (err) {
    console.error('Field Officer Get Assigned Claims Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch assigned claims: ' + err.message });
  }
};

/**
 * 3. GET /api/field-officer/relief/claims/:claimId
 * Comprehensive claim detail bundle for field inspection
 */
exports.getClaimDetails = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claimRes = await pool.query(`
      SELECT
        c.*,
        u.name AS applicant_name,
        u.phone AS applicant_phone,
        u.email AS applicant_email,
        u.panchayat AS applicant_panchayat,
        i.incident_code,
        i.description AS incident_description,
        i.severity AS incident_severity
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN incidents i ON c.incident_id = i.id
      WHERE (c.id::text = $1 OR c.claim_id = $1);
    `, [claimId]);

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Relief claim not found' });
    }

    const claim = claimRes.rows[0];

    // Citizen Evidence (photos, tax receipts, identity proofs)
    const citizenEvidenceRes = await pool.query(`
      SELECT id, file_path, file_name, file_type, file_size, evidence_type, description, source, uploaded_at
      FROM relief_claim_evidence
      WHERE claim_id = $1 AND (source = 'CITIZEN' OR source IS NULL)
      ORDER BY uploaded_at ASC;
    `, [claim.id]);

    // Field Officer Uploaded Geo-tagged Evidence
    const officerEvidenceRes = await pool.query(`
      SELECT id, file_path, file_name, file_type, file_size, evidence_type, description, source, latitude, longitude, captured_at, officer_name
      FROM relief_claim_evidence
      WHERE claim_id = $1 AND source = 'FIELD_OFFICER'
      ORDER BY captured_at DESC, uploaded_at DESC;
    `, [claim.id]);

    // Field Verification Report record
    const verificationRes = await pool.query(`
      SELECT v.*, u.name AS officer_name, u.phone AS officer_phone, u.designation AS officer_designation
      FROM relief_verifications v
      LEFT JOIN users u ON v.officer_id = u.id
      WHERE v.claim_id = $1
      ORDER BY v.created_at DESC
      LIMIT 1;
    `, [claim.id]);
    const verificationRecord = verificationRes.rows[0] || null;

    // Status Audit History
    const historyRes = await pool.query(`
      SELECT h.id, h.status, h.old_status, h.remarks, h.created_at, u.name AS updated_by_name, u.role AS updated_by_role
      FROM relief_claim_status_history h
      LEFT JOIN users u ON h.updated_by = u.id
      WHERE h.claim_id = $1
      ORDER BY h.created_at ASC;
    `, [claim.id]);

    // Family members of the applicant if saved
    const familyRes = await pool.query(`
      SELECT id, name, relation, age, gender, phone, blood_group, medical_needs, status
      FROM family_members
      WHERE user_id = $1
      ORDER BY id ASC;
    `, [claim.citizen_id]);

    // SDRF/NDRF Relief Norms for reference and dynamic calculation
    const normsRes = await pool.query(`
      SELECT * FROM relief_norms WHERE is_active = TRUE ORDER BY damage_category ASC, id ASC;
    `);

    return res.status(200).json({
      success: true,
      claim: {
        ...claim,
        citizenEvidence: citizenEvidenceRes.rows,
        officerEvidence: officerEvidenceRes.rows,
        verificationRecord,
        statusHistory: historyRes.rows,
        familyMembers: familyRes.rows,
        applicableNorms: normsRes.rows,
        sdrfNorms: normsRes.rows
      }
    });
  } catch (err) {
    console.error('Field Officer Get Claim Details Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claim details: ' + err.message });
  }
};

/**
 * 4. POST /api/field-officer/relief/claims/:claimId/schedule-visit
 * Field Officer schedules a ground visit
 * Workflow: Field Officer Assigned -> Visit Scheduled
 */
exports.scheduleVisit = async (req, res) => {
  try {
    const officerId = req.user.id;
    const { claimId } = req.params;
    const { visitDate, visitTime, notes } = req.body;

    if (!visitDate) {
      return res.status(400).json({ success: false, error: 'Visit date is required' });
    }

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    const scheduledTimestamp = visitTime ? `${visitDate} ${visitTime}:00` : `${visitDate} 10:00:00`;
    const oldStatus = claim.status;
    const newStatus = 'VISIT_SCHEDULED';

    // Update claim
    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        scheduled_visit_date = $2,
        assigned_officer_id = COALESCE(assigned_officer_id, $3),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `, [newStatus, scheduledTimestamp, officerId, claim.id]);

    // Upsert verification record
    const verCheck = await pool.query("SELECT id FROM relief_verifications WHERE claim_id = $1 ORDER BY created_at DESC LIMIT 1", [claim.id]);
    if (verCheck.rows.length > 0) {
      await pool.query(`
        UPDATE relief_verifications SET
          scheduled_visit_date = $1,
          scheduled_visit_notes = $2,
          verification_status = 'VISIT_SCHEDULED',
          officer_id = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
      `, [scheduledTimestamp, notes || 'Field visit scheduled by Verification Officer', officerId, verCheck.rows[0].id]);
    } else {
      await pool.query(`
        INSERT INTO relief_verifications (
          claim_id, officer_id, assigned_at, scheduled_visit_date, scheduled_visit_notes, verification_status
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, 'VISIT_SCHEDULED');
      `, [claim.id, officerId, scheduledTimestamp, notes || 'Field visit scheduled by Verification Officer']);
    }

    // Status history
    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Field inspection scheduled for ${visitDate} ${visitTime || ''}. Notes: ${notes || 'Ground assessment scheduled.'}`, officerId]);

    // Notify Citizen
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_VISIT_SCHEDULED',
      title: 'Field Verification Scheduled 📅',
      message: `Verification Officer ${req.user.name} has scheduled a ground visit for application ${claim.claim_id} on ${visitDate} at ${visitTime || '10:00 AM'}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, 'RELIEF_VISIT_SCHEDULED', 'ReliefClaim', claim.claim_id, claim.district, {
      scheduledDate: scheduledTimestamp,
      notes
    });

    return res.status(200).json({
      success: true,
      message: `Field visit scheduled for ${visitDate} ${visitTime || ''}`,
      status: newStatus,
      scheduledVisitDate: scheduledTimestamp
    });
  } catch (err) {
    console.error('Schedule Visit Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to schedule visit: ' + err.message });
  }
};

/**
 * 5. POST /api/field-officer/relief/claims/:claimId/complete-visit
 * Officer marks ground inspection as completed
 * Workflow: Visit Scheduled -> Field Visit Completed
 */
exports.completeFieldVisit = async (req, res) => {
  try {
    const officerId = req.user.id;
    const { claimId } = req.params;
    const { inspectionNotes, officerLatitude, officerLongitude } = req.body;

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    const oldStatus = claim.status;
    const newStatus = 'FIELD_VISIT_COMPLETED';

    await pool.query(`
      UPDATE relief_claims SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [newStatus, claim.id]);

    await pool.query(`
      UPDATE relief_verifications SET
        verification_status = 'FIELD_VISIT_COMPLETED',
        inspection_completed_at = CURRENT_TIMESTAMP,
        officer_latitude = COALESCE($1, officer_latitude),
        officer_longitude = COALESCE($2, officer_longitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE claim_id = $3;
    `, [officerLatitude ? parseFloat(officerLatitude) : null, officerLongitude ? parseFloat(officerLongitude) : null, claim.id]);

    await pool.query(`
      INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [claim.id, newStatus, oldStatus, `Field inspection conducted at location by Officer ${req.user.name}. ${inspectionNotes || 'Damage evidence recorded.'}`, officerId]);

    // Citizen notification
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_FIELD_VISIT_DONE',
      title: 'Field Inspection Completed 🔍',
      message: `The physical ground inspection for your relief claim ${claim.claim_id} has been concluded. Verification report is being compiled.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    return res.status(200).json({
      success: true,
      message: 'Field visit marked as completed. You can now submit the verification report.',
      status: newStatus
    });
  } catch (err) {
    console.error('Complete Visit Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete visit: ' + err.message });
  }
};

/**
 * 6. POST /api/field-officer/relief/claims/:claimId/photos
 * Upload multiple geo-tagged field verification photographs
 */
exports.uploadFieldPhotos = async (req, res) => {
  try {
    const officerId = req.user.id;
    const officerName = req.user.name || 'Field Officer';
    const { claimId } = req.params;
    const { latitude, longitude, description = 'Ground inspection photograph', damageCategory } = req.body;

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No photo files attached' });
    }

    const insertedPhotos = [];
    for (const file of req.files) {
      const filePath = `/uploads/relief_evidence/${file.filename}`;
      const ins = await pool.query(`
        INSERT INTO relief_claim_evidence (
          claim_id, file_path, file_name, file_type, file_size, evidence_type, description,
          source, latitude, longitude, captured_at, officer_name, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, 'field_photo', $6, 'FIELD_OFFICER', $7, $8, CURRENT_TIMESTAMP, $9, $10)
        RETURNING *;
      `, [
        claim.id,
        filePath,
        file.originalname,
        file.mimetype,
        file.size,
        damageCategory ? `[${damageCategory}] ${description}` : description,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        officerName,
        officerId
      ]);
      insertedPhotos.push(ins.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${insertedPhotos.length} geo-tagged field photograph(s) uploaded successfully.`,
      photos: insertedPhotos
    });
  } catch (err) {
    console.error('Upload Field Photos Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload field photos: ' + err.message });
  }
};

/**
 * 7. POST /api/field-officer/relief/claims/:claimId/submit-report
 * Submit final verification report findings:
 * Outcome: VERIFIED (forward to Collector Review) OR REQUIRES_CORRECTION
 * 
 * IMPORTANT: Field Officer CANNOT approve relief or disburse payments.
 * That authority strictly belongs to District Collector!
 */
exports.submitVerificationReport = async (req, res) => {
  try {
    const officerId = req.user.id;
    const { claimId } = req.params;
    const {
      outcome, // 'VERIFIED' | 'REQUIRES_CORRECTION'
      damageCategory, // e.g. 'House Damage', 'Agricultural / Crop Loss', etc.
      damageObserved,
      estimatedLoss,
      recommendedAssistance,
      officerRemarks,
      officerLatitude,
      officerLongitude,
      gpsAccuracyMeters = 5.0,
      locationVerified = true,
      applicantVerified = true,
      applicantAcknowledged = true,
      applicantAcknowledgementNotes,
      applicantNameConfirmed,
      correctionInstructions,
      // SDRF Normative Assessment Fields
      sdrfNormId,
      sdrfNormCode,
      sdrfRuleVersion,
      propertyType,
      geographicZone,
      damagePercentage,
      affectedQuantity,
      affectedUnit,
      prescribedRate,
      calculationBasis,
      statutoryReference
    } = req.body;

    if (!['VERIFIED', 'REQUIRES_CORRECTION'].includes(outcome)) {
      return res.status(400).json({
        success: false,
        error: "Invalid report outcome. Must be 'VERIFIED' or 'REQUIRES_CORRECTION'."
      });
    }

    if (!damageCategory) {
      return res.status(400).json({ success: false, error: 'Verified damage category is required' });
    }

    if (!damageObserved || !damageObserved.trim()) {
      return res.status(400).json({ success: false, error: 'Actual physical damage observations are required' });
    }

    const claimRes = await pool.query("SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1)", [claimId]);
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    const claim = claimRes.rows[0];

    // Compute distance between reported GPS and officer GPS
    let distanceM = 0;
    if (officerLatitude && officerLongitude && claim.latitude && claim.longitude) {
      distanceM = calculateDistanceMeters(claim.latitude, claim.longitude, officerLatitude, officerLongitude);
    }

    // Look up the configured SDRF norm in database if provided
    let sdrfNorm = null;
    if (sdrfNormId || sdrfNormCode) {
      const normCheck = await pool.query(
        "SELECT * FROM relief_norms WHERE (id = $1 OR norm_code = $2) AND is_active = TRUE LIMIT 1",
        [parseInt(sdrfNormId, 10) || 0, sdrfNormCode || '']
      );
      if (normCheck.rows.length > 0) {
        sdrfNorm = normCheck.rows[0];
      }
    }

    // Calculate / Verify Recommended Assistance strictly based on SDRF norm
    let calculatedRecommendedAmount = 0;
    let isEligible = true;
    const observedDmgPct = parseFloat(damagePercentage) || 0;

    if (sdrfNorm) {
      const minThreshold = parseFloat(sdrfNorm.min_damage_percentage || 0);
      if (observedDmgPct < minThreshold) {
        isEligible = false;
        calculatedRecommendedAmount = 0;
      } else {
        const rate = parseFloat(sdrfNorm.rate_per_unit || sdrfNorm.maximum_amount || 0);
        let qty = parseFloat(affectedQuantity) || 1;
        if (sdrfNorm.max_units && qty > parseFloat(sdrfNorm.max_units)) {
          qty = parseFloat(sdrfNorm.max_units);
        }
        let total = qty * rate;
        if (sdrfNorm.maximum_ceiling && total > parseFloat(sdrfNorm.maximum_ceiling)) {
          total = parseFloat(sdrfNorm.maximum_ceiling);
        }
        calculatedRecommendedAmount = total;
      }
    } else {
      calculatedRecommendedAmount = parseFloat(recommendedAssistance) || parseFloat(estimatedLoss) || 0;
    }

    const recommendedAmtNum = calculatedRecommendedAmount;
    const verifiedLossNum = parseFloat(estimatedLoss) || recommendedAmtNum || parseFloat(claim.estimated_loss) || 0;

    const sdrfAssessmentDetails = {
      normId: sdrfNorm ? sdrfNorm.id : (parseInt(sdrfNormId, 10) || null),
      normCode: sdrfNorm ? sdrfNorm.norm_code : (sdrfNormCode || 'SDRF-ASSESSMENT'),
      normTitle: sdrfNorm ? sdrfNorm.norm_title : (damageCategory || 'SDRF Assistance'),
      ruleVersion: sdrfNorm ? sdrfNorm.rule_version : (sdrfRuleVersion || 'SDRF-2023-26-v2.1'),
      statutoryReference: sdrfNorm ? sdrfNorm.statutory_reference : (statutoryReference || 'Official SDRF Schedule'),
      damageCategory: damageCategory || (sdrfNorm ? sdrfNorm.damage_category : 'Damage Assistance'),
      propertyType: propertyType || (sdrfNorm ? sdrfNorm.property_type : 'General'),
      geographicZone: geographicZone || (sdrfNorm ? sdrfNorm.geographic_zone : 'ALL'),
      damagePercentage: observedDmgPct,
      minThresholdPercentage: sdrfNorm ? parseFloat(sdrfNorm.min_damage_percentage || 0) : 0,
      eligibilityMet: isEligible,
      affectedQuantity: parseFloat(affectedQuantity) || 1,
      affectedUnit: affectedUnit || (sdrfNorm ? sdrfNorm.unit : 'Unit'),
      prescribedRate: sdrfNorm ? parseFloat(sdrfNorm.rate_per_unit || 0) : parseFloat(prescribedRate || 0),
      calculatedAssistance: calculatedRecommendedAmount,
      claimedAmount: parseFloat(claim.requested_amount || claim.estimated_loss || 0),
      calculationBasis: calculationBasis || (sdrfNorm
        ? `${sdrfNorm.norm_code} (${sdrfNorm.norm_title}) → ${isEligible ? 'Eligible' : 'Ineligible'} → ₹${sdrfNorm.rate_per_unit}/${sdrfNorm.unit} → ${affectedQuantity || 1} ${sdrfNorm.unit} → ₹${calculatedRecommendedAmount}`
        : `Recommended SDRF Assistance: ₹${calculatedRecommendedAmount}`),
      assessedByOfficerId: officerId,
      assessedByOfficerName: req.user.name,
      assessedAt: new Date().toISOString()
    };

    const oldStatus = claim.status;
    let newStatus = '';
    let notificationTitle = '';
    let notificationMsg = '';

    if (outcome === 'VERIFIED') {
      newStatus = 'FIELD_VERIFIED'; // Forwarded to Collector Review

      // Update relief_claims with SDRF recommendation
      await pool.query(`
        UPDATE relief_claims SET
          status = $1,
          verified_loss = $2,
          damage_severity = $3,
          field_damage_category = $3,
          field_remarks = $4,
          location_verified = $5,
          field_officer_id = $6,
          assigned_officer_id = $6,
          sdrf_norm_reference = $7,
          sdrf_rule_version = $8,
          sdrf_calculation_summary = $9,
          sdrf_assessment_details = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $11;
      `, [
        newStatus,
        recommendedAmtNum,
        damageCategory,
        officerRemarks || damageObserved,
        locationVerified,
        officerId,
        sdrfAssessmentDetails.normCode,
        sdrfAssessmentDetails.ruleVersion,
        sdrfAssessmentDetails.calculationBasis,
        JSON.stringify(sdrfAssessmentDetails),
        claim.id
      ]);

      // Update relief_verifications with full audit trail
      await pool.query(`
        UPDATE relief_verifications SET
          verification_status = 'VERIFIED',
          applicant_verified = $1,
          location_verified = $2,
          officer_latitude = $3,
          officer_longitude = $4,
          gps_accuracy_meters = $5,
          distance_from_reported_meters = $6,
          damage_observed = $7,
          verified_damage_category = $8,
          verified_damage_severity = $8,
          verified_loss_estimate = $9,
          recommended_assistance = $10,
          officer_remarks = $11,
          applicant_acknowledged = $12,
          applicant_acknowledgement_notes = $13,
          applicant_name_confirmed = $14,
          sdrf_norm_id = $15,
          sdrf_norm_code = $16,
          sdrf_rule_version = $17,
          damage_category = $8,
          damage_percentage = $18,
          property_type = $19,
          geographic_zone = $20,
          affected_quantity = $21,
          affected_unit = $22,
          prescribed_rate = $23,
          calculation_basis = $24,
          sdrf_assessment_details = $25,
          inspection_completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE claim_id = $26;
      `, [
        applicantVerified,
        locationVerified,
        officerLatitude ? parseFloat(officerLatitude) : null,
        officerLongitude ? parseFloat(officerLongitude) : null,
        parseFloat(gpsAccuracyMeters),
        distanceM,
        damageObserved.trim(),
        damageCategory,
        verifiedLossNum,
        recommendedAmtNum,
        officerRemarks || 'Ground inspection verified and recommended under official SDRF norms.',
        applicantAcknowledged,
        applicantAcknowledgementNotes || 'Applicant confirmed inspection findings on-site.',
        applicantNameConfirmed || claim.applicant_name,
        sdrfAssessmentDetails.normId,
        sdrfAssessmentDetails.normCode,
        sdrfAssessmentDetails.ruleVersion,
        sdrfAssessmentDetails.damagePercentage,
        sdrfAssessmentDetails.propertyType,
        sdrfAssessmentDetails.geographicZone,
        sdrfAssessmentDetails.affectedQuantity,
        sdrfAssessmentDetails.affectedUnit,
        sdrfAssessmentDetails.prescribedRate,
        sdrfAssessmentDetails.calculationBasis,
        JSON.stringify(sdrfAssessmentDetails),
        claim.id
      ]);

      // Audit history log
      await pool.query(`
        INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        claim.id,
        newStatus,
        oldStatus,
        `Field verification completed under SDRF Norm [${sdrfAssessmentDetails.normCode}]: ${damageCategory}, Recommended SDRF Assistance: ₹${recommendedAmtNum.toLocaleString('en-IN')}. Calculation Basis: ${sdrfAssessmentDetails.calculationBasis}. Forwarded to District Collector for official review & sanction.`,
        officerId
      ]);

      notificationTitle = 'Ground Verification Completed 📋';
      notificationMsg = `Your relief claim ${claim.claim_id} has been physically inspected by Officer ${req.user.name}. Report has been submitted with recommended SDRF assistance of ₹${recommendedAmtNum.toLocaleString('en-IN')} for District Collector review.`;
    } else {
      // outcome === 'REQUIRES_CORRECTION'
      newStatus = 'REQUIRES_CORRECTION';
      const instructions = correctionInstructions || officerRemarks || 'Additional supporting documentation or identity clarification required.';

      // Update relief_claims
      await pool.query(`
        UPDATE relief_claims SET
          status = $1,
          correction_instructions = $2,
          reverification_reason = $2,
          field_remarks = $3,
          field_damage_category = $4,
          field_officer_id = $5,
          sdrf_assessment_details = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7;
      `, [newStatus, instructions, officerRemarks || damageObserved, damageCategory, officerId, JSON.stringify(sdrfAssessmentDetails), claim.id]);

      // Update relief_verifications
      await pool.query(`
        UPDATE relief_verifications SET
          verification_status = 'REQUIRES_CORRECTION',
          verified_damage_category = $1,
          damage_observed = $2,
          officer_remarks = $3,
          reverification_notes = $4,
          applicant_acknowledged = $5,
          applicant_acknowledgement_notes = $6,
          officer_latitude = $7,
          officer_longitude = $8,
          sdrf_norm_code = $9,
          sdrf_rule_version = $10,
          damage_percentage = $11,
          property_type = $12,
          geographic_zone = $13,
          affected_quantity = $14,
          affected_unit = $15,
          sdrf_assessment_details = $16,
          updated_at = CURRENT_TIMESTAMP
        WHERE claim_id = $17;
      `, [
        damageCategory,
        damageObserved.trim(),
        officerRemarks || '',
        instructions,
        applicantAcknowledged,
        applicantAcknowledgementNotes || '',
        officerLatitude ? parseFloat(officerLatitude) : null,
        officerLongitude ? parseFloat(officerLongitude) : null,
        sdrfAssessmentDetails.normCode,
        sdrfAssessmentDetails.ruleVersion,
        sdrfAssessmentDetails.damagePercentage,
        sdrfAssessmentDetails.propertyType,
        sdrfAssessmentDetails.geographicZone,
        sdrfAssessmentDetails.affectedQuantity,
        sdrfAssessmentDetails.affectedUnit,
        JSON.stringify(sdrfAssessmentDetails),
        claim.id
      ]);

      // Audit history
      await pool.query(`
        INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        claim.id,
        newStatus,
        oldStatus,
        `Field verification returned for correction: ${instructions}`,
        officerId
      ]);

      notificationTitle = 'Application Requires Correction ⚠️';
      notificationMsg = `Verification Officer noted items requiring correction for application ${claim.claim_id}: ${instructions}`;
    }

    // Citizen notification
    await createNotification({
      userId: claim.citizen_id,
      type: outcome === 'VERIFIED' ? 'RELIEF_FIELD_VERIFIED' : 'RELIEF_CORRECTION_REQUIRED',
      title: notificationTitle,
      message: notificationMsg,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    await createAuditLog(req, outcome === 'VERIFIED' ? 'RELIEF_FIELD_REPORT_VERIFIED' : 'RELIEF_REPORT_REQUIRES_CORRECTION', 'ReliefClaim', claim.claim_id, claim.district, {
      damageCategory,
      outcome,
      recommendedAssistance: recommendedAmtNum,
      sdrfAssessmentDetails
    });

    return res.status(200).json({
      success: true,
      message: outcome === 'VERIFIED'
        ? 'Verification report submitted successfully with SDRF normative recommendation and forwarded to District Collector review.'
        : 'Application marked as requiring correction. Applicant has been notified.',
      status: newStatus,
      outcome,
      recommendedAssistance: recommendedAmtNum,
      calculationBasis: sdrfAssessmentDetails.calculationBasis,
      roleRestrictionNotice: 'Officer verification findings recorded. Final relief approval and DBT disbursement remain strictly restricted to District Collector authorization.'
    });
  } catch (err) {
    console.error('Submit Verification Report Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit verification report: ' + err.message });
  }
};

/**
 * 8. GET /api/field-officer/relief/my-visits
 * Returns upcoming and completed visits for "My Field Visits" section
 */
exports.getMyVisits = async (req, res) => {
  try {
    const officerId = req.user.id;
    const district = req.user.district || 'Kottayam';

    // Upcoming visits
    const upcomingRes = await pool.query(`
      SELECT
        c.id, c.claim_id, c.citizen_id, u.name AS applicant_name, u.phone AS applicant_phone,
        c.disaster_type, c.damage_type, COALESCE(c.field_damage_category, c.damage_severity) AS damage_category,
        c.district, c.taluk, c.village, c.latitude, c.longitude, c.status, c.priority,
        COALESCE(c.scheduled_visit_date, v.scheduled_visit_date) AS scheduled_visit_date,
        v.scheduled_visit_notes
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN relief_verifications v ON v.claim_id = c.id
      WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
        AND c.status IN ('VISIT_SCHEDULED', 'UNDER_FIELD_VERIFICATION', 'ASSIGNED_FOR_VERIFICATION')
      ORDER BY COALESCE(c.scheduled_visit_date, v.scheduled_visit_date) ASC NULLS LAST, c.created_at DESC;
    `, [officerId, district]);

    // Completed visits
    const completedRes = await pool.query(`
      SELECT
        c.id, c.claim_id, c.citizen_id, u.name AS applicant_name, u.phone AS applicant_phone,
        c.disaster_type, c.damage_type, COALESCE(c.field_damage_category, c.damage_severity) AS damage_category,
        c.district, c.taluk, c.village, c.latitude, c.longitude, c.status, c.priority,
        c.verified_loss, v.inspection_completed_at, v.verification_status, v.damage_observed, v.officer_remarks,
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id AND e.source = 'FIELD_OFFICER') AS officer_photos_count
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN relief_verifications v ON v.claim_id = c.id
      WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
        AND c.status IN ('FIELD_VISIT_COMPLETED', 'FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'REQUIRES_CORRECTION', 'APPROVED', 'DISBURSED')
      ORDER BY v.inspection_completed_at DESC NULLS LAST, c.updated_at DESC;
    `, [officerId, district]);

    return res.status(200).json({
      success: true,
      upcomingVisits: upcomingRes.rows,
      completedVisits: completedRes.rows
    });
  } catch (err) {
    console.error('Get My Visits Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch visits: ' + err.message });
  }
};

/**
 * 9. GET /api/field-officer/relief/map-data
 * GeoJSON/points of assigned applicant locations and visit locations
 */
exports.getMapData = async (req, res) => {
  try {
    const officerId = req.user.id;
    const district = req.user.district || 'Kottayam';

    const result = await pool.query(`
      SELECT
        c.id,
        c.claim_id,
        u.name AS applicant_name,
        u.phone AS applicant_phone,
        c.disaster_type,
        COALESCE(c.field_damage_category, c.damage_severity, 'Partially Damaged') AS damage_category,
        c.district,
        c.taluk,
        c.village,
        c.latitude,
        c.longitude,
        c.status,
        c.priority,
        c.estimated_loss,
        c.verified_loss,
        COALESCE(c.scheduled_visit_date, v.scheduled_visit_date) AS scheduled_visit_date,
        v.officer_latitude,
        v.officer_longitude,
        v.verification_status,
        v.location_verified,
        v.distance_from_reported_meters
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN relief_verifications v ON v.claim_id = c.id
      WHERE (c.assigned_officer_id = $1 OR LOWER(c.district) = LOWER($2))
        AND c.status != 'DRAFT'
        AND c.latitude IS NOT NULL
        AND c.longitude IS NOT NULL;
    `, [officerId, district]);

    return res.status(200).json({
      success: true,
      locations: result.rows
    });
  } catch (err) {
    console.error('Get Map Data Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch map data: ' + err.message });
  }
};

/**
 * 10. GET /api/field-officer/relief/sdrf-norms
 * Returns all active, configurable SDRF relief norms with rate schedules, eligibility thresholds, and units
 */
exports.getSdrfNorms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        norm_code,
        fund_source,
        assistance_category,
        damage_category,
        norm_title,
        property_type,
        geographic_zone,
        min_damage_percentage,
        max_damage_percentage,
        rate_per_unit,
        unit,
        max_units,
        maximum_ceiling,
        maximum_amount,
        rule_version,
        statutory_reference,
        eligibility_conditions,
        calculation_formula,
        norm_description,
        is_active,
        effective_from,
        effective_to
      FROM relief_norms
      WHERE is_active = TRUE
      ORDER BY damage_category ASC, id ASC;
    `);

    return res.status(200).json({
      success: true,
      norms: result.rows
    });
  } catch (err) {
    console.error('Field Officer Get SDRF Norms Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch SDRF norms: ' + err.message });
  }
};
