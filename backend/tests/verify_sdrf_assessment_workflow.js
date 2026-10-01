const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';
const BASE_URL = 'http://localhost:5000/api/field-officer/relief';

async function runSdrfTests() {
  console.log('🏛️ --- TESTING GOVERNMENT SDRF NORMATIVE ASSESSMENT WORKFLOW ---');

  // 1. Generate token for Field Officer
  const token = jwt.sign(
    { id: 50, role: 'field_officer', name: 'Sujith Menon', district: 'Kottayam' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Step 1: Verify Configurable SDRF Norms API
  console.log('\n1. Testing GET /sdrf-norms (Configured Rules from Database)...');
  const normsRes = await fetch(`${BASE_URL}/sdrf-norms`, { headers });
  const normsData = await normsRes.json();
  console.log(`Status: ${normsRes.status} | Total Active Norms: ${normsData.norms?.length}`);

  if (!normsData.success || !normsData.norms || normsData.norms.length === 0) {
    throw new Error('Failed to retrieve SDRF norms from database');
  }

  // Inspect sample rules
  const housePuccaHills = normsData.norms.find((n) => n.norm_code === 'SDRF-HOUSE-PUCCA-FULL-HILLS');
  const cropIrrigated = normsData.norms.find((n) => n.norm_code === 'SDRF-CROP-IRRIGATED');

  console.log('Sample Rule 1 (House Damage - Hilly):', {
    code: housePuccaHills.norm_code,
    title: housePuccaHills.norm_title,
    zone: housePuccaHills.geographic_zone,
    rate: housePuccaHills.rate_per_unit,
    threshold: `${housePuccaHills.min_damage_percentage}%`,
    unit: housePuccaHills.unit
  });

  console.log('Sample Rule 2 (Crop Loss - Irrigated):', {
    code: cropIrrigated.norm_code,
    title: cropIrrigated.norm_title,
    rate: cropIrrigated.rate_per_unit,
    maxUnits: cropIrrigated.max_units,
    unit: cropIrrigated.unit
  });

  // Step 2: Get a test claim
  console.log('\n2. Fetching Claim Detail for SDRF Assessment...');
  const claimsRes = await fetch(`${BASE_URL}/claims?tab=all`, { headers });
  const claimsData = await claimsRes.json();
  const testClaim = claimsData.claims[0];
  console.log(`Target Claim: ${testClaim.claim_id} (ID: ${testClaim.id}) | Current Status: ${testClaim.status}`);

  const claimDetailRes = await fetch(`${BASE_URL}/claims/${testClaim.id}`, { headers });
  const claimDetailData = await claimDetailRes.json();
  console.log(`Citizen Claimed Amount: ₹${claimDetailData.claim.requested_amount}`);
  console.log(`Citizen Reported Loss: ₹${claimDetailData.claim.estimated_loss}`);

  // Step 3: Simulate Ground Inspection Completion
  console.log('\n3. Conducting Physical Ground Inspection (POST /complete-visit)...');
  await fetch(`${BASE_URL}/claims/${testClaim.id}/complete-visit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inspectionNotes: 'Physical structural damage assessment conducted with revenue team.',
      officerLatitude: 9.7125,
      officerLongitude: 76.4520
    })
  });

  // Step 4: Submit Verification with SDRF Norm Identification & Calculation
  console.log('\n4. Submitting SDRF Verification Report (POST /submit-report)...');
  // Scenario: 80% Damage to Pucca House in Hilly terrain -> Rate is ₹1,30,000 / House
  const assessmentPayload = {
    outcome: 'VERIFIED',
    damageCategory: 'House Damage',
    damageObserved: 'House suffered catastrophic wall crack fracture and landslide foundation destabilization. Verified uninhabitable.',
    officerRemarks: 'Ground inspection confirms complete structural breakdown. Eligible under SDRF Schedule Item 3(a)(i) Hilly Terrain.',
    officerLatitude: 9.7125,
    officerLongitude: 76.4520,
    locationVerified: true,
    applicantVerified: true,
    applicantAcknowledged: true,
    applicantAcknowledgementNotes: 'Applicant verified and acknowledged findings on site.',
    applicantNameConfirmed: testClaim.applicant_name,
    // SDRF Fields
    sdrfNormId: housePuccaHills.id,
    sdrfNormCode: housePuccaHills.norm_code,
    sdrfRuleVersion: housePuccaHills.rule_version,
    propertyType: 'Pucca / Concrete / Brick',
    geographicZone: 'Hilly',
    damagePercentage: 80,
    affectedQuantity: 1,
    affectedUnit: 'House',
    prescribedRate: 130000,
    calculationBasis: `${housePuccaHills.norm_code} (${housePuccaHills.norm_title}) → Eligibility: MET (80% ≥ 75% threshold) → Prescribed Rate: ₹1,30,000 / House → Quantity: 1 House → Recommended Assistance: ₹1,30,000`,
    statutoryReference: housePuccaHills.statutory_reference
  };

  const submitRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(assessmentPayload)
  });

  const submitData = await submitRes.json();
  console.log('Submission Response Status:', submitRes.status);
  console.log('Message:', submitData.message);
  console.log('Calculated Recommended Assistance:', submitData.recommendedAssistance);
  console.log('Calculation Basis:', submitData.calculationBasis);

  if (!submitData.success || submitData.recommendedAssistance !== 130000) {
    throw new Error(`SDRF Calculation failed: expected 130000, got ${submitData.recommendedAssistance}`);
  }

  // Step 5: Verify Database Persistence & Audit Trail
  console.log('\n5. Verifying Database Audit Records in PostgreSQL...');
  const verifyRow = await pool.query(
    'SELECT * FROM relief_verifications WHERE claim_id = $1 ORDER BY id DESC LIMIT 1',
    [testClaim.id]
  );
  const vr = verifyRow.rows[0];

  console.log('Relief Verifications Audit Record:', {
    sdrf_norm_code: vr.sdrf_norm_code,
    sdrf_rule_version: vr.sdrf_rule_version,
    property_type: vr.property_type,
    geographic_zone: vr.geographic_zone,
    damage_percentage: vr.damage_percentage,
    prescribed_rate: vr.prescribed_rate,
    recommended_assistance: vr.recommended_assistance,
    calculation_basis: vr.calculation_basis,
    has_audit_details_json: !!vr.sdrf_assessment_details
  });

  const claimRow = await pool.query('SELECT status, verified_loss, sdrf_norm_reference, sdrf_calculation_summary FROM relief_claims WHERE id = $1', [testClaim.id]);
  console.log('Relief Claims Updated Record:', claimRow.rows[0]);

  const historyRows = await pool.query('SELECT remarks, created_at FROM relief_claim_status_history WHERE claim_id = $1 ORDER BY id DESC LIMIT 1', [testClaim.id]);
  console.log('Audit History Log:', historyRows.rows[0].remarks);

  // Step 6: Test Ineligible / Below Threshold Calculation
  console.log('\n6. Testing Below-Threshold Ineligible Condition (e.g. 20% Crop Loss when 33% is required)...');
  const cropTestRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      outcome: 'VERIFIED',
      damageCategory: 'Agricultural / Crop Loss',
      damageObserved: 'Minor leaf wilt observed in corner plot.',
      sdrfNormId: cropIrrigated.id,
      sdrfNormCode: cropIrrigated.norm_code,
      sdrfRuleVersion: cropIrrigated.rule_version,
      propertyType: 'Irrigated Land',
      geographicZone: 'ALL',
      damagePercentage: 20, // Below 33% threshold
      affectedQuantity: 1.5,
      affectedUnit: 'Hectare',
      prescribedRate: 17000
    })
  });
  const cropTestData = await cropTestRes.json();
  console.log('Ineligible Claim Calculated Amount:', cropTestData.recommendedAssistance, '(Expected: 0)');
  if (cropTestData.recommendedAssistance !== 0) {
    throw new Error('Threshold validation failed: expected 0 for below-threshold damage');
  }

  // Restore the 130000 verified record
  await fetch(`${BASE_URL}/claims/${testClaim.id}/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(assessmentPayload)
  });

  console.log('\n🎉 ALL GOVERNMENT SDRF ASSESSMENT & AUDIT WORKFLOW CHECKS PASSED 100%!');
  pool.end();
}

runSdrfTests().catch((e) => {
  console.error('❌ Test Error:', e);
  pool.end();
  process.exit(1);
});
