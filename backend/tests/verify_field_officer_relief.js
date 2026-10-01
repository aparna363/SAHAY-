const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';
const BASE_URL = 'http://localhost:5000/api/field-officer/relief';

async function runTests() {
  console.log('--- TESTING FIELD VISIT OFFICER RELIEF API ---');

  // Generate test token for Kottayam Field Officer (ID: 50)
  const token = jwt.sign(
    { id: 50, role: 'field_officer', district: 'Kottayam' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Test Summary
  console.log('\n1. Testing GET /summary...');
  const sumRes = await fetch(`${BASE_URL}/summary`, { headers });
  const sumData = await sumRes.json();
  console.log('Status:', sumRes.status, 'Summary:', sumData.summary);

  if (!sumData.success) throw new Error('Summary failed');

  // 2. Test Claims List
  console.log('\n2. Testing GET /claims...');
  const claimsRes = await fetch(`${BASE_URL}/claims?tab=all`, { headers });
  const claimsData = await claimsRes.json();
  console.log('Status:', claimsRes.status, 'Total Claims:', claimsData.total, 'Count:', claimsData.claims?.length);

  if (!claimsData.success || claimsData.claims.length === 0) throw new Error('Claims list failed');

  const testClaim = claimsData.claims[0];
  console.log('Sample Claim:', testClaim.claim_id, 'Status:', testClaim.status);

  // 3. Test Claim Details
  console.log(`\n3. Testing GET /claims/${testClaim.id}...`);
  const detRes = await fetch(`${BASE_URL}/claims/${testClaim.id}`, { headers });
  const detData = await detRes.json();
  console.log('Status:', detRes.status, 'Applicant:', detData.claim?.applicant_name, 'Citizen Evidence:', detData.claim?.citizenEvidence?.length);

  if (!detData.success) throw new Error('Claim details failed');

  // 4. Test Schedule Visit
  console.log(`\n4. Testing POST /claims/${testClaim.id}/schedule-visit...`);
  const schedRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/schedule-visit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      visitDate: '2026-10-02',
      visitTime: '14:30',
      notes: 'Scheduled field verification visit with structural inspection team.'
    })
  });
  const schedData = await schedRes.json();
  console.log('Status:', schedRes.status, 'Result:', schedData);

  if (!schedData.success) throw new Error('Schedule visit failed');

  // 5. Test Complete Visit
  console.log(`\n5. Testing POST /claims/${testClaim.id}/complete-visit...`);
  const compRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/complete-visit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inspectionNotes: 'On-site physical inspection complete. Measured cracked foundation and wall damage.',
      officerLatitude: 9.7124,
      officerLongitude: 76.4522
    })
  });
  const compData = await compRes.json();
  console.log('Status:', compRes.status, 'Result:', compData);

  if (!compData.success) throw new Error('Complete visit failed');

  // 6. Test Submit Verification Report (VERIFIED)
  console.log(`\n6. Testing POST /claims/${testClaim.id}/submit-report...`);
  const repRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      outcome: 'VERIFIED',
      damageCategory: 'Severely Damaged',
      damageObserved: 'House structure suffered extensive structural wall fractures due to flood mudflow. Foundation remains intact but requires immediate underpinning.',
      estimatedLoss: 85000,
      recommendedAssistance: 85000,
      officerRemarks: 'Applicant verified in person. GPS point confirmed within 15 meters. Recommended for SDRF assistance.',
      officerLatitude: 9.7124,
      officerLongitude: 76.4522,
      locationVerified: true,
      applicantVerified: true,
      applicantAcknowledged: true,
      applicantAcknowledgementNotes: 'Applicant acknowledged damages noted by officer.',
      applicantNameConfirmed: testClaim.applicant_name
    })
  });
  const repData = await repRes.json();
  console.log('Status:', repRes.status, 'Result:', repData);

  if (!repData.success) throw new Error('Submit report failed');

  // 7. Test My Field Visits
  console.log('\n7. Testing GET /my-visits...');
  const visRes = await fetch(`${BASE_URL}/my-visits`, { headers });
  const visData = await visRes.json();
  console.log('Status:', visRes.status, 'Upcoming:', visData.upcomingVisits?.length, 'Completed:', visData.completedVisits?.length);

  if (!visData.success) throw new Error('My visits failed');

  // 8. Test Map Data
  console.log('\n8. Testing GET /map-data...');
  const mapRes = await fetch(`${BASE_URL}/map-data`, { headers });
  const mapData = await mapRes.json();
  console.log('Status:', mapRes.status, 'Map Points Count:', mapData.locations?.length);

  if (!mapData.success) throw new Error('Map data failed');

  // 9. Test Security Constraint: Prohibit approval / disbursement
  console.log('\n9. Testing Security Restriction (Prohibit Approve from Field Officer)...');
  const appRes = await fetch(`${BASE_URL}/claims/${testClaim.id}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ approvedAmount: 50000 })
  });
  console.log('Status (Should be 403 Forbidden):', appRes.status);
  const appData = await appRes.json();
  console.log('Response:', appData);

  if (appRes.status !== 403) throw new Error('Security check failed! Should be 403');

  console.log('\n🎉 ALL FIELD OFFICER RELIEF TESTS PASSED 100%!');
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
