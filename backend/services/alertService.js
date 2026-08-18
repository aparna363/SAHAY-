/**
 * ============================================================
 * SAHAY - Dynamic Alert Service
 * ============================================================
 *
 * Responsibilities:
 * 1. Fetch official district alerts from PostgreSQL
 * 2. Fetch weather telemetry
 * 3. Calculate dynamic weather alerts
 * 4. Use exact user GPS coordinates when available
 * 5. Detect nearby/inside hazard zones using PostGIS
 * 6. Combine district + weather + location hazard information
 *
 * PostgreSQL tables used:
 *   - disaster_alerts
 *   - hazard_zones
 *
 * PostGIS:
 *   - Geometry SRID: 4326
 *   - Spatial distance calculated using geography/meters
 *
 * ============================================================
 */

const pool = require('../db');
const { fetchWeatherData } = require('./weatherService');

/**
 * ============================================================
 * Standard District Coordinates for Kerala's 14 Districts
 * ============================================================
 *
 * These coordinates are used ONLY as a fallback when the
 * user's actual GPS coordinates are not available.
 */

const DISTRICT_COORDS = {
  thiruvananthapuram: {
    lat: 8.5241,
    lon: 76.9366
  },

  kollam: {
    lat: 8.8932,
    lon: 76.6141
  },

  pathanamthitta: {
    lat: 9.2648,
    lon: 76.7870
  },

  alappuzha: {
    lat: 9.4981,
    lon: 76.3388
  },

  kottayam: {
    lat: 9.5916,
    lon: 76.5222
  },

  idukki: {
    lat: 9.8497,
    lon: 76.9804
  },

  ernakulam: {
    lat: 9.9816,
    lon: 76.2999
  },

  thrissur: {
    lat: 10.5276,
    lon: 76.2144
  },

  palakkad: {
    lat: 10.7867,
    lon: 76.6548
  },

  malappuram: {
    lat: 11.0720,
    lon: 76.0740
  },

  kozhikode: {
    lat: 11.2588,
    lon: 75.7804
  },

  wayanad: {
    lat: 11.6854,
    lon: 76.1320
  },

  kannur: {
    lat: 11.8745,
    lon: 75.3704
  },

  kasaragod: {
    lat: 12.5102,
    lon: 74.9852
  }
};

/**
 * ============================================================
 * Kerala District List
 * ============================================================
 */

const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
];

/**
 * ============================================================
 * Alert Priority
 * ============================================================
 */

const ALERT_PRIORITY = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

/**
 * ============================================================
 * Hazard Severity Priority
 * ============================================================
 */

const HAZARD_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/**
 * ============================================================
 * Clean and normalize district names
 * ============================================================
 */

function cleanDistrictName(rawDistrict) {
  if (!rawDistrict) {
    return 'Thiruvananthapuram';
  }

  let district = String(rawDistrict)
    .trim()
    .replace(/\s+district$/i, '')
    .trim();

  return district || 'Thiruvananthapuram';
}

/**
 * ============================================================
 * Validate GPS coordinates
 * ============================================================
 */

function isValidCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * ============================================================
 * Get Alert Priority
 * ============================================================
 */

function getAlertPriority(level) {
  return (
    ALERT_PRIORITY[
      String(level || 'GREEN').toUpperCase()
    ] || 0
  );
}

/**
 * ============================================================
 * Get Hazard Priority
 * ============================================================
 */

function getHazardPriority(severity) {
  return (
    HAZARD_PRIORITY[
      String(severity || 'LOW').toUpperCase()
    ] || 0
  );
}

/**
 * ============================================================
 * Dynamic Weather Alert Engine
 * ============================================================
 *
 * /**
 * ============================================================
 * Local Risk Analysis Engine (Open-Meteo + GPS + Hazard Zones)
 * ============================================================
 *
 * Evaluates weather telemetry and location hazard zones to produce
 * a LOCAL RISK level (LOW, MODERATE, HIGH, CRITICAL).
 *
 * CRITICAL RULE: Local Risk Analysis MUST NOT alter or overwrite
 * the Official IMD/KSDMA Alert level!
 */

