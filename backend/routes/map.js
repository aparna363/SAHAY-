const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { createAuditLog } = require('../utils/auditLogger');
const { calculateSafeRoute } = require('../services/safeRoutingService');
const { rankEvacuationCenters } = require('../services/evacuationRankingService');
const {
  setActiveScenario,
  getActiveScenario,
  listScenarios,
  SCENARIO_DEFINITIONS
} = require('../services/disasterSimulationService');
const {
  notifyNewIncident,
  notifyIncidentUpdate,
  notifyRoadHazardUpdate,
  notifyHazardZoneUpdate,
  notifyIoTSensorUpdate,
  notifyShelterUpdate
} = require('../services/socketService');

// Helper to sanitize & extract user from optional auth
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return next();
  return authenticateToken(req, res, next);
};

// Helper: Haversine distance in meters
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// -------------------------------------------------------------
// 1. GET /api/map/incidents
// Role-based filtered incidents with PostGIS coordinates
// -------------------------------------------------------------
router.get('/incidents', optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const role = (user?.role || 'citizen').toLowerCase();
    const userDistrict = user?.district;
    const { district, severity, status, type, timeRange, lat, lng, radius = 50000 } = req.query;

    const whereClauses = [];
    const params = [];

    // Filter out rejected or closed for general map
    whereClauses.push("i.status NOT IN ('REJECTED', 'CLOSED')");

    // Role-based visibility scoping (District-Aware without hardcoding)
    if (role === 'collector') {
      // Collector is authorized strictly for their assigned district
      const targetDistrict = userDistrict || district;
      if (targetDistrict) {
        params.push(`%${targetDistrict.toLowerCase()}%`);
        whereClauses.push(`(LOWER(u.district) LIKE $${params.length} OR LOWER(i.location_address) LIKE $${params.length})`);
      }
    } else if (role === 'station' || role === 'rescue_team' || role === 'station_admin') {
      // Rescue team sees incidents in their operational district
      const targetDistrict = userDistrict || district;
      if (targetDistrict) {
        params.push(`%${targetDistrict.toLowerCase()}%`);
        whereClauses.push(`(LOWER(u.district) LIKE $${params.length} OR LOWER(i.location_address) LIKE $${params.length})`);
      }
    } else if (role === 'admin' || role === 'super_admin') {
      // Admin can filter by district or view statewide
      if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
        params.push(`%${district.toLowerCase()}%`);
        whereClauses.push(`(LOWER(u.district) LIKE $${params.length} OR LOWER(i.location_address) LIKE $${params.length})`);
      }
    } else {
      // Citizen / Public View
      if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
        params.push(`%${district.toLowerCase()}%`);
        whereClauses.push(`(LOWER(u.district) LIKE $${params.length} OR LOWER(i.location_address) LIKE $${params.length})`);
      }
    }

    if (severity && severity !== 'all') {
      params.push(severity.toUpperCase());
      whereClauses.push(`i.severity = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status.toUpperCase());
      whereClauses.push(`i.status = $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(`%${type.toLowerCase()}%`);
      whereClauses.push(`LOWER(it.name) LIKE $${params.length}`);
    }

    // Time filter
    if (timeRange === 'today') {
      whereClauses.push(`i.created_at >= CURRENT_DATE`);
    } else if (timeRange === '24h') {
      whereClauses.push(`i.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`);
    } else if (timeRange === '3d') {
      whereClauses.push(`i.created_at >= CURRENT_TIMESTAMP - INTERVAL '3 days'`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        i.id,
        i.incident_code,
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        ST_AsGeoJSON(COALESCE(i.location, ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326))) AS geojson,
        i.location_address,
        i.status,
        i.source,
        i.created_at,
        i.updated_at,
        it.name AS incident_type_name,
        u.district AS reporter_district,
        u.name AS reporter_name,
        u.phone AS reporter_phone,
        (SELECT json_build_object(
           'assignedTeam', h.remarks,
           'assignedAt', h.created_at
         ) FROM incident_status_history h 
         WHERE h.incident_id = i.id AND h.new_status = 'RESPONSE_ASSIGNED' 
         ORDER BY h.id DESC LIMIT 1) AS assignment_info
      FROM incidents i
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      LEFT JOIN users u ON i.user_id = u.id
      ${whereSql}
      ORDER BY 
        CASE i.severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MODERATE' THEN 3 
          ELSE 4 END,
        i.created_at DESC;
    `;

    const result = await pool.query(query, params);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    const isOfficial = ['collector', 'admin', 'super_admin', 'station', 'rescue_team', 'station_admin'].includes(role);

    const sanitizedData = result.rows.map(row => {
      const incLat = parseFloat(row.latitude);
      const incLng = parseFloat(row.longitude);
      let distanceMeters = null;
      let distanceKm = null;

      if (hasGps && !isNaN(incLat) && !isNaN(incLng)) {
        distanceMeters = Math.round(haversineDistanceMeters(latNum, lngNum, incLat, incLng));
        distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
      }

      const item = {
        id: row.id,
        incidentCode: row.incident_code,
        incidentTypeName: row.incident_type_name || 'General Incident',
        severity: row.severity,
        description: row.description,
        latitude: incLat,
        longitude: incLng,
        geojson: row.geojson ? JSON.parse(row.geojson) : null,
        locationAddress: row.location_address,
        status: row.status,
        createdAt: row.created_at,
        distanceMeters,
        distanceKm
      };

      // Internal operational metadata ONLY exposed to authorized officials
      if (isOfficial) {
        item.reporter = {
          name: row.reporter_name,
          phone: row.reporter_phone,
          district: row.reporter_district
        };
        item.assignment = row.assignment_info;
        item.updatedAt = row.updated_at;
      }

      return item;
    });

    let finalIncidents = sanitizedData;
    if (hasGps && role === 'citizen') {
      const radNum = parseFloat(radius);
      finalIncidents = sanitizedData.sort((a, b) => (a.distanceMeters || 9999999) - (b.distanceMeters || 9999999));
    }

    return res.status(200).json({
      success: true,
      role,
      count: finalIncidents.length,
      incidents: finalIncidents
    });

  } catch (err) {
    console.error('Fetch Map Incidents Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch map incidents: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. GET /api/map/incidents/:id/nearest-resources
// PostGIS Spatial Query: Nearest available rescue team, shelter, hospital around an incident
// -------------------------------------------------------------
router.get('/incidents/:id/nearest-resources', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch Incident Location
    const isNumericId = !isNaN(parseInt(id, 10)) && String(parseInt(id, 10)) === String(id);
    const incRes = isNumericId
      ? await pool.query("SELECT id, incident_code, severity, status, latitude, longitude, location_address FROM incidents WHERE id = $1", [parseInt(id, 10)])
      : await pool.query("SELECT id, incident_code, severity, status, latitude, longitude, location_address FROM incidents WHERE incident_code = $1", [id]);

    if (incRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const inc = incRes.rows[0];
    const incLat = parseFloat(inc.latitude);
    const incLng = parseFloat(inc.longitude);

    if (isNaN(incLat) || isNaN(incLng)) {
      return res.status(400).json({ success: false, error: 'Incident has invalid GPS coordinates' });
    }

    // 2. Nearest Rescue Units via PostGIS ST_Distance
    const teamsRes = await pool.query(
      `SELECT 
         id, 
         unit_id AS "unitId", 
         unit_name AS "unitName", 
         unit_type AS "unitType", 
         district, 
         contact_number AS "contactNumber", 
         status, 
         latitude, 
         longitude, 
         team_leader AS "teamLeader", 
         team_size AS "teamSize", 
         current_location AS "currentLocation",
         ST_Distance(
           ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_meters
       FROM rescue_units
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [incLng, incLat]
    );

    const nearestTeams = teamsRes.rows.map(t => ({
      ...t,
      latitude: parseFloat(t.latitude),
      longitude: parseFloat(t.longitude),
      distanceMeters: Math.round(t.distance_meters),
      distanceKm: parseFloat((t.distance_meters / 1000).toFixed(1))
    }));

    // 3. Nearest Shelters via PostGIS ST_Distance
    const sheltersRes = await pool.query(
      `SELECT 
         id, 
         name, 
         district, 
         address, 
         latitude, 
         longitude, 
         capacity, 
         available_capacity AS "availableCapacity", 
         contact_number AS "contactNumber",
         ST_Distance(
           ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_meters
       FROM shelters
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [incLng, incLat]
    );

    const nearestShelters = sheltersRes.rows.map(s => ({
      ...s,
      latitude: parseFloat(s.latitude),
      longitude: parseFloat(s.longitude),
      distanceMeters: Math.round(s.distance_meters),
      distanceKm: parseFloat((s.distance_meters / 1000).toFixed(1)),
      status: (s.availableCapacity && s.availableCapacity > 0) ? 'OPEN' : 'FULL'
    }));

    // 4. Nearest Hospitals via PostGIS ST_Distance
    const hospitalsRes = await pool.query(
      `SELECT 
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
         ST_Distance(
           ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_meters
       FROM hospitals
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [incLng, incLat]
    );

    const nearestHospitals = hospitalsRes.rows.map(h => ({
      ...h,
      latitude: parseFloat(h.latitude),
      longitude: parseFloat(h.longitude),
      distanceMeters: Math.round(h.distance_meters),
      distanceKm: parseFloat((h.distance_meters / 1000).toFixed(1))
    }));

    // 5. Active Hazard Zones intersecting or nearby
    const hazardRes = await pool.query(
      `SELECT 
         id, name, hazard_type AS "hazardType", severity, description, active,
         ST_AsGeoJSON(geometry) AS geojson,
         ST_Distance(
           geometry::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_meters
       FROM hazard_zones
       WHERE active = true
       ORDER BY distance_meters ASC
       LIMIT 3`,
      [incLng, incLat]
    );

    const nearestHazardZones = hazardRes.rows.map(hz => ({
      ...hz,
      geojson: hz.geojson ? JSON.parse(hz.geojson) : null,
      distanceMeters: Math.round(hz.distance_meters),
      distanceKm: parseFloat((hz.distance_meters / 1000).toFixed(1))
    }));

    return res.status(200).json({
      success: true,
      incident: {
        id: inc.id,
        incidentCode: inc.incident_code,
        severity: inc.severity,
        status: inc.status,
        latitude: incLat,
        longitude: incLng,
        locationAddress: inc.location_address
      },
      nearestRescueTeam: nearestTeams[0] || null,
      nearestTeams,
      nearestShelter: nearestShelters[0] || null,
      nearestShelters,
      nearestHospital: nearestHospitals[0] || null,
      nearestHospitals,
      nearestHazardZones
    });

  } catch (err) {
    console.error('Fetch Incident Nearest Resources Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute nearest spatial resources: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. POST /api/map/incidents/:id/dispatch
// Collector/Admin operational dispatch workflow directly from Live Map
// -------------------------------------------------------------
router.post('/incidents/:id/dispatch', authenticateToken, requireRole(['collector', 'admin', 'super_admin', 'station', 'station_admin', 'rescue_team']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rescueTeamId, unitId, remarks } = req.body;

    if (!rescueTeamId && !unitId) {
      return res.status(400).json({ success: false, error: 'Rescue Team or Unit ID is required for dispatch' });
    }

    // 1. Verify incident
    const isNumericId = !isNaN(parseInt(id, 10)) && String(parseInt(id, 10)) === String(id);
    const incRes = isNumericId
      ? await pool.query("SELECT id, incident_code, status, severity, user_id FROM incidents WHERE id = $1", [parseInt(id, 10)])
      : await pool.query("SELECT id, incident_code, status, severity, user_id FROM incidents WHERE incident_code = $1", [id]);
    if (incRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    const incident = incRes.rows[0];

    // 2. Find rescue unit / team
    let teamName = 'Emergency Response Unit';
    let teamPhone = '112';
    let targetUnitId = unitId;

    if (rescueTeamId) {
      const userTeamRes = await pool.query("SELECT id, name, phone, district FROM users WHERE id = $1", [rescueTeamId]);
      if (userTeamRes.rows.length > 0) {
        teamName = userTeamRes.rows[0].name;
        teamPhone = userTeamRes.rows[0].phone || '112';
      }
    }

    if (!targetUnitId && rescueTeamId) {
      const unitRes = await pool.query("SELECT unit_id, unit_name, contact_number FROM rescue_units WHERE id = $1 OR unit_id = $2", [rescueTeamId, String(rescueTeamId)]);
      if (unitRes.rows.length > 0) {
        teamName = unitRes.rows[0].unit_name;
        teamPhone = unitRes.rows[0].contact_number || teamPhone;
        targetUnitId = unitRes.rows[0].unit_id;
      }
    } else if (targetUnitId) {
      const unitRes = await pool.query("SELECT unit_id, unit_name, contact_number FROM rescue_units WHERE unit_id = $1 OR id = $2", [targetUnitId, parseInt(targetUnitId, 10) || 0]);
      if (unitRes.rows.length > 0) {
        teamName = unitRes.rows[0].unit_name;
        teamPhone = unitRes.rows[0].contact_number || teamPhone;
      }
    }

    const oldStatus = incident.status;
    const newStatus = 'RESPONSE_ASSIGNED';

    // 3. Update Incident Status
    await pool.query(
      `UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, incident.id]
    );

    // 4. Update Rescue Unit status if unitId matches
    if (targetUnitId) {
      await pool.query(
        `UPDATE rescue_units 
         SET status = 'Busy', assigned_incident_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE unit_id = $2 OR id = $3`,
        [incident.incident_code, targetUnitId, parseInt(targetUnitId, 10) || 0]
      );
    }

    // 5. Insert Status History Record
    await pool.query(
      `INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, oldStatus, newStatus, req.user ? req.user.id : null, remarks || `Dispatched Unit: ${teamName}`]
    );

    // 6. Send Notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'INCIDENT_ASSIGNED', 'Rescue Unit Dispatched', $2, 'INCIDENT', $3)`,
      [
        incident.user_id,
        `Rescue Unit ${teamName} (${teamPhone}) has been dispatched to your incident location.`,
        incident.incident_code
      ]
    );

    // 7. Audit Log
    await createAuditLog(req, 'INCIDENT_RESCUE_ASSIGNED', 'Incident', incident.incident_code, req.user?.district || 'Statewide', {
      assignedTeam: teamName,
      unitId: targetUnitId,
      remarks: remarks || ''
    });

    return res.status(200).json({
      success: true,
      message: `Rescue unit ${teamName} dispatched to incident ${incident.incident_code} successfully.`,
      incidentId: incident.id,
      incidentCode: incident.incident_code,
      assignedTeam: teamName,
      status: newStatus
    });

  } catch (err) {
    console.error('Dispatch Incident Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to dispatch rescue team: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. GET /api/map/hazard-zones
// PostGIS Hazard Zones Layer with GeoJSON polygons
// -------------------------------------------------------------
router.get('/hazard-zones', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        hazard_type AS "hazardType", 
        severity, 
        description, 
        source, 
        active,
        ST_AsGeoJSON(geometry) AS geojson,
        created_at AS "createdAt"
      FROM hazard_zones
      WHERE active = true
      ORDER BY id ASC;
    `);

    const zones = result.rows.map(z => ({
      id: z.id,
      name: z.name,
      hazardType: z.hazardType,
      severity: z.severity,
      description: z.description,
      source: z.source,
      active: z.active,
      geojson: z.geojson ? JSON.parse(z.geojson) : null,
      createdAt: z.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: zones.length,
      zones
    });

  } catch (err) {
    console.error('Fetch Hazard Zones Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch hazard zones: ' + err.message });
  }
});

// -------------------------------------------------------------
// 5. GET /api/map/nearby
// PostGIS / Haversine spatial lookup for Citizen Safety Map
// -------------------------------------------------------------
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 25000 } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusMeters = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    // 1. Nearby Incidents (Public Safe)
    const incRes = await pool.query(`
      SELECT 
        i.id, i.incident_code, i.severity, i.description, i.latitude, i.longitude,
        i.location_address, i.status, i.created_at, it.name AS incident_type_name
      FROM incidents i
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      WHERE i.status NOT IN ('REJECTED', 'CLOSED')
    `);

    const nearbyIncidents = incRes.rows
      .map(row => {
        const d = haversineDistanceMeters(latNum, lngNum, parseFloat(row.latitude), parseFloat(row.longitude));
        return {
          id: row.id,
          incidentCode: row.incident_code,
          incidentTypeName: row.incident_type_name || 'General Incident',
          severity: row.severity,
          description: row.description,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          locationAddress: row.location_address,
          status: row.status,
          distanceMeters: Math.round(d),
          distanceKm: parseFloat((d / 1000).toFixed(1)),
          createdAt: row.created_at
        };
      })
      .filter(i => i.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    // 2. Nearby Relief Shelters
    const shelterRes = await pool.query(`
      SELECT id, name, district, address, latitude, longitude, capacity, available_capacity, contact_number
      FROM shelters
    `);

    const nearbyShelters = shelterRes.rows
      .map(s => {
        const sLat = parseFloat(s.latitude);
        const sLng = parseFloat(s.longitude);
        const d = (!isNaN(sLat) && !isNaN(sLng)) ? haversineDistanceMeters(latNum, lngNum, sLat, sLng) : 9999999;
        return {
          id: s.id,
          name: s.name,
          district: s.district,
          address: s.address,
          latitude: sLat,
          longitude: sLng,
          capacity: s.capacity || 100,
          availableCapacity: s.available_capacity || 0,
          contactNumber: s.contact_number,
          distanceMeters: Math.round(d),
          distanceKm: parseFloat((d / 1000).toFixed(1)),
          status: (s.available_capacity && s.available_capacity > 0) ? 'OPEN' : 'FULL'
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    // 3. Nearby Hospitals
    const hospRes = await pool.query(`
      SELECT id, name, district, address, latitude, longitude, contact_number, emergency_available, bed_capacity, available_beds, trauma_care_level
      FROM hospitals
    `);

    const nearbyHospitals = hospRes.rows
      .map(h => {
        const hLat = parseFloat(h.latitude);
        const hLng = parseFloat(h.longitude);
        const d = (!isNaN(hLat) && !isNaN(hLng)) ? haversineDistanceMeters(latNum, lngNum, hLat, hLng) : 9999999;
        return {
          id: h.id,
          name: h.name,
          district: h.district,
          address: h.address,
          latitude: hLat,
          longitude: hLng,
          contactNumber: h.contact_number,
          emergencyAvailable: h.emergency_available !== false,
          bedCapacity: h.bed_capacity || 200,
          availableBeds: h.available_beds || 20,
          traumaCareLevel: h.trauma_care_level || 'Level 2 Trauma',
          distanceMeters: Math.round(d),
          distanceKm: parseFloat((d / 1000).toFixed(1))
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    // 4. Active Disaster Alerts
    const alertsRes = await pool.query(`
      SELECT id, district, alert_level, alert_type, description, source, start_time, end_time
      FROM disaster_alerts
      ORDER BY id DESC LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      center: { latitude: latNum, longitude: lngNum },
      radiusMeters,
      incidents: nearbyIncidents,
      shelters: nearbyShelters.slice(0, 10),
      hospitals: nearbyHospitals.slice(0, 10),
      alerts: alertsRes.rows,
      nearestShelter: nearbyShelters[0] || null,
      nearestHospital: nearbyHospitals[0] || null
    });

  } catch (err) {
    console.error('Map Nearby Query Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to query nearby safety resources: ' + err.message });
  }
});

