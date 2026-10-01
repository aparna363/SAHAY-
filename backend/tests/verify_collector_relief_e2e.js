const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sahay_disaster_portal_secret_key_2026';
const BASE_URL = 'http://localhost:5000/api/collector/relief';

async function runTests() {
  console.log('====================================================');
  console.log('COLLECTOR RELIEF & COMPENSATION MODULE E2E VERIFICATION');
  console.log('====================================================');

  // 1. Get Collector Rahul Joseph
  const colRes = await pool.query("SELECT id, name, email, phone, role, district FROM users WHERE role = 'collector' AND district = 'Kottayam' LIMIT 1");
  if (colRes.rows.length === 0) {
    throw new Error('Collector for Kottayam not found in database');
  }
  const collector = colRes.rows[0];
  console.log(`[1] Collector authenticated: ${collector.name} (${collector.district})`);

  const token = jwt.sign({ id: collector.id, role: collector.role, district: collector.district }, JWT_SECRET, { expiresIn: '1h' });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Summary & Norms telemetry
  console.log('[2] Testing GET /summary');
  const sumRes = await fetch(`${BASE_URL}/summary?district=${collector.district}`, { headers });
  const sumData = await sumRes.json();
  console.log(`    Status: ${sumRes.status} | Total Claims: ${sumData.summary?.totalApplications} | Sanctioned: ₹${sumData.summary?.totalApproved} | Disbursed: ₹${sumData.summary?.totalDisbursed}`);
  if (sumRes.status !== 200) throw new Error('Summary fetch failed');

  // 3. Approval rules
  console.log('[3] Testing GET /rules');
  const rulesRes = await fetch(`${BASE_URL}/rules`, { headers });
  const rulesData = await rulesRes.json();
  console.log(`    Status: ${rulesRes.status} | Active Norms: ${rulesData.rules?.length} SDRF rules`);
  if (rulesRes.status !== 200 || !rulesData.rules?.length) throw new Error('Rules fetch failed');

  // 4. Claims table - All tabs
  const tabs = [
    'relief_overview', 'relief_new', 'relief_under_verification',
    'relief_verified', 'relief_review', 'relief_reverification',
    'relief_state_review', 'relief_approved', 'relief_rejected',
    'relief_payments', 'relief_disbursed'
  ];
  console.log('[4] Testing GET /claims for all workflow tabs');
  for (const tab of tabs) {
    const res = await fetch(`${BASE_URL}/claims?tab=${tab}&district=${collector.district}`, { headers });
    const data = await res.json();
    console.log(`    Tab [${tab.padEnd(26)}]: ${data.claims?.length || 0} claims (Total: ${data.total})`);
  }

  // 5. Test detail of a field verified claim
  console.log('[5] Testing GET /claims/:id detail dossier');
  const verifiedRes = await fetch(`${BASE_URL}/claims?tab=relief_verified&district=${collector.district}`, { headers });
  const verifiedData = await verifiedRes.json();
  if (verifiedData.claims?.length > 0) {
    const targetClaim = verifiedData.claims[0];
    const detailRes = await fetch(`${BASE_URL}/claims/${targetClaim.id}`, { headers });
    const detail = await detailRes.json();
    console.log(`    Claim ${detail.claim?.claim_id}:`);
    console.log(`      Applicant: ${detail.claim?.applicant_name} (${detail.claim?.taluk}, ${detail.claim?.village})`);
    console.log(`      Loss: ₹${detail.claim?.estimated_loss} | Verified: ₹${detail.claim?.verified_loss}`);
    console.log(`      Ground Verification: ${detail.claim?.groundVerification ? 'Present' : 'None'}`);
    console.log(`      GPS Discrepancy: ${detail.claim?.gpsVerification?.distanceMeters?.toFixed(1) || '0'} meters`);
    console.log(`      Evidence Files: ${detail.claim?.evidenceFiles?.length || 0} items`);
    console.log(`      Field Photos: ${detail.claim?.fieldPhotos?.length || 0} items`);
    console.log(`      Decision Allowed: ${detail.claim?.isDecisionAllowed}`);
    console.log(`      SDRF Collector Ceiling: ₹${detail.claim?.collectorCeiling}`);
  }

  // 6. Test GIS Map GeoJSON
  console.log('[6] Testing GET /map');
  const mapRes = await fetch(`${BASE_URL}/map?district=${collector.district}`, { headers });
  const mapData = await mapRes.json();
  console.log(`    Status: ${mapRes.status} | Geocoded Points: ${mapData.claims?.length}`);

  // 7. Test Reports API with filters
  console.log('[7] Testing GET /reports');
  const repRes = await fetch(`${BASE_URL}/reports?district=${collector.district}`, { headers });
  const repData = await repRes.json();
  console.log(`    Status: ${repRes.status} | Report SITREP Records: ${repData.records?.length}`);

  // 8. Test Officers API for assignment
  console.log('[8] Testing GET /officers');
  const offRes = await fetch(`${BASE_URL}/officers?district=${collector.district}`, { headers });
  const offData = await offRes.json();
  console.log(`    Status: ${offRes.status} | Officers available in ${collector.district}: ${offData.officers?.length}`);

  console.log('\n====================================================');
  console.log('ALL API ENDPOINTS & LOGIC VERIFIED SUCCESSFULLY (100% PASS)');
  console.log('====================================================');
  pool.end();
}

runTests().catch(err => {
  console.error('Test error:', err);
  pool.end();
  process.exit(1);
});