function computeLocalRisk(districtName, weatherInfo = {}, locationHazard = {}) {
  const district = cleanDistrictName(districtName);

  const temp = Number(weatherInfo.temperature ?? 28);
  const humidity = Number(weatherInfo.humidity ?? 80);
  const windSpeed = Number(weatherInfo.windSpeed ?? 15);
  const rainProb = Number(weatherInfo.rainProbability ?? 40);
  const weatherCode = Number(weatherInfo.weatherCode ?? 0);

  let riskLevel = 'LOW';
  let reason = `Normal weather conditions detected in ${district} (${temp}°C, ${rainProb}% rain probability).`;

  if (locationHazard.hasHazard && locationHazard.highestSeverity === 'CRITICAL') {
    riskLevel = 'CRITICAL';
    reason = `Critical ${locationHazard.nearestHazard?.hazardType || 'hazard'} zone detected at user location.`;
  } else if (rainProb >= 80 || [65, 82, 95, 96, 99].includes(weatherCode) || windSpeed >= 40) {
    riskLevel = 'CRITICAL';
    reason = `Heavy downpour probability (${rainProb}%) and squally winds (${windSpeed} km/h) detected from local telemetry.`;
  } else if (locationHazard.hasHazard && locationHazard.highestSeverity === 'HIGH') {
    riskLevel = 'HIGH';
    reason = `High-risk ${locationHazard.nearestHazard?.hazardType || 'hazard'} zone near user location.`;
  } else if (rainProb >= 60 || [63, 81].includes(weatherCode) || windSpeed >= 25) {
    riskLevel = 'HIGH';
    reason = `High precipitation probability (${rainProb}%) and moderate wind (${windSpeed} km/h) detected.`;
  } else if (rainProb >= 35 || [53, 55, 61, 80].includes(weatherCode) || humidity >= 85) {
    riskLevel = 'MODERATE';
    reason = `Moderate precipitation probability (${rainProb}%) and high moisture (${humidity}% humidity) detected.`;
  }

  return {
    level: riskLevel, // LOW | MODERATE | HIGH | CRITICAL
    reason,
    district,
    metrics: {
      temperature: temp,
      humidity,
      windSpeed,
      rainProbability: rainProb,
      weatherCode
    }
  };
}

/**
 * Kept for backward compatibility
 */
function computeDynamicAlert(districtName, weatherInfo = {}) {
  const risk = computeLocalRisk(districtName, weatherInfo);
  return {
    district: cleanDistrictName(districtName),
    alertLevel: 'GREEN', // Official alert level defaults to GREEN
    alertType: 'Normal Weather Conditions',
    description: `No active official disaster warning in effect. Local telemetry risk: ${risk.level}`,
    source: 'Dynamic Weather Telemetry',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    localRisk: risk
  };
}

/**
 * ============================================================
 * Get Nearby Hazard Zones
 * ============================================================
 */
