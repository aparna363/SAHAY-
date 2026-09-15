/**
 * SAHAY AI Disaster Copilot Controller
 */

const pool = require('../db');
const { getCitizenDisasterContext } = require('../services/disasterContext.service');
const {
  classifyEmergencyIntent,
  getContextOptionsForIntent,
  generateConversationalResponse,
  generateDisasterCopilotResponse
} = require('../services/ai.service');
const { calculateContextualRisk } = require('../services/mlRiskService');
const { generateIncidentCode } = require('../utils/incidentCode');

/**
 * POST /api/ai/chat
 * Primary conversation endpoint for Citizen Copilot
 */
async function chat(req, res) {
  try {
    const { message, latitude, longitude, sessionId, language = 'en' } = req.body;
    const userId = req.user?.id || null;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and cannot be empty.'
      });
    }

    if (message.length > 1500) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds maximum allowed length of 1500 characters.'
      });
    }

    const trimmedMessage = message.trim();
    const preferredDistrict = req.user?.district || null;

    // 1. Classify Intent FIRST
    const classification = classifyEmergencyIntent(trimmedMessage, language);

    let aiResponse;

    // 2. Gate Context Retrieval: Skip spatial/telemetry queries for greetings & casual chats
    if (!classification.requiresContext) {
      const directMessage = generateConversationalResponse(classification, language);
      aiResponse = {
        intent: classification.intent,
        disasterType: classification.disasterType,
        severity: classification.severity, // 'NONE'
        requiresContext: false,
        requiresSOS: false,
        locationContext: classification.locationContext || null,
        requestedDistrict: classification.locationContext?.requestedDistrict || null,
        requestedPlace: classification.locationContext?.requestedPlace || null,
        locationSource: classification.locationContext?.locationSource || 'NONE',
        locationConfidence: classification.locationContext?.locationConfidence || 'UNKNOWN',
        originalQuery: classification.originalQuery || trimmedMessage,
        correctedQuery: classification.correctedQuery || trimmedMessage,
        corrections: classification.corrections || [],
        correctionConfidence: classification.correctionConfidence || 'HIGH',
        message: directMessage,
        riskLevel: 'Low',
        nearestShelter: null,
        nearestHospital: null,
        showShelterButton: false,
        showSOSButton: false,
        showReliefButton: false,
        language,
        generatedAt: new Date().toISOString()
      };
    } else {
      // 3. Selective context retrieval based on specific intent and location context
      const contextOptions = getContextOptionsForIntent(classification.intent, classification.locationContext);
      const context = await getCitizenDisasterContext(latitude, longitude, preferredDistrict, contextOptions);

      aiResponse = await generateDisasterCopilotResponse({
        userMessage: trimmedMessage,
        context,
        classification,
        preferredLanguage: language
      });
    }

    // 3. Persist Conversation & Messages if DB accessible
    let conversationId = null;
    const activeSessionId = sessionId || `sess_${userId || 'guest'}_${Date.now()}`;

    try {
      // Find or create conversation
      const convRes = await pool.query(
        `SELECT id FROM ai_conversations WHERE session_id = $1 LIMIT 1`,
        [activeSessionId]
      );

      if (convRes.rows.length > 0) {
        conversationId = convRes.rows[0].id;
        await pool.query(
          `UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [conversationId]
        );
      } else {
        const titleSnippet = message.slice(0, 40);
        const newConv = await pool.query(
          `INSERT INTO ai_conversations (user_id, session_id, language, title)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [userId, activeSessionId, language, titleSnippet]
        );
        conversationId = newConv.rows[0].id;
      }

      // Store User Message (Keep raw citizen message in content; audit correction trail in metadata)
      await pool.query(
        `INSERT INTO ai_messages (conversation_id, role, content, disaster_type, severity, requires_sos, metadata)
         VALUES ($1, 'user', $2, $3, $4, $5, $6)`,
        [
          conversationId,
          trimmedMessage,
          aiResponse.disasterType,
          aiResponse.severity,
          aiResponse.requiresSOS,
          JSON.stringify({
            latitude,
            longitude,
            originalQuery: trimmedMessage,
            correctedQuery: classification.correctedQuery || trimmedMessage,
            corrections: classification.corrections || [],
            correctionConfidence: classification.correctionConfidence || 'HIGH',
            detectedIntent: classification.intent
          })
        ]
      );

      // Store Assistant Response
      await pool.query(
        `INSERT INTO ai_messages (conversation_id, role, content, disaster_type, severity, requires_sos, metadata)
         VALUES ($1, 'assistant', $2, $3, $4, $5, $6)`,
        [conversationId, aiResponse.message, aiResponse.disasterType, aiResponse.severity, aiResponse.requiresSOS, JSON.stringify(aiResponse)]
      );
    } catch (dbErr) {
      console.warn('[AI Controller] DB message recording note:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      sessionId: activeSessionId,
      conversationId,
      originalQuery: classification.originalQuery || trimmedMessage,
      correctedQuery: classification.correctedQuery || trimmedMessage,
      corrections: classification.corrections || [],
      correctionConfidence: classification.correctionConfidence || 'HIGH',
      ...aiResponse
    });
  } catch (err) {
    console.error('[AI Controller] Chat error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to connect to SAHAY AI right now. Official emergency services (112, 1077) remain fully active.',
      emergencyContacts: {
        police: '112',
        districtControlRoom: '1077',
        ambulance: '108',
        fire: '101'
      }
    });
  }
}

