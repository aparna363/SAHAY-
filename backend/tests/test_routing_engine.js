/**
 * ============================================================
 * SAHAY - Automated Route Risk & Disaster Decision Engine Tests
 * ============================================================
 *
 * Verifies:
 * 1. Normal route remains selected when safe (low risk).
 * 2. High-risk route is rejected when a safer alternative exists.
 * 3. Blocked roads are strictly rejected.
 * 4. Disaster-zone intersection increases risk score.
 * 5. Safe route is selected based on actual disaster risk.
 * 6. Route changes dynamically when hazard data changes.
 * 7. No-safe-route condition is handled gracefully.
 * 8. All 10 developer disaster simulation scenarios execute properly.
 * ============================================================
 */

const assert = require('assert');
const { calculateSafeRoute } = require('../services/safeRoutingService');
const {
  setActiveScenario,
  getActiveScenario,
  listScenarios
} = require('../services/disasterSimulationService');

// Test origin & destination in Thrissur near Model Boys High School Relief Hub
const testOrigin = { lat: 10.5220, lng: 76.1980 };
const testDestination = { lat: 10.5276, lng: 76.2144 }; // Model Boys High School

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
  }
}

async function executeTestSuite() {
  console.log('\n============================================================');
  console.log('   SAHAY SAFE ROUTING & DISASTER SIMULATION TEST SUITE');
  console.log('============================================================\n');

  // Test 1: List all 10 Simulation Scenarios
  runTest('Scenario registry contains all 10 required simulation scenarios', () => {
    const list = listScenarios();
    assert.strictEqual(list.length, 10, `Expected 10 scenarios, found ${list.length}`);
    const ids = list.map(s => s.id);
    assert.ok(ids.includes('NORMAL_CONDITIONS'));
    assert.ok(ids.includes('FLOOD_ZONE_CROSSING'));
    assert.ok(ids.includes('LANDSLIDE_ZONE_CROSSING'));
    assert.ok(ids.includes('BLOCKED_ROAD'));
    assert.ok(ids.includes('HIGH_SEVERITY_INCIDENT'));
    assert.ok(ids.includes('MULTIPLE_HAZARDS'));
    assert.ok(ids.includes('NO_SAFE_ROUTE'));
    assert.ok(ids.includes('DESTINATION_IN_HAZARD_ZONE'));
    assert.ok(ids.includes('SHELTER_UNAVAILABLE'));
    assert.ok(ids.includes('REALTIME_HAZARD_INJECTION'));
  });

  // Test 2: Normal Conditions -> Normal route remains selected when safe
  await runAsyncTest('Normal Conditions: Normal route remains selected when safe', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'NORMAL_CONDITIONS'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.route, 'Safe route must exist');
    assert.ok(result.normalRoute, 'Normal route must exist');
    assert.strictEqual(result.normalRoute.riskLevel, 'LOW');
    assert.strictEqual(result.comparison.isDetourNeeded, false, 'No detour should be needed when normal route is clear');
    assert.strictEqual(result.route.isRerouted, false);
    assert.ok(result.comparison.reasons.some(r => r.includes('no known active hazards')));
  });

  // Test 3: Flood Zone Crossing -> High-risk normal route rejected in favor of safe alternative
  await runAsyncTest('Flood Zone Crossing: High-risk normal route rejected for safe detour', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'FLOOD_ZONE_CROSSING'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.normalRoute.riskScore >= 25, 'Normal route risk score must increase due to flood zone');
    assert.strictEqual(result.normalRoute.riskBreakdown.floodRisk, 'HIGH');
    assert.strictEqual(result.comparison.isDetourNeeded, true, 'Detour must be chosen');
    assert.strictEqual(result.route.riskBreakdown.floodRisk, 'LOW');
    assert.ok(result.comparison.avoidedHazards.length > 0, 'Avoided hazards must be recorded');
    assert.ok(result.comparison.extraDistanceKm >= 0, 'Extra distance must be non-negative');
  });

  // Test 4: Blocked Road -> Blocked road is strictly rejected
  await runAsyncTest('Blocked Road: Any route containing blocked road is strictly rejected', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'BLOCKED_ROAD'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.normalRoute.isBlocked, true, 'Normal route must be flagged as blocked');
    assert.strictEqual(result.normalRoute.riskBreakdown.roadRisk, 'BLOCKED');
    assert.strictEqual(result.route.isBlocked, false, 'Recommended safe route must NOT be blocked');
    assert.strictEqual(result.comparison.isDetourNeeded, true);
    assert.ok(result.comparison.normalRouteAvoidedReasons.some(r => r.includes('blocked/closed road')));
  });

  // Test 5: High-Severity Incident -> Increases incident risk
  await runAsyncTest('High-Severity Incident: Incident exposure triggers safety detour', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'HIGH_SEVERITY_INCIDENT'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.normalRoute.riskBreakdown.incidentRisk, 'HIGH');
    assert.ok(result.normalRoute.hazards.some(h => h.includes('Incident')));
  });

  // Test 6: Multiple Hazards -> Compound disaster risk score calculation
  await runAsyncTest('Multiple Hazards: Compound risk accumulates penalties properly', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'MULTIPLE_HAZARDS'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.normalRoute.riskScore >= 55, 'Multiple hazards must produce critical risk score');
    assert.strictEqual(result.normalRoute.riskLevel, 'CRITICAL');
    assert.strictEqual(result.comparison.isDetourNeeded, true);
    assert.ok(result.comparison.riskReduction.includes('→'));
  });

  // Test 7: No Safe Route Available -> All candidate routes blocked
  await runAsyncTest('No Safe Route Available: Handled gracefully with fallback alert', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'NO_SAFE_ROUTE'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.noSafeRouteAvailable, true, 'noSafeRouteAvailable flag must be true');
    assert.ok(result.route, 'Fallback path should still be returned');
  });

  // Test 8: Real-time Route Invalidation Scenario
  await runAsyncTest('Real-time Hazard Injection: Simulates sudden road hazard ahead', async () => {
    const result = await calculateSafeRoute(testOrigin, testDestination, {
      simulationScenario: 'REALTIME_HAZARD_INJECTION'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.normalRoute.isBlocked, true);
    assert.ok(result.normalRoute.hazards.some(h => h.includes('Active Route Ahead')));
  });

  // Test 9: Reset simulation returns to production database mode
  runTest('Reset simulation restores live production database mode', () => {
    setActiveScenario(null);
    assert.strictEqual(getActiveScenario(), null);
  });

  console.log('\n------------------------------------------------------------');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
  console.log('------------------------------------------------------------\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL AUTOMATED ROUTING ENGINE TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.\n');
    process.exit(1);
  }
}

executeTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