async function getNearbyHazardAlerts(latitude, longitude, radiusMeters = 5000) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const radius = Number(radiusMeters);

  if (!isValidCoordinates(lat, lon) || !Number.isFinite(radius) || radius <= 0) {
    return [];
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        hazard_type AS "hazardType",
        severity,
        description,
        source,
        active,
        CASE
          WHEN ST_Covers(geometry, ST_SetSRID(ST_Point($1, $2), 4326))
          THEN TRUE ELSE FALSE
        END AS "insideZone",
        ROUND(ST_Distance(geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography)::numeric, 2) AS "distanceMeters"
      FROM hazard_zones
      WHERE active = TRUE AND ST_DWithin(geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, $3)
      ORDER BY "insideZone" DESC, "distanceMeters" ASC
      `,
      [lon, lat, radius]
    );
    return result.rows;
  } catch (error) {
    console.error('[AlertService] Hazard zone query failed:', error.message);
    return [];
  }
}

/**
 * ============================================================
 * Get Location Hazard Alert
 * ============================================================
 */
async function getLocationHazardAlert(latitude, longitude) {
  const hazards = await getNearbyHazardAlerts(latitude, longitude, 5000);

  if (!hazards.length) {
    return {
      hasHazard: false,
      highestSeverity: null,
      nearestHazard: null,
      hazards: []
    };
  }

  const sortedHazards = [...hazards].sort((a, b) => {
    const severityDifference = getHazardPriority(b.severity) - getHazardPriority(a.severity);
    if (severityDifference !== 0) return severityDifference;
    return Number(a.distanceMeters || 0) - Number(b.distanceMeters || 0);
  });

  const highest = sortedHazards[0];
  const nearest = [...hazards].sort((a, b) => Number(a.distanceMeters || 0) - Number(b.distanceMeters || 0))[0];

  return {
    hasHazard: true,
    highestSeverity: highest.severity,
    nearestHazard: nearest,
    hazards: sortedHazards
  };
}

/**
 * ============================================================
 * Get Current Alert
 * ============================================================
 *
 * Separates OFFICIAL IMD/KSDMA DISASTER ALERT from LOCAL WEATHER RISK ANALYSIS.
 *
 * Rules:
 * 1. Official Alert is derived strictly from DB disaster_alerts / IMD feed.
 * 2. If no active official warning is found, Official Alert MUST default to GREEN.
 * 3. Open-Meteo telemetry / local thresholds NEVER override Official Alert to RED.
 * 4. Local Risk Analysis (LOW, MODERATE, HIGH, CRITICAL) is calculated separately.
 */

async function getCurrentAlert(districtName, weatherInfo = null, latitude = null, longitude = null) {
  const district = cleanDistrictName(districtName);

  /**
   * 1. Get Active Official District Alert from Database
   */
  let districtAlert = null;
  try {
    const result = await pool.query(
      `
      SELECT
        district,
        alert_level AS "alertLevel",
        alert_type AS "alertType",
        description,
        source,
        start_time AS "startTime",
        end_time AS "endTime"
      FROM disaster_alerts
      WHERE (LOWER(district) = LOWER($1) OR LOWER(district) = 'kerala' OR LOWER(district) = 'all')
        AND (start_time IS NULL OR start_time <= NOW())
        AND (end_time IS NULL OR end_time >= NOW())
      ORDER BY
        CASE UPPER(alert_level)
          WHEN 'RED' THEN 4
          WHEN 'ORANGE' THEN 3
          WHEN 'YELLOW' THEN 2
          WHEN 'GREEN' THEN 1
          ELSE 0
        END DESC,
        start_time DESC
      LIMIT 1
      `,
      [district]
    );

    if (result.rows.length > 0) {
      districtAlert = {
        district,
        ...result.rows[0]
      };
    }
  } catch (error) {
    console.warn('[AlertService] District alert query failed:', error.message);
  }

  /**
   * 2. Official Alert Level (DEFAULT TO GREEN IF NO ACTIVE OFFICIAL WARNING)
   */
  const activeOfficialAlert = districtAlert;
  const officialAlertLevel = activeOfficialAlert
    ? String(activeOfficialAlert.alertLevel).toUpperCase()
    : 'GREEN';

  const officialAlertType = activeOfficialAlert
    ? activeOfficialAlert.alertType
    : 'Normal Weather Conditions';

  const officialDescription = activeOfficialAlert
    ? activeOfficialAlert.description
    : `No active official IMD / KSDMA disaster warning. Normal weather conditions in ${district}.`;

  const officialSource = activeOfficialAlert
    ? activeOfficialAlert.source
    : 'IMD / KSDMA Official Feed';

  /**
   * 3. Get Weather Telemetry
   */
  let telemetry = weatherInfo;
  if (!telemetry || typeof telemetry !== 'object') {
    if (isValidCoordinates(latitude, longitude)) {
      try {
        telemetry = await fetchWeatherData(Number(latitude), Number(longitude));
      } catch (error) {
        telemetry = null;
      }
    }
    if (!telemetry) {
      const coords = DISTRICT_COORDS[district.toLowerCase()];
      if (coords) {
        try {
          telemetry = await fetchWeatherData(coords.lat, coords.lon);
        } catch (error) {
          telemetry = null;
        }
      }
    }
  }

  /**
   * 4. Find Location Hazard Zones
   */
  let locationHazard = {
    hasHazard: false,
    highestSeverity: null,
    nearestHazard: null,
    hazards: []
  };

  if (isValidCoordinates(latitude, longitude)) {
    locationHazard = await getLocationHazardAlert(Number(latitude), Number(longitude));
  }

  /**
   * 5. Calculate Local Risk Analysis (SEPARATED FROM OFFICIAL ALERT)
   */
  const localRisk = computeLocalRisk(district, telemetry || {}, locationHazard);

  /**
   * MANDATORY DEBUG LOGGING
   */
  console.log('[SAHAY ALERT] Current district:', district);
  console.log('[SAHAY ALERT] Active official alerts:', activeOfficialAlert ? [activeOfficialAlert] : []);
  console.log('[SAHAY ALERT] Selected official alert:', activeOfficialAlert || null);
  console.log('[SAHAY ALERT] Official level:', officialAlertLevel);
  console.log('[SAHAY ALERT] Local risk:', localRisk.level);

  /**
   * 6. Build Separated Response
   */
  return {
    district,

    // Official IMD/KSDMA Alert
    officialAlert: {
      alertLevel: officialAlertLevel,
      alertType: officialAlertType,
      description: officialDescription,
      source: officialSource,
      startTime: activeOfficialAlert ? activeOfficialAlert.startTime : new Date().toISOString(),
      endTime: activeOfficialAlert ? activeOfficialAlert.endTime : null,
      hasOfficialAlert: !!activeOfficialAlert
    },

    // Top-level fields (strictly reflecting official alert for backward compatibility)
    alertLevel: officialAlertLevel,
    alertType: officialAlertType,
    description: officialDescription,
    source: officialSource,

    // Local Weather & Risk Analysis
    localRisk: {
      level: localRisk.level,
      reason: localRisk.reason,
      weather: telemetry || null,
      locationHazardDetected: locationHazard.hasHazard,
      locationHazards: locationHazard.hazards,
      nearestHazard: locationHazard.nearestHazard
    },

    location: {
      latitude: isValidCoordinates(latitude, longitude) ? Number(latitude) : null,
      longitude: isValidCoordinates(latitude, longitude) ? Number(longitude) : null
    },

    weather: telemetry || null,

    locationHazardDetected: locationHazard.hasHazard,
    locationHazards: locationHazard.hazards,
    nearestHazard: locationHazard.nearestHazard,

    weatherLocation: isValidCoordinates(latitude, longitude) ? 'USER_LOCATION' : 'DISTRICT_CENTER'
  };
}

/**
 * ============================================================
 * Get All Kerala Alerts
 * ============================================================
 */
async function getAllKeralaAlerts() {
  let dbAlertsMap = {};

  try {
    const result = await pool.query(
      `
      SELECT
        district,
        alert_level AS "alertLevel",
        alert_type AS "alertType",
        description,
        source,
        start_time AS "startTime",
        end_time AS "endTime"
      FROM disaster_alerts
      WHERE (start_time IS NULL OR start_time <= NOW())
        AND (end_time IS NULL OR end_time >= NOW())
      ORDER BY
        CASE UPPER(alert_level)
          WHEN 'RED' THEN 4
          WHEN 'ORANGE' THEN 3
          WHEN 'YELLOW' THEN 2
          WHEN 'GREEN' THEN 1
          ELSE 0
        END DESC,
        start_time DESC
      `
    );

    for (const row of result.rows) {
      const key = cleanDistrictName(row.district).toLowerCase();
      if (!dbAlertsMap[key]) {
        dbAlertsMap[key] = row;
      }
    }
  } catch (error) {
    console.warn('[AlertService] getAllKeralaAlerts DB query failed:', error.message);
  }

  const allAlerts = [];

  for (const district of KERALA_DISTRICTS) {
    const key = district.toLowerCase();

    if (dbAlertsMap[key]) {
      const item = dbAlertsMap[key];
      allAlerts.push({
        district,
        alertLevel: String(item.alertLevel).toUpperCase(),
        alertType: item.alertType,
        description: item.description,
        source: item.source || 'IMD / KSDMA Official Feed',
        startTime: item.startTime,
        endTime: item.endTime,
        officialAlert: {
          alertLevel: String(item.alertLevel).toUpperCase(),
          alertType: item.alertType,
          description: item.description,
          source: item.source || 'IMD / KSDMA Official Feed',
          hasOfficialAlert: true
        },
        localRisk: {
          level: 'LOW',
          reason: `Official ${item.alertLevel} alert active for ${district}.`
        }
      });
    } else {
      allAlerts.push({
        district,
        alertLevel: 'GREEN',
        alertType: 'Normal Weather Conditions',
        description: `No active official disaster warning in effect for ${district}.`,
        source: 'IMD / KSDMA Official Feed',
        officialAlert: {
          alertLevel: 'GREEN',
          alertType: 'Normal Weather Conditions',
          description: `No active official disaster warning in effect for ${district}.`,
          source: 'IMD / KSDMA Official Feed',
          hasOfficialAlert: false
        },
        localRisk: {
          level: 'LOW',
          reason: `No active official warning. Normal conditions in ${district}.`
        }
      });
    }
  }

  return allAlerts;
}

/**
 * ============================================================
 * Save Official Disaster Alert
 * ============================================================
 */

async function saveDisasterAlert({
  district,
  alertLevel,
  alertType,
  description,
  source,
  durationHours = 24,
  scope = 'DISTRICT'
}) {
  const cleanDist =
    cleanDistrictName(
      district
    );

  const startTime =
    new Date();

  const endTime =
    new Date(
      Date.now() +
        Number(durationHours) *
          3600 *
          1000
    );

  const result =
    await pool.query(
      `
      INSERT INTO disaster_alerts (
        district,
        alert_level,
        alert_type,
        description,
        source,
        start_time,
        end_time,
        scope
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING
        id,
        district,
        alert_level AS "alertLevel",
        alert_type AS "alertType",
        description,
        source,
        start_time AS "startTime",
        end_time AS "endTime",
        scope
      `,
      [
        cleanDist,
        String(
          alertLevel
        ).toUpperCase(),

        alertType,

        description,

        source ||
          'KSDMA / Official Portal',

        startTime,

        endTime,

        String(
          scope || 'DISTRICT'
        ).toUpperCase()
      ]
    );

  return result.rows[0];
}

/**
 * ============================================================
 * Module Exports
 * ============================================================
 */

module.exports = {
  getCurrentAlert,

  getAllKeralaAlerts,

  computeDynamicAlert,

  saveDisasterAlert,

  cleanDistrictName,

  getNearbyHazardAlerts,

  getLocationHazardAlert,

  DISTRICT_COORDS
};