/**
 * POST /api/ai/risk-assessment
 * Returns detailed risk assessment for citizen's location
 */
async function getRiskAssessment(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const preferredDistrict = req.user?.district || null;

    const context = await getCitizenDisasterContext(latitude, longitude, preferredDistrict);
    const risk = calculateContextualRisk(context);

    return res.status(200).json({
      success: true,
      location: context.location,
      riskAssessment: risk,
      activeAlerts: context.alerts,
      hazards: context.hazards,
      roadHazards: context.roadHazards
    });
  } catch (err) {
    console.error('[AI Controller] Risk assessment error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute risk assessment: ' + err.message
    });
  }
}

/**
 * GET /api/ai/nearby-shelters
 * Returns PostGIS proximity-sorted shelters
 */
async function getNearbyShelters(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const district = req.query.district ? req.query.district.trim() : null;

    const effectiveLat = !isNaN(lat) ? lat : 11.605;
    const effectiveLng = !isNaN(lng) ? lng : 76.083;

    let result;
    if (district) {
      result = await pool.query(`
        SELECT 
          id, 
          name, 
          district, 
          address, 
          latitude, 
          longitude, 
          capacity, 
          available_capacity AS "availableCapacity", 
          contact_number AS "contactNumber",
          ROUND(ST_Distance(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )) AS distance_meters
        FROM shelters
        WHERE (LOWER(district) = LOWER($3) OR LOWER(address) LIKE LOWER('%' || $3 || '%'))
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY available_capacity DESC, distance_meters ASC
        LIMIT 10
      `, [effectiveLng, effectiveLat, district]);
    } else {
      result = await pool.query(`
        SELECT 
          id, 
          name, 
          district, 
          address, 
          latitude, 
          longitude, 
          capacity, 
          available_capacity AS "availableCapacity", 
          contact_number AS "contactNumber",
          ROUND(ST_Distance(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )) AS distance_meters
        FROM shelters
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY distance_meters ASC
        LIMIT 10
      `, [effectiveLng, effectiveLat]);
    }

    const shelters = result.rows.map(s => {
      const distMeters = parseInt(s.distance_meters, 10) || 0;
      return {
        id: s.id,
        name: s.name,
        district: s.district,
        address: s.address,
        latitude: parseFloat(s.latitude),
        longitude: parseFloat(s.longitude),
        capacity: s.capacity,
        availableCapacity: s.availableCapacity,
        contactNumber: s.contactNumber,
        distanceMeters: distMeters,
        distanceKm: parseFloat((distMeters / 1000).toFixed(1)),
        status: (s.availableCapacity && s.availableCapacity > 0) ? 'Available' : 'Full'
      };
    });

    return res.status(200).json({
      success: true,
      count: shelters.length,
      shelters
    });
  } catch (err) {
    console.error('[AI Controller] Shelters error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch shelters: ' + err.message
    });
  }
}

/**
 * POST /api/ai/sos
 * Triggers emergency SOS tagged with source: 'AI_DISASTER_COPILOT'
 */
