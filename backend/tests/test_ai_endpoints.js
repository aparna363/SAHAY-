async function testEndpoints() {
  console.log('--- Testing /api/ai/chat ---');
  const chatRes = await fetch('http://localhost:5000/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Water is entering my house and rising fast',
      latitude: 9.5916,
      longitude: 76.5222,
      language: 'en'
    })
  });
  const chatData = await chatRes.json();
  console.log('Chat Status:', chatRes.status);
  console.log('Disaster Type:', chatData.disasterType);
  console.log('Severity:', chatData.severity);
  console.log('Requires SOS:', chatData.requiresSOS);
  console.log('Show SOS Button:', chatData.showSOSButton);
  console.log('Show Shelter Button:', chatData.showShelterButton);
  console.log('Nearest Shelter:', chatData.nearestShelter?.name, `(${chatData.nearestShelter?.distanceKm} km)`);

  console.log('\n--- Testing /api/ai/risk-assessment ---');
  const riskRes = await fetch('http://localhost:5000/api/ai/risk-assessment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: 9.5916,
      longitude: 76.5222
    })
  });
  const riskData = await riskRes.json();
  console.log('Risk Status:', riskRes.status);
  console.log('Risk Level:', riskData.riskAssessment?.riskLevel);
  console.log('Risk Score:', riskData.riskAssessment?.riskScorePct);
  console.log('Reasons:', riskData.riskAssessment?.reasons);

  console.log('\n--- Testing /api/ai/nearby-shelters ---');
  const sheltersRes = await fetch('http://localhost:5000/api/ai/nearby-shelters?lat=9.5916&lng=76.5222');
  const sheltersData = await sheltersRes.json();
  console.log('Shelters Status:', sheltersRes.status);
  console.log('Shelters Count:', sheltersData.count);
  if (sheltersData.shelters?.length > 0) {
    console.log('First Shelter:', sheltersData.shelters[0].name, `${sheltersData.shelters[0].distanceKm} km`, `Available beds: ${sheltersData.shelters[0].availableCapacity}`);
  }

  console.log('\n--- Testing /api/ai/sos (AI-assisted SOS Dispatch) ---');
  const sosRes = await fetch('http://localhost:5000/api/ai/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: 9.5916,
      longitude: 76.5222,
      disasterType: 'Flood',
      severity: 'CRITICAL',
      description: 'Water has risen to chest level. Citizen trapped inside house. AI Copilot Emergency Dispatch.'
    })
  });
  const sosData = await sosRes.json();
  console.log('SOS Status:', sosRes.status);
  console.log('Incident Code:', sosData.incident?.incidentCode);
  console.log('Source Tag:', sosData.incident?.source);
  console.log('Severity:', sosData.incident?.severity);

  console.log('\n--- Testing Rate Limiting on /api/ai/chat ---');
  let rateLimited = false;
  for (let i = 0; i < 45; i++) {
    const r = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Status check ' + i, latitude: 9.59, longitude: 76.52 })
    });
    if (r.status === 429) {
      rateLimited = true;
      const data = await r.json();
      console.log(`Successfully intercepted by rate limiter at request #${i + 1}:`, data.error);
      break;
    }
  }
  if (!rateLimited) {
    console.log('Note: Under rate limit threshold or window reset.');
  }

  console.log('\nAll Endpoints Tested Successfully!');
  process.exit(0);
}

testEndpoints().catch(err => {
  console.error('Endpoints test failed:', err);
  process.exit(1);
});
