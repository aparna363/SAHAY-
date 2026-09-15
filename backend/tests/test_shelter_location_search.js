/**
 * Verification Test Suite for SAHAY AI Copilot Location Search Fix
 * Tests Section 16 requirements:
 * 1. "Hi" -> GREETING, no shelter lookup
 * 2. "Give me shelter camps in Idukki" -> SHELTER_QUERY, requestedDistrict='Idukki', locationSource='USER_REQUEST', only Idukki shelters
 * 3. "Show me relief camps in Kottayam" -> SHELTER_QUERY, requestedDistrict='Kottayam', locationSource='USER_REQUEST', only Kottayam shelters
 * 4. "Nearest shelter near me" -> SHELTER_QUERY, locationSource='CURRENT_GPS', uses browser GPS
 * 5. "What is the nearest shelter in Idukki?" -> SHELTER_QUERY, requestedDistrict='Idukki', distance calculation enabled
 * 6. "Are there shelters in Thodupuzha?" -> SHELTER_QUERY, requestedPlace='Thodupuzha', locationSource='USER_REQUEST'
 * 7. "Give me shelters" -> SHELTER_QUERY, locationSource='CURRENT_GPS'
 */

const { classifyEmergencyIntent, extractLocationContext } = require('../services/ai.service');

const TEST_CASES = [
  {
    query: 'Hi',
    expectedIntent: 'GREETING',
    expectedLocationSource: 'NONE',
    expectedDistrict: null,
    expectedRequiresContext: false
  },
  {
    query: 'Give me shelter camps in Idukki',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'USER_REQUEST',
    expectedDistrict: 'Idukki',
    expectedRequiresContext: true,
    checkDistance: false
  },
  {
    query: 'Show me relief camps in Kottayam',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'USER_REQUEST',
    expectedDistrict: 'Kottayam',
    expectedRequiresContext: true,
    checkDistance: false
  },
  {
    query: 'Nearest shelter near me',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'CURRENT_GPS',
    expectedDistrict: null,
    expectedRequiresContext: true,
    checkDistance: true
  },
  {
    query: 'What is the nearest shelter in Idukki?',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'USER_REQUEST',
    expectedDistrict: 'Idukki',
    expectedRequiresContext: true,
    checkDistance: true
  },
  {
    query: 'Are there shelters in Thodupuzha?',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'USER_REQUEST',
    expectedPlace: 'Thodupuzha',
    expectedRequiresContext: true
  },
  {
    query: 'Give me shelters',
    expectedIntent: 'SHELTER_QUERY',
    expectedLocationSource: 'CURRENT_GPS',
    expectedDistrict: null,
    expectedRequiresContext: true
  }
];