// -------------------------------------------------------------
// 6. GET /api/map/shelters
// Relief Shelters list with distance calculation
// -------------------------------------------------------------
router.get('/shelters', optionalAuth, async (req, res) => {
  try {
    const { district, lat, lng } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    let query = 'SELECT id, name, district, address, latitude, longitude, capacity, available_capacity, contact_number FROM shelters';
    const params = [];

    let cleanDist = district ? String(district).replace(/\s*district\b/i, '').replace(/,\s*kerala\b/i, '').trim() : '';

    if (cleanDist && cleanDist.toLowerCase() !== 'all' && cleanDist.toLowerCase() !== 'statewide' && cleanDist.toLowerCase() !== 'all kerala') {
      params.push(`%${cleanDist.toLowerCase()}%`);
      params.push(cleanDist.toLowerCase());
      query += ` WHERE (LOWER(district) LIKE $1 OR LOWER(address) LIKE $1 OR $2 LIKE '%' || LOWER(district) || '%')`;
    }

    let result = await pool.query(query, params);

    // Fallback: if no shelters found for specified district, fetch all shelters so proximity sort can provide closest camps
    if (result.rows.length === 0 && cleanDist) {
      result = await pool.query('SELECT id, name, district, address, latitude, longitude, capacity, available_capacity, contact_number FROM shelters');
    }

    const shelters = result.rows.map(s => {
      const sLat = parseFloat(s.latitude);
      const sLng = parseFloat(s.longitude);
      let distanceMeters = null;
      let distanceKm = null;

      if (hasGps && !isNaN(sLat) && !isNaN(sLng)) {
        distanceMeters = Math.round(haversineDistanceMeters(latNum, lngNum, sLat, sLng));
        distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
      }

      return {
        id: s.id,
        name: s.name,
        district: s.district,
        address: s.address,
        latitude: sLat,
        longitude: sLng,
        capacity: s.capacity || 100,
        availableCapacity: s.available_capacity || 0,
        contactNumber: s.contact_number,
        distanceMeters,
        distanceKm,
        status: (s.available_capacity && s.available_capacity > 0) ? 'OPEN' : 'FULL'
      };
    });

    if (hasGps) {
      shelters.sort((a, b) => (a.distanceMeters || 9999999) - (b.distanceMeters || 9999999));
    }

    return res.status(200).json({ success: true, count: shelters.length, shelters });

  } catch (err) {
    console.error('Fetch Map Shelters Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch shelters: ' + err.message });
  }
});

