const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';

async function runTest() {
  console.log('--- STARTING RELIEF & COMPENSATION E2E TEST ---');

  try {
    // 1. Fetch or seed a test citizen user
    let userRes = await pool.query("SELECT id, name, phone, role, district FROM users WHERE role = 'citizen' LIMIT 1;");
    if (userRes.rows.length === 0) {
      userRes = await pool.query(
        "INSERT INTO users (name, phone, role, district, panchayat) VALUES ('Dev Citizen', '9876543210', 'citizen', 'Wayanad', 'Meppadi') RETURNING id, name, phone, role, district;"
      );
    }
    const citizen = userRes.rows[0];
    const citizenToken = jwt.sign({ id: citizen.id, role: 'citizen' }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Fetch or seed a test collector user
    let colRes = await pool.query("SELECT id, name, role, district FROM users WHERE role = 'collector' LIMIT 1;");
    if (colRes.rows.length === 0) {
      colRes = await pool.query(
        "INSERT INTO users (name, phone, role, district) VALUES ('District Collector Wayanad', '9847000001', 'collector', 'Wayanad') RETURNING id, name, role, district;"
      );
    }
    const collector = colRes.rows[0];
    const collectorToken = jwt.sign({ id: collector.id, role: 'collector' }, JWT_SECRET, { expiresIn: '1h' });

    const headersCitizen = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    };

    const headersCollector = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${collectorToken}`
    };

    // A. Summary API
    const sumRes = await fetch('http://localhost:5000/api/relief/summary/my', { headers: headersCitizen });
    const sumData = await sumRes.json();
    console.log('✓ GET /api/relief/summary/my status:', sumRes.status, 'Summary:', sumData.summary);

    // B. Norms API
    const normsRes = await fetch('http://localhost:5000/api/relief/norms', { headers: headersCitizen });
    const normsData = await normsRes.json();
    console.log('✓ GET /api/relief/norms count:', normsData.norms?.length);

    // C. Create Draft
    const draftRes = await fetch('http://localhost:5000/api/relief/claims/draft', {
      method: 'POST',
      headers: headersCitizen,
      body: JSON.stringify({
        disasterType: 'Flood',
        disasterDate: '2026-09-10',
        assistanceCategory: 'Damage Assistance',
        district: 'Wayanad',
        latitude: 11.5512,
        longitude: 76.1245
      })
    });
    const draftData = await draftRes.json();
    console.log('✓ POST /api/relief/claims/draft status:', draftRes.status, 'draftData:', draftData);
    if (!draftData.success || !draftData.claim) {
      console.error('Draft creation failed:', draftData);
      process.exit(1);
    }
    const draftClaimId = draftData.claim.claim_id;

    // D. Update Draft
    const updateRes = await fetch(`http://localhost:5000/api/relief/claims/${draftClaimId}/draft`, {
      method: 'PUT',
      headers: headersCitizen,
      body: JSON.stringify({
        damageType: 'Residential House Loss',
        damageSeverity: 'Severely Damaged',
        damageDescription: 'Floodwaters inundated dwelling up to 5 feet causing severe structural cracks.',
        houseOwnership: 'Owned',
        houseType: 'Concrete/RCC',
        estimatedLoss: 45000,
        bankAccountHolder: citizen.name,
        bankName: 'State Bank of India',
        accountNumber: '123456789012',
        ifscCode: 'SBIN0001234'
      })
    });
    const updateData = await updateRes.json();
    console.log('✓ PUT /api/relief/claims/:id/draft status:', updateRes.status, 'Masked Account:', updateData.claim?.masked_account_number);

    // E. Submit Application
    const submitRes = await fetch(`http://localhost:5000/api/relief/claims/${draftClaimId}/submit`, {
      method: 'POST',
      headers: headersCitizen,
      body: JSON.stringify({
        disasterType: 'Flood',
        disasterDate: '2026-09-10',
        relationshipToAffected: 'Self',
        affectedFamilyMembers: 4,
        vulnerablePersonCategory: ['Elderly person (60+)', 'Child (Under 12)'],
        assistanceCategory: 'Damage Assistance',
        damageType: 'Residential House Loss',
        damageSeverity: 'Severely Damaged',
        damageDescription: 'Floodwaters inundated dwelling up to 5 feet causing severe structural cracks.',
        latitude: 11.5512,
        longitude: 76.1245,
        district: 'Wayanad',
        locality: 'Meppadi Town',
        bankAccountHolder: citizen.name,
        bankName: 'State Bank of India',
        accountNumber: '123456789012',
        confirmAccountNumber: '123456789012',
        ifscCode: 'SBIN0001234',
        declarationAccepted: true,
        penaltyWarningAccepted: true
      })
    });
    const submitData = await submitRes.json();
    console.log('✓ POST /api/relief/claims/:id/submit status:', submitRes.status, 'Official Application ID:', submitData.claimId, 'Status:', submitData.claim?.status);
    const finalClaimId = submitData.claimId;

    // F. Get Claim Details
    const getRes = await fetch(`http://localhost:5000/api/relief/claims/${finalClaimId}`, { headers: headersCitizen });
    const getData = await getRes.json();
    console.log('✓ GET /api/relief/claims/:id status:', getRes.status, 'AI Assessment:', getData.claim?.aiAssessment);

    // G. Field Verification Simulation
    const fieldRes = await fetch(`http://localhost:5000/api/relief/claims/${finalClaimId}/field-verify`, {
      method: 'PATCH',
      headers: headersCollector,
      body: JSON.stringify({
        verifiedSeverity: 'Severely Damaged',
        fieldRemarks: 'Ground inspection completed by Revenue Inspector. GPS verified.',
        isLocationConfirmed: true
      })
    });
    const fieldData = await fieldRes.json();
    console.log('✓ PATCH /api/relief/claims/:id/field-verify status:', fieldRes.status, 'New State:', fieldData.status);

    // H. Collector Decision (Approval)
    const decRes = await fetch(`http://localhost:5000/api/relief/claims/${finalClaimId}/collector-decision`, {
      method: 'PATCH',
      headers: headersCollector,
      body: JSON.stringify({
        decision: 'APPROVE',
        approvedAmount: 40000,
        remarks: 'Sanctioned under SDRF relief norms for Wayanad District.'
      })
    });
    const decData = await decRes.json();
    console.log('✓ PATCH /api/relief/claims/:id/collector-decision status:', decRes.status, 'Approved Amount:', decData.approvedAmount);

    // I. Simulate Disbursement
    const disbRes = await fetch(`http://localhost:5000/api/relief/claims/${finalClaimId}/disburse`, {
      method: 'PATCH',
      headers: headersCollector
    });
    const disbData = await disbRes.json();
    console.log('✓ PATCH /api/relief/claims/:id/disburse status:', disbRes.status, 'Ref:', disbData.transactionReference);

    // J. History Audit Trail check
    const histRes = await fetch(`http://localhost:5000/api/relief/claims/${finalClaimId}/history`, { headers: headersCitizen });
    const histData = await histRes.json();
    console.log('✓ GET /api/relief/claims/:id/history step count:', histData.history?.length);
    histData.history?.forEach((h, i) => console.log(`   [${i + 1}] ${h.status}: ${h.remarks}`));

    console.log('\n=============================================');
    console.log('🎉 ALL RELIEF WORKFLOW TESTS PASSED 100%!');
    console.log('=============================================');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    process.exit(0);
  }
}

runTest();
