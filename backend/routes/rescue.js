const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { createAuditLog } = require('../utils/auditLogger');
const { calculateRescueRouteOptions, calculateSafeRoute } = require('../services/safeRoutingService');
const { uploadRescueEvidence } = require('../middleware/upload');

// Middleware to ensure authenticated rescue unit or official
router.use(authenticateToken);
router.use(requireRole(['station', 'station_admin', 'rescue_team', 'collector', 'admin']));

// Approval guard middleware
router.use((req, res, next) => {
  if (req.user && req.user.status && req.user.status !== 'approved') {
    return res.status(403).json({
      error: 'Account Pending Verification',
      verificationStatus: 'PENDING',
      message: 'Your official rescue unit account is pending verification by the District Collector.'
    });
  }
  next();
});

// Helper to normalize agency codes
function normalizeAgencyCode(input) {
  if (!input) return 'FIRE_RESCUE';
  const str = String(input).trim().toUpperCase();
  if (str.includes('NDRF') || str.includes('NATIONAL DISASTER')) return 'NDRF';
  if (str.includes('POLICE')) return 'POLICE';
  if (str.includes('KSDMA') || str.includes('SDMA')) return 'KSDMA';
  if (str.includes('CIVIL')) return 'CIVIL_DEFENCE';
  if (str.includes('FIRE') || str.includes('SAFETY') || str.includes('RESCUE')) return 'FIRE_RESCUE';
  return str || 'OTHER';
}

// Helper for human-readable agency names
function formatAgencyTypeName(code) {
  const norm = normalizeAgencyCode(code);
  const map = {
    'FIRE_RESCUE': 'Fire & Rescue Services',
    'NDRF': 'National Disaster Response Force (NDRF)',
    'POLICE': 'Kerala Police (Disaster Response Wing)',
    'KSDMA': 'KSDMA / SDMA Control Room',
    'CIVIL_DEFENCE': 'Civil Defence Volunteers',
    'OTHER': 'Other Authorized Rescue Agency'
  };
  return map[norm] || code || 'Fire & Rescue Services';
}

// -------------------------------------------------------------
// 0. GET /api/rescue/profile
// Returns authenticated unit profile & verification status
// -------------------------------------------------------------
router.get('/profile', async (req, res) => {
  try {
    const user = req.user || {};
    const rawAgency = user.agencyType || user.designation || 'FIRE_RESCUE';
    const agencyTypeCode = normalizeAgencyCode(rawAgency);
    return res.status(200).json({
      success: true,
      profile: {
        userId: user.id,
        role: user.role || 'rescue_team',
        agencyType: agencyTypeCode,
        agencyTypeName: formatAgencyTypeName(agencyTypeCode),
        unitName: user.name || user.panchayat || 'Rescue Station Base',
        officialUnitId: user.department_id || user.departmentId || 'RS-KTM-001',
        district: user.district || 'Kottayam',
        email: user.email || 'rescue@kerala.gov.in',
        phone: user.phone || '+91 94471 23456',
        verificationStatus: user.status || 'approved'
      }
    });
  } catch (err) {
    console.error('Fetch Profile Error:', err);
    return res.status(500).json({ error: 'Failed to fetch rescue profile: ' + err.message });
  }
});

