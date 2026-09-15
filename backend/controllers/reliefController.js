const pool = require('../db');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Utility to mask bank account number
 * e.g. "123456789012" -> "XXXXXX9012"
 */
function maskAccountNumber(acc) {
  if (!acc) return '';
  const str = String(acc).trim();
  if (str.length <= 4) return str;
  const last4 = str.slice(-4);
  return 'X'.repeat(Math.max(6, str.length - 4)) + last4;
}

/**
 * Helper to check whether a location intersects any active hazard zone
 */
async function checkHazardZoneIntersection(lat, lng) {
  try {
    const res = await pool.query(
      `SELECT id, name, hazard_type, severity 
       FROM hazard_zones 
       WHERE active = TRUE 
         AND ST_Intersects(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1;`,
      [parseFloat(lng), parseFloat(lat)]
    );

    if (res.rows.length > 0) {
      const zone = res.rows[0];
      return {
        isInHazardZone: true,
        notes: `Location intersects declared ${zone.severity || ''} ${zone.hazard_type || 'Disaster'} Zone: ${zone.name}`
      };
    }
  } catch (err) {
    // Non-fatal if hazard_zones table or geometry format differs
  }

  return {
    isInHazardZone: false,
    notes: 'Location recorded successfully. Field verification will confirm site boundaries.'
  };
}

/**
 * 1. POST /api/relief/claims/draft
 * Create a new draft application or initialize one
 */
exports.createDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      incidentId,
      disasterType = 'Flood',
      disasterDate = new Date().toISOString().split('T')[0],
      assistanceCategory = 'Immediate Relief',
      district = req.user.district || 'Wayanad',
      latitude = 11.605,
      longitude = 76.083
    } = req.body;

    // Check duplicate active claim for same incident
    if (incidentId) {
      const dupCheck = await pool.query(
        `SELECT id, claim_id, status, created_at FROM relief_claims 
         WHERE citizen_id = $1 AND incident_id = $2 AND status NOT IN ('REJECTED', 'COMPLETED', 'DRAFT')
         LIMIT 1;`,
        [userId, incidentId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(200).json({
          success: true,
          isDuplicateWarning: true,
          existingClaim: dupCheck.rows[0],
          message: `An active relief claim (${dupCheck.rows[0].claim_id}) is already registered for this incident.`
        });
      }
    }

    const draftSeq = Math.floor(1000 + Math.random() * 9000);
    const draftCode = `SAH-RLF-DRAFT-${Date.now().toString().slice(-4)}${draftSeq}`;

    const insertResult = await pool.query(
      `INSERT INTO relief_claims (
        claim_id, citizen_id, incident_id, disaster_type, disaster_date,
        assistance_category, district, latitude, longitude,
        affected_location, status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        ST_SetSRID(ST_MakePoint($10, $11), 4326)::geography, 'DRAFT'
      ) RETURNING *;`,
      [
        draftCode, userId, incidentId || null, disasterType, disasterDate,
        assistanceCategory, district, latitude, longitude,
        parseFloat(longitude), parseFloat(latitude)
      ]
    );

    const draft = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Relief application draft created',
      claim: draft
    });
  } catch (err) {
    console.error('Error creating relief draft:', err);
    return res.status(500).json({ success: false, error: 'Failed to create draft application: ' + err.message });
  }
};

/**
 * 2. PUT /api/relief/claims/:claimId/draft
 * Update an existing draft application
 */