// -------------------------------------------------------------
// 7. GET /api/map/hospitals
// Hospitals directory with distance calculation
// -------------------------------------------------------------
router.get('/hospitals', optionalAuth, async (req, res) => {
  try {
    const { district, lat, lng } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    let query = 'SELECT id, name, district, address, latitude, longitude, contact_number, emergency_available, bed_capacity, available_beds, trauma_care_level FROM hospitals';
    const params = [];

    if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
      params.push(`%${district.toLowerCase()}%`);
      query += ` WHERE LOWER(district) LIKE $${params.length}`;
    }

    const result = await pool.query(query, params);

    const hospitals = result.rows.map(h => {
      const hLat = parseFloat(h.latitude);
      const hLng = parseFloat(h.longitude);
      let distanceMeters = null;
      let distanceKm = null;

      if (hasGps && !isNaN(hLat) && !isNaN(hLng)) {
        distanceMeters = Math.round(haversineDistanceMeters(latNum, lngNum, hLat, hLng));
        distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
      }

      return {
        id: h.id,
        name: h.name,
        district: h.district,
        address: h.address,
        latitude: hLat,
        longitude: hLng,
        contactNumber: h.contact_number,
        emergencyAvailable: h.emergency_available !== false,
        bedCapacity: h.bed_capacity || 200,
        availableBeds: h.available_beds || 20,
        traumaCareLevel: h.trauma_care_level || 'Level 2 Trauma',
        distanceMeters,
        distanceKm
      };
    });

    if (hasGps) {
      hospitals.sort((a, b) => (a.distanceMeters || 9999999) - (b.distanceMeters || 9999999));
    }

    return res.status(200).json({ success: true, count: hospitals.length, hospitals });

  } catch (err) {
    console.error('Fetch Map Hospitals Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch hospitals: ' + err.message });
  }
});