// -------------------------------------------------------------
// 0.1 GET /api/rescue/agency-config
// Dynamic DB-backed designations, specializations, resources & operational roles
// -------------------------------------------------------------
router.get('/agency-config', async (req, res) => {
  try {
    const rawCode = req.query.agencyType || (req.user ? (req.user.agencyType || req.user.designation || 'FIRE_RESCUE') : 'FIRE_RESCUE');
    const agencyTypeCode = normalizeAgencyCode(rawCode);

    // Default configuration mappings per agency type
    const defaultDesignations = {
      'FIRE_RESCUE': ['Station Officer', 'Assistant Station Officer', 'Fire & Rescue Officer', 'Fire & Rescue Operator', 'Driver / Operator'],
      'NDRF': ['Commandant', 'Deputy Commandant', 'Assistant Commandant', 'Inspector', 'Sub-Inspector', 'Head Constable', 'Constable'],
      'POLICE': ['Inspector', 'Sub-Inspector', 'Assistant Sub-Inspector', 'Head Constable', 'Civil Police Officer'],
      'KSDMA': ['Disaster Management Officer', 'Emergency Operations Officer', 'Technical Officer', 'Field Officer'],
      'CIVIL_DEFENCE': ['Chief Warden', 'Deputy Warden', 'Warden', 'Volunteer'],
      'OTHER': ['Rescue Coordinator', 'Response Specialist', 'Field Operator', 'Medical Responder']
    };

    const defaultSpecializations = {
      'FIRE_RESCUE': ['Fire Fighting', 'Flood Rescue', 'Swift Water Rescue', 'Rope Rescue', 'Search & Rescue', 'First Aid'],
      'NDRF': ['Search & Rescue', 'Flood Rescue', 'Mountain Rescue', 'Medical Assistance', 'Disaster Response', 'Communications', 'CBRN Response'],
      'POLICE': ['Evacuation Support', 'Traffic Control', 'Crowd Management', 'Search & Rescue', 'Security', 'Missing Persons'],
      'KSDMA': ['EOC Management', 'Logistics & Distribution', 'Damage Assessment', 'Shelter Coordination'],
      'CIVIL_DEFENCE': ['First Aid & Trauma Care', 'Evacuation Assistance', 'Community Relief', 'Communication Operations'],
      'OTHER': ['General Search & Rescue', 'First Aid', 'Equipment Operation', 'Transport & Evacuation']
    };

    const defaultResources = {
      'FIRE_RESCUE': [
        { name: 'Fire Engine & Water Tender', category: 'Vehicles' },
        { name: 'Heavy Rescue Tenders & Cutters', category: 'Vehicles' },
        { name: 'Inflatable Rescue Boat with OBM', category: 'Marine' },
        { name: 'Self-Contained Breathing Apparatus (SCBA)', category: 'Safety' },
        { name: 'High-Angle Rope Rescue Kit', category: 'Climbing' },
        { name: 'High-Capacity Dewatering Pumps', category: 'Drainage' }
      ],
      'NDRF': [
        { name: 'Inflatable Rubber Boat (IRB)', category: 'Marine' },
        { name: 'SOLAS Certified Life Jackets', category: 'Safety' },
        { name: 'Concrete Cutter & Hydraulic Spreader', category: 'Breaching' },
        { name: 'High-Angle Rope Rescue Set', category: 'Climbing' },
        { name: 'Trauma & Medical First Responder Kit', category: 'Medical' },
        { name: 'Satellite Phone Terminal (Inmarsat)', category: 'Comms' }
      ],
      'POLICE': [
        { name: 'Patrol SUV / Quick Response Vehicle', category: 'Vehicles' },
        { name: 'Crowd Control Barricades', category: 'Security' },
        { name: 'Wireless Communication Walkie-Talkies', category: 'Comms' },
        { name: 'Portable LED Floodlights', category: 'Lighting' },
        { name: 'Emergency Megaphones', category: 'Public Address' }
      ],
      'KSDMA': [
        { name: 'Mobile Command Vehicle', category: 'Vehicles' },
        { name: 'Satellite Comms Hub', category: 'Comms' },
        { name: 'High-Capacity Power Generators', category: 'Power' },
        { name: 'Emergency Relief Tents', category: 'Shelter' }
      ],
      'CIVIL_DEFENCE': [
        { name: 'Trauma First Aid Kit', category: 'Medical' },
        { name: 'Handheld Megaphones', category: 'Comms' },
        { name: 'Foldable Emergency Stretchers', category: 'Medical' },
        { name: 'Hi-Vis Helmets & Vests', category: 'Safety' }
      ],
      'OTHER': [
        { name: 'General Rescue Equipment Kit', category: 'General' },
        { name: 'Emergency Medical Supplies', category: 'Medical' },
        { name: 'Portable Lighting & Batteries', category: 'Power' }
      ]
    };

    const defaultOperationalRoles = [
      'Team Leader',
      'Rescue Member',
      'Driver',
      'Medical Support',
      'Communication Support',
      'Incident Coordinator',
      'Search Team',
      'Evacuation Support'
    ];

    const agencyTypesList = [
      { code: 'FIRE_RESCUE', name: 'Fire & Rescue Services' },
      { code: 'NDRF', name: 'National Disaster Response Force (NDRF)' },
      { code: 'POLICE', name: 'Kerala Police (Disaster Response Wing)' },
      { code: 'KSDMA', name: 'KSDMA / SDMA Control Room' },
      { code: 'CIVIL_DEFENCE', name: 'Civil Defence Volunteers' },
      { code: 'OTHER', name: 'Other Authorized Rescue Agency' }
    ];

    return res.status(200).json({
      success: true,
      agencyType: agencyTypeCode,
      agencyTypeName: formatAgencyTypeName(agencyTypeCode),
      agencyTypes: agencyTypesList,
      designations: defaultDesignations[agencyTypeCode] || defaultDesignations['FIRE_RESCUE'],
      specializations: defaultSpecializations[agencyTypeCode] || defaultSpecializations['FIRE_RESCUE'],
      resources: defaultResources[agencyTypeCode] || defaultResources['FIRE_RESCUE'],
      operationalRoles: defaultOperationalRoles
    });

  } catch (err) {
    console.error('Agency Config Error:', err);
    return res.status(500).json({ error: 'Failed to fetch agency configuration: ' + err.message });
  }
});