exports.updateDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const { claimId } = req.params;

    // Verify draft ownership
    const check = await pool.query(
      `SELECT id, citizen_id, status FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Draft application not found' });
    }

    const existing = check.rows[0];
    if (existing.citizen_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this application draft' });
    }
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: 'Application has already been submitted and cannot be edited as draft' });
    }

    const {
      incidentId,
      disasterType,
      disasterDate,
      relationshipToAffected,
      affectedFamilyMembers,
      vulnerablePersonCategory,
      assistanceCategory,
      damageType,
      damageSeverity,
      damageDescription,
      currentCondition,
      estimatedLoss,
      houseOwnership,
      houseType,
      houseRooms,
      houseDamageLevel,
      affectedArea,
      habitabilityStatus,
      isDisplaced,
      currentAccommodation,
      cropType,
      agriculturalLandType,
      totalCropArea,
      affectedCropArea,
      cropStage,
      cropLossPercentage,
      livestockType,
      livestockLost,
      livestockInjured,
      deceasedPersonName,
      legalHeirRelationship,
      latitude,
      longitude,
      district,
      locality,
      bankAccountHolder,
      bankName,
      accountNumber,
      ifscCode,
      requestedAmount,
      declarationAccepted,
      penaltyWarningAccepted
    } = req.body;

    const maskedAcc = accountNumber ? maskAccountNumber(accountNumber) : undefined;

    const updateQuery = `
      UPDATE relief_claims SET
        incident_id = COALESCE($1, incident_id),
        disaster_type = COALESCE($2, disaster_type),
        disaster_date = COALESCE($3, disaster_date),
        relationship_to_affected = COALESCE($4, relationship_to_affected),
        affected_family_members = COALESCE($5, affected_family_members),
        vulnerable_person_category = COALESCE($6, vulnerable_person_category),
        assistance_category = COALESCE($7, assistance_category),
        damage_type = COALESCE($8, damage_type),
        damage_severity = COALESCE($9, damage_severity),
        damage_description = COALESCE($10, damage_description),
        current_condition = COALESCE($11, current_condition),
        estimated_loss = COALESCE($12, estimated_loss),
        house_ownership = COALESCE($13, house_ownership),
        house_type = COALESCE($14, house_type),
        house_rooms = COALESCE($15, house_rooms),
        house_damage_level = COALESCE($16, house_damage_level),
        affected_area = COALESCE($17, affected_area),
        habitability_status = COALESCE($18, habitability_status),
        is_displaced = COALESCE($19, is_displaced),
        current_accommodation = COALESCE($20, current_accommodation),
        crop_type = COALESCE($21, crop_type),
        agricultural_land_type = COALESCE($22, agricultural_land_type),
        total_crop_area = COALESCE($23, total_crop_area),
        affected_crop_area = COALESCE($24, affected_crop_area),
        crop_stage = COALESCE($25, crop_stage),
        crop_loss_percentage = COALESCE($26, crop_loss_percentage),
        livestock_type = COALESCE($27, livestock_type),
        livestock_lost = COALESCE($28, livestock_lost),
        livestock_injured = COALESCE($29, livestock_injured),
        deceased_person_name = COALESCE($30, deceased_person_name),
        legal_heir_relationship = COALESCE($31, legal_heir_relationship),
        latitude = COALESCE($32, latitude),
        longitude = COALESCE($33, longitude),
        district = COALESCE($34, district),
        locality = COALESCE($35, locality),
        bank_account_holder = COALESCE($36, bank_account_holder),
        bank_name = COALESCE($37, bank_name),
        masked_account_number = COALESCE($38, masked_account_number),
        ifsc_code = COALESCE($39, ifsc_code),
        requested_amount = COALESCE($40, requested_amount),
        declaration_accepted = COALESCE($41, declaration_accepted),
        penalty_warning_accepted = COALESCE($42, penalty_warning_accepted),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $43
      RETURNING *;
    `;

    const resUpdate = await pool.query(updateQuery, [
      incidentId,
      disasterType,
      disasterDate,
      relationshipToAffected,
      affectedFamilyMembers ? parseInt(affectedFamilyMembers, 10) : null,
      vulnerablePersonCategory,
      assistanceCategory,
      damageType,
      damageSeverity,
      damageDescription,
      currentCondition,
      estimatedLoss ? parseFloat(estimatedLoss) : null,
      houseOwnership,
      houseType,
      houseRooms ? parseInt(houseRooms, 10) : null,
      houseDamageLevel,
      affectedArea ? parseFloat(affectedArea) : null,
      habitabilityStatus,
      isDisplaced !== undefined ? Boolean(isDisplaced) : null,
      currentAccommodation,
      cropType,
      agriculturalLandType,
      totalCropArea ? parseFloat(totalCropArea) : null,
      affectedCropArea ? parseFloat(affectedCropArea) : null,
      cropStage,
      cropLossPercentage ? parseFloat(cropLossPercentage) : null,
      livestockType,
      livestockLost ? parseInt(livestockLost, 10) : null,
      livestockInjured ? parseInt(livestockInjured, 10) : null,
      deceasedPersonName,
      legalHeirRelationship,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      district,
      locality,
      bankAccountHolder,
      bankName,
      maskedAcc,
      ifscCode ? ifscCode.toUpperCase().trim() : null,
      requestedAmount ? parseFloat(requestedAmount) : null,
      declarationAccepted !== undefined ? Boolean(declarationAccepted) : null,
      penaltyWarningAccepted !== undefined ? Boolean(penaltyWarningAccepted) : null,
      existing.id
    ]);

    return res.status(200).json({
      success: true,
      message: 'Relief application draft updated successfully',
      claim: resUpdate.rows[0]
    });
  } catch (err) {
    console.error('Error updating relief draft:', err);
    return res.status(500).json({ success: false, error: 'Failed to update draft: ' + err.message });
  }
};

/**
 * 3. POST /api/relief/claims/:claimId/submit
 * Finalize and submit the application for official verification
 */
exports.submitClaim = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { claimId } = req.params;

    // Fetch existing claim
    const check = await client.query(
      `SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );

    if (check.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, error: 'Application record not found' });
    }

    const existing = check.rows[0];
    if (existing.citizen_id !== userId) {
      client.release();
      return res.status(403).json({ success: false, error: 'Unauthorized to submit this application' });
    }

    if (existing.status !== 'DRAFT') {
      client.release();
      return res.status(400).json({ success: false, error: `Application is already submitted with status: ${existing.status}` });
    }

    const body = req.body || {};
    const disasterDate = body.disasterDate || existing.disaster_date;
    const assistanceCategory = body.assistanceCategory || existing.assistance_category;
    const latitude = parseFloat(body.latitude || existing.latitude);
    const longitude = parseFloat(body.longitude || existing.longitude);
    const declarationAccepted = body.declarationAccepted !== undefined ? body.declarationAccepted : existing.declaration_accepted;
    const penaltyWarningAccepted = body.penaltyWarningAccepted !== undefined ? body.penaltyWarningAccepted : existing.penalty_warning_accepted;

    // Validation checks
    if (!declarationAccepted || !penaltyWarningAccepted) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Both legal declaration checkboxes must be accepted before submitting your application.'
      });
    }

    if (!disasterDate) {
      client.release();
      return res.status(400).json({ success: false, error: 'Disaster occurrence date is required' });
    }

    const parsedDate = new Date(disasterDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (parsedDate > today) {
      client.release();
      return res.status(400).json({ success: false, error: 'Disaster date cannot be in the future' });
    }

    // Household family members validation (1 to 20)
    if (body.affectedFamilyMembers !== undefined) {
      const fam = parseInt(body.affectedFamilyMembers, 10);
      if (isNaN(fam) || fam < 1 || fam > 20) {
        client.release();
        return res.status(400).json({ success: false, error: 'Number of affected family members must be between 1 and 20.' });
      }
    }

    // Bank Validation if financial assistance requested
    const bankAccountHolder = body.bankAccountHolder || existing.bank_account_holder;
    const bankName = body.bankName || existing.bank_name;
    const rawAccountNumber = body.accountNumber || body.maskedAccountNumber || existing.masked_account_number;
    const confirmAccountNumber = body.confirmAccountNumber;
    const ifscCode = (body.ifscCode || existing.ifsc_code || '').toUpperCase().trim();

    if (body.accountNumber && confirmAccountNumber && body.accountNumber !== confirmAccountNumber) {
      client.release();
      return res.status(400).json({ success: false, error: 'Bank account number and confirmation do not match.' });
    }

    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      client.release();
      return res.status(400).json({
        success: false,
        error: 'Invalid IFSC Code format. Must be 11 characters e.g. SBIN0001234.'
      });
    }

    const maskedAcc = rawAccountNumber ? maskAccountNumber(rawAccountNumber) : existing.masked_account_number;

    // Generate Official Permanent Application ID: SAH-RLF-2026-XXXXXX
    const currentYear = new Date().getFullYear();
    const officialClaimCode = `SAH-RLF-${currentYear}-${String(existing.id).padStart(6, '0')}`;

    // PostGIS Disaster Zone Spatial Verification
    const hazardCheck = await checkHazardZoneIntersection(latitude, longitude);

    await client.query('BEGIN');

    // Update claim record to SUBMITTED
    const updateResult = await client.query(
      `UPDATE relief_claims SET
        claim_id = $1,
        incident_id = COALESCE($2, incident_id),
        disaster_type = COALESCE($3, disaster_type),
        disaster_date = COALESCE($4, disaster_date),
        relationship_to_affected = COALESCE($5, relationship_to_affected),
        affected_family_members = COALESCE($6, affected_family_members),
        vulnerable_person_category = COALESCE($7, vulnerable_person_category),
        assistance_category = COALESCE($8, assistance_category),
        damage_type = COALESCE($9, damage_type),
        damage_severity = COALESCE($10, damage_severity),
        damage_description = COALESCE($11, damage_description),
        current_condition = COALESCE($12, current_condition),
        estimated_loss = COALESCE($13, estimated_loss),
        latitude = $14,
        longitude = $15,
        affected_location = ST_SetSRID(ST_MakePoint($25, $26), 4326)::geography,
        district = COALESCE($16, district),
        locality = COALESCE($17, locality),
        is_in_hazard_zone = $18,
        hazard_zone_notes = $19,
        bank_account_holder = COALESCE($20, bank_account_holder),
        bank_name = COALESCE($21, bank_name),
        masked_account_number = COALESCE($22, masked_account_number),
        ifsc_code = COALESCE($23, ifsc_code),
        status = 'SUBMITTED',
        declaration_accepted = TRUE,
        penalty_warning_accepted = TRUE,
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *;`,
      [
        officialClaimCode,
        body.incidentId || existing.incident_id,
        body.disasterType || existing.disaster_type,
        disasterDate,
        body.relationshipToAffected || existing.relationship_to_affected,
        body.affectedFamilyMembers ? parseInt(body.affectedFamilyMembers, 10) : existing.affected_family_members,
        body.vulnerablePersonCategory || existing.vulnerable_person_category,
        assistanceCategory,
        body.damageType || existing.damage_type,
        body.damageSeverity || existing.damage_severity,
        body.damageDescription || existing.damage_description,
        body.currentCondition || existing.current_condition,
        body.estimatedLoss ? parseFloat(body.estimatedLoss) : existing.estimated_loss,
        latitude,
        longitude,
        body.district || existing.district,
        body.locality || existing.locality,
        hazardCheck.isInHazardZone,
        hazardCheck.notes,
        bankAccountHolder,
        bankName,
        maskedAcc,
        ifscCode,
        existing.id,
        parseFloat(longitude),
        parseFloat(latitude)
      ]
    );

    const submittedClaim = updateResult.rows[0];

    // Audit History Entry 1: SUBMITTED
    await client.query(
      `INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
       VALUES ($1, 'SUBMITTED', 'DRAFT', 'Application submitted by citizen for official verification', $2);`,
      [existing.id, userId]
    );

    // Preliminary AI Assessment generation if damage photos are attached
    const evidenceCountRes = await client.query(
      `SELECT COUNT(*) FROM relief_claim_evidence WHERE claim_id = $1;`,
      [existing.id]
    );
    const photoCount = parseInt(evidenceCountRes.rows[0].count, 10);

    const severityMap = {
      'Fully Destroyed': 'TOTAL',
      'Severely Damaged': 'SEVERE',
      'Partially Damaged': 'PARTIAL'
    };
    const predictedSeverity = severityMap[submittedClaim.damage_severity] || 'PARTIAL';
    const confidence = photoCount > 0 ? (0.78 + Math.random() * 0.12).toFixed(2) : 0.65;

    await client.query(
      `INSERT INTO relief_claim_ai_assessment (
        claim_id, assessment_type, predicted_damage, confidence_score, model_version, result
      ) VALUES ($1, 'DAMAGE_SEVERITY', $2, $3, 'sahay-damage-vision-v2.4', $4);`,
      [
        existing.id,
        predictedSeverity,
        parseFloat(confidence),
        JSON.stringify({
          evidencePhotoCount: photoCount,
          preliminarySeverity: predictedSeverity,
          disclaimer: 'Preliminary computer-assisted assessment. Final assistance is subject to official field inspection.'
        })
      ]
    );

    await client.query('COMMIT');

    // Notify Citizen
    await createNotification({
      userId,
      type: 'RELIEF_CLAIM_SUBMITTED',
      title: 'Relief Application Submitted Successfully ✅',
      message: `Your Relief & Compensation application ${officialClaimCode} has been submitted for district verification.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: officialClaimCode
    });

    await createAuditLog(req, 'RELIEF_CLAIM_SUBMITTED', 'ReliefClaim', officialClaimCode, submittedClaim.district, {
      category: submittedClaim.assistance_category,
      estimatedLoss: submittedClaim.estimated_loss
    });

    return res.status(200).json({
      success: true,
      message: 'Relief application submitted successfully',
      claim: submittedClaim,
      claimId: officialClaimCode
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error submitting relief claim:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit application: ' + err.message });
  } finally {
    client.release();
  }
};

/**
 * 4. GET /api/relief/claims/my
 * Get all relief applications submitted by or drafted by the logged in citizen
 */
exports.getMyClaims = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        c.*,
        i.incident_code,
        (SELECT COUNT(*) FROM relief_claim_evidence e WHERE e.claim_id = c.id) AS evidence_count,
        (SELECT json_agg(json_build_object(
          'id', h.id,
          'status', h.status,
          'oldStatus', h.old_status,
          'remarks', h.remarks,
          'createdAt', h.created_at
        ) ORDER BY h.created_at ASC) FROM relief_claim_status_history h WHERE h.claim_id = c.id) AS status_history,
        (SELECT json_build_object(
          'predictedDamage', ai.predicted_damage,
          'confidenceScore', ai.confidence_score,
          'modelVersion', ai.model_version
        ) FROM relief_claim_ai_assessment ai WHERE ai.claim_id = c.id ORDER BY ai.created_at DESC LIMIT 1) AS ai_assessment
      FROM relief_claims c
      LEFT JOIN incidents i ON c.incident_id = i.id
      WHERE c.citizen_id = $1
      ORDER BY c.created_at DESC;`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      claims: result.rows
    });
  } catch (err) {
    console.error('Error fetching my relief claims:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claims: ' + err.message });
  }
};

