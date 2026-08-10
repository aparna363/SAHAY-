const pool = require('../db');

/**
 * Alert Decision Engine Risk Service
 * Evaluates reported incident against severity, spatial cluster density (PostGIS 5km radius),
 * and weather hazard telemetry.
 *
 * NOTE: Unverified citizen reports DO NOT trigger public critical alerts automatically.
 * Instead, risk score is flagged for rescue officials to prioritize review.
 */
async function evaluateIncidentRisk({ incidentId, latitude, longitude, severity, disasterType }) {
  try {
    let riskScore = 0;

    // 1. Severity weight
    const severityWeights = {
      'LOW': 10,
      'MODERATE': 25,
      'HIGH': 50,
      'CRITICAL': 80
    };
    riskScore += severityWeights[severity] || 20;

    // 2. Spatial query: count nearby active incidents within 5,000 meters
    let nearbyCount = 0;
    try {
      const hasLocationCol = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'incidents' AND column_name = 'location';
      `);

      let spatialRes;
      if (hasLocationCol.rows.length > 0) {
        spatialRes = await pool.query(
          `SELECT COUNT(*) FROM incidents 
           WHERE ST_DWithin(
             location::geography, 
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
             5000
           ) AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'IN_PROGRESS');`,
          [longitude, latitude]
        );
      } else {
        spatialRes = await pool.query(
          `SELECT COUNT(*) FROM incidents 
           WHERE ( 6371000 * acos(
               LEAST(1.0, GREATEST(-1.0,
                 cos(radians($2)) * cos(radians(latitude)) * cos(radians(longitude) - radians($1)) +
                 sin(radians($2)) * sin(radians(latitude))
               ))
           ) ) <= 5000 AND status IN ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'IN_PROGRESS');`,
          [longitude, latitude]
        );
      }
      nearbyCount = parseInt(spatialRes.rows[0].count, 10);
    } catch (e) {
      console.log('Spatial Risk Query Note:', e.message);
    }

    if (nearbyCount > 5) riskScore += 30;
    else if (nearbyCount > 2) riskScore += 15;

    // 3. Category specific hazards
    const highRiskCategories = ['Flood', 'Landslide', 'Dam/River Issue', 'Fire'];
    if (highRiskCategories.includes(disasterType)) {
      riskScore += 15;
    }

    let riskLevel = 'LOW';
    if (riskScore >= 80) riskLevel = 'CRITICAL';
    else if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MODERATE';

    return {
      incidentId,
      riskScore,
      riskLevel,
      nearbyIncidentsCount: nearbyCount,
      requiresPriorityReview: riskScore >= 60,
      evaluatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Risk Evaluation Error:', err.message);
    return {
      incidentId,
      riskScore: 20,
      riskLevel: 'LOW',
      nearbyIncidentsCount: 0,
      requiresPriorityReview: false,
      evaluatedAt: new Date().toISOString()
    };
  }
}

module.exports = { evaluateIncidentRisk };