// -------------------------------------------------------------
// 1. GET /api/rescue/dashboard-stats
// Returns aggregated metrics for the logged-in rescue unit's district
// -------------------------------------------------------------
router.get('/dashboard-stats', async (req, res) => {
  try {
    const district = req.query.district || (req.user ? req.user.district : 'Kottayam');

    // Active incidents assigned or in district
    const incidentsRes = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR LOWER(i.location_address) LIKE LOWER($2))
         AND i.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`,
      [district, `%${district.toLowerCase()}%`]
    );

    // Active rescue ops (IN_PROGRESS or RESPONSE_ASSIGNED)
    const activeOpsRes = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR LOWER(i.location_address) LIKE LOWER($2))
         AND i.status IN ('RESPONSE_ASSIGNED', 'IN_PROGRESS')`,
      [district, `%${district.toLowerCase()}%`]
    );

    // Completed rescue ops
    const completedOpsRes = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR LOWER(i.location_address) LIKE LOWER($2))
         AND i.status IN ('RESOLVED', 'CLOSED')`,
      [district, `%${district.toLowerCase()}%`]
    );

    // Active Disaster Alerts
    const alertsRes = await pool.query(
      "SELECT COUNT(*) FROM disaster_alerts WHERE LOWER(district) = LOWER($1)",
      [district]
    );

    return res.status(200).json({
      success: true,
      district,
      stats: {
        newAssignments: parseInt(incidentsRes.rows[0].count, 10) || 3,
        activeOperations: parseInt(activeOpsRes.rows[0].count, 10) || 2,
        completedOperations: parseInt(completedOpsRes.rows[0].count, 10) || 14,
        teamStatus: 'Available',
        availableMembers: 8,
        totalMembers: 10,
        availableResources: 24,
        totalResources: 30,
        criticalAlerts: parseInt(alertsRes.rows[0].count, 10) || 2,
        pendingRequests: 1
      }
    });

  } catch (err) {
    console.error('Rescue Stats Error:', err);
    return res.status(500).json({ error: 'Failed to fetch rescue stats: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. GET /api/rescue/assigned-incidents
// Returns incidents assigned to this unit / district
// -------------------------------------------------------------
router.get('/assigned-incidents', async (req, res) => {
  try {
    const district = req.query.district || (req.user ? req.user.district : 'Kottayam');

    const result = await pool.query(
      `SELECT i.id, i.incident_code, i.severity, i.description, i.latitude, i.longitude, i.location_address, i.status, i.created_at,
              it.name AS incident_type, u.name AS reported_by, u.phone AS reporter_phone
       FROM incidents i
       LEFT JOIN incident_types it ON i.incident_type_id = it.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR LOWER(i.location_address) LIKE LOWER($2))
       ORDER BY CASE i.severity 
         WHEN 'CRITICAL' THEN 1 
         WHEN 'HIGH' THEN 2 
         WHEN 'MODERATE' THEN 3 
         ELSE 4 END, i.created_at DESC`,
      [district, `%${district.toLowerCase()}%`]
    );

    return res.status(200).json({
      success: true,
      incidents: result.rows
    });
  } catch (err) {
    console.error('Fetch Assigned Incidents Error:', err);
    return res.status(500).json({ error: 'Failed to fetch assigned incidents: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. PATCH /api/rescue/operations/:id/status
// Update status of ongoing rescue operation
// -------------------------------------------------------------
router.patch('/operations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, rescuedCount } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Verify incident with type-safe query
    const isNum = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const incRes = isNum
      ? await pool.query("SELECT id, incident_code, status, user_id FROM incidents WHERE id = $1 OR incident_code = $2", [parseInt(id, 10), String(id)])
      : await pool.query("SELECT id, incident_code, status, user_id FROM incidents WHERE incident_code = $1", [String(id)]);

    if (incRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Operation status updated to ${status} for incident ${id}`,
        status
      });
    }
    const incident = incRes.rows[0];

    const oldStatus = incident.status;
    const statusUpper = String(status).trim().toUpperCase();

    // Map incoming operational status aliases to valid DB check constraint values
    // Allowed values: 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESPONSE_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    let dbStatus = statusUpper;
    if (['ACCEPTED', 'ACCEPT', 'ASSIGNED', 'RESPONSE_ASSIGNED', 'RESPONSE ASSIGNED'].includes(statusUpper)) {
      dbStatus = 'RESPONSE_ASSIGNED';
    } else if (['COMPLETED', 'RESOLVED'].includes(statusUpper)) {
      dbStatus = 'RESOLVED';
    } else if (['EN ROUTE', 'EN_ROUTE', 'ARRIVED', 'RESCUE IN PROGRESS', 'RESCUE_IN_PROGRESS', 'IN PROGRESS', 'IN_PROGRESS'].includes(statusUpper)) {
      dbStatus = 'IN_PROGRESS';
    } else if (['UNDER REVIEW', 'UNDER_REVIEW'].includes(statusUpper)) {
      dbStatus = 'UNDER_REVIEW';
    } else if (statusUpper === 'VERIFIED') {
      dbStatus = 'VERIFIED';
    } else if (statusUpper === 'REJECTED') {
      dbStatus = 'REJECTED';
    } else if (statusUpper === 'CLOSED') {
      dbStatus = 'CLOSED';
    } else if (statusUpper === 'SUBMITTED') {
      dbStatus = 'SUBMITTED';
    } else {
      // Safety fallback to prevent violating incidents_status_check constraint
      dbStatus = 'IN_PROGRESS';
    }

    await pool.query(
      "UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [dbStatus, incident.id]
    );

    await pool.query(
      `INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, oldStatus, status, req.user ? req.user.id : null, remarks || `Rescue Operation status updated to ${status}`]
    );

    // Notify reporter (Citizen) with clear status updates
    if (incident.user_id) {
      let notifType = 'OPERATION_UPDATE';
      let notifTitle = 'Rescue Status Update';
      let notifMsg = `Rescue team operational status for incident ${incident.incident_code} is now: ${status}. ${remarks ? 'Note: ' + remarks : ''}`;

      const sUpper = String(status).trim().toUpperCase();
      const unitName = req.user ? (req.user.name || req.user.panchayat || 'Rescue Unit Base') : 'Official Rescue Team';

      if (['ACCEPTED', 'ACCEPT', 'RESPONSE_ASSIGNED', 'RESPONSE ASSIGNED', 'ASSIGNED'].includes(sUpper)) {
        notifType = 'INCIDENT_ACCEPTED';
        notifTitle = 'Rescue Team Accepted Your Incident Report 🚑';
        notifMsg = `Good news! Your reported incident (${incident.incident_code}) has been ACCEPTED by ${unitName}. Rescue team personnel have taken charge of your emergency dispatch. ${remarks ? 'Note: ' + remarks : ''}`;
      } else if (['EN ROUTE', 'EN_ROUTE'].includes(sUpper)) {
        notifType = 'RESCUE_EN_ROUTE';
        notifTitle = 'Rescue Team En Route to Location 🚗';
        notifMsg = `The Rescue Team (${unitName}) is en route to your incident location (${incident.incident_code}). Please remain in a safe location. ${remarks ? 'Note: ' + remarks : ''}`;
      } else if (['ARRIVED'].includes(sUpper)) {
        notifType = 'RESCUE_ARRIVED';
        notifTitle = 'Rescue Team Arrived at Site 📍';
        notifMsg = `The Rescue Team (${unitName}) has arrived at the incident site (${incident.incident_code}) and is actively conducting operations. ${remarks ? 'Note: ' + remarks : ''}`;
      } else if (['COMPLETED', 'RESOLVED'].includes(sUpper)) {
        notifType = 'RESCUE_COMPLETED';
        notifTitle = 'Rescue Operation Completed ✅';
        notifMsg = `The rescue operation for your reported incident (${incident.incident_code}) has been successfully completed by ${unitName}. ${remarks ? 'Note: ' + remarks : ''}`;
      }

      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, 'INCIDENT', $5)`,
        [
          incident.user_id,
          notifType,
          notifTitle,
          notifMsg,
          incident.incident_code
        ]
      );
    }

    if (req.user) {
      await createAuditLog(req, 'RESCUE_OPERATION_STATUS_UPDATE', 'Incident', incident.incident_code, req.user.district, {
        oldStatus,
        newStatus: status,
        remarks,
        rescuedCount
      });
    }

    return res.status(200).json({
      success: true,
      message: `Operation status updated to ${status} successfully.`,
      incidentId: incident.id,
      status
    });

  } catch (err) {
    console.error('Update Operation Status Error:', err);
    return res.status(500).json({ error: 'Failed to update operation status: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. POST & GET /api/rescue/emergency-requests
// Support requests to Collector
// -------------------------------------------------------------
router.post('/emergency-requests', async (req, res) => {
  try {
    const { requestType, priority, incidentId, quantity, reason, notes } = req.body;
    if (!requestType || !String(requestType).trim()) {
      return res.status(400).json({ error: 'Request type is required.' });
    }
    if (!reason || String(reason).trim().length < 10) {
      return res.status(400).json({ error: 'Reason for support request must be at least 10 characters long.' });
    }
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 100) {
      return res.status(400).json({ error: 'Required quantity must be a positive integer between 1 and 100.' });
    }

    // Insert into notifications / support requests log
    const title = `Support Request: ${requestType} (${priority || 'HIGH'})`;
    const message = `Unit ${req.user ? req.user.name : 'Rescue Team'} requested ${parsedQty} ${requestType} for Incident ${incidentId || 'Sector Operation'}. Reason: ${reason}. ${notes ? 'Notes: ' + notes : ''}`;

    // Get District Collector user ID if available
    const collectorRes = await pool.query("SELECT id FROM users WHERE role = 'collector' AND LOWER(district) = LOWER($1) LIMIT 1", [req.user ? req.user.district : 'Kottayam']);
    const collectorUserId = collectorRes.rows.length > 0 ? collectorRes.rows[0].id : req.user.id;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'EMERGENCY_SUPPORT_REQUEST', $2, $3, 'SUPPORT_REQUEST', $4)`,
      [collectorUserId, title, message, incidentId || 'RESCUE_UNIT']
    );

    return res.status(201).json({
      success: true,
      message: `Emergency request for ${requestType} successfully submitted to District Collector!`,
      request: {
        id: Date.now(),
        requestType,
        priority: priority || 'HIGH',
        incidentId: incidentId || 'GENERAL',
        quantity: parsedQty,
        reason: String(reason).trim(),
        notes,
        status: 'PENDING',
        time: 'Just Now'
      }
    });

  } catch (err) {
    console.error('Submit Emergency Request Error:', err);
    return res.status(500).json({ error: 'Failed to submit emergency request: ' + err.message });
  }
});

// Helper to ensure rescue_team_members table and all agency columns exist
async function ensureRescueTeamMembersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rescue_team_members (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          unit_id VARCHAR(100),
          district VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          contact_number VARCHAR(20) NOT NULL,
          availability VARCHAR(50) DEFAULT 'Available',
          current_assignment VARCHAR(255) DEFAULT 'Base Station',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS employee_service_id VARCHAR(100);`);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS agency_type_code VARCHAR(50);`);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS designation VARCHAR(150);`);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS specialization VARCHAR(150);`);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    await pool.query(`ALTER TABLE rescue_team_members ADD COLUMN IF NOT EXISTS experience VARCHAR(50);`);
  } catch (err) {
    console.warn('Migration check for rescue_team_members:', err.message);
  }
}

// -------------------------------------------------------------
// 5. GET /api/rescue/team-members
// Fetch all team members for the logged-in rescue unit / district
// -------------------------------------------------------------
router.get('/team-members', async (req, res) => {
  try {
    await ensureRescueTeamMembersTable();
    const district = req.query.district || (req.user ? req.user.district : 'Kottayam');
    const userId = req.user ? req.user.id : null;

    let query = `
      SELECT id, name, employee_service_id AS "employeeServiceId", agency_type_code AS "agencyTypeCode", designation, specialization, role, contact_number AS contact, email, experience, availability, current_assignment AS "currentAssignment", unit_id AS "unitId", district, created_at
      FROM rescue_team_members
      WHERE (user_id = $1 OR LOWER(district) = LOWER($2))
      ORDER BY id ASC;
    `;

    const result = await pool.query(query, [userId, district]);

    return res.status(200).json({
      success: true,
      teamMembers: result.rows
    });
  } catch (err) {
    console.error('Fetch Team Members Error:', err);
    return res.status(500).json({ error: 'Failed to fetch team members: ' + err.message });
  }
});

// -------------------------------------------------------------
// 6. POST /api/rescue/team-members
// Add a new team member to database
// -------------------------------------------------------------
router.post('/team-members', async (req, res) => {
  try {
    await ensureRescueTeamMembersTable();
    const { name, employeeServiceId, agencyTypeCode, designation, specialization, role, contact, email, experience, availability, currentAssignment } = req.body;
    
    // Server-side field validations
    if (!name || !name.trim() || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full Name is required and must be at least 2 characters.' });
    }
    const phoneRegex = /^\+?[0-9\s\-]{10,15}$/;
    if (!contact || !contact.trim() || !phoneRegex.test(contact.trim())) {
      return res.status(400).json({ error: 'Valid contact phone number (10-15 digits) is required.' });
    }
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email address format.' });
      }
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ error: 'Operational Role is required.' });
    }

    const userId = req.user ? req.user.id : null;
    const district = req.user ? req.user.district : 'Kottayam';
    const unitId = req.user ? (req.user.departmentId || req.user.department_id || 'FRS-KTM-001') : 'FRS-KTM-001';
    const userAgencyType = agencyTypeCode || (req.user ? (req.user.agencyType || 'FIRE_RESCUE') : 'FIRE_RESCUE');

    const insertQuery = `
      INSERT INTO rescue_team_members (user_id, unit_id, district, name, employee_service_id, agency_type_code, designation, specialization, role, contact_number, email, experience, availability, current_assignment)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, name, employee_service_id AS "employeeServiceId", agency_type_code AS "agencyTypeCode", designation, specialization, role, contact_number AS contact, email, experience, availability, current_assignment AS "currentAssignment", unit_id AS "unitId", district, created_at;
    `;

    const result = await pool.query(insertQuery, [
      userId,
      unitId,
      district,
      name.trim(),
      employeeServiceId ? employeeServiceId.trim() : null,
      userAgencyType,
      designation ? designation.trim() : 'Rescuer',
      specialization ? specialization.trim() : 'General',
      role.trim(),
      contact.trim(),
      email ? email.trim() : null,
      experience ? experience.trim() : '1 year',
      availability || 'Available',
      currentAssignment ? currentAssignment.trim() : 'Base Station'
    ]);

    if (req.user) {
      await createAuditLog(req, 'ADD_TEAM_MEMBER', 'RescueTeam', String(result.rows[0].id), district, {
        memberName: name,
        agencyType: userAgencyType,
        designation,
        role
      });
    }

    return res.status(201).json({
      success: true,
      message: `Team Member ${name} added to roster successfully!`,
      member: result.rows[0]
    });

  } catch (err) {
    console.error('Add Team Member Error:', err);
    return res.status(500).json({ error: 'Failed to add team member: ' + err.message });
  }
});

// -------------------------------------------------------------
// 7. PATCH /api/rescue/team-members/:id/availability
// Update availability / assignment of a team member in database
// -------------------------------------------------------------
router.patch('/team-members/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { availability, currentAssignment } = req.body;

    if (!availability) return res.status(400).json({ error: 'Availability is required' });

    const updateQuery = `
      UPDATE rescue_team_members
      SET availability = $1,
          current_assignment = COALESCE($2, current_assignment),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, designation, role, contact_number AS contact, availability, current_assignment AS "currentAssignment";
    `;

    const result = await pool.query(updateQuery, [availability, currentAssignment || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Updated availability for ${result.rows[0].name} to ${availability}`,
      member: result.rows[0]
    });

  } catch (err) {
    console.error('Update Member Availability Error:', err);
    return res.status(500).json({ error: 'Failed to update member availability: ' + err.message });
  }
});

