/**
 * Verification Test for SAHAY AI Disaster Copilot
 * Tests the 12 specific inputs requested by the user:
 * 1. Hi
 * 2. Hello
 * 3. What can you do?
 * 4. Thanks
 * 5. Is there a flood alert?
 * 6. Will it rain today?
 * 7. Where is the nearest shelter?
 * 8. Is my area at risk?
 * 9. What should I do during a landslide?
 * 10. Water is entering my house
 * 11. I am trapped inside my house
 * 12. My house was damaged by flood
 */

const { classifyEmergencyIntent } = require('../services/ai.service');

const TEST_CASES = [
  {
    input: 'Hi',
    expectedIntent: 'GREETING',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    input: 'Hello',
    expectedIntent: 'GREETING',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    input: 'What can you do?',
    expectedIntent: 'CAPABILITY_QUERY',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    input: 'Thanks',
    expectedIntent: 'CASUAL_CONVERSATION',
    expectedSeverity: 'NONE',
    expectedRequiresContext: false
  },
  {
    input: 'Is there a flood alert?',
    expectedIntent: 'DISASTER_ALERT_QUERY',
    expectedSeverity: 'LOW',
    expectedRequiresContext: true
  },
  {
    input: 'Will it rain today?',
    expectedIntent: 'WEATHER_QUERY',
    expectedSeverity: 'LOW',
    expectedRequiresContext: true
  },
  {
    input: 'Where is the nearest shelter?',
    expectedIntent: 'SHELTER_QUERY',
    expectedSeverity: 'LOW',
    expectedRequiresContext: true
  },
  {
    input: 'Is my area at risk?',
    expectedIntent: 'RISK_QUERY',
    expectedSeverity: 'LOW',
    expectedRequiresContext: true
  },
  {
    input: 'What should I do during a landslide?',
    expectedIntent: 'SAFETY_GUIDANCE',
    expectedSeverity: 'LOW',
    expectedRequiresContext: true
  },
  {
    input: 'Water is entering my house',
    expectedIntent: 'FLOOD',
    expectedSeverity: 'HIGH',
    expectedRequiresContext: true
  },
  {
    input: 'I am trapped inside my house',
    expectedIntent: 'SOS',
    expectedSeverity: 'CRITICAL',
    expectedRequiresContext: true,
    expectedRequiresSOS: true
  },
  {
    input: 'My house was damaged by flood',
    expectedIntent: 'BUILDING_DAMAGE',
    expectedSeverity: 'MEDIUM',
    expectedRequiresContext: true
  }
];

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING UNIT & ENDPOINT TESTS FOR 12 REQUIRED CITIZEN INPUTS');
  console.log('================================================================\n');

  let classifierPassed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const classification = classifyEmergencyIntent(tc.input);

    const intentMatch = classification.intent === tc.expectedIntent;
    const severityMatch = classification.severity === tc.expectedSeverity;
    const contextMatch = classification.requiresContext === tc.expectedRequiresContext;
    const sosMatch = tc.expectedRequiresSOS ? classification.requiresSOS === true : true;

    const allPassed = intentMatch && severityMatch && contextMatch && sosMatch;
    if (allPassed) {
      classifierPassed++;
      console.log(`[PASS] Test ${i + 1}: "${tc.input}"`);
      console.log(`       -> Intent: ${classification.intent} | Severity: ${classification.severity} | RequiresContext: ${classification.requiresContext}`);
    } else {
      console.error(`[FAIL] Test ${i + 1}: "${tc.input}"`);
      console.error(`       Expected: Intent=${tc.expectedIntent}, Severity=${tc.expectedSeverity}, RequiresContext=${tc.expectedRequiresContext}`);
      console.error(`       Got:      Intent=${classification.intent}, Severity=${classification.severity}, RequiresContext=${classification.requiresContext}`);
    }
  }

  console.log(`\nClassification Summary: ${classifierPassed}/${TEST_CASES.length} Passed`);

  // Now test live chat endpoint at http://localhost:5000/api/ai/chat
  console.log('\n----------------------------------------------------------------');
  console.log('TESTING LIVE /api/ai/chat ENDPOINT RESPONSES');
  console.log('----------------------------------------------------------------\n');

  try {
    for (let i = 0; i < TEST_CASES.length; i++) {
      const tc = TEST_CASES[i];
      const res = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tc.input,
          latitude: 9.5916,
          longitude: 76.5222,
          language: 'en'
        })
      });

      if (!res.ok) {
        console.error(`[ENDPOINT FAIL] ${tc.input} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      console.log(`\n[ENDPOINT OK] Query: "${tc.input}"`);
      console.log(`   Intent: ${data.intent} | Severity: ${data.severity} | RequiresContext: ${data.requiresContext}`);
      console.log(`   ShowShelter: ${data.showShelterButton} | ShowSOS: ${data.showSOSButton} | ShowRelief: ${data.showReliefButton}`);
      console.log(`   First 120 chars: "${(data.message || '').replace(/\n/g, ' ').slice(0, 120)}..."`);

      // Verify that greetings/casual queries do not return shelters
      if (!tc.expectedRequiresContext && (data.nearestShelter || data.showShelterButton)) {
        console.error(`   [WARNING] Unwarranted shelter returned for non-context query!`);
      }
    }
  } catch (netErr) {
    console.warn('Endpoint test note (backend server might not be running on :5000):', netErr.message);
  }

  console.log('\n================================================================');
  console.log('ALL 12 TESTS COMPLETED');
  console.log('================================================================\n');

  if (classifierPassed === TEST_CASES.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
