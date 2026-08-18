const assert = require('assert');
const { mapSeverityLevel, getHighestSeverityLevel } = require('../utils/severityMapper');

console.log('🧪 Running Severity Mapper Unit Tests...');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

// 1. Official IMD Category Tests
test('IMD Red Warning maps to RED', () => {
  assert.strictEqual(mapSeverityLevel('Red Warning'), 'RED');
  assert.strictEqual(mapSeverityLevel('Extreme'), 'RED');
});

test('IMD Orange Warning maps to ORANGE', () => {
  assert.strictEqual(mapSeverityLevel('Orange Warning'), 'ORANGE');
  assert.strictEqual(mapSeverityLevel('Moderate Warning'), 'ORANGE');
});

test('IMD Yellow Advisory maps to YELLOW', () => {
  assert.strictEqual(mapSeverityLevel('Yellow Advisory'), 'YELLOW');
  assert.strictEqual(mapSeverityLevel('Minor'), 'YELLOW');
});

test('IMD Nil / Green maps to GREEN', () => {
  assert.strictEqual(mapSeverityLevel('Nil'), 'GREEN');
  assert.strictEqual(mapSeverityLevel('Green'), 'GREEN');
  assert.strictEqual(mapSeverityLevel('None'), 'GREEN');
});

// 2. OpenWeatherMap & CAP Feed Tests
test('CAP Extreme maps to RED', () => {
  assert.strictEqual(mapSeverityLevel({ severity: 'Extreme', event: 'Flash Flood Warning' }), 'RED');
});

test('CAP Moderate maps to ORANGE', () => {
  assert.strictEqual(mapSeverityLevel({ severity: 'Moderate', event: 'Heavy Rain Watch' }), 'ORANGE');
});

test('CAP Minor / Advisory maps to YELLOW', () => {
  assert.strictEqual(mapSeverityLevel({ severity: 'Minor', event: 'Coastal Wind Advisory' }), 'YELLOW');
});

// 3. Custom DB Mappings Override Test
test('Custom DB Mappings override default rule', () => {
  const custom = [{ source_category: 'Special Advisory', mapped_level: 'ORANGE', is_active: true }];
  assert.strictEqual(mapSeverityLevel('Special Advisory', custom), 'ORANGE');
});

// 4. Highest Severity Computation Test
test('getHighestSeverityLevel selects highest level among multiple simultaneous alerts', () => {
  const alerts = [
    { mapped_severity: 'YELLOW', title: 'Wind Advisory' },
    { mapped_severity: 'RED', title: 'Torrential Downpour Warning' },
    { mapped_severity: 'ORANGE', title: 'Flood Alert' }
  ];
  assert.strictEqual(getHighestSeverityLevel(alerts), 'RED');
});

test('getHighestSeverityLevel returns GREEN when alert list is empty', () => {
  assert.strictEqual(getHighestSeverityLevel([]), 'GREEN');
});

console.log(`\n✅ ${passed}/${total} Severity Mapper Unit Tests Passed Successfully!\n`);

if (passed !== total) {
  process.exit(1);
}