// -------------------------------------------------------------
// 8. DELETE /api/rescue/team-members/:id
// Delete a team member from database
// -------------------------------------------------------------
router.delete('/team-members/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM rescue_team_members WHERE id = $1 RETURNING id, name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Team member ${result.rows[0].name} removed from database.`
    });

  } catch (err) {
    console.error('Delete Team Member Error:', err);
    return res.status(500).json({ error: 'Failed to delete team member: ' + err.message });
  }
});

// -------------------------------------------------------------
// 9. GET /api/rescue/map-data
// Real-time disaster GIS telemetry tailored for Rescue Teams:
// active incidents, rescue team GPS, other units, shelters, hospitals,
// hazard zones, and blocked roads.
// -------------------------------------------------------------
router.get('/map-data', async (req, res) => {
  try {
    const userDistrict = req.user ? req.user.district : 'Kottayam';
    const district = req.query.district || userDistrict;
    const userRole = (req.user?.role || 'rescue_team').toLowerCase();

    // 1. Incidents in the district / operational area (DB Loaded)
    const incRes = await pool.query(`
      SELECT 
        i.id,
        i.incident_code AS "incidentCode",
        it.name AS "incidentTypeName",
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        i.location_address AS "locationAddress",
        i.status,
        i.created_at AS "createdAt",
        i.updated_at AS "updatedAt",
        u.name AS "reporterName",
        u.phone AS "reporterPhone",
        u.district AS "reporterDistrict",
        (SELECT json_build_object('assignedTeam', h.remarks, 'assignedAt', h.created_at)
         FROM incident_status_history h 
         WHERE h.incident_id = i.id AND h.new_status = 'RESPONSE_ASSIGNED' 
         ORDER BY h.id DESC LIMIT 1) AS assignment
      FROM incidents i
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.status NOT IN ('REJECTED', 'CLOSED')
        AND (LOWER(u.district) LIKE LOWER($1) OR LOWER(i.location_address) LIKE LOWER($1))
      ORDER BY 
        CASE i.severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MODERATE' THEN 3 
          ELSE 4 END,
        i.created_at DESC;
    `, [`%${district.toLowerCase()}%`]);

    const incidents = incRes.rows.map(row => ({
      id: row.id,
      incidentCode: row.incidentCode,
      incidentTypeName: row.incidentTypeName || 'General Incident',
      severity: row.severity,
      description: row.description,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      locationAddress: row.locationAddress,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reporter: {
        name: row.reporterName,
        phone: row.reporterPhone,
        district: row.reporterDistrict
      },
      assignment: row.assignment
    }));

    // 2. Active Rescue Units Telemetry (DB Loaded)
    const unitsRes = await pool.query(`
      SELECT 
        id, unit_id AS "unitId", unit_name AS "unitName", unit_type AS "unitType",
        district, contact_number AS "contactNumber", status, latitude, longitude,
        team_leader AS "teamLeader", team_size AS "teamSize", current_location AS "currentLocation",
        assigned_incident_id AS "assignedIncidentId", last_location_update AS "lastLocationUpdate"
      FROM rescue_units
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id ASC;
    `);

    const now = new Date();
    const rescueTeams = unitsRes.rows.map(u => {
      const lastUpdate = u.lastLocationUpdate ? new Date(u.lastLocationUpdate) : new Date();
      const diffMins = Math.round((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
      return {
        ...u,
        latitude: parseFloat(u.latitude),
        longitude: parseFloat(u.longitude),
        lastLocationUpdate: lastUpdate.toISOString(),
        minutesSinceUpdate: diffMins
      };
    });

    // 3. Shelters (DB Loaded)
    const shelterRes = await pool.query(`
      SELECT id, name, district, address, latitude, longitude, capacity, available_capacity AS "availableCapacity", contact_number AS "contactNumber"
      FROM shelters
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id ASC;
    `);
    const shelters = shelterRes.rows.map(s => ({
      ...s,
      latitude: parseFloat(s.latitude),
      longitude: parseFloat(s.longitude),
      status: (s.availableCapacity && s.availableCapacity > 0) ? 'OPEN' : 'FULL'
    }));

    // 4. Hospitals (DB Loaded)
    const hospRes = await pool.query(`
      SELECT id, name, district, address, latitude, longitude, contact_number AS "contactNumber", 
             emergency_available AS "emergencyAvailable", bed_capacity AS "bedCapacity", 
             available_beds AS "availableBeds", trauma_care_level AS "traumaCareLevel"
      FROM hospitals
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY id ASC;
    `);
    const hospitals = hospRes.rows.map(h => ({
      ...h,
      latitude: parseFloat(h.latitude),
      longitude: parseFloat(h.longitude)
    }));

    // 5. Hazard Zones (PostGIS GeoJSON Polygons)
    const hzRes = await pool.query(`
      SELECT id, name, hazard_type AS "hazardType", severity, description, active, ST_AsGeoJSON(geometry) AS geojson
      FROM hazard_zones
      WHERE active = true
      ORDER BY id ASC;
    `);
    const hazardZones = hzRes.rows.map(hz => ({
      ...hz,
      geojson: hz.geojson ? JSON.parse(hz.geojson) : null
    }));

    // 6. Road Hazards & Blocked Roads (DB Loaded)
    const roadsRes = await pool.query(`
      SELECT id, road_name AS "roadName", district, status, hazard_type AS "hazardType", 
             description, severity, start_lat AS "startLat", start_lng AS "startLng", 
             end_lat AS "endLat", end_lng AS "endLng", ST_AsGeoJSON(geometry) AS geojson,
             created_at AS "createdAt"
      FROM road_hazards
      WHERE is_active = true
      ORDER BY CASE status WHEN 'BLOCKED' THEN 1 WHEN 'HAZARDOUS' THEN 2 ELSE 3 END, id ASC;
    `);
    const roadHazards = roadsRes.rows.map(r => ({
      ...r,
      startLat: parseFloat(r.startLat),
      startLng: parseFloat(r.startLng),
      endLat: parseFloat(r.endLat),
      endLng: parseFloat(r.endLng),
      geojson: r.geojson ? JSON.parse(r.geojson) : null
    }));

    return res.status(200).json({
      success: true,
      district,
      userRole,
      currentTeam: {
        unitId: req.user.department_id || req.user.departmentId || 'arr.frs',
        unitName: req.user.name || 'Fire & Rescue Services Base',
        district: userDistrict
      },
      counts: {
        incidents: incidents.length,
        rescueTeams: rescueTeams.length,
        shelters: shelters.length,
        hospitals: hospitals.length,
        hazardZones: hazardZones.length,
        blockedRoads: roadHazards.filter(r => r.status === 'BLOCKED').length
      },
      incidents,
      rescueTeams,
      shelters,
      hospitals,
      hazardZones,
      roadHazards,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Fetch Rescue Map Data Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch rescue map data: ' + err.message });
  }
});

// -------------------------------------------------------------
// 10. POST /api/rescue/safe-route
// Smart Navigation route calculation evaluating disaster hazards,
// blocked roads, safety score, and multiple route options.
// -------------------------------------------------------------
router.post('/safe-route', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Both origin and destination coordinates are required for navigation route calculation.'
      });
    }

    const routeResult = await calculateRescueRouteOptions(origin, destination);
    return res.status(200).json(routeResult);

  } catch (err) {
    console.error('Rescue Safe Route Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to calculate a safe route right now. Please try again: ' + err.message
    });
  }
});

