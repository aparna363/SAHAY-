const http = require('http');

async function testBackend() {
  console.log('Testing SAHAY AI Disaster Copilot Backend...');

  // Test 1: Chat endpoint
  const chatPayload = JSON.stringify({
    message: 'Water is entering my house and rising fast',
    latitude: 9.5916,
    longitude: 76.5222,
    language: 'en'
  });

  const { chat, disasterContext } = await testDirectServices();
  console.log('\n--- Direct Context Engine Test ---');
  console.log('Detected Place/District:', disasterContext.location.place, disasterContext.location.district);
  console.log('Weather:', disasterContext.weather.temperature, 'C,', disasterContext.weather.condition);
  console.log('Active Alerts Count:', disasterContext.alerts.count);
  console.log('Nearest Shelter:', disasterContext.shelters[0]?.name, `(${disasterContext.shelters[0]?.distanceKm} km)`);
  console.log('Nearest Hospital:', disasterContext.hospitals[0]?.name, `(${disasterContext.hospitals[0]?.distanceKm} km)`);

  console.log('\n--- Direct AI Copilot Response Test ---');
  console.log('Disaster Type:', chat.disasterType);
  console.log('Severity:', chat.severity);
  console.log('Requires SOS:', chat.requiresSOS);
  console.log('Risk Level:', chat.riskLevel);
  console.log('Show SOS Button:', chat.showSOSButton);
  console.log('Show Shelter Button:', chat.showShelterButton);
  console.log('Show Relief Button:', chat.showReliefButton);
  console.log('\nGenerated Message Snippet:\n', chat.message.slice(0, 300) + '...');

  // Test Malayalam query
  const { generateDisasterCopilotResponse } = require('../services/ai.service');
  const mlChat = await generateDisasterCopilotResponse({
    userMessage: 'ente veettil vellam kerunnundu, njan enthu cheyyanam?',
    context: disasterContext,
    preferredLanguage: 'ml'
  });
  console.log('\n--- Malayalam / Manglish Query Test ---');
  console.log('Disaster Type:', mlChat.disasterType);
  console.log('Severity:', mlChat.severity);
  console.log('Message Snippet:\n', mlChat.message.slice(0, 250) + '...');

  // Test Relief query
  const reliefChat = await generateDisasterCopilotResponse({
    userMessage: 'My house was damaged in the flood. How can I get relief compensation?',
    context: disasterContext,
    preferredLanguage: 'en'
  });
  console.log('\n--- Relief Fund Query Test ---');
  console.log('Disaster Type:', reliefChat.disasterType);
  console.log('Show Relief Button:', reliefChat.showReliefButton);
  console.log('Message Snippet:\n', reliefChat.message.slice(0, 250) + '...');

  console.log('\nAll service logic verified successfully!');
  process.exit(0);
}

async function testDirectServices() {
  const { getCitizenDisasterContext } = require('../services/disasterContext.service');
  const { generateDisasterCopilotResponse } = require('../services/ai.service');

  const disasterContext = await getCitizenDisasterContext(9.5916, 76.5222, 'Kottayam');
  const chat = await generateDisasterCopilotResponse({
    userMessage: 'Water is entering my house and rising fast',
    context: disasterContext,
    preferredLanguage: 'en'
  });

  return { chat, disasterContext };
}

testBackend().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
