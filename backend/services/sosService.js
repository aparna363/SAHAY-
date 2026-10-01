const pool = require('../db');
const { createNotification, sendDistrictRoleNotification } = require('./notificationService');
const { broadcastEvent } = require('./socketService');

// Kerala Taluks Reference Mapping
const KERALA_TALUKS = {
  'Alappuzha': ['Ambalapuzha', 'Chengannur', 'Cherthala', 'Karthikappally', 'Kuttanad', 'Mavelikkara'],
  'Ernakulam': ['Aluva', 'Kanayannur', 'Kochi', 'Kothamangalam', 'Kunnathunad', 'Muvattupuzha', 'Paravur'],
  'Idukki': ['Devikulam', 'Peerumade', 'Thodupuzha', 'Udumbanchola', 'Idukki'],
  'Kannur': ['Kannur', 'Taliparamba', 'Thalassery', 'Iritty', 'Payyannur'],
  'Kasaragod': ['Hosdurg', 'Kasaragod', 'Manjeshwaram', 'Vellarikundu'],
  'Kollam': ['Kollam', 'Karunagappally', 'Kunnathur', 'Kottarakkara', 'Punalur', 'Pathanapuram'],
  'Kottayam': ['Kottayam', 'Changanassery', 'Kanjirappally', 'Meenachil', 'Vaikom'],
  'Kozhikode': ['Kozhikode', 'Koyilandy', 'Thamarassery', 'Vadakara'],
  'Malappuram': ['Eranad', 'Kondotty', 'Nilambur', 'Perinthalmanna', 'Ponnani', 'Tirur', 'Tirurangadi'],
  'Palakkad': ['Alathur', 'Chittur', 'Mannarkkad', 'Ottappalam', 'Palakkad', 'Pattambi'],
  'Pathanamthitta': ['Adoor', 'Konni', 'Kozhencherry', 'Mallappally', 'Ranni', 'Thiruvalla'],
  'Thiruvananthapuram': ['Chirayinkeezhu', 'Nedumangad', 'Neyyattinkara', 'Thiruvananthapuram', 'Varkala', 'Kattakada'],
  'Thrissur': ['Chalakudy', 'Chavakkad', 'Kodungallur', 'Mukundapuram', 'Thalapilly', 'Thrissur'],
  'Wayanad': ['Mananthavady', 'Sulthan Bathery', 'Vythiri']
};

/**
 * Haversine distance in kilometers
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates sequential SOS ID e.g. SOS-2026-00125
 */
async function generateSOSCode() {
  const year = new Date().getFullYear();
  try {
    const maxRes = await pool.query(`
      SELECT COALESCE(
        MAX(
          NULLIF(regexp_replace(sos_code, '^SOS-[0-9]{4}-', ''), '')
        )::bigint, 
        0
      ) AS max_seq 
      FROM sos_requests 
      WHERE sos_code ~ '^SOS-[0-9]{4}-[0-9]+$'
    `);
    const nextSeq = (parseInt(maxRes.rows[0].max_seq, 10) || 0) + 1;
    return `SOS-${year}-${String(nextSeq).padStart(5, '0')}`;
  } catch (err) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `SOS-${year}-${rand}`;
  }
}


/**
 * Determine District & Taluk heuristic fallback from coordinates if not provided
 */