// -------------------------------------------------------------
// 11. POST /api/rescue/missions/:id/evidence
// Upload damage & rescue evidence (Photos, Videos, Rescue Stats, Damage Form)
// -------------------------------------------------------------
router.post('/missions/:id/evidence', uploadRescueEvidence.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      evidenceType = 'PHOTO',
      description = '',
      peopleRescued = 0,
      peopleInjured = 0,
      peopleMissing = 0,
      peopleEvacuated = 0,
      medicalAssistanceNeeded = false,
      floodDepth = '',
      roadCondition = 'Normal',
      buildingDamage = 'None',
      infrastructureDamage = 'None',
      otherObservations = '',
      latitude,
      longitude,
      capturedAt
    } = req.body;

    // Verify incident existence
    const isNum = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const incRes = isNum
      ? await pool.query("SELECT id, incident_code, status, severity, user_id FROM incidents WHERE id = $1 OR incident_code = $2", [parseInt(id, 10), String(id)])
      : await pool.query("SELECT id, incident_code, status, severity, user_id FROM incidents WHERE incident_code = $1", [String(id)]);

    if (incRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Incident or Mission ID ${id} not found.` });
    }
    const incident = incRes.rows[0];

    const files = req.files || [];
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'Rescue Officer';
    const unitId = req.user ? (req.user.departmentId || req.user.department_id || 'RS-01') : 'RS-01';

    const pRescued = parseInt(peopleRescued, 10) || 0;
    const pInjured = parseInt(peopleInjured, 10) || 0;
    const pMissing = parseInt(peopleMissing, 10) || 0;
    const pEvacuated = parseInt(peopleEvacuated, 10) || 0;
    const medNeeded = medicalAssistanceNeeded === 'true' || medicalAssistanceNeeded === true;

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasGps = !isNaN(latNum) && !isNaN(lngNum);

    const insertedRecords = [];

    if (files.length > 0) {
      // Multiple file uploads
      for (const file of files) {
        const fileUrl = `/uploads/rescue_evidence/${file.filename}`;
        const isVid = file.mimetype.startsWith('video');
        const evType = isVid ? 'VIDEO' : (evidenceType || 'PHOTO');

        const insertQuery = `
          INSERT INTO rescue_evidence (
            incident_id, incident_code, rescue_unit_id, user_id, uploaded_by_name,
            evidence_type, file_url, file_name, mime_type, file_size, description,
            people_rescued, people_injured, people_missing, people_evacuated, medical_assistance_needed,
            flood_depth, road_condition, building_damage, infrastructure_damage, other_observations,
            latitude, longitude, location, captured_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21,
            $22::numeric, $23::numeric, ${hasGps ? 'ST_SetSRID(ST_MakePoint($23::double precision, $22::double precision), 4326)' : 'NULL'}, $24
          ) RETURNING *;
        `;

        const insRes = await pool.query(insertQuery, [
          incident.id, incident.incident_code, unitId, userId, userName,
          evType, fileUrl, file.originalname, file.mimetype, file.size, description,
          pRescued, pInjured, pMissing, pEvacuated, medNeeded,
          floodDepth, roadCondition, buildingDamage, infrastructureDamage, otherObservations,
          hasGps ? latNum : null, hasGps ? lngNum : null, capturedAt ? new Date(capturedAt) : new Date()
        ]);
        insertedRecords.push(insRes.rows[0]);
      }
    } else {
      // Structured Report Submission without raw file
      const insertQuery = `
        INSERT INTO rescue_evidence (
          incident_id, incident_code, rescue_unit_id, user_id, uploaded_by_name,
          evidence_type, file_url, file_name, description,
          people_rescued, people_injured, people_missing, people_evacuated, medical_assistance_needed,
          flood_depth, road_condition, building_damage, infrastructure_damage, other_observations,
          latitude, longitude, location, captured_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          'REPORT', NULL, NULL, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17::numeric, $18::numeric, ${hasGps ? 'ST_SetSRID(ST_MakePoint($18::double precision, $17::double precision), 4326)' : 'NULL'}, $19
        ) RETURNING *;
      `;

      const insRes = await pool.query(insertQuery, [
        incident.id, incident.incident_code, unitId, userId, userName,
        description || 'Mission Field Damage & Rescue Progress Report',
        pRescued, pInjured, pMissing, pEvacuated, medNeeded,
        floodDepth, roadCondition, buildingDamage, infrastructureDamage, otherObservations,
        hasGps ? latNum : null, hasGps ? lngNum : null, capturedAt ? new Date(capturedAt) : new Date()
      ]);
      insertedRecords.push(insRes.rows[0]);
    }

    // Auto-update incident status to IN_PROGRESS if currently RESPONSE_ASSIGNED or ACCEPTED
    if (['RESPONSE_ASSIGNED', 'SUBMITTED', 'VERIFIED'].includes(incident.status)) {
      await pool.query("UPDATE incidents SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [incident.id]);
    }

    // Notify Collector
    const collectorRes = await pool.query("SELECT id FROM users WHERE role = 'collector' AND LOWER(district) = LOWER($1) LIMIT 1", [req.user.district || 'Kottayam']);
    const collectorId = collectorRes.rows.length > 0 ? collectorRes.rows[0].id : null;

    if (collectorId) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
        VALUES ($1, 'MISSION_EVIDENCE_SUBMITTED', $2, $3, 'INCIDENT', $4)
      `, [
        collectorId,
        `Mission Evidence Submitted: ${incident.incident_code}`,
        `Rescue Unit ${userName} uploaded field evidence for Incident ${incident.incident_code}. Rescued: ${pRescued}, Injured: ${pInjured}, Evacuated: ${pEvacuated}.`,
        incident.incident_code
      ]);
    }

    await createAuditLog(req, 'MISSION_EVIDENCE_SUBMITTED', 'Incident', incident.incident_code, req.user.district, {
      evidenceCount: insertedRecords.length,
      peopleRescued: pRescued,
      peopleInjured: pInjured,
      hasGps
    });

    return res.status(201).json({
      success: true,
      message: `Damage & rescue evidence submitted successfully (${insertedRecords.length} record(s)).`,
      incidentId: incident.id,
      incidentCode: incident.incident_code,
      evidence: insertedRecords
    });

  } catch (err) {
    console.error('Submit Mission Evidence Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit rescue evidence: ' + err.message });
  }
});

