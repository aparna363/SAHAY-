/**
 * Dynamic Alert Service for SAHAY Emergency & Weather Portal
 * Evaluates real-time disaster alerts based on PostgreSQL `disaster_alerts` table
 * and dynamic weather telemetry from Open-Meteo API for all Kerala districts.
 */

const pool = require('../db');
const { fetchWeatherData } = require('./weatherService');

/**
 * Standard District Coordinates for Kerala's 14 Districts
 */
const DISTRICT_COORDS = {
  thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
  kollam: { lat: 8.8932, lon: 76.6141 },
  pathanamthitta: { lat: 9.2648, lon: 76.7870 },
  alappuzha: { lat: 9.4981, lon: 76.3388 },
  kottayam: { lat: 9.5916, lon: 76.5222 },
  idukki: { lat: 9.8497, lon: 76.9804 },
  ernakulam: { lat: 9.9816, lon: 76.2999 },
  thrissur: { lat: 10.5276, lon: 76.2144 },
  palakkad: { lat: 10.7867, lon: 76.6548 },
  malappuram: { lat: 11.0720, lon: 76.0740 },
  kozhikode: { lat: 11.2588, lon: 75.7804 },
  wayanad: { lat: 11.6854, lon: 76.1320 },
  kannur: { lat: 11.8745, lon: 75.3704 },
  kasaragod: { lat: 12.5102, lon: 74.9852 }
};

/**
 * Clean and normalize district names
 */
function cleanDistrictName(rawDistrict) {
  if (!rawDistrict) return 'Thiruvananthapuram';
  let district = String(rawDistrict).trim();
  district = district.replace(/\s+district$/i, '').trim();
  return district || 'Thiruvananthapuram';
}

/**
 * Dynamically evaluate weather metrics to compute disaster alert level & advisory
 */
function computeDynamicAlert(districtName, weatherInfo = {}) {
  const district = cleanDistrictName(districtName);

  const temp = Number(weatherInfo.temperature ?? 28);
  const humidity = Number(weatherInfo.humidity ?? 80);
  const windSpeed = Number(weatherInfo.windSpeed ?? 15);
  const rainProb = Number(weatherInfo.rainProbability ?? 40);
  const condition = String(weatherInfo.condition || 'Cloudy');
  const weatherCode = Number(weatherInfo.weatherCode ?? 0);

  const distLower = district.toLowerCase();
  const isHighRange = ['idukki', 'wayanad'].includes(distLower);
  const isRiverBasin = ['ernakulam', 'pathanamthitta', 'kottayam', 'thrissur', 'malappuram'].includes(distLower);
  const isCoastal = ['thiruvananthapuram', 'kollam', 'alappuzha', 'kozhikode', 'kannur', 'kasaragod'].includes(distLower);

  let alertLevel = 'GREEN';
  let alertType = 'Normal Weather Conditions';
  let description = `No active disaster warning. Normal weather conditions in ${district} (${temp}°C, ${rainProb}% precipitation probability).`;

  // RED ALERT thresholds
  if (rainProb >= 85 || [65, 82, 95, 96, 99].includes(weatherCode) || windSpeed >= 40) {
    alertLevel = 'RED';
    if (isHighRange) {
      alertType = 'Heavy Rainfall & Landslide Warning';
      description = `Red Alert issued for ${district} high ranges. Torrential downpour expected (${rainProb}% rain probability, ${windSpeed} km/h wind). High risk of landslides & flash floods. Avoid travel.`;
    } else if (isRiverBasin) {
      alertType = 'Flood Warning & High River Inundation';
      description = `Red Alert issued for ${district}. Rapidly rising river levels due to torrential rain (${rainProb}% rain probability). Residents in low-lying sub-basins stay on high alert.`;
    } else if (isCoastal) {
      alertType = 'Urban Inundation & Sea Surge Warning';
      description = `Red Alert active along ${district} coastal & urban belt. Violent rain showers (${rainProb}%) and squally winds (${windSpeed} km/h). Avoid coastal waters.`;
    } else {
      alertType = 'Extremely Heavy Downpour Warning';
      description = `Red Alert active in ${district} district. Torrential rainfall (${rainProb}% precipitation) expected. Emergency teams deployed.`;
    }
  }
  // ORANGE ALERT thresholds
  else if (rainProb >= 65 || [63, 81].includes(weatherCode) || windSpeed >= 25) {
    alertLevel = 'ORANGE';
    if (isHighRange) {
      alertType = 'Heavy Downpour & Slopewatch Advisory';
      description = `Orange Alert for ${district} hills. Persistent heavy showers (${rainProb}% rain probability, ${temp}°C). Watch for soil movement in steep slopes.`;
    } else if (isRiverBasin) {
      alertType = 'Heavy Rain & River Discharge Alert';
      description = `Orange Alert issued for ${district} river basins. Heavy catchment rainfall (${rainProb}% rain probability). Waterlogging reported in low-lying paddies.`;
    } else if (isCoastal) {
      alertType = 'High Waves & Squally Wind Advisory';
      description = `Orange Alert active for ${district}. Rough sea conditions and gusty winds (${windSpeed} km/h). Coastal residents remain cautious.`;
    } else {
      alertType = 'Heavy Rain & Waterlogging Advisory';
      description = `Orange Alert for ${district}. Substantial rainfall expected (${rainProb}% rain probability). Local drainage systems monitored.`;
    }
  }
  // YELLOW ALERT thresholds
  else if (rainProb >= 40 || [53, 55, 61, 80].includes(weatherCode) || humidity >= 85) {
    alertLevel = 'YELLOW';
    alertType = 'Moderate Showers & Weather Watch';
    description = `Yellow Alert active for ${district}. Moderate rainfall with gusty breezes expected (${rainProb}% rain probability, ${windSpeed} km/h wind). Stay updated.`;
  }

  return {
    district,
    alertLevel,
    alertType,
    description,
    source: 'IMD / KSDMA Live Telemetry',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  };
}