function resolveDistrictAndTaluk(lat, lng, address = '', clientDistrict = '', clientTaluk = '') {
  let district = clientDistrict && clientDistrict !== 'Unknown' ? clientDistrict : '';
  let taluk = clientTaluk && clientTaluk !== 'Unknown' ? clientTaluk : '';

  // Scan address string if available
  if (address) {
    for (const [dist, taluks] of Object.entries(KERALA_TALUKS)) {
      if (new RegExp(`\\b${dist}\\b`, 'i').test(address)) {
        district = dist;
      }
      for (const t of taluks) {
        if (new RegExp(`\\b${t}\\b`, 'i').test(address)) {
          taluk = t;
          district = dist;
          break;
        }
      }
    }
  }

  // Centroid-based approximate fallback if still unknown
  if (!district) {
    const DISTRICT_CENTERS = [
      { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
      { name: 'Kollam', lat: 8.8932, lng: 76.6141 },
      { name: 'Pathanamthitta', lat: 9.2648, lng: 76.787 },
      { name: 'Alappuzha', lat: 9.4981, lng: 76.3388 },
      { name: 'Kottayam', lat: 9.5916, lng: 76.5222 },
      { name: 'Idukki', lat: 9.851, lng: 76.945 },
      { name: 'Ernakulam', lat: 9.9816, lng: 76.2999 },
      { name: 'Thrissur', lat: 10.5276, lng: 76.2144 },
      { name: 'Palakkad', lat: 10.7867, lng: 76.6548 },
      { name: 'Malappuram', lat: 11.072, lng: 76.074 },
      { name: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
      { name: 'Wayanad', lat: 11.6854, lng: 76.132 },
      { name: 'Kannur', lat: 11.8745, lng: 75.3704 },
      { name: 'Kasaragod', lat: 12.4996, lng: 74.9869 }
    ];

    let minDist = Infinity;
    let closest = 'Kottayam';
    for (const d of DISTRICT_CENTERS) {
      const dist = haversineDistanceKm(lat, lng, d.lat, d.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = d.name;
      }
    }
    district = closest;
  }

  if (!taluk && district && KERALA_TALUKS[district]) {
    taluk = KERALA_TALUKS[district][0]; // Default to district headquarters taluk
  }

  return { district, taluk };
}

/**
 * Identifies nearby resources using PostGIS / Haversine and prioritizes rescue teams
 */
async function findNearbyResources({ latitude, longitude, district, emergencyType }) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  let nearbyTeams = [];
  let nearbyHospitals = [];
  let nearbyShelters = [];

  try {
    // 1. Fetch available Rescue Units / Teams in district or nearby
    const teamsRes = await pool.query(
      `SELECT 
         id, unit_id, unit_name, unit_type, district, contact_number, 
         email, status, latitude, longitude, team_leader, team_size, current_location
       FROM rescue_units 
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
    );

    // Also fetch user accounts that are approved rescue teams
    const userTeamsRes = await pool.query(
      `SELECT 
         id, name as unit_name, 'Fire & Safety' as unit_type, district, 
         phone as contact_number, email, status, designation, department_id as unit_id
       FROM users 
       WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'approved'`
    );

    // Active workload query: count ongoing active SOS for rescue units
    const activeWorkloadRes = await pool.query(
      `SELECT assigned_team_id, COUNT(*) as active_count 
       FROM sos_requests 
       WHERE status IN ('Team Assigned', 'Rescue In Progress') AND assigned_team_id IS NOT NULL 
       GROUP BY assigned_team_id`
    );
    const workloadMap = {};
    activeWorkloadRes.rows.forEach(r => {
      workloadMap[r.assigned_team_id] = parseInt(r.active_count, 10);
    });

    const combinedTeams = [...teamsRes.rows];

    // Merge in user teams if not already present
    userTeamsRes.rows.forEach(ut => {
      if (!combinedTeams.find(t => t.id === ut.id || t.unit_id === ut.unit_id)) {
        combinedTeams.push({
          ...ut,
          latitude: lat + (Math.random() - 0.5) * 0.05, // If coordinate not set on user, approximate
          longitude: lng + (Math.random() - 0.5) * 0.05,
          team_leader: ut.unit_name,
          team_size: 10,
          current_location: `${ut.district} Station HQ`
        });
      }
    });

    nearbyTeams = combinedTeams.map(team => {
      const tLat = parseFloat(team.latitude);
      const tLng = parseFloat(team.longitude);
      const distKm = haversineDistanceKm(lat, lng, tLat, tLng);

      // Prioritization calculation:
      // 1. Distance (max 100 pts)
      const distanceScore = Math.max(0, 100 - distKm * 3);

      // 2. On-duty / Availability status (max 40 pts)
      let availScore = 0;
      const statusLower = (team.status || '').toLowerCase();
      if (statusLower === 'active' || statusLower === 'approved') availScore = 40;
      else if (statusLower === 'busy') availScore = 15;
      else availScore = -50;

      // 3. Emergency category compatibility (max 30 pts)
      let catScore = 10;
      const uType = (team.unit_type || '').toLowerCase();
      const eType = (emergencyType || '').toLowerCase();

      if (eType.includes('fire') && uType.includes('fire')) catScore = 30;
      else if ((eType.includes('flood') || eType.includes('landslide')) && (uType.includes('ndrf') || uType.includes('fire'))) catScore = 30;
      else if ((eType.includes('accident') || eType.includes('medical')) && (uType.includes('police') || uType.includes('fire'))) catScore = 25;

      // 4. Assigned workload penalty (-15 pts per active operation)
      const currentWorkload = workloadMap[team.id] || 0;
      const workloadScore = -(currentWorkload * 15);

      const totalPriorityScore = Math.round(distanceScore + availScore + catScore + workloadScore);

      return {
        id: team.id,
        unitId: team.unit_id,
        unitName: team.unit_name,
        unitType: team.unit_type,
        district: team.district,
        contactNumber: team.contact_number,
        status: team.status,
        distanceKm: Math.round(distKm * 10) / 10,
        teamLeader: team.team_leader,
        teamSize: team.team_size,
        currentWorkload,
        priorityScore: totalPriorityScore
      };
    });

    // Sort by highest priority score
    nearbyTeams.sort((a, b) => b.priorityScore - a.priorityScore);
    nearbyTeams = nearbyTeams.slice(0, 5);

    // 2. Fetch Nearby Hospitals
    const hospRes = await pool.query(
      `SELECT id, name, district, address, latitude, longitude, contact_number, 
              emergency_available, trauma_care_level, available_beds
       FROM hospitals`
    );
    nearbyHospitals = hospRes.rows.map(h => ({
      id: h.id,
      name: h.name,
      district: h.district,
      address: h.address,
      contactNumber: h.contact_number,
      emergencyAvailable: h.emergency_available,
      traumaCareLevel: h.trauma_care_level,
      availableBeds: h.available_beds,
      distanceKm: Math.round(haversineDistanceKm(lat, lng, parseFloat(h.latitude), parseFloat(h.longitude)) * 10) / 10
    })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);

    // 3. Fetch Nearby Shelters
    const shelterRes = await pool.query(
      `SELECT id, name, district, address, latitude, longitude, capacity, available_capacity, contact_number
       FROM shelters`
    );
    nearbyShelters = shelterRes.rows.map(s => ({
      id: s.id,
      name: s.name,
      district: s.district,
      address: s.address,
      contactNumber: s.contact_number,
      availableCapacity: s.available_capacity,
      distanceKm: Math.round(haversineDistanceKm(lat, lng, parseFloat(s.latitude), parseFloat(s.longitude)) * 10) / 10
    })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);

  } catch (err) {
    console.error('findNearbyResources error:', err.message);
  }

  return { nearbyTeams, nearbyHospitals, nearbyShelters };
}

/**
 * Create SOS Request
 */
async function createSOSRequest({
  userId,
  emergencyType,
  description,
  affectedPeople = 1,
  latitude,
  longitude,
  address,
  district: clientDistrict,
  taluk: clientTaluk,
  photoUrl,
  reporterName,
  reporterPhone
}) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Valid GPS latitude and longitude are required.');
  }

  // Safeguard: Check for existing active SOS from this citizen
  if (userId) {
    const existing = await pool.query(
      `SELECT * FROM sos_requests 
       WHERE user_id = $1 
         AND status IN ('Pending', 'Acknowledged', 'Team Assigned', 'Rescue In Progress')
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      const activeSOS = existing.rows[0];
      const err = new Error('You already have an active SOS emergency request in progress.');
      err.code = 'DUPLICATE_ACTIVE_SOS';
      err.existingSOS = activeSOS;
      throw err;
    }
  }

  // Resolve District and Taluk
  const { district, taluk } = resolveDistrictAndTaluk(lat, lng, address, clientDistrict, clientTaluk);
  const sosCode = await generateSOSCode();

  // Insert SOS Request into PostgreSQL with PostGIS Geometry Point
  const insertQuery = `
    INSERT INTO sos_requests (
      sos_code, user_id, emergency_type, description, affected_people,
      latitude, longitude, location, address, district, taluk, photo_url,
      status, reporter_name, reporter_phone
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6::numeric, $7::numeric, ST_SetSRID(ST_MakePoint($7::numeric, $6::numeric), 4326), $8, $9, $10, $11,
      'Pending', $12, $13
    ) RETURNING *;
  `;

  const values = [
    sosCode,
    userId || null,
    emergencyType,
    description || null,
    parseInt(affectedPeople, 10) || 1,
    lat,
    lng,
    address || `${taluk || district}, Kerala`,
    district,
    taluk,
    photoUrl || null,
    reporterName || null,
    reporterPhone || null
  ];

  const res = await pool.query(insertQuery, values);
  const sos = res.rows[0];

  // Insert Status History Audit
  await pool.query(
    `INSERT INTO sos_status_history (sos_id, old_status, new_status, changed_by, remarks)
     VALUES ($1, NULL, 'Pending', $2, 'Distress SOS initiated by citizen')`,
    [sos.id, userId || null]
  );

  // Discover nearby rescue teams, hospitals, and shelters
  const resources = await findNearbyResources({
    latitude: lat,
    longitude: lng,
    district,
    emergencyType
  });

  // Notify Citizen
  if (userId) {
    await createNotification({
      userId,
      type: 'SOS_CREATED',
      title: '🚨 Emergency SOS Dispatched',
      message: `Your SOS (${sos.sos_code}) for ${emergencyType} at ${sos.address || district} has been broadcast to emergency authorities. Stay calm; responders are being notified.`,
      referenceType: 'SOS',
      referenceId: sos.sos_code
    });
  }

  // Broadcast Alert to District Rescue Teams & Collector
  await sendDistrictRoleNotification({
    district,
    roles: ['station', 'station_admin', 'rescue_team', 'collector'],
    title: `🚨 NEW SOS: ${emergencyType} in ${district}`,
    message: `Immediate distress call (${sos.sos_code}) at ${sos.address || district}. ${sos.affected_people} person(s) affected. Action required!`,
    referenceType: 'SOS',
    referenceId: sos.sos_code
  });

  // Emit Real-time Socket Event
  broadcastEvent('sos:created', {
    sos,
    nearbyTeams: resources.nearbyTeams,
    nearbyHospitals: resources.nearbyHospitals,
    nearbyShelters: resources.nearbyShelters
  }, district);

  return {
    sos,
    nearbyResources: resources
  };
}

/**
 * Get active SOS for a citizen
 */
async function getActiveCitizenSOS(userId) {
  if (!userId) return null;
  const res = await pool.query(
    `SELECT * FROM sos_requests 
     WHERE user_id = $1 
       AND status IN ('Pending', 'Acknowledged', 'Team Assigned', 'Rescue In Progress')
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (res.rows.length === 0) return null;
  const sos = res.rows[0];
  const resources = await findNearbyResources({
    latitude: sos.latitude,
    longitude: sos.longitude,
    district: sos.district,
    emergencyType: sos.emergency_type
  });
  return { sos, nearbyResources: resources };
}

/**
 * Get full SOS details with status timeline
 */
async function getSOSDetails(sosIdOrCode) {
  const isNumeric = /^\d+$/.test(sosIdOrCode);
  const query = isNumeric
    ? 'SELECT * FROM sos_requests WHERE id = $1'
    : 'SELECT * FROM sos_requests WHERE sos_code = $1';

  const res = await pool.query(query, [sosIdOrCode]);
  if (res.rows.length === 0) return null;
  const sos = res.rows[0];

  const historyRes = await pool.query(
    `SELECT sh.*, u.name as changed_by_name, u.role as changed_by_role
     FROM sos_status_history sh
     LEFT JOIN users u ON sh.changed_by = u.id
     WHERE sh.sos_id = $1
     ORDER BY sh.created_at ASC`,
    [sos.id]
  );

  const resources = await findNearbyResources({
    latitude: sos.latitude,
    longitude: sos.longitude,
    district: sos.district,
    emergencyType: sos.emergency_type
  });

  return {
    sos,
    timeline: historyRes.rows,
    nearbyResources: resources
  };
}

/**
 * Cancel an active SOS (citizen cancellation)
 */
async function cancelSOSRequest(sosIdOrCode, userId, reason = 'Accidental trigger or citizen is safe') {
  const details = await getSOSDetails(sosIdOrCode);
  if (!details) throw new Error('SOS request not found');

  const sos = details.sos;
  if (sos.status === 'Resolved' || sos.status === 'Cancelled') {
    throw new Error(`Cannot cancel SOS with status '${sos.status}'`);
  }

  const res = await pool.query(
    `UPDATE sos_requests 
     SET status = 'Cancelled',
         cancelled_at = CURRENT_TIMESTAMP,
         cancellation_reason = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [reason, sos.id]
  );

  const updatedSOS = res.rows[0];

  await pool.query(
    `INSERT INTO sos_status_history (sos_id, old_status, new_status, changed_by, remarks)
     VALUES ($1, $2, 'Cancelled', $3, $4)`,
    [sos.id, sos.status, userId || null, reason]
  );

  // Notify Citizen & Team
  if (sos.user_id) {
    await createNotification({
      userId: sos.user_id,
      type: 'SOS_CANCELLED',
      title: 'SOS Emergency Cancelled',
      message: `Your SOS request (${sos.sos_code}) has been marked as Cancelled.`,
      referenceType: 'SOS',
      referenceId: sos.sos_code
    });
  }

  broadcastEvent('sos:updated', updatedSOS, sos.district);
  return updatedSOS;
}

/**
 * Rescue team accepts SOS request
 * Status: Acknowledged -> Team Assigned
 */
async function acceptSOSByRescueTeam(sosIdOrCode, rescueUser) {
  const details = await getSOSDetails(sosIdOrCode);
  if (!details) throw new Error('SOS request not found');

  const sos = details.sos;
  if (sos.status === 'Resolved' || sos.status === 'Cancelled') {
    throw new Error(`Cannot accept SOS already marked as ${sos.status}`);
  }

  const teamName = rescueUser.name || rescueUser.panchayat || 'Rapid Rescue Unit';
  const teamPhone = rescueUser.phone || '+91 94471 23456';

  const res = await pool.query(
    `UPDATE sos_requests 
     SET status = 'Team Assigned',
         assigned_team_id = $1,
         assigned_team_name = $2,
         assigned_team_phone = $3,
         assigned_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [rescueUser.id, teamName, teamPhone, sos.id]
  );

  const updatedSOS = res.rows[0];

  await pool.query(
    `INSERT INTO sos_status_history (sos_id, old_status, new_status, changed_by, remarks)
     VALUES ($1, $2, 'Team Assigned', $3, $4)`,
    [sos.id, sos.status, rescueUser.id, `Accepted and deployed by rescue unit: ${teamName}`]
  );

  // Notify Citizen
  if (sos.user_id) {
    await createNotification({
      userId: sos.user_id,
      type: 'SOS_TEAM_ASSIGNED',
      title: '🚑 Rescue Team En Route!',
      message: `Rescue team "${teamName}" has accepted your SOS (${sos.sos_code}) and is navigating to your location. Contact: ${teamPhone}`,
      referenceType: 'SOS',
      referenceId: sos.sos_code
    });
  }

  broadcastEvent('sos:updated', updatedSOS, sos.district);
  return updatedSOS;
}

/**
 * Update SOS Status (Rescue In Progress, Resolved, Acknowledged)
 */
async function updateSOSStatus(sosIdOrCode, { status, resolutionNotes, changedByUserId, userRole }) {
  const allowed = ['Acknowledged', 'Team Assigned', 'Rescue In Progress', 'Resolved', 'Cancelled'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid status '${status}'. Must be one of: ${allowed.join(', ')}`);
  }

  const details = await getSOSDetails(sosIdOrCode);
  if (!details) throw new Error('SOS request not found');

  const sos = details.sos;
  const oldStatus = sos.status;

  const isResolved = status === 'Resolved';
  const isCancelled = status === 'Cancelled';

  const res = await pool.query(
    `UPDATE sos_requests 
     SET status = $1,
         resolution_notes = COALESCE($2, resolution_notes),
         resolved_at = ${isResolved ? 'CURRENT_TIMESTAMP' : 'resolved_at'},
         cancelled_at = ${isCancelled ? 'CURRENT_TIMESTAMP' : 'cancelled_at'},
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [status, resolutionNotes || null, sos.id]
  );

  const updatedSOS = res.rows[0];

  await pool.query(
    `INSERT INTO sos_status_history (sos_id, old_status, new_status, changed_by, remarks)
     VALUES ($1, $2, $3, $4, $5)`,
    [sos.id, oldStatus, status, changedByUserId || null, resolutionNotes || `Status updated to ${status}`]
  );

  // Notify Citizen
  if (sos.user_id) {
    let title = `SOS Status: ${status}`;
    let message = `Your emergency request (${sos.sos_code}) status has changed to ${status}.`;

    if (status === 'Rescue In Progress') {
      title = '⚡ Rescue Operation In Progress';
      message = `Emergency rescue teams are on-site and conducting rescue operations for your request (${sos.sos_code}).`;
    } else if (status === 'Resolved') {
      title = '✅ SOS Emergency Resolved';
      message = `Your SOS request (${sos.sos_code}) has been marked as successfully resolved. Stay safe!`;
    }

    await createNotification({
      userId: sos.user_id,
      type: `SOS_${status.toUpperCase().replace(/\s+/g, '_')}`,
      title,
      message,
      referenceType: 'SOS',
      referenceId: sos.sos_code
    });
  }

  broadcastEvent('sos:updated', updatedSOS, sos.district);
  return updatedSOS;
}

/**
 * Fetch SOS requests for Rescue Teams
 */
async function getRescueFeedSOS(district, user) {
  let query = `
    SELECT * FROM sos_requests 
    WHERE status NOT IN ('Cancelled')
  `;
  const params = [];

  if (district && district !== 'All Kerala' && district !== 'all') {
    params.push(`%${district.toLowerCase()}%`);
    query += ` AND LOWER(district) LIKE $${params.length}`;
  }

  query += ` ORDER BY 
    CASE 
      WHEN status = 'Pending' THEN 1
      WHEN status = 'Acknowledged' THEN 2
      WHEN status = 'Team Assigned' THEN 3
      WHEN status = 'Rescue In Progress' THEN 4
      ELSE 5
    END, created_at DESC LIMIT 50`;

  const res = await pool.query(query, params);
  return res.rows;
}

/**
 * Fetch SOS requests & metrics for Collector Dashboard
 */
async function getCollectorSOSData(district, filters = {}) {
  const { emergencyType, taluk, dateFrom, dateTo, status } = filters;
  const whereClauses = [];
  const params = [];

  if (district && district !== 'All Kerala' && district !== 'all') {
    params.push(`%${district.toLowerCase()}%`);
    whereClauses.push(`LOWER(district) LIKE $${params.length}`);
  }

  if (emergencyType && emergencyType !== 'all') {
    params.push(emergencyType);
    whereClauses.push(`emergency_type = $${params.length}`);
  }

  if (taluk && taluk !== 'all') {
    params.push(`%${taluk.toLowerCase()}%`);
    whereClauses.push(`LOWER(taluk) LIKE $${params.length}`);
  }

  if (status && status !== 'all') {
    params.push(status);
    whereClauses.push(`status = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    whereClauses.push(`created_at >= $${params.length}::timestamp`);
  }

  if (dateTo) {
    params.push(dateTo);
    whereClauses.push(`created_at <= ($${params.length}::timestamp + interval '1 day')`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Fetch filtered SOS list
  const listQuery = `
    SELECT * FROM sos_requests 
    ${whereStr}
    ORDER BY created_at DESC LIMIT 100;
  `;
  const listRes = await pool.query(listQuery, params);

  // 2. Fetch Aggregated Metrics for District
  const metricParams = district && district !== 'All Kerala' && district !== 'all' ? [`%${district.toLowerCase()}%`] : [];
  const metricWhere = metricParams.length > 0 ? `WHERE LOWER(district) LIKE $1` : '';

  const metricsQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Cancelled')) as total_active,
      COUNT(*) FILTER (WHERE status = 'Pending') as pending,
      COUNT(*) FILTER (WHERE status = 'Team Assigned') as team_assigned,
      COUNT(*) FILTER (WHERE status = 'Rescue In Progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
      COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
      COALESCE(SUM(affected_people) FILTER (WHERE status NOT IN ('Resolved', 'Cancelled')), 0) as total_affected_active
    FROM sos_requests
    ${metricWhere};
  `;
  const metricsRes = await pool.query(metricsQuery, metricParams);
  const m = metricsRes.rows[0];

  return {
    metrics: {
      totalActive: parseInt(m.total_active, 10),
      pending: parseInt(m.pending, 10),
      teamAssigned: parseInt(m.team_assigned, 10),
      inProgress: parseInt(m.in_progress, 10),
      resolved: parseInt(m.resolved, 10),
      cancelled: parseInt(m.cancelled, 10),
      totalAffectedActive: parseInt(m.total_affected_active, 10)
    },
    requests: listRes.rows
  };
}

/**
 * Fetch Map Markers for Live Disaster Map
 * Excludes Resolved and Cancelled by default
 */
async function getMapSOSMarkers(district, includeResolved = false) {
  let query = `
    SELECT 
      id, sos_code, emergency_type, description, affected_people,
      latitude, longitude, address, district, taluk, status,
      assigned_team_id, assigned_team_name, assigned_team_phone,
      created_at, updated_at
    FROM sos_requests
  `;
  const params = [];
  const where = [];

  if (!includeResolved) {
    where.push(`status NOT IN ('Resolved', 'Cancelled')`);
  }

  if (district && district !== 'All Kerala' && district !== 'all') {
    params.push(`%${district.toLowerCase()}%`);
    where.push(`LOWER(district) LIKE $${params.length}`);
  }

  if (where.length > 0) {
    query += ` WHERE ${where.join(' AND ')}`;
  }

  query += ` ORDER BY created_at DESC LIMIT 200`;

  const res = await pool.query(query, params);
  return res.rows;
}

module.exports = {
  KERALA_TALUKS,
  generateSOSCode,
  resolveDistrictAndTaluk,
  findNearbyResources,
  createSOSRequest,
  getActiveCitizenSOS,
  getSOSDetails,
  cancelSOSRequest,
  acceptSOSByRescueTeam,
  updateSOSStatus,
  getRescueFeedSOS,
  getCollectorSOSData,
  getMapSOSMarkers
};