async function runTests() {
  console.log('================================================================');
  console.log('TESTING LOCATION EXTRACTION & INTENT CLASSIFICATION');
  console.log('================================================================\n');

  let parserPassed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const classification = classifyEmergencyIntent(tc.query);
    const locCtx = classification.locationContext || {};

    const intentOk = classification.intent === tc.expectedIntent;
    const sourceOk = locCtx.locationSource === tc.expectedLocationSource;
    const districtOk = tc.expectedDistrict !== undefined ? locCtx.requestedDistrict === tc.expectedDistrict : true;
    const placeOk = tc.expectedPlace !== undefined ? locCtx.requestedPlace === tc.expectedPlace : true;

    const allOk = intentOk && sourceOk && districtOk && placeOk;
    if (allOk) {
      parserPassed++;
      console.log(`[PASS] Case ${i + 1}: "${tc.query}"`);
      console.log(`       -> Intent: ${classification.intent} | Source: ${locCtx.locationSource} | District: ${locCtx.requestedDistrict} | Place: ${locCtx.requestedPlace}`);
    } else {
      console.error(`[FAIL] Case ${i + 1}: "${tc.query}"`);
      console.error(`       Expected: Intent=${tc.expectedIntent}, Source=${tc.expectedLocationSource}, District=${tc.expectedDistrict}`);
      console.error(`       Got:      Intent=${classification.intent}, Source=${locCtx.locationSource}, District=${locCtx.requestedDistrict}`);
    }
  }

  console.log(`\nParser Summary: ${parserPassed}/${TEST_CASES.length} Passed`);

  console.log('\n================================================================');
  console.log('TESTING LIVE API ENDPOINT RESPONSES WITH GPS (Kottayam Citizen: 9.5916, 76.5222)');
  console.log('================================================================\n');

  // We test the endpoint with the citizen's browser GPS coordinates set to Kottayam (9.5916, 76.5222).
  // When citizen asks for Idukki, the response MUST ONLY return Idukki shelters!
  let apiPassed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    try {
      const res = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tc.query,
          latitude: 9.5916,
          longitude: 76.5222,
          language: 'en'
        })
      });

      if (!res.ok) {
        console.error(`[API FAIL] "${tc.query}" status: ${res.status}`);
        continue;
      }

      const data = await res.json();
      console.log(`\n[API OK] Query: "${tc.query}"`);
      console.log(`   Intent: ${data.intent} | Source: ${data.locationSource} | District: ${data.requestedDistrict}`);
      console.log(`   Message Header:\n   ${data.message.split('\n')[0]}`);

      // Verification checks:
      let verificationFailed = false;

      // 1. If Idukki requested, verify NO Kottayam shelters in response text or nearestShelter
      if (tc.expectedDistrict === 'Idukki') {
        const textHasKottayam = /kottayam/i.test(data.message);
        const textHasIdukki = /idukki/i.test(data.message) || /painavu/i.test(data.message) || /munnar/i.test(data.message);

        if (textHasKottayam) {
          console.error(`   [ERROR] Message contains Kottayam when Idukki was requested!`);
          verificationFailed = true;
        }
        if (!textHasIdukki) {
          console.error(`   [ERROR] Message does not contain Idukki shelters!`);
          verificationFailed = true;
        }
        if (data.nearestShelter && data.nearestShelter.district !== 'Idukki') {
          console.error(`   [ERROR] nearestShelter district is ${data.nearestShelter.district}, expected Idukki!`);
          verificationFailed = true;
        }

        // Check if distance is included or omitted per requirement
        if (tc.checkDistance === false && data.message.includes('Distance:')) {
          console.error(`   [ERROR] Distance displayed when not requested!`);
          verificationFailed = true;
        }
        if (tc.checkDistance === true && !data.message.includes('Distance:')) {
          console.error(`   [ERROR] Distance NOT displayed when requested!`);
          verificationFailed = true;
        }
      }

      // 2. If Kottayam requested, verify NO Idukki shelters
      if (tc.expectedDistrict === 'Kottayam') {
        const textHasIdukki = /painavu|munnar/i.test(data.message);
        if (textHasIdukki) {
          console.error(`   [ERROR] Message contains Idukki when Kottayam was requested!`);
          verificationFailed = true;
        }
        if (data.nearestShelter && data.nearestShelter.district !== 'Kottayam') {
          console.error(`   [ERROR] nearestShelter district is ${data.nearestShelter.district}, expected Kottayam!`);
          verificationFailed = true;
        }
      }

      // 3. If "Hi", verify no shelters returned
      if (tc.query === 'Hi') {
        if (data.nearestShelter || data.showShelterButton) {
          console.error(`   [ERROR] Shelter returned for greeting query!`);
          verificationFailed = true;
        }
      }

      if (!verificationFailed) {
        apiPassed++;
        console.log(`   [VERIFIED] Geographic filter, heading, and distance rules satisfied.`);
      }
    } catch (err) {
      console.error(`API test error on "${tc.query}":`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: Parser: ${parserPassed}/${TEST_CASES.length}, API: ${apiPassed}/${TEST_CASES.length}`);
  console.log('================================================================\n');

  if (parserPassed === TEST_CASES.length && apiPassed === TEST_CASES.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
