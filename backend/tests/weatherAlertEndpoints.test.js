const { fetchAlertsForDistrict } = require('../services/officialWeatherAlertFetcher');

async function runEndpointTests() {
  console.log('🧪 Testing Weather Alert Fetcher Engine...');
  try {
    const res = await fetchAlertsForDistrict('Ernakulam');
    console.log('  ✓ District fetch result:', {
      district: res.district,
      highestSeverity: res.highestSeverity,
      fetchStatus: res.fetchStatus,
      lastSuccessfulFetch: res.lastSuccessfulFetch,
      activeAlertsCount: res.activeAlerts.length,
      sourceName: res.sourceName,
      sourceType: res.sourceType
    });
    console.log('✅ Weather Alert Fetcher Engine verified!');
  } catch (err) {
    console.error('❌ Weather Alert Engine test failed:', err.message);
    process.exit(1);
  }
}

runEndpointTests();