async function dispatchCopilotSOS(req, res) {
  const client = await pool.connect();
  try {
    let finalUserId = req.user?.id || null;
    if (!finalUserId) {
      const uRes = await client.query(`SELECT id FROM users WHERE role = 'citizen' ORDER BY id ASC LIMIT 1`);
      if (uRes.rows.length > 0) {
        finalUserId = uRes.rows[0].id;
      } else {
        const anyU = await client.query(`SELECT id FROM users LIMIT 1`);
        finalUserId = anyU.rows[0]?.id || 1;
      }
    }

    const {
      latitude,
      longitude,
      disasterType = 'EMERGENCY',
      severity = 'CRITICAL',
      description = 'Citizen distress signal triggered via SAHAY AI Disaster Copilot.'
    } = req.body;

    const lat = parseFloat(latitude) || 11.605;
    const lng = parseFloat(longitude) || 76.083;

    await client.query('BEGIN');

    // Generate standard incident code
    const incidentCode = await generateIncidentCode(client);

    // Resolve address or sector
    const locationAddress = `GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°) - AI Disaster Copilot Urgent Distress`;

    // Fetch default or matching incident_type_id
    const typeRes = await client.query(
      `SELECT id FROM incident_types WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 1`,
      [`%${disasterType}%`]
    );
    const incidentTypeId = typeRes.rows.length > 0 ? typeRes.rows[0].id : null;

    // Check if location geometry column exists
    const hasLocationCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'location';
    `);

    let insertQuery;
    let queryParams;

    if (hasLocationCol.rows.length > 0) {
      insertQuery = `
        INSERT INTO incidents (
          incident_code, user_id, incident_type_id, severity, description,
          latitude, longitude, location, location_address, status, source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          ST_SetSRID(ST_MakePoint($8, $9), 4326),
          $10, 'SUBMITTED', 'AI_DISASTER_COPILOT'
        )
        RETURNING id, incident_code, severity, status, created_at;
      `;
      queryParams = [incidentCode, finalUserId, incidentTypeId, severity, description, lat, lng, lng, lat, locationAddress];
    } else {
      insertQuery = `
        INSERT INTO incidents (
          incident_code, user_id, incident_type_id, severity, description,
          latitude, longitude, location_address, status, source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', 'AI_DISASTER_COPILOT'
        )
        RETURNING id, incident_code, severity, status, created_at;
      `;
      queryParams = [incidentCode, finalUserId, incidentTypeId, severity, description, lat, lng, locationAddress];
    }

    const insertResult = await client.query(insertQuery, queryParams);
    const createdIncident = insertResult.rows[0];

    // Notification broadcast
    try {
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
        VALUES ($1, 'SOS_ALERT', '🚨 AI-Assisted SOS Dispatched', $2, 'INCIDENT', $3)
      `, [
        finalUserId,
        `Emergency distress dispatched from AI Copilot at coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}). Incident: ${incidentCode}. Rescue authorities alerted.`,
        incidentCode
      ]);
    } catch (notifErr) {
      console.warn('[AI Controller] SOS notification note:', notifErr.message);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS broadcast successfully to District Control Room and Rescue Teams.',
      incident: {
        id: createdIncident.id,
        incidentCode: createdIncident.incident_code,
        severity: createdIncident.severity,
        status: createdIncident.status,
        source: 'AI_DISASTER_COPILOT',
        createdAt: createdIncident.created_at
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[AI Controller] SOS dispatch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to dispatch SOS: ' + err.message
    });
  } finally {
    client.release();
  }
}

/**
 * GET /api/ai/conversations
 * Fetch user conversation history
 */
async function getConversations(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: true, conversations: [] });
    }

    const result = await pool.query(
      `SELECT id, session_id, language, title, created_at, updated_at
       FROM ai_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 20`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      conversations: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/ai/conversations/:id/messages
 * Fetch messages for a specific conversation
 */
async function getConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, role, content, disaster_type AS "disasterType", severity, requires_sos AS "requiresSOS", metadata, created_at AS "createdAt"
       FROM ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      messages: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  chat,
  getRiskAssessment,
  getNearbyShelters,
  dispatchCopilotSOS,
  getConversations,
  getConversationMessages
};
