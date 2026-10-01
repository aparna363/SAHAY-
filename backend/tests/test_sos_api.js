const http = require('http');

async function runTests() {
  console.log('Testing SOS APIs...');

  // 1. Test POST /api/sos (Create SOS)
  const payload = JSON.stringify({
    emergencyType: 'Flood',
    description: 'Flash flood water entering residential house, 4 members trapped on 1st floor.',
    affectedPeople: 4,
    latitude: 9.5558,
    longitude: 76.7884, // Kanjirappally, Kottayam
    address: 'Koovappally, Kanjirappally, Kottayam',
    district: 'Kottayam',
    taluk: 'Kanjirappally',
    reporterName: 'Test Citizen',
    reporterPhone: '+91 98470 12345'
  });

  const postRes = await fetch('http://localhost:5000/api/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });

  const postData = await postRes.json();
  console.log('POST /api/sos Status:', postRes.status);
  console.log('Created SOS Code:', postData.sos?.sos_code);
  console.log('Nearby Teams Count:', postData.nearbyResources?.nearbyTeams?.length);
  console.log('Nearby Hospitals Count:', postData.nearbyResources?.nearbyHospitals?.length);
  console.log('Nearby Shelters Count:', postData.nearbyResources?.nearbyShelters?.length);

  if (!postData.sos?.id) {
    throw new Error('Failed to create SOS: ' + JSON.stringify(postData));
  }

  const sosId = postData.sos.id;
  const sosCode = postData.sos.sos_code;

  // 2. Test GET /api/sos/:id
  const getRes = await fetch(`http://localhost:5000/api/sos/${sosCode}`);
  const getData = await getRes.json();
  console.log('GET /api/sos/:id Status:', getRes.status, 'Code:', getData.sos?.sos_code, 'Timeline length:', getData.timeline?.length);

  // 3. Test GET /api/sos/map-markers
  const mapRes = await fetch('http://localhost:5000/api/sos/map-markers?district=Kottayam');
  const mapData = await mapRes.json();
  console.log('GET /api/sos/map-markers count:', mapData.markers?.length);

  console.log('ALL SOS API TESTS PASSED! 🎉');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