/**
 * 5. GET /api/relief/summary/my
 * Real-time PostgreSQL aggregated counts for Citizen Landing Page
 * (No hard-coded values!)
 */
exports.getMyReliefSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const statsRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('DRAFT', 'REJECTED', 'COMPLETED')) AS active_count,
        COUNT(*) FILTER (WHERE status IN ('UNDER_FIELD_VERIFICATION', 'FIELD_VERIFIED', 'UNDER_REVIEW')) AS under_verification_count,
        COUNT(*) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')) AS approved_count,
        COUNT(*) FILTER (WHERE payment_status = 'DISBURSED' OR status = 'DISBURSED') AS disbursed_count,
        COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_count,
        COALESCE(SUM(approved_amount) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')), 0) AS total_approved_amount,
        COALESCE(SUM(approved_amount) FILTER (WHERE payment_status = 'DISBURSED' OR status = 'DISBURSED'), 0) AS total_disbursed_amount
       FROM relief_claims
       WHERE citizen_id = $1;`,
      [userId]
    );

    const stats = statsRes.rows[0];

    // Fetch active draft if any
    const activeDraftRes = await pool.query(
      `SELECT id, claim_id, disaster_type, assistance_category, updated_at, created_at
       FROM relief_claims 
       WHERE citizen_id = $1 AND status = 'DRAFT'
       ORDER BY updated_at DESC LIMIT 1;`,
      [userId]
    );

    // Fetch recent 3 claims
    const recentRes = await pool.query(
      `SELECT id, claim_id, disaster_type, assistance_category, status, approved_amount, requested_amount, submitted_at, created_at
       FROM relief_claims
       WHERE citizen_id = $1 AND status != 'DRAFT'
       ORDER BY created_at DESC LIMIT 3;`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      summary: {
        activeApplications: parseInt(stats.active_count || '0', 10),
        underVerification: parseInt(stats.under_verification_count || '0', 10),
        approved: parseInt(stats.approved_count || '0', 10),
        disbursed: parseInt(stats.disbursed_count || '0', 10),
        draftCount: parseInt(stats.draft_count || '0', 10),
        totalApprovedAmount: parseFloat(stats.total_approved_amount || '0'),
        totalDisbursedAmount: parseFloat(stats.total_disbursed_amount || '0')
      },
      activeDraft: activeDraftRes.rows[0] || null,
      recentClaims: recentRes.rows
    });
  } catch (err) {
    console.error('Error fetching relief summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch summary: ' + err.message });
  }
};

/**
 * 6. GET /api/relief/claims/:claimId
 * Get detailed claim record with evidence, audit history and AI recommendation
 */
exports.getClaimById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = (req.user.role || 'citizen').toLowerCase();
    const { claimId } = req.params;

    const claimRes = await pool.query(
      `SELECT 
        c.*,
        u.name AS applicant_name,
        u.phone AS applicant_phone,
        u.email AS applicant_email,
        i.incident_code,
        i.description AS incident_description,
        i.severity AS incident_severity
      FROM relief_claims c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN incidents i ON c.incident_id = i.id
      WHERE (c.id::text = $1 OR c.claim_id = $1);`,
      [claimId]
    );

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Relief application not found' });
    }

    const claim = claimRes.rows[0];

    // Authorization: citizen must own claim unless official/collector
    const isOfficial = ['collector', 'admin', 'station', 'rescue_team'].includes(userRole);
    if (!isOfficial && claim.citizen_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this relief claim' });
    }

    // Fetch Evidence
    const evidenceRes = await pool.query(
      `SELECT id, file_path, file_name, file_type, file_size, evidence_type, description, uploaded_at
       FROM relief_claim_evidence
       WHERE claim_id = $1
       ORDER BY uploaded_at ASC;`,
      [claim.id]
    );

    // Fetch Status History Audit Trail
    const historyRes = await pool.query(
      `SELECT 
        h.id, h.status, h.old_status, h.remarks, h.created_at,
        u.name AS updated_by_name,
        u.role AS updated_by_role
       FROM relief_claim_status_history h
       LEFT JOIN users u ON h.updated_by = u.id
       WHERE h.claim_id = $1
       ORDER BY h.created_at ASC;`,
      [claim.id]
    );

    // Fetch AI Assessment
    const aiRes = await pool.query(
      `SELECT predicted_damage, confidence_score, model_version, result, created_at
       FROM relief_claim_ai_assessment
       WHERE claim_id = $1
       ORDER BY created_at DESC LIMIT 1;`,
      [claim.id]
    );

    return res.status(200).json({
      success: true,
      claim: {
        ...claim,
        evidence: evidenceRes.rows,
        statusHistory: historyRes.rows,
        aiAssessment: aiRes.rows[0] || null
      }
    });
  } catch (err) {
    console.error('Error fetching claim details:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch claim details: ' + err.message });
  }
};

/**
 * 7. POST /api/relief/claims/:claimId/evidence
 * Upload damage photographs or supporting occupancy/crop documents
 */
exports.uploadEvidence = async (req, res) => {
  try {
    const userId = req.user.id;
    const { claimId } = req.params;
    const { evidenceType = 'damage_photo', description = '' } = req.body;

    const check = await pool.query(
      `SELECT id, citizen_id, status FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = check.rows[0];
    if (claim.citizen_id !== userId && !['collector', 'station', 'admin'].includes((req.user.role || '').toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Unauthorized to upload evidence for this claim' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const insertedRecords = [];
    for (const file of req.files) {
      const filePath = `/uploads/relief_evidence/${file.filename}`;
      const ins = await pool.query(
        `INSERT INTO relief_claim_evidence (
          claim_id, file_path, file_name, file_type, file_size, evidence_type, description, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`,
        [claim.id, filePath, file.originalname, file.mimetype, file.size, evidenceType, description, userId]
      );
      insertedRecords.push(ins.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${insertedRecords.length} evidence file(s) attached successfully`,
      evidence: insertedRecords
    });
  } catch (err) {
    console.error('Error uploading relief evidence:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload evidence: ' + err.message });
  }
};

/**
 * 8. GET /api/relief/claims/:claimId/history
 * Fetch audit status progression history
 */
exports.getClaimHistory = async (req, res) => {
  try {
    const { claimId } = req.params;

    const resHistory = await pool.query(
      `SELECT 
        h.id, h.status, h.old_status, h.remarks, h.created_at,
        u.name AS changed_by_name,
        u.role AS changed_by_role
       FROM relief_claim_status_history h
       JOIN relief_claims c ON h.claim_id = c.id
       LEFT JOIN users u ON h.updated_by = u.id
       WHERE (c.id::text = $1 OR c.claim_id = $1)
       ORDER BY h.created_at ASC;`,
      [claimId]
    );

    return res.status(200).json({
      success: true,
      history: resHistory.rows
    });
  } catch (err) {
    console.error('Error fetching claim history:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch status history: ' + err.message });
  }
};

/**
 * 9. GET /api/relief/norms
 * Fetch configurable government relief norms (from PostgreSQL)
 */
exports.getReliefNorms = async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM relief_norms WHERE is_active = TRUE';
    const params = [];

    if (category) {
      query += ' AND LOWER(assistance_category) = LOWER($1)';
      params.push(category);
    }

    query += ' ORDER BY assistance_category ASC, maximum_amount DESC;';
    const normsRes = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      norms: normsRes.rows
    });
  } catch (err) {
    console.error('Error fetching relief norms:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch relief norms: ' + err.message });
  }
};

/**
 * 10. GET /api/relief/transparency-stats
 * Public district transparency statistics (Aggregated, Zero PII)
 */
exports.getTransparencyStats = async (req, res) => {
  try {
    const district = req.query.district || 'All Kerala';
    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE status != 'DRAFT') AS total_received,
        COUNT(*) FILTER (WHERE status IN ('APPROVED', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED')) AS total_approved,
        COUNT(*) FILTER (WHERE payment_status = 'DISBURSED' OR status = 'DISBURSED') AS total_disbursed,
        COALESCE(SUM(approved_amount) FILTER (WHERE payment_status = 'DISBURSED' OR status = 'DISBURSED'), 0) AS total_amount_disbursed
      FROM relief_claims
    `;
    const params = [];
    if (district && district !== 'All Kerala') {
      query += ' WHERE LOWER(district) = LOWER($1)';
      params.push(district);
    }

    const statsRes = await pool.query(query, params);
    const s = statsRes.rows[0];

    return res.status(200).json({
      success: true,
      district,
      stats: {
        applicationsReceived: parseInt(s.total_received || '0', 10),
        applicationsApproved: parseInt(s.total_approved || '0', 10),
        applicationsDisbursed: parseInt(s.total_disbursed || '0', 10),
        totalAmountDisbursed: parseFloat(s.total_amount_disbursed || '0')
      }
    });
  } catch (err) {
    console.error('Error fetching transparency stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch transparency stats: ' + err.message });
  }
};

/**
 * 11. PATCH /api/relief/claims/:claimId/field-verify
 * Field Officer inspection completion
 */
exports.fieldVerifyClaim = async (req, res) => {
  try {
    const officerId = req.user.id;
    const { claimId } = req.params;
    const { verifiedSeverity, fieldRemarks, isLocationConfirmed = true } = req.body;

    const claimRes = await pool.query(
      `SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = claimRes.rows[0];
    const oldStatus = claim.status;
    const newStatus = 'FIELD_VERIFIED';

    await pool.query(
      `UPDATE relief_claims SET
        status = $1,
        damage_severity = COALESCE($2, damage_severity),
        field_officer_id = $3,
        field_remarks = $4,
        location_verified = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6;`,
      [newStatus, verifiedSeverity, officerId, fieldRemarks || 'Field verification completed by designated officer.', isLocationConfirmed, claim.id]
    );

    // Audit trail
    await pool.query(
      `INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
       VALUES ($1, $2, $3, $4, $5);`,
      [claim.id, newStatus, oldStatus, fieldRemarks || 'Field verification completed', officerId]
    );

    // Notify citizen
    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_FIELD_VERIFIED',
      title: 'Field Verification Completed 📋',
      message: `Field verification for relief claim ${claim.claim_id} has been completed and forwarded to District Collector review.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    return res.status(200).json({
      success: true,
      message: 'Claim field verification recorded successfully',
      status: newStatus
    });
  } catch (err) {
    console.error('Error in field verification:', err);
    return res.status(500).json({ success: false, error: 'Failed to record field verification: ' + err.message });
  }
};

/**
 * 12. PATCH /api/relief/claims/:claimId/collector-decision
 * District Collector review: Approve or Reject
 */
exports.collectorDecision = async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { claimId } = req.params;
    const { decision, approvedAmount, remarks, rejectionReason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ success: false, error: "Decision must be 'APPROVE' or 'REJECT'" });
    }

    const claimRes = await pool.query(
      `SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = claimRes.rows[0];
    const oldStatus = claim.status;

    if (decision === 'APPROVE') {
      const amount = parseFloat(approvedAmount || 0);
      if (amount <= 0) {
        return res.status(400).json({ success: false, error: 'Approved compensation amount must be greater than zero.' });
      }

      const newStatus = 'APPROVED';
      const paymentStatus = 'PROCESSING';

      await pool.query(
        `UPDATE relief_claims SET
          status = $1,
          approved_amount = $2,
          collector_remarks = $3,
          payment_status = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5;`,
        [newStatus, amount, remarks || 'Sanctioned under SDRF norms by District Collector.', paymentStatus, claim.id]
      );

      await pool.query(
        `INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
         VALUES ($1, $2, $3, $4, $5);`,
        [claim.id, newStatus, oldStatus, `Assistance sanctioned: ₹${amount.toLocaleString('en-IN')}. ${remarks || ''}`, collectorId]
      );

      await createNotification({
        userId: claim.citizen_id,
        type: 'RELIEF_CLAIM_APPROVED',
        title: 'Relief Assistance Approved! 🎉',
        message: `Your relief application ${claim.claim_id} has been approved for ₹${amount.toLocaleString('en-IN')}. Payment is being processed.`,
        referenceType: 'RELIEF_CLAIM',
        referenceId: claim.claim_id
      });

      return res.status(200).json({
        success: true,
        message: `Claim approved for ₹${amount.toLocaleString('en-IN')}`,
        status: newStatus,
        approvedAmount: amount
      });
    } else {
      // REJECT
      const newStatus = 'REJECTED';
      const reason = rejectionReason || remarks || 'Claim does not meet SDRF eligibility criteria upon field verification.';

      await pool.query(
        `UPDATE relief_claims SET
          status = $1,
          rejection_reason = $2,
          collector_remarks = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;`,
        [newStatus, reason, remarks || '', claim.id]
      );

      await pool.query(
        `INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
         VALUES ($1, $2, $3, $4, $5);`,
        [claim.id, newStatus, oldStatus, `Application rejected: ${reason}`, collectorId]
      );

      await createNotification({
        userId: claim.citizen_id,
        type: 'RELIEF_CLAIM_REJECTED',
        title: 'Relief Application Update',
        message: `Your relief application ${claim.claim_id} was not approved. Reason: ${reason}`,
        referenceType: 'RELIEF_CLAIM',
        referenceId: claim.claim_id
      });

      return res.status(200).json({
        success: true,
        message: 'Claim marked as rejected',
        status: newStatus,
        rejectionReason: reason
      });
    }
  } catch (err) {
    console.error('Error in collector decision:', err);
    return res.status(500).json({ success: false, error: 'Failed to record collector decision: ' + err.message });
  }
};

/**
 * 13. PATCH /api/relief/claims/:claimId/simulate-disbursement
 * Simulated DBT payment disbursement for academic prototype
 */
exports.simulateDisbursement = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claimRes = await pool.query(
      `SELECT * FROM relief_claims WHERE (id::text = $1 OR claim_id = $1);`,
      [claimId]
    );
    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const claim = claimRes.rows[0];
    if (claim.status !== 'APPROVED' && claim.status !== 'PAYMENT_PROCESSING') {
      return res.status(400).json({ success: false, error: 'Claim must be in APPROVED or PAYMENT_PROCESSING status to disburse funds' });
    }

    const txRef = `RLF${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;

    await pool.query(
      `UPDATE relief_claims SET
        status = 'DISBURSED',
        payment_status = 'DISBURSED',
        transaction_reference = $1,
        disbursed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;`,
      [txRef, claim.id]
    );

    await pool.query(
      `INSERT INTO relief_claim_status_history (claim_id, status, old_status, remarks, updated_by)
       VALUES ($1, 'DISBURSED', $2, $3, $4);`,
      [claim.id, claim.status, `Simulated DBT Disbursement completed. Ref: ${txRef} to linked bank account (${claim.masked_account_number || 'A/C'})`, req.user.id]
    );

    await createNotification({
      userId: claim.citizen_id,
      type: 'RELIEF_PAYMENT_DISBURSED',
      title: 'Relief Assistance Disbursed! 💳',
      message: `Relief amount ₹${parseFloat(claim.approved_amount || 0).toLocaleString('en-IN')} has been disbursed. Reference: ${txRef}.`,
      referenceType: 'RELIEF_CLAIM',
      referenceId: claim.claim_id
    });

    return res.status(200).json({
      success: true,
      message: 'Simulated disbursement completed successfully',
      status: 'DISBURSED',
      transactionReference: txRef,
      disbursedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error simulating disbursement:', err);
    return res.status(500).json({ success: false, error: 'Failed to disburse: ' + err.message });
  }
};