// -------------------------------------------------------------
// 8. GET /api/map/rescue-teams
// STRICT AUTHORIZATION: ONLY Rescue Teams, Collectors & Admins
// -------------------------------------------------------------
router.get('/rescue-teams', authenticateToken, requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']), async (req, res) => {
  try {
    const user = req.user;
    const role = (user?.role || '').toLowerCase();
    const userDistrict = user?.district;
    const { district } = req.query;

    const whereClauses = [];
    const params = [];

    if (role === 'collector') {
      const targetDistrict = userDistrict || district;
      if (targetDistrict) {
        params.push(`%${targetDistrict.toLowerCase()}%`);
        whereClauses.push(`LOWER(district) LIKE $${params.length}`);
      }
    } else if (role === 'station' || role === 'rescue_team' || role === 'station_admin') {
      const targetDistrict = userDistrict || district;
      if (targetDistrict) {
        params.push(`%${targetDistrict.toLowerCase()}%`);
        whereClauses.push(`LOWER(district) LIKE $${params.length}`);
      }
    } else if (role === 'admin' || role === 'super_admin') {
      if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
        params.push(`%${district.toLowerCase()}%`);
        whereClauses.push(`LOWER(district) LIKE $${params.length}`);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        unit_id AS "unitId",
        unit_name AS "unitName",
        unit_type AS "unitType",
        district,
        contact_number AS "contactNumber",
        email,
        status,
        latitude,
        longitude,
        team_leader AS "teamLeader",
        team_size AS "teamSize",
        current_location AS "currentLocation",
        assigned_incident_id AS "assignedIncidentId",
        last_location_update AS "lastLocationUpdate",
        created_at AS "createdAt"
      FROM rescue_units
      ${whereSql}
      ORDER BY id ASC;
    `;

    const result = await pool.query(query, params);
    const now = new Date();

    const teams = result.rows.map(u => {
      const lastUpdate = u.lastLocationUpdate ? new Date(u.lastLocationUpdate) : new Date(u.createdAt);
      const diffMinutes = Math.round((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
      const isStale = diffMinutes > 10;

      let normStatus = (u.status || 'AVAILABLE').toUpperCase();
      if (normStatus === 'ACTIVE') normStatus = 'AVAILABLE';
      if (normStatus === 'BUSY') normStatus = 'ON_DUTY';

      return {
        id: u.id,
        unitId: u.unitId,
        unitName: u.unitName,
        unitType: u.unitType,
        district: u.district,
        contactNumber: u.contactNumber,
        email: u.email,
        status: normStatus,
        latitude: parseFloat(u.latitude) || 9.5916,
        longitude: parseFloat(u.longitude) || 76.5222,
        teamLeader: u.teamLeader || 'Officer in Charge',
        teamSize: u.teamSize || 12,
        currentLocation: u.currentLocation || `${u.district} Base Station`,
        assignedIncidentId: u.assignedIncidentId || null,
        lastLocationUpdate: lastUpdate.toISOString(),
        minutesSinceUpdate: diffMinutes,
        isStale
      };
    });

    return res.status(200).json({
      success: true,
      count: teams.length,
      teams
    });

  } catch (err) {
    console.error('Fetch Map Rescue Teams Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch rescue teams telemetry: ' + err.message });
  }
});

// -------------------------------------------------------------
// 9. PATCH /api/map/rescue-teams/location
// Update live GPS location of a rescue team unit
// -------------------------------------------------------------
router.patch('/rescue-teams/location', authenticateToken, requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']), async (req, res) => {
  try {
    const { unitId, latitude, longitude, currentLocation, status } = req.body;

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude numbers are required' });
    }

    const effectiveUnitId = unitId || req.user.department_id || req.user.departmentId || 'arr.frs';

    const updateQuery = `
      UPDATE rescue_units
      SET latitude = $1,
          longitude = $2,
          current_location = COALESCE($3, current_location),
          status = COALESCE($4, status),
          last_location_update = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE unit_id = $5 OR LOWER(unit_id) = LOWER($5)
      RETURNING id, unit_id AS "unitId", unit_name AS "unitName", latitude, longitude, status, last_location_update AS "lastLocationUpdate";
    `;

    const result = await pool.query(updateQuery, [latNum, lngNum, currentLocation || null, status || null, effectiveUnitId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Rescue unit with ID ${effectiveUnitId} not found in database.` });
    }

    return res.status(200).json({
      success: true,
      message: 'Rescue unit GPS telemetry updated successfully',
      unit: result.rows[0]
    });

  } catch (err) {
    console.error('Update Rescue Team Location Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update rescue team GPS: ' + err.message });
  }
});

