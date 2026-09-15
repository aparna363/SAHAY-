/**
 * SAHAY Machine Learning & Risk Intelligence Service
 * 
 * Computes contextual disaster risk scores based on:
 * 1. Official meteorological alert levels (RED, ORANGE, YELLOW)
 * 2. Real-time telemetry (rainfall rate, wind gusts, humidity)
 * 3. PostGIS proximity to active hazard zones (landslide slopes, flood basins)
 * 4. Active reported road blockages and emergency incident density
 * 
 * Architecture ready for integration with external Python / Scikit-learn / XGBoost model server.
 */

/**
 * Calculate dynamic risk score and level for a citizen's context
 * @param {Object} context Output from disasterContext.service.js
 * @returns {Object} Risk breakdown, score, level, and reasons
 */
function calculateContextualRisk(context) {
  let score = 5; // Baseline minimal risk
  const reasons = [];

  const { alerts, weather, hazards, roadHazards, nearbyIncidents, location } = context;

  // 1. Official Alert Factor (0 - 40 points)
  const alertLevel = (alerts?.highestLevel || 'GREEN').toUpperCase();
  if (alertLevel === 'RED') {
    score += 40;
    reasons.push(`Official RED Warning active for ${location.district}: Extreme weather danger.`);
  } else if (alertLevel === 'ORANGE') {
    score += 25;
    reasons.push(`Official ORANGE Warning active for ${location.district}: Severe weather threat.`);
  } else if (alertLevel === 'YELLOW') {
    score += 12;
    reasons.push(`Official YELLOW Watch active for ${location.district}: Be updated on weather.`);
  }

  // 2. Weather Intensity Factor (0 - 25 points)
  const precip = Number(weather?.precipitation) || 0;
  const rainProb = Number(weather?.rainProbability) || 0;
  const wind = Number(weather?.windSpeed) || 0;

  if (precip >= 30 || rainProb >= 85) {
    score += 18;
    reasons.push(`Heavy torrential rainfall forecast (${precip.toFixed(1)} mm/hr, ${rainProb}% probability).`);
  } else if (precip >= 15 || rainProb >= 60) {
    score += 10;
    reasons.push(`Moderate to heavy continuous precipitation in the area.`);
  }

  if (wind >= 50) {
    score += 10;
    reasons.push(`High wind gusts detected (${wind} km/h), risk of tree and utility pole falls.`);
  }

  // 3. Proximity to PostGIS Hazard Polygons (0 - 30 points)
  if (hazards && hazards.length > 0) {
    const closestHazard = hazards[0];
    if (closestHazard.distanceKm <= 2.0) {
      score += 28;
      reasons.push(`Critical: Situated ${closestHazard.distanceKm} km from verified ${closestHazard.hazardType} hazard zone (${closestHazard.name}).`);
    } else if (closestHazard.distanceKm <= 5.0) {
      score += 18;
      reasons.push(`High: Situated ${closestHazard.distanceKm} km from ${closestHazard.hazardType} hazard zone (${closestHazard.name}).`);
    } else if (closestHazard.distanceKm <= 10.0) {
      score += 8;
      reasons.push(`Moderate: Within 10 km of ${closestHazard.hazardType} vulnerability area.`);
    }
  }

  // 4. Proximity to Road Blockages & Active Incidents (0 - 20 points)
  const blockedRoadsNearby = (roadHazards || []).filter(r => r.status === 'BLOCKED' || r.severity === 'CRITICAL');
  if (blockedRoadsNearby.length > 0) {
    score += 12;
    reasons.push(`${blockedRoadsNearby.length} impassable road obstruction(s) reported nearby.`);
  }

  if (nearbyIncidents && nearbyIncidents.length >= 3) {
    score += 12;
    reasons.push(`Cluster of ${nearbyIncidents.length} active emergency incidents in your immediate vicinity.`);
  } else if (nearbyIncidents && nearbyIncidents.length > 0) {
    score += 6;
    reasons.push(`${nearbyIncidents.length} active emergency incident(s) reported in local sector.`);
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(5, score));
  const normalizedScore = parseFloat((score / 100).toFixed(2));

  // Determine categorical level
  let riskLevel = 'Low';
  let recommendedAction = 'No immediate threat detected. Continue monitoring official SAHAY bulletins.';

  if (score >= 75) {
    riskLevel = 'Critical';
    recommendedAction = 'IMMINENT DANGER: Prepare for immediate evacuation to the nearest registered shelter. Keep your emergency Go-Bag ready and monitor SAHAY live map.';
  } else if (score >= 55) {
    riskLevel = 'High';
    recommendedAction = 'HIGH RISK: Unfavorable weather conditions and nearby hazard zones detected. Avoid travel, check on vulnerable family members, and identify nearest shelter.';
  } else if (score >= 35) {
    riskLevel = 'Moderate';
    recommendedAction = 'ELEVATED CAUTION: Weather advisory or nearby minor incidents active. Stay indoors during rain spells and keep emergency contacts handy.';
  }

  // If no specific risk factors found
  if (reasons.length === 0) {
    reasons.push('Normal meteorological and hydrological parameters.');
    reasons.push('No active flood or landslide warnings in local catchment.');
  }

  // Feature vector formatted for future Python Scikit-learn Random Forest / XGBoost microservice
  const featureVector = {
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    alert_level_numeric: alertLevel === 'RED' ? 3 : alertLevel === 'ORANGE' ? 2 : alertLevel === 'YELLOW' ? 1 : 0,
    precipitation_rate: precip,
    wind_speed: wind,
    closest_hazard_distance_km: hazards?.[0]?.distanceKm || 999.0,
    nearby_incidents_count: nearbyIncidents?.length || 0,
    blocked_roads_count: blockedRoadsNearby.length
  };

  return {
    riskScore: normalizedScore,
    riskScorePct: score,
    riskLevel,
    reasons,
    recommendedAction,
    featureVector,
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateContextualRisk
};
