/**
 * Comprehensive Automated Test Suite for SAHAY AI Copilot
 * Universal Spelling, Typo, and Query Correction Layer
 */

const { classifyEmergencyIntent } = require('../services/ai.service');
const { correctQuery } = require('../services/queryCorrection.service');

const TEST_CASES = [
  {
    id: 1,
    query: 'shelter in kanjirappalyy',
    expectedCorrected: 'Shelter in Kanjirappally',
    expectedIntent: 'SHELTER_QUERY',
    expectedDistrict: 'Kottayam',
    expectedPlace: 'Kanjirappally',
    expectedSource: 'USER_REQUEST',
    expectedSeverity: 'LOW'
  },
  {
    id: 2,
    query: 'wheather today',
    expectedCorrected: 'Weather today',
    expectedIntent: 'WEATHER_QUERY',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'LOW'
  },
  {
    id: 3,
    query: 'flood alret in idukky',
    expectedCorrected: 'Flood alert in Idukki',
    expectedIntent: 'DISASTER_ALERT_QUERY',
    expectedDistrict: 'Idukki',
    expectedPlace: null,
    expectedSource: 'USER_REQUEST',
    expectedSeverity: 'LOW'
  },
  {
    id: 4,
    query: 'hospitl near me',
    expectedCorrected: 'Hospital near me',
    expectedIntent: 'HOSPITAL_QUERY',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'CURRENT_GPS',
    expectedSeverity: 'LOW'
  },
  {
    id: 5,
    query: 'relif fund apply',
    expectedCorrected: 'Relief fund apply',
    expectedIntent: 'RELIEF_ASSISTANCE',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'LOW'
  },
  {
    id: 6,
    query: 'emergncy number',
    expectedCorrected: 'Emergency number',
    expectedIntent: 'GENERAL_DISASTER_QUERY',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'LOW'
  },
  {
    id: 7,
    query: 'landslid saftey',
    expectedCorrected: 'Landslide safety',
    expectedIntent: 'SAFETY_GUIDANCE',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'LOW'
  },
  {
    id: 8,
    query: 'i am traped in my hous',
    expectedCorrected: 'I am trapped in my house',
    expectedIntent: 'SOS',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'CRITICAL'
  },
  {
    id: 9,
    query: 'water is enterng my hous',
    expectedCorrected: 'Water is entering my house',
    expectedIntent: 'FLOOD',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'HIGH'
  },
  {
    id: 10,
    query: 'helo',
    expectedCorrected: 'Hello',
    expectedIntent: 'GREETING',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    id: 11,
    query: 'thnks',
    expectedCorrected: 'Thanks',
    expectedIntent: 'CASUAL_CONVERSATION',
    expectedDistrict: null,
    expectedPlace: null,
    expectedSource: 'NONE',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    id: 12,
    query: 'is ther any flood alret in idukky today',
    expectedCorrected: 'Is there any flood alert in Idukki today',
    expectedIntent: 'DISASTER_ALERT_QUERY',
    expectedDistrict: 'Idukki',
    expectedPlace: null,
    expectedSource: 'USER_REQUEST',
    expectedSeverity: 'LOW'
  },
  {
    id: 13,
    query: 'sheltr in kanjirappalyy with emergncy contact',
    expectedCorrected: 'Shelter in Kanjirappally with emergency contact',
    expectedIntent: 'SHELTER_QUERY',
    expectedDistrict: 'Kottayam',
    expectedPlace: 'Kanjirappally',
    expectedSource: 'USER_REQUEST',
    expectedSeverity: 'LOW'
  },
  {
    id: 14,
    query: 'shltr in xyzabc',
    expectedCorrected: 'Shelter in xyzabc',
    expectedIntent: 'SHELTER_QUERY',
    expectedDistrict: null,
    expectedPlace: 'xyzabc',
    expectedSource: 'USER_REQUEST',
    expectedSeverity: 'LOW',
    expectedNeedsClarification: true
  }
];