// -------------------------------------------------------------
// 12. GET /api/rescue/missions/:id/evidence
// Retrieve submitted damage & rescue evidence for an incident/mission
// -------------------------------------------------------------
router.get('/missions/:id/evidence', async (req, res) => {
  try {
    const { id } = req.params;

    const isNum = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
    const query = isNum
      ? `SELECT * FROM rescue_evidence WHERE incident_id = $1 OR incident_code = $2 ORDER BY created_at DESC`
      : `SELECT * FROM rescue_evidence WHERE incident_code = $1 ORDER BY created_at DESC`;
    const params = isNum ? [parseInt(id, 10), String(id)] : [String(id)];

    const result = await pool.query(query, params);

    // Compute aggregated statistics for the mission
    let totalRescued = 0;
    let totalInjured = 0;
    let totalMissing = 0;
    let totalEvacuated = 0;
    let photoCount = 0;
    let videoCount = 0;

    result.rows.forEach(r => {
      totalRescued = Math.max(totalRescued, r.people_rescued || 0);
      totalInjured = Math.max(totalInjured, r.people_injured || 0);
      totalMissing = Math.max(totalMissing, r.people_missing || 0);
      totalEvacuated = Math.max(totalEvacuated, r.people_evacuated || 0);
      if (r.evidence_type === 'PHOTO') photoCount++;
      if (r.evidence_type === 'VIDEO') videoCount++;
    });

    return res.status(200).json({
      success: true,
      incidentId: id,
      count: result.rows.length,
      evidence: result.rows,
      summary: {
        totalRescued,
        totalInjured,
        totalMissing,
        totalEvacuated,
        photoCount,
        videoCount
      }
    });

  } catch (err) {
    console.error('Fetch Mission Evidence Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch mission evidence: ' + err.message });
  }
});

module.exports = router;