// -------------------------------------------------------------
// 10. GET /api/map/summary
// Summary statistics cards for map dashboards
// -------------------------------------------------------------
router.get('/summary', optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const role = (user?.role || 'citizen').toLowerCase();
    const userDistrict = user?.district;
    const { district } = req.query;

    const targetDistrict = (role === 'collector' || role === 'station') ? (userDistrict || district) : (district || userDistrict);

    // 1. Incidents Count
    let incSql = "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity IN ('HIGH', 'CRITICAL')) AS high_critical FROM incidents WHERE status NOT IN ('REJECTED', 'CLOSED')";
    const incParams = [];
    if (targetDistrict && targetDistrict !== 'all' && targetDistrict !== 'Statewide' && targetDistrict !== 'All Kerala') {
      incParams.push(`%${targetDistrict.toLowerCase()}%`);
      incSql += ` AND (LOWER(location_address) LIKE $1 OR id IN (SELECT i.id FROM incidents i JOIN users u ON i.user_id = u.id WHERE LOWER(u.district) LIKE $1))`;
    }
    const incRes = await pool.query(incSql, incParams);

    // 2. Shelters Count
    let shelterSql = "SELECT COUNT(*) AS total, COALESCE(SUM(capacity), 0) AS total_capacity, COALESCE(SUM(available_capacity), 0) AS available_capacity FROM shelters";
    const shelterParams = [];
    if (targetDistrict && targetDistrict !== 'all' && targetDistrict !== 'Statewide' && targetDistrict !== 'All Kerala') {
      shelterParams.push(`%${targetDistrict.toLowerCase()}%`);
      shelterSql += ` WHERE LOWER(district) LIKE $1`;
    }
    const shelterRes = await pool.query(shelterSql, shelterParams);

    // 3. Hospitals Count
    let hospSql = "SELECT COUNT(*) AS total, COALESCE(SUM(available_beds), 0) AS available_beds FROM hospitals";
    const hospParams = [];
    if (targetDistrict && targetDistrict !== 'all' && targetDistrict !== 'Statewide' && targetDistrict !== 'All Kerala') {
      hospParams.push(`%${targetDistrict.toLowerCase()}%`);
      hospSql += ` WHERE LOWER(district) LIKE $1`;
    }
    const hospRes = await pool.query(hospSql, hospParams);

    // 4. Rescue Teams Count
    let teamSql = "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('Active', 'AVAILABLE', 'Available')) AS available, COUNT(*) FILTER (WHERE status IN ('Busy', 'ON_DUTY', 'EN_ROUTE', 'AT_SCENE')) AS on_duty FROM rescue_units";
    const teamParams = [];
    if (targetDistrict && targetDistrict !== 'all' && targetDistrict !== 'Statewide' && targetDistrict !== 'All Kerala') {
      teamParams.push(`%${targetDistrict.toLowerCase()}%`);
      teamSql += ` WHERE LOWER(district) LIKE $1`;
    }
    const teamRes = await pool.query(teamSql, teamParams);

    // 5. Active Alerts Count
    let alertSql = "SELECT COUNT(*) AS total FROM disaster_alerts";
    const alertParams = [];
    if (targetDistrict && targetDistrict !== 'all' && targetDistrict !== 'Statewide' && targetDistrict !== 'All Kerala') {
      alertParams.push(`%${targetDistrict.toLowerCase()}%`);
      alertSql += ` WHERE LOWER(district) LIKE $1`;
    }
    const alertRes = await pool.query(alertSql, alertParams);

    return res.status(200).json({
      success: true,
      district: targetDistrict || 'Kerala Statewide',
      stats: {
        activeIncidents: parseInt(incRes.rows[0].total, 10) || 0,
        highCriticalIncidents: parseInt(incRes.rows[0].high_critical, 10) || 0,
        openShelters: parseInt(shelterRes.rows[0].total, 10) || 0,
        availableShelterBeds: parseInt(shelterRes.rows[0].available_capacity, 10) || 0,
        totalHospitals: parseInt(hospRes.rows[0].total, 10) || 0,
        availableHospitalBeds: parseInt(hospRes.rows[0].available_beds, 10) || 0,
        availableTeams: parseInt(teamRes.rows[0].available, 10) || 0,
        onDutyTeams: parseInt(teamRes.rows[0].on_duty, 10) || 0,
        totalRescueTeams: parseInt(teamRes.rows[0].total, 10) || 0,
        activeAlerts: parseInt(alertRes.rows[0].total, 10) || 0
      }
    });

  } catch (err) {
    console.error('Fetch Map Summary Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch map summary: ' + err.message });
  }
});