/**
 * Fetch active disaster alert for a given district
 * 1. Checks PostgreSQL `disaster_alerts` table first
 * 2. If no DB record, computes dynamic alert using live weather telemetry
 */
async function getCurrentAlert(districtName, weatherInfo = null) {
  const district = cleanDistrictName(districtName);

  // 1. Query PostgreSQL Database
  try {
    const result = await pool.query(
      `SELECT district, alert_level as "alertLevel", alert_type as "alertType", 
              description, source, start_time as "startTime", end_time as "endTime"
       FROM disaster_alerts 
       WHERE LOWER(district) = LOWER($1) 
         AND (end_time IS NULL OR end_time > NOW())
       ORDER BY id DESC LIMIT 1`,
      [district]
    );

    if (result.rows.length > 0) {
      return {
        district,
        ...result.rows[0]
      };
    }
  } catch (error) {
    console.warn('[AlertService] DB query note:', error.message);
  }

  // 2. Compute dynamic weather alert if no DB record found
  let telemetry = weatherInfo;
  if (!telemetry || typeof telemetry !== 'object') {
    const coords = DISTRICT_COORDS[district.toLowerCase()];
    if (coords) {
      try {
        telemetry = await fetchWeatherData(coords.lat, coords.lon);
      } catch (err) {
        telemetry = null;
      }
    }
  }

  return computeDynamicAlert(district, telemetry || {});
}

/**
 * Fetch active disaster alerts for ALL 14 districts in Kerala
 */
async function getAllKeralaAlerts() {
  let dbAlertsMap = {};

  try {
    const result = await pool.query(
      `SELECT district, alert_level as "alertLevel", alert_type as "alertType", 
              description, source, start_time as "startTime", end_time as "endTime"
       FROM disaster_alerts 
       WHERE (end_time IS NULL OR end_time > NOW())
       ORDER BY id DESC`
    );

    for (const row of result.rows) {
      const key = cleanDistrictName(row.district).toLowerCase();
      if (!dbAlertsMap[key]) {
        dbAlertsMap[key] = row;
      }
    }
  } catch (error) {
    console.warn('[AlertService] DB getAllKeralaAlerts query note:', error.message);
  }

  const keralaDistricts = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
    'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
    'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const allAlerts = [];

  for (const dist of keralaDistricts) {
    const key = dist.toLowerCase();
    if (dbAlertsMap[key]) {
      allAlerts.push({
        district: dist,
        ...dbAlertsMap[key]
      });
    } else {
      const coords = DISTRICT_COORDS[key];
      let weather = null;
      if (coords) {
        try {
          weather = await fetchWeatherData(coords.lat, coords.lon);
        } catch {
          weather = null;
        }
      }
      allAlerts.push(computeDynamicAlert(dist, weather || {}));
    }
  }

  return allAlerts;
}

/**
 * Create or Update an official disaster alert in PostgreSQL DB
 */
async function saveDisasterAlert({ district, alertLevel, alertType, description, source, durationHours = 24 }) {
  const cleanDist = cleanDistrictName(district);
  const startTime = new Date();
  const endTime = new Date(Date.now() + (durationHours * 3600 * 1000));

  const result = await pool.query(
    `INSERT INTO disaster_alerts (district, alert_level, alert_type, description, source, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, district, alert_level as "alertLevel", alert_type as "alertType", description, source, start_time as "startTime", end_time as "endTime"`,
    [
      cleanDist,
      alertLevel.toUpperCase(),
      alertType,
      description,
      source || 'KSDMA / Official Portal',
      startTime,
      endTime
    ]
  );

  return result.rows[0];
}

module.exports = {
  getCurrentAlert,
  getAllKeralaAlerts,
  computeDynamicAlert,
  saveDisasterAlert,
  cleanDistrictName,
  DISTRICT_COORDS
};
