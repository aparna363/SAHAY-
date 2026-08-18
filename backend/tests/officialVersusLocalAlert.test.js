const { getCurrentAlert, getAllKeralaAlerts } = require('../services/alertService');
const pool = require('../db');

async function runTests() {
  console.log('🧪 Starting Official vs Local Weather Alert System Tests...\n');

  try {
    // ----------------------------------------------------
    // TEST 1: 16 August 2026 / Today with NO official warning in DB
    // Must produce Official Alert = GREEN and NOT RED
    // ----------------------------------------------------
    console.log('Test 1: No official warning in DB (16 August 2026 scenario)...');
    
    // Clear any test records in disaster_alerts
    await pool.query("DELETE FROM disaster_alerts WHERE district IN ('Malappuram', 'Idukki', 'Wayanad', 'Ernakulam', 'TestDistrict')");

    // Weather with high precipitation (e.g. 85%) from Open-Meteo
    const highRainTelemetry = {
      temperature: 28,
      humidity: 81,
      windSpeed: 9.4,
      rainProbability: 85,
      weatherCode: 63,
      condition: 'Dense Drizzle'
    };

    const result1 = await getCurrentAlert('Malappuram', highRainTelemetry);

    console.log('  [SAHAY TEST 1 Output]');
    console.log('  Official Alert Level:', result1.officialAlert.alertLevel);
    console.log('  Top-Level Alert Level:', result1.alertLevel);
    console.log('  Local Risk Level:', result1.localRisk.level);
    console.log('  Local Risk Reason:', result1.localRisk.reason);

    if (result1.officialAlert.alertLevel !== 'GREEN' || result1.alertLevel !== 'GREEN') {
      throw new Error(`TEST 1 FAILED! Expected official alert GREEN, but got ${result1.officialAlert.alertLevel}`);
    }

    if (result1.localRisk.level !== 'CRITICAL') {
      throw new Error(`TEST 1 FAILED! Expected local risk CRITICAL due to 85% rain telemetry, but got ${result1.localRisk.level}`);
    }

    console.log('  ✅ TEST 1 PASSED: Official alert is GREEN while local risk is CRITICAL (strictly separated).\n');

    // ----------------------------------------------------
    // TEST 2: Active Official RED warning in DB
    // ----------------------------------------------------
    console.log('Test 2: Active Official RED Warning inserted in DB...');
    await pool.query(`
      INSERT INTO disaster_alerts (district, alert_level, alert_type, description, source, start_time, end_time)
      VALUES ('Malappuram', 'RED', 'Heavy Rainfall Warning', 'IMD Red Warning for Malappuram', 'IMD Official', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '24 hours')
    `);

    const result2 = await getCurrentAlert('Malappuram', { temperature: 28, rainProbability: 20 });
    console.log('  Official Alert Level:', result2.officialAlert.alertLevel);
    console.log('  Official Alert Type:', result2.officialAlert.alertType);

    if (result2.officialAlert.alertLevel !== 'RED' || result2.alertLevel !== 'RED') {
      throw new Error(`TEST 2 FAILED! Expected RED official alert, but got ${result2.officialAlert.alertLevel}`);
    }
    console.log('  ✅ TEST 2 PASSED: Official RED alert returned correctly.\n');

    // ----------------------------------------------------
    // TEST 3: Active Official ORANGE warning in DB
    // ----------------------------------------------------
    console.log('Test 3: Active Official ORANGE Warning inserted in DB...');
    await pool.query("DELETE FROM disaster_alerts WHERE district = 'Malappuram'");
    await pool.query(`
      INSERT INTO disaster_alerts (district, alert_level, alert_type, description, source, start_time, end_time)
      VALUES ('Malappuram', 'ORANGE', 'High Winds Advisory', 'KSDMA Orange Alert', 'KSDMA', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '12 hours')
    `);

    const result3 = await getCurrentAlert('Malappuram', { temperature: 30, rainProbability: 40 });
    if (result3.officialAlert.alertLevel !== 'ORANGE' || result3.alertLevel !== 'ORANGE') {
      throw new Error(`TEST 3 FAILED! Expected ORANGE official alert, but got ${result3.officialAlert.alertLevel}`);
    }
    console.log('  ✅ TEST 3 PASSED: Official ORANGE alert returned correctly.\n');

    // ----------------------------------------------------
    // TEST 4: Active Official YELLOW warning in DB
    // ----------------------------------------------------
    console.log('Test 4: Active Official YELLOW Warning inserted in DB...');
    await pool.query("DELETE FROM disaster_alerts WHERE district = 'Malappuram'");
    await pool.query(`
      INSERT INTO disaster_alerts (district, alert_level, alert_type, description, source, start_time, end_time)
      VALUES ('Malappuram', 'YELLOW', 'Moderate Showers', 'IMD Yellow Watch', 'IMD', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '6 hours')
    `);

    const result4 = await getCurrentAlert('Malappuram', { temperature: 29, rainProbability: 30 });
    if (result4.officialAlert.alertLevel !== 'YELLOW' || result4.alertLevel !== 'YELLOW') {
      throw new Error(`TEST 4 FAILED! Expected YELLOW official alert, but got ${result4.officialAlert.alertLevel}`);
    }
    console.log('  ✅ TEST 4 PASSED: Official YELLOW alert returned correctly.\n');

    // ----------------------------------------------------
    // TEST 5: Expired Warning in DB (should be ignored)
    // ----------------------------------------------------
    console.log('Test 5: Expired RED Warning in DB (ended yesterday)...');
    await pool.query("DELETE FROM disaster_alerts WHERE district = 'Malappuram'");
    await pool.query(`
      INSERT INTO disaster_alerts (district, alert_level, alert_type, description, source, start_time, end_time)
      VALUES ('Malappuram', 'RED', 'Expired Flood Warning', 'Old RED alert from yesterday', 'IMD', NOW() - INTERVAL '48 hours', NOW() - INTERVAL '2 hours')
    `);

    const result5 = await getCurrentAlert('Malappuram', highRainTelemetry);
    if (result5.officialAlert.alertLevel !== 'GREEN' || result5.alertLevel !== 'GREEN') {
      throw new Error(`TEST 5 FAILED! Expired RED alert was returned! Expected GREEN, got ${result5.officialAlert.alertLevel}`);
    }
    console.log('  ✅ TEST 5 PASSED: Expired RED alert safely ignored, official level returned GREEN.\n');

    // Clean up test records
    await pool.query("DELETE FROM disaster_alerts WHERE district = 'Malappuram'");

    console.log('🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