// -------------------------------------------------------------
// 11. GET /api/map/weather-alerts
// Active weather alerts and IMD zone data
// -------------------------------------------------------------
router.get('/weather-alerts', optionalAuth, async (req, res) => {
  try {
    const { district } = req.query;
    let query = 'SELECT * FROM disaster_alerts';
    const params = [];

    if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
      params.push(`%${district.toLowerCase()}%`);
      query += ' WHERE LOWER(district) LIKE $1';
    }
    query += ' ORDER BY id DESC LIMIT 20;';

    const result = await pool.query(query, params);
    return res.status(200).json({ success: true, alerts: result.rows });
  } catch (err) {
    console.error('Fetch Map Weather Alerts Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch weather alerts: ' + err.message });
  }
});

// -------------------------------------------------------------
// 12. GET /api/map/road-hazards
// Road safety conditions layer (Safe, Caution, Hazardous, Blocked)
// -------------------------------------------------------------
router.get('/road-hazards', optionalAuth, async (req, res) => {
  try {
    const { district, status, lat, lng, radius = 50000 } = req.query;
    const whereClauses = ['is_active = true'];
    const params = [];

    if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
      params.push(`%${district.toLowerCase()}%`);
      whereClauses.push(`LOWER(district) LIKE $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status.toUpperCase());
      whereClauses.push(`status = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        road_name AS "roadName",
        district,
        status,
        hazard_type AS "hazardType",
        description,
        severity,
        start_lat AS "startLat",
        start_lng AS "startLng",
        end_lat AS "endLat",
        end_lng AS "endLng",
        ST_AsGeoJSON(geometry) AS geojson,
        reported_by AS "reportedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM road_hazards
      ${whereSql}
      ORDER BY 
        CASE status 
          WHEN 'BLOCKED' THEN 1 
          WHEN 'HAZARDOUS' THEN 2 
          WHEN 'CAUTION' THEN 3 
          ELSE 4 END,
        id ASC;
    `;

    const result = await pool.query(query, params);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    const roads = result.rows.map(r => {
      let distanceMeters = null;
      let distanceKm = null;
      if (hasGps && r.startLat && r.startLng) {
        distanceMeters = Math.round(haversineDistanceMeters(latNum, lngNum, parseFloat(r.startLat), parseFloat(r.startLng)));
        distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
      }

      return {
        ...r,
        startLat: parseFloat(r.startLat),
        startLng: parseFloat(r.startLng),
        endLat: parseFloat(r.endLat),
        endLng: parseFloat(r.endLng),
        geojson: r.geojson ? JSON.parse(r.geojson) : null,
        distanceMeters,
        distanceKm
      };
    });

    return res.status(200).json({
      success: true,
      count: roads.length,
      roads
    });
  } catch (err) {
    console.error('Fetch Road Hazards Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch road conditions: ' + err.message });
  }
});

// -------------------------------------------------------------
// 13. POST /api/map/road-hazards
// Report or update a road condition (Official/Citizen)
// -------------------------------------------------------------
router.post('/road-hazards', optionalAuth, async (req, res) => {
  try {
    const { roadName, district, status, hazardType, description, severity, startLat, startLng, endLat, endLng, reportedBy } = req.body;

    if (!roadName || !district || !status || !hazardType || isNaN(parseFloat(startLat)) || isNaN(parseFloat(startLng))) {
      return res.status(400).json({ success: false, error: 'Missing required road hazard information' });
    }

    const sLat = parseFloat(startLat);
    const sLng = parseFloat(startLng);
    const eLat = parseFloat(endLat || startLat);
    const eLng = parseFloat(endLng || startLng);

    const insertSql = `
      INSERT INTO road_hazards (
        road_name, district, status, hazard_type, description, severity,
        start_lat, start_lng, end_lat, end_lng, geometry, reported_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        ST_SetSRID(ST_MakeLine(ST_MakePoint($8, $7), ST_MakePoint($10, $9)), 4326),
        $11
      ) RETURNING id, road_name AS "roadName", district, status, hazard_type AS "hazardType", severity, description;
    `;

    const result = await pool.query(insertSql, [
      roadName,
      district,
      status.toUpperCase(),
      hazardType,
      description || '',
      severity || 'MODERATE',
      sLat,
      sLng,
      eLat,
      eLng,
      reportedBy || req.user?.name || 'Citizen Report'
    ]);

    const created = result.rows[0];
    notifyRoadHazardUpdate(created);

    return res.status(201).json({
      success: true,
      message: 'Road condition recorded successfully',
      hazard: created
    });
  } catch (err) {
    console.error('Create Road Hazard Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record road hazard: ' + err.message });
  }
});

// -------------------------------------------------------------
// 14. GET /api/map/iot-sensors
// IoT environmental telemetry layer (Water level, rainfall, landslide, etc.)
// -------------------------------------------------------------
router.get('/iot-sensors', optionalAuth, async (req, res) => {
  try {
    const { district, type, status, lat, lng } = req.query;
    const whereClauses = [];
    const params = [];

    if (district && district !== 'all' && district !== 'Statewide' && district !== 'All Kerala') {
      params.push(`%${district.toLowerCase()}%`);
      whereClauses.push(`LOWER(district) LIKE $${params.length}`);
    }

    if (type && type !== 'all') {
      params.push(type.toUpperCase());
      whereClauses.push(`sensor_type = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status.toUpperCase());
      whereClauses.push(`status = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        sensor_code AS "sensorCode",
        sensor_name AS "sensorName",
        sensor_type AS "sensorType",
        district,
        location_name AS "locationName",
        latitude,
        longitude,
        current_value AS "currentValue",
        unit,
        threshold_warning AS "thresholdWarning",
        threshold_critical AS "thresholdCritical",
        status,
        battery_pct AS "batteryPct",
        last_telemetry_at AS "lastTelemetryAt"
      FROM iot_sensors
      ${whereSql}
      ORDER BY 
        CASE status 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'WARNING' THEN 2 
          WHEN 'NORMAL' THEN 3 
          ELSE 4 END,
        id ASC;
    `;

    const result = await pool.query(query, params);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    const sensors = result.rows.map(s => {
      const sLat = parseFloat(s.latitude);
      const sLng = parseFloat(s.longitude);
      let distanceMeters = null;
      let distanceKm = null;

      if (hasGps && !isNaN(sLat) && !isNaN(sLng)) {
        distanceMeters = Math.round(haversineDistanceMeters(latNum, lngNum, sLat, sLng));
        distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
      }

      return {
        ...s,
        latitude: sLat,
        longitude: sLng,
        currentValue: parseFloat(s.currentValue),
        thresholdWarning: parseFloat(s.thresholdWarning),
        thresholdCritical: parseFloat(s.thresholdCritical),
        distanceMeters,
        distanceKm
      };
    });

    return res.status(200).json({
      success: true,
      count: sensors.length,
      sensors
    });
  } catch (err) {
    console.error('Fetch IoT Sensors Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch IoT sensors: ' + err.message });
  }
});