async function runUnitTests() {
  console.log('================================================================');
  console.log('TESTING UNIVERSAL SPELLING & TYPO CORRECTION LAYER');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const classification = classifyEmergencyIntent(tc.query);

    const corrMatch = classification.correctedQuery.toLowerCase().trim() === tc.expectedCorrected.toLowerCase().trim();
    const intentMatch = classification.intent === tc.expectedIntent;
    const severityMatch = classification.severity === tc.expectedSeverity;
    const distMatch = classification.locationContext?.requestedDistrict === tc.expectedDistrict;
    const placeMatch = classification.locationContext?.requestedPlace === tc.expectedPlace;
    const sourceMatch = classification.locationContext?.locationSource === tc.expectedSource;

    let clarifMatch = true;
    if (tc.expectedNeedsClarification !== undefined) {
      clarifMatch = classification.locationContext?.needsClarification === tc.expectedNeedsClarification;
    }

    const allOk = corrMatch && intentMatch && severityMatch && distMatch && placeMatch && sourceMatch && clarifMatch;

    if (allOk) {
      console.log(`[PASS] Case ${tc.id}: "${tc.query}"`);
      console.log(`       -> Corrected: "${classification.correctedQuery}"`);
      console.log(`       -> Intent: ${classification.intent} | Severity: ${classification.severity} | District: ${classification.locationContext?.requestedDistrict} | Place: ${classification.locationContext?.requestedPlace} | Source: ${classification.locationContext?.locationSource}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${tc.id}: "${tc.query}"`);
      console.error(`       -> Got Corrected: "${classification.correctedQuery}" (Expected: "${tc.expectedCorrected}")`);
      console.error(`       -> Got Intent: ${classification.intent} (Expected: ${tc.expectedIntent})`);
      console.error(`       -> Got Severity: ${classification.severity} (Expected: ${tc.expectedSeverity})`);
      console.error(`       -> Got District: ${classification.locationContext?.requestedDistrict} (Expected: ${tc.expectedDistrict})`);
      console.error(`       -> Got Place: ${classification.locationContext?.requestedPlace} (Expected: ${tc.expectedPlace})`);
      console.error(`       -> Got Source: ${classification.locationContext?.locationSource} (Expected: ${tc.expectedSource})`);
      if (tc.expectedNeedsClarification !== undefined) {
        console.error(`       -> Got Clarification: ${classification.locationContext?.needsClarification} (Expected: ${tc.expectedNeedsClarification})`);
      }
      failed++;
    }
  }

  console.log(`\nUnit Tests Summary: ${passed}/${TEST_CASES.length} Passed, ${failed} Failed\n`);
  return failed === 0;
}

async function runLiveEndpointTests() {
  console.log('================================================================');
  console.log('TESTING LIVE /api/ai/chat ENDPOINT WITH TYPO QUERIES');
  console.log('================================================================\n');

  // Citizen located in Kottayam (9.5916, 76.5222)
  const citizenLat = 9.5916;
  const citizenLng = 76.5222;

  const endpointCases = [
    {
      query: 'shelter in kanjirappalyy',
      check: (data) => {
        if (!data.message.includes('KANJIRAPPALLY')) {
          throw new Error(`Expected KANJIRAPPALLY in heading, got:\n${data.message}`);
        }
        if (data.nearestShelter && data.nearestShelter.district !== 'Kottayam') {
          throw new Error(`Expected Kottayam shelter for Kanjirappally, got: ${data.nearestShelter.district}`);
        }
      }
    },
    {
      query: 'wheather today',
      check: (data) => {
        if (!data.message.includes('WEATHER') && !data.message.includes('Temperature')) {
          throw new Error(`Expected Weather report, got:\n${data.message}`);
        }
      }
    },
    {
      query: 'flood alret in idukky',
      check: (data) => {
        if (!/idukki/i.test(data.message)) {
          throw new Error(`Expected IDUKKI in alert response, got:\n${data.message}`);
        }
      }
    },
    {
      query: 'emergncy number',
      check: (data) => {
        if (!data.message.includes('112') || !data.message.includes('1077')) {
          throw new Error(`Expected emergency numbers 112 and 1077, got:\n${data.message}`);
        }
      }
    },
    {
      query: 'i am traped in my hous',
      check: (data) => {
        if (data.intent !== 'SOS' || data.severity !== 'CRITICAL') {
          throw new Error(`Expected SOS / CRITICAL, got: ${data.intent} / ${data.severity}`);
        }
        if (!data.showSOSButton) {
          throw new Error(`Expected showSOSButton to be true`);
        }
      }
    },
    {
      query: 'helo',
      check: (data) => {
        if (data.intent !== 'GREETING' || data.severity !== 'NONE') {
          throw new Error(`Expected GREETING / NONE, got: ${data.intent} / ${data.severity}`);
        }
        if (data.requiresContext) {
          throw new Error(`Expected requiresContext = false for greeting`);
        }
      }
    },
    {
      query: 'shltr in xyzabc',
      check: (data) => {
        if (!data.message.includes('xyzabc') || !data.message.includes('couldn\'t identify the location')) {
          throw new Error(`Expected location clarification message, got:\n${data.message}`);
        }
        // Must NOT return shelters from GPS
        if (data.nearestShelter !== null && data.nearestShelter !== undefined) {
          throw new Error(`Expected no nearestShelter on unrecognized location, got: ${data.nearestShelter.name}`);
        }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of endpointCases) {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tc.query,
          latitude: citizenLat,
          longitude: citizenLng,
          language: 'en'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      tc.check(data);

      console.log(`[API OK] Query: "${tc.query}"`);
      console.log(`   Corrected: "${data.correctedQuery}" | Intent: ${data.intent}`);
      console.log(`   Message Preview: "${data.message.slice(0, 100).replace(/\n/g, ' ')}..."`);
      console.log('   [VERIFIED] Query correction and behavioral rules satisfied.\n');
      passed++;
    } catch (err) {
      console.error(`[API FAIL] Query: "${tc.query}":`, err.message, '\n');
      failed++;
    }
  }

  console.log(`Endpoint Tests Summary: ${passed}/${endpointCases.length} Passed, ${failed} Failed\n`);
  return failed === 0;
}

async function main() {
  const unitOk = await runUnitTests();
  const apiOk = await runLiveEndpointTests();

  if (unitOk && apiOk) {
    console.log('================================================================');
    console.log('ALL UNIVERSAL SPELLING & TYPO CORRECTION TESTS PASSED!');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error('Some tests failed!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
