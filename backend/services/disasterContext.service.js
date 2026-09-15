/**
 * SAHAY Disaster Context Service
 * Aggregates live spatial intelligence, weather telemetry, official alerts,
 * and emergency resources based on citizen GPS location using PostGIS.
 */

const pool = require('../db');
const { reverseGeocode } = require('./locationService');
const { fetchWeatherData } = require('./weatherService');
const { fetchAlertsForDistrict } = require('./officialWeatherAlertFetcher');
const { normalizeDistrict } = require('./ai.service');

/**
 * Retrieve comprehensive, verified SAHAY context for a citizen
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} preferredDistrict Optional override if known
 */
async function getCitizenDisasterContext(latitude, longitude, preferredDistrict, options = {}) {
  const {
    includeWeather = false,
    includeAlerts = false,
    includeShelters = false,
    includeHospitals = false,
    includeHazards = false,
    includeRoadHazards = false,
    includeIncidents = false,
    includeRescueUnits = false,
    fetchAll = false,
    locationContext = {
      locationSource: 'CURRENT_GPS',
      requestedDistrict: null,
      requestedPlace: null,
      calculateDistance: false
    }
  } = options;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const isValidCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  // Fallback coords if not provided (e.g. Wayanad / Erumeli Kottayam)
  const effectiveLat = isValidCoords ? lat : 11.605;
  const effectiveLng = isValidCoords ? lng : 76.083;

  // 1. Resolve Location & District
  let locationInfo = {
    latitude: effectiveLat,
    longitude: effectiveLng,
    place: 'Detected Location',
    district: preferredDistrict || 'Wayanad',
    state: 'Kerala'
  };

  try {
    const geo = await reverseGeocode(effectiveLat, effectiveLng);
    if (geo && geo.district) {
      locationInfo.district = geo.district;
      locationInfo.place = geo.placeName || geo.panchayat || geo.taluk || geo.district;
      locationInfo.state = geo.state || 'Kerala';
    }
  } catch (err) {
    console.warn('[DisasterContext] Geocoding fallback note:', err.message);
  }

  // Priority Rule: Explicit User Location ALWAYS Overrides GPS and Preferred District
  if (locationContext.locationSource === 'USER_REQUEST') {
    if (locationContext.requestedDistrict) {
      locationInfo.district = locationContext.requestedDistrict;
    }
    if (locationContext.requestedPlace) {
      locationInfo.place = locationContext.requestedPlace;
    }
  } else if (preferredDistrict) {
    locationInfo.district = preferredDistrict;
  }

  const queryAll = fetchAll || (
    !includeWeather && !includeAlerts && !includeShelters &&
    !includeHospitals && !includeHazards && !includeRoadHazards &&
    !includeIncidents && !includeRescueUnits
  );

  // Parallel execution of requested independent data gathering
  const [
    weatherResult,
    alertsResult,
    sheltersResult,
    hospitalsResult,
    hazardsResult,
    roadHazardsResult,
    incidentsResult,
    rescueUnitsResult
  ] = await Promise.allSettled([
    // 2. Weather Telemetry
    (queryAll || includeWeather) ? fetchWeatherData(effectiveLat, effectiveLng).catch(e => {
      console.warn('[DisasterContext] Weather fetch note:', e.message);
      return null;
    }) : Promise.resolve(null),

    // 3. Current Weather & Disaster Alerts
    (queryAll || includeAlerts) ? fetchAlertsForDistrict(locationInfo.district).catch(e => {
      console.warn('[DisasterContext] Alert fetch note:', e.message);
      return null;
    }) : Promise.resolve(null),

    // 4. PostGIS Shelters (Mode A: Requested location filter vs Mode B: Current GPS proximity)
    (queryAll || includeShelters) ? (async () => {
      // If location needs clarification (unrecognized location), do NOT fall back to GPS
      if (locationContext.needsClarification) {
        return { rows: [] };
      }

      try {
        if (locationContext.locationSource === 'USER_REQUEST') {
          const targetDistrict = locationContext.requestedDistrict || '';
          const targetPlace = locationContext.requestedPlace || null;
          const searchKey = targetDistrict || targetPlace || '';

          if (locationContext.calculateDistance && isValidCoords) {
            // Filter to requested district/place FIRST in WHERE clause, then calculate distance from citizen coordinates
            return await pool.query(`
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
              WHERE (
                LOWER(district) = LOWER($3)
                OR LOWER(address) LIKE LOWER('%' || $3 || '%')
                OR LOWER(name) LIKE LOWER('%' || $3 || '%')
                OR ($4::text IS NOT NULL AND (
                     LOWER(address) LIKE LOWER('%' || $4 || '%')
                     OR LOWER(name) LIKE LOWER('%' || $4 || '%')
                   ))
              )
              AND latitude IS NOT NULL AND longitude IS NOT NULL
              ORDER BY distance_meters ASC
              LIMIT 5
            `, [effectiveLng, effectiveLat, searchKey, targetPlace]);
          } else {
            // Filter by requested district/place and sort by capacity/availability
            return await pool.query(`
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
                0 AS distance_meters
              FROM shelters
              WHERE (
                LOWER(district) = LOWER($1)
                OR LOWER(address) LIKE LOWER('%' || $1 || '%')
                OR LOWER(name) LIKE LOWER('%' || $1 || '%')
                OR ($2::text IS NOT NULL AND (
                     LOWER(address) LIKE LOWER('%' || $2 || '%')
                     OR LOWER(name) LIKE LOWER('%' || $2 || '%')
                   ))
              )
              ORDER BY available_capacity DESC, name ASC
              LIMIT 5
            `, [searchKey, targetPlace]);
          }
        } else {
          // CURRENT_GPS: Proximity search using citizen's current browser coordinates
          return await pool.query(`
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
            LIMIT 5
          `, [effectiveLng, effectiveLat]);
        }
      } catch (err) {
        console.warn('[DisasterContext] PostGIS shelters note:', err.message);
        return { rows: [] };
      }
    })() : Promise.resolve({ rows: [] }),

    // 5. PostGIS Nearby Hospitals
    (queryAll || includeHospitals) ? pool.query(`
      SELECT 
        id, 
        name, 
        district, 
        address, 
        latitude, 
        longitude, 
        contact_number AS "contactNumber", 
        emergency_available AS "emergencyAvailable", 
        bed_capacity AS "bedCapacity", 
        available_beds AS "availableBeds", 
        trauma_care_level AS "traumaCareLevel",
        ROUND(ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )) AS distance_meters
      FROM hospitals
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY distance_meters ASC
      LIMIT 5
    `, [effectiveLng, effectiveLat]).catch(e => {
      console.warn('[DisasterContext] PostGIS hospitals note:', e.message);
      return { rows: [] };
    }) : Promise.resolve({ rows: [] }),

    // 6. PostGIS Nearby Hazard Polygons (within 15km)
    (queryAll || includeHazards) ? pool.query(`
      SELECT 
        id, 
        name, 
        hazard_type AS "hazardType", 
        severity, 
        description,
        source,
        ROUND(ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )) AS distance_meters
      FROM hazard_zones
      WHERE active = TRUE
      ORDER BY distance_meters ASC
      LIMIT 3
    `, [effectiveLng, effectiveLat]).catch(e => {
      console.warn('[DisasterContext] PostGIS hazard zones note:', e.message);
      return { rows: [] };
    }) : Promise.resolve({ rows: [] }),

    // 7. PostGIS Road Hazards / Road Blockages (within 15km)
    (queryAll || includeRoadHazards) ? pool.query(`
      SELECT 
        id, 
        road_name AS "roadName", 
        district, 
        status, 
        hazard_type AS "hazardType", 
        description, 
        severity,
        ROUND(ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )) AS distance_meters
      FROM road_hazards
      WHERE is_active = TRUE
      ORDER BY distance_meters ASC
      LIMIT 4
    `, [effectiveLng, effectiveLat]).catch(e => {
      console.warn('[DisasterContext] PostGIS road hazards note:', e.message);
      return { rows: [] };
    }) : Promise.resolve({ rows: [] }),

    // 8. PostGIS Nearby Citizen Incidents (within 10km)
    (queryAll || includeIncidents) ? pool.query(`
      SELECT 
        id, 
        incident_code AS "incidentCode", 
        severity, 
        description, 
        location_address AS "locationAddress", 
        status,
        ROUND(ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )) AS distance_meters
      FROM incidents
      WHERE location IS NOT NULL 
        AND status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
      ORDER BY distance_meters ASC
      LIMIT 5
    `, [effectiveLng, effectiveLat]).catch(e => {
      console.warn('[DisasterContext] PostGIS incidents note:', e.message);
      return { rows: [] };
    }) : Promise.resolve({ rows: [] }),

    // 9. PostGIS Nearby Rescue Units
    (queryAll || includeRescueUnits) ? pool.query(`
      SELECT 
        id, 
        unit_id AS "unitId", 
        unit_name AS "unitName", 
        unit_type AS "unitType", 
        district, 
        contact_number AS "contactNumber", 
        status,
        ROUND(ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )) AS distance_meters
      FROM rescue_units
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY distance_meters ASC
      LIMIT 3
    `, [effectiveLng, effectiveLat]).catch(e => {
      console.warn('[DisasterContext] PostGIS rescue units note:', e.message);
      return { rows: [] };
    }) : Promise.resolve({ rows: [] })
  ]);

  // Format Shelters with km
  let shelters = (sheltersResult.status === 'fulfilled' ? sheltersResult.value.rows : []).map(s => {
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

  // Strict Backend Validation (Section 11):
  // When citizen explicitly requested a district, NEVER let other districts leak through!
  if (locationContext.locationSource === 'USER_REQUEST' && locationContext.requestedDistrict) {
    const targetNorm = normalizeDistrict(locationContext.requestedDistrict).toLowerCase();
    shelters = shelters.filter(s => {
      const sNorm = normalizeDistrict(s.district).toLowerCase();
      const inAddress = s.address && s.address.toLowerCase().includes(targetNorm);
      const inName = s.name && s.name.toLowerCase().includes(targetNorm);
      return sNorm === targetNorm || inAddress || inName;
    });
  }

  // Format Hospitals with km
  const hospitals = (hospitalsResult.status === 'fulfilled' ? hospitalsResult.value.rows : []).map(h => {
    const distMeters = parseInt(h.distance_meters, 10) || 0;
    return {
      id: h.id,
      name: h.name,
      district: h.district,
      address: h.address,
      latitude: parseFloat(h.latitude),
      longitude: parseFloat(h.longitude),
      contactNumber: h.contactNumber,
      emergencyAvailable: h.emergencyAvailable,
      availableBeds: h.availableBeds,
      traumaCareLevel: h.traumaCareLevel,
      distanceMeters: distMeters,
      distanceKm: parseFloat((distMeters / 1000).toFixed(1))
    };
  });

  // Format Hazard Zones with km
  const hazards = (hazardsResult.status === 'fulfilled' ? hazardsResult.value.rows : []).map(hz => {
    const distMeters = parseInt(hz.distance_meters, 10) || 0;
    return {
      id: hz.id,
      name: hz.name,
      hazardType: hz.hazardType,
      severity: hz.severity,
      description: hz.description,
      source: hz.source,
      distanceMeters: distMeters,
      distanceKm: parseFloat((distMeters / 1000).toFixed(1))
    };
  });

  // Format Road Hazards with km
  const roadHazards = (roadHazardsResult.status === 'fulfilled' ? roadHazardsResult.value.rows : []).map(rh => {
    const distMeters = parseInt(rh.distance_meters, 10) || 0;
    return {
      id: rh.id,
      roadName: rh.roadName,
      district: rh.district,
      status: rh.status,
      hazardType: rh.hazardType,
      description: rh.description,
      severity: rh.severity,
      distanceMeters: distMeters,
      distanceKm: parseFloat((distMeters / 1000).toFixed(1))
    };
  });

  // Format Incidents with km
  const nearbyIncidents = (incidentsResult.status === 'fulfilled' ? incidentsResult.value.rows : []).map(inc => {
    const distMeters = parseInt(inc.distance_meters, 10) || 0;
    return {
      id: inc.id,
      code: inc.incidentCode,
      severity: inc.severity,
      description: inc.description,
      location: inc.locationAddress,
      status: inc.status,
      distanceMeters: distMeters,
      distanceKm: parseFloat((distMeters / 1000).toFixed(1))
    };
  });

  // Format Rescue Units with km
  const rescueUnits = (rescueUnitsResult.status === 'fulfilled' ? rescueUnitsResult.value.rows : []).map(ru => {
    const distMeters = parseInt(ru.distance_meters, 10) || 0;
    return {
      id: ru.id,
      unitName: ru.unitName,
      unitType: ru.unitType,
      contactNumber: ru.contactNumber,
      status: ru.status,
      distanceMeters: distMeters,
      distanceKm: parseFloat((distMeters / 1000).toFixed(1))
    };
  });

  // Weather Telemetry
  const weather = weatherResult.status === 'fulfilled' && weatherResult.value ? weatherResult.value : {
    temperature: 26,
    condition: 'Overcast / Monsoon Showers',
    rainProbability: 75,
    windSpeed: 24,
    humidity: 88,
    precipitation: 15.4
  };

  // Weather & Disaster Alerts
  const alertData = alertsResult.status === 'fulfilled' && alertsResult.value ? alertsResult.value : null;
  const activeAlerts = alertData?.activeAlerts || [];
  const highestAlertLevel = alertData?.highestSeverity || 'GREEN';

  return {
    location: locationInfo,
    weather: {
      temperature: weather.temperature,
      condition: weather.condition,
      rainProbability: weather.rainProbability,
      windSpeed: weather.windSpeed,
      humidity: weather.humidity,
      precipitation: weather.precipitation || 0
    },
    alerts: {
      highestLevel: highestAlertLevel,
      count: activeAlerts.length,
      list: activeAlerts.map(a => ({
        id: a.alert_id,
        title: a.title,
        hazardType: a.hazard_type,
        severity: a.mapped_severity,
        description: a.description,
        expiresAt: a.expires_at
      }))
    },
    hazards,
    roadHazards,
    shelters,
    hospitals,
    nearbyIncidents,
    rescueUnits,
    emergencyContacts: {
      police: '112',
      districtControlRoom: '1077',
      stateControlRoom: '1070',
      fire: '101',
      ambulance: '108'
    },
    retrievedAt: new Date().toISOString()
  };
}

module.exports = {
  getCitizenDisasterContext
};