// -------------------------------------------------------------
// 15. POST /api/map/safe-route & POST /api/map/compare-routes
// Intelligent safe route calculation & normal vs safe comparison
// -------------------------------------------------------------
const handleRouteCalculation = async (req, res) => {
  try {
    const { origin, destination, simulationScenario, district } = req.body;
    const scenarioQuery = req.query.simulationScenario || simulationScenario;

    if (!origin || !destination) {
      return res.status(400).json({ success: false, error: 'Origin and destination coordinates are required.' });
    }

    const result = await calculateSafeRoute(origin, destination, {
      simulationScenario: scenarioQuery,
      district
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Calculate Safe Route Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate safe route: ' + err.message });
  }
};

router.post('/safe-route', optionalAuth, handleRouteCalculation);
router.post('/compare-routes', optionalAuth, handleRouteCalculation);

// -------------------------------------------------------------
// Simulation & Testing Control Endpoints (Isolated for Developer Testing)
// -------------------------------------------------------------
router.get('/simulation/scenarios', optionalAuth, (req, res) => {
  try {
    const scenarios = listScenarios();
    const active = getActiveScenario();
    return res.status(200).json({
      success: true,
      activeScenario: active?.id || null,
      scenarios
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/scenario', optionalAuth, (req, res) => {
  try {
    const { scenarioId } = req.body;
    const result = setActiveScenario(scenarioId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/simulation/reset', optionalAuth, (req, res) => {
  try {
    const result = setActiveScenario(null);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/inject-realtime-hazard', optionalAuth, (req, res) => {
  try {
    const { district = 'Thrissur', roadName = 'Primary Route Ahead', hazardType = 'Flash Flood Debris' } = req.body;
    
    // Set active scenario to REALTIME_HAZARD_INJECTION
    setActiveScenario('REALTIME_HAZARD_INJECTION');

    // Broadcast real-time road hazard socket update to force client-side route invalidation
    notifyRoadHazardUpdate({
      id: 9999,
      roadName,
      status: 'BLOCKED',
      hazardType,
      severity: 'CRITICAL',
      district,
      isSimulated: true
    }, district);

    return res.status(200).json({
      success: true,
      message: 'Real-time hazard injected and broadcast via Socket.IO successfully',
      scenario: 'REALTIME_HAZARD_INJECTION'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 16. POST /api/map/evacuate-me
// Intelligent multi-criteria shelter ranking & safe evacuation recommendation
// -------------------------------------------------------------
router.post('/evacuate-me', optionalAuth, async (req, res) => {
  try {
    const { citizenLocation, district } = req.body;

    const lat = citizenLocation?.lat || citizenLocation?.latitude;
    const lng = citizenLocation?.lng || citizenLocation?.longitude;

    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ success: false, error: 'Citizen current GPS latitude and longitude are required.' });
    }

    const result = await rankEvacuationCenters(lat, lng, district);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Evacuation Ranking Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute evacuation ranking: ' + err.message });
  }
});

// -------------------------------------------------------------
// 17. GET /api/map/safety-status
// Dynamically calculated citizen safety status badge & summary
// -------------------------------------------------------------
router.get('/safety-status', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, district } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    // 1. Check if citizen is inside any active hazard zone
    const insideHazardRes = await pool.query(
      `SELECT id, name, hazard_type, severity, description 
       FROM hazard_zones 
       WHERE active = true 
         AND ST_Intersects(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1`,
      [lngNum, latNum]
    );

    // 2. Nearest hazard zones within 10 km
    const nearbyHazardRes = await pool.query(
      `SELECT id, name, hazard_type, severity,
              ROUND(ST_Distance(geometry::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_meters
       FROM hazard_zones
       WHERE active = true AND ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 10000)
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [lngNum, latNum]
    );

    // 3. Nearby active incidents within 10 km
    const nearbyIncRes = await pool.query(
      `SELECT id, incident_code, severity,
              ROUND(ST_Distance(COALESCE(location, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_meters
       FROM incidents
       WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
         AND ST_DWithin(COALESCE(location, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 10000)
       ORDER BY distance_meters ASC`,
      [lngNum, latNum]
    );

    // 4. Blocked roads within 5 km
    const blockedRoadRes = await pool.query(
      `SELECT id, road_name, hazard_type,
              ROUND(ST_Distance(geometry::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_meters
       FROM road_hazards
       WHERE is_active = true AND status = 'BLOCKED'
         AND ST_DWithin(geometry::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 5000)
       ORDER BY distance_meters ASC`,
      [lngNum, latNum]
    );

    // 5. Open shelters nearby
    const shelterRes = await pool.query(
      `SELECT id, name, capacity, available_capacity,
              ROUND(ST_Distance(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_meters
       FROM shelters
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [lngNum, latNum]
    );

    // 6. Rescue teams nearby
    const teamsRes = await pool.query(
      `SELECT id, unit_name, status,
              ROUND(ST_Distance(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::numeric, 0) AS distance_meters
       FROM rescue_units
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY distance_meters ASC
       LIMIT 5`,
      [lngNum, latNum]
    );

    // DYNAMIC SAFETY STATUS DETERMINATION:
    let safetyStatus = 'SAFE'; // SAFE | WARNING | EMERGENCY
    let statusMessage = 'AREA CURRENTLY SAFE';
    let statusColor = 'GREEN';
    let emergencyAlert = null;

    const isInsideZone = insideHazardRes.rows.length > 0;
    const criticalIncidentsNearby = nearbyIncRes.rows.filter(i => i.severity === 'CRITICAL' && i.distance_meters <= 2500);
    const blockedRoadsImmediate = blockedRoadRes.rows.filter(r => r.distance_meters <= 1500);

    if (isInsideZone) {
      const zone = insideHazardRes.rows[0];
      safetyStatus = 'EMERGENCY';
      statusMessage = 'EMERGENCY IN YOUR AREA';
      statusColor = 'RED';
      emergencyAlert = {
        title: `🔴 EMERGENCY IN YOUR AREA: Inside ${zone.name}`,
        description: `Your current location is inside an active ${zone.hazard_type} zone (${zone.severity} severity). Immediate evacuation recommended.`,
        hazardType: zone.hazard_type,
        severity: zone.severity
      };
    } else if (criticalIncidentsNearby.length > 0) {
      const inc = criticalIncidentsNearby[0];
      safetyStatus = 'EMERGENCY';
      statusMessage = 'EMERGENCY IN YOUR AREA';
      statusColor = 'RED';
      emergencyAlert = {
        title: `🔴 EMERGENCY IN YOUR AREA: Critical Incident Nearby`,
        description: `Critical emergency reported ${(inc.distance_meters / 1000).toFixed(1)} km from your location. A safer evacuation route is available.`,
        distanceKm: (inc.distance_meters / 1000).toFixed(1)
      };
    } else if (blockedRoadsImmediate.length > 0) {
      const br = blockedRoadsImmediate[0];
      safetyStatus = 'WARNING';
      statusMessage = 'WARNING IN YOUR AREA';
      statusColor = 'YELLOW';
      emergencyAlert = {
        title: `🟡 WARNING: Road Blockage Nearby`,
        description: `${br.road_name} is blocked ${(br.distance_meters / 1000).toFixed(1)} km away (${br.hazard_type}). Safe alternate routes available.`
      };
    } else if (nearbyHazardRes.rows.length > 0 && nearbyHazardRes.rows[0].distance_meters <= 5000) {
      const hz = nearbyHazardRes.rows[0];
      safetyStatus = 'WARNING';
      statusMessage = 'WARNING IN YOUR AREA';
      statusColor = 'YELLOW';
      emergencyAlert = {
        title: `🟡 WARNING: Active Disaster Zone Nearby`,
        description: `${hz.name} is active ${(hz.distance_meters / 1000).toFixed(1)} km from your location.`
      };
    }

    const nearestShelter = shelterRes.rows[0] ? {
      ...shelterRes.rows[0],
      distanceKm: parseFloat((shelterRes.rows[0].distance_meters / 1000).toFixed(1))
    } : null;

    return res.status(200).json({
      success: true,
      safetyStatus,
      statusMessage,
      statusColor,
      emergencyAlert,
      metrics: {
        activeDisastersNearby: nearbyHazardRes.rows.length,
        activeIncidentsNearby: nearbyIncRes.rows.length,
        blockedRoadsNearby: blockedRoadRes.rows.length,
        openSheltersNearby: shelterRes.rows.length,
        rescueTeamsNearby: teamsRes.rows.length,
        nearestShelter
      }
    });

  } catch (err) {
    console.error('Fetch Safety Status Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate safety status: ' + err.message });
  }
});

module.exports = router;

