const pool = require('../db');
const { validateIncidentSubmission, sanitizeInput } = require('../validators/incidentValidator');
const { generateIncidentCode } = require('../utils/incidentCode');
const { evaluateIncidentRisk } = require('../services/riskService');
const { notifyCitizenStatusUpdate } = require('../services/notificationService');

/**
 * POST /api/incidents
 * Creates a new incident report with database transaction and PostGIS geometry
 */
const submitIncident = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id; // Derived solely from authenticated JWT token

    // 1. Input Validation
    const validation = validateIncidentSubmission(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const { incident_type_id, severity, description, latitude, longitude, location_address } = validation.data;
    const cleanDescription = sanitizeInput(description);
    const cleanAddress = location_address ? sanitizeInput(location_address) : null;

    // 2. Database Transaction
    await client.query('BEGIN');

    // Generate Incident Code (e.g. INC-2026-000001)
    const incidentCode = await generateIncidentCode(client);

    // Check if PostGIS location geometry column is present
    const hasLocationCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'location';
    `);

    let insertIncidentQuery;
    let queryParams;

    if (hasLocationCol.rows.length > 0) {
      insertIncidentQuery = `
        INSERT INTO incidents (
          incident_code, user_id, incident_type_id, severity, description,
          latitude, longitude, location, location_address, status, source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          ST_SetSRID(ST_MakePoint($8, $9), 4326),
          $10, 'SUBMITTED', 'CITIZEN_APP'
        )
        RETURNING id, incident_code, status, severity, latitude, longitude, location_address, created_at;
      `;
      queryParams = [incidentCode, userId, incident_type_id, severity, cleanDescription, latitude, longitude, longitude, latitude, cleanAddress];
    } else {
      insertIncidentQuery = `
        INSERT INTO incidents (
          incident_code, user_id, incident_type_id, severity, description,
          latitude, longitude, location_address, status, source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED', 'CITIZEN_APP'
        )
        RETURNING id, incident_code, status, severity, latitude, longitude, location_address, created_at;
      `;
      queryParams = [incidentCode, userId, incident_type_id, severity, cleanDescription, latitude, longitude, cleanAddress];
    }

    const incidentResult = await client.query(insertIncidentQuery, queryParams);

    const createdIncident = incidentResult.rows[0];
    const incidentId = createdIncident.id;

    // 3. Process Uploaded Media Attachments (from Multer middleware)
    const mediaRecords = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        // Relative path for frontend serving (e.g., /uploads/incidents/inc-1234.jpg)
        const relativeFilePath = `/uploads/incidents/${file.filename}`;
        
        const mediaInsertQuery = `
          INSERT INTO incident_media (incident_id, file_path, file_name, mime_type, file_size)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, file_path, file_name, mime_type, file_size;
        `;
        const mediaResult = await client.query(mediaInsertQuery, [
          incidentId,
          relativeFilePath,
          file.filename,
          file.mimetype,
          file.size
        ]);
        mediaRecords.push(mediaResult.rows[0]);
      }
    }

    // 4. Initial Status History Audit Entry
    await client.query(`
      INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, remarks)
      VALUES ($1, NULL, 'SUBMITTED', $2, 'Incident report submitted by citizen');
    `, [incidentId, userId]);

    // Commit Transaction
    await client.query('COMMIT');

    // 5. Trigger Risk Assessment Evaluation in background
    evaluateIncidentRisk({
      incidentId,
      latitude,
      longitude,
      severity,
      disasterType: 'Incident'
    }).catch(err => console.error('Risk Evaluation Error:', err));

    // Return Success API Response
    return res.status(201).json({
      success: true,
      message: 'Incident submitted successfully',
      data: {
        id: createdIncident.id,
        incidentId: createdIncident.incident_code,
        status: createdIncident.status,
        severity: createdIncident.severity,
        latitude: parseFloat(createdIncident.latitude),
        longitude: parseFloat(createdIncident.longitude),
        locationAddress: createdIncident.location_address,
        createdAt: createdIncident.created_at,
        media: mediaRecords
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit Incident Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong while submitting the incident. Please try again.'
    });
  } finally {
    client.release();
  }
};

/**
 * GET /api/incidents/my
 * Retrieves incidents submitted by the authenticated citizen
 */
const getMyIncidents = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        i.id,
        i.incident_code,
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        i.location_address,
        i.status,
        i.created_at,
        i.updated_at,
        i.verified_at,
        i.resolved_at,
        it.name AS incident_type_name,
        it.description AS incident_type_description,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'filePath', m.file_path,
              'fileName', m.file_name,
              'mimeType', m.mime_type,
              'fileSize', m.file_size
            )
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS media
      FROM incidents i
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      LEFT JOIN incident_media m ON i.id = m.incident_id
      WHERE i.user_id = $1
      GROUP BY i.id, it.id
      ORDER BY i.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        incidentCode: row.incident_code,
        incidentTypeName: row.incident_type_name || 'General Incident',
        severity: row.severity,
        description: row.description,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        locationAddress: row.location_address,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        verifiedAt: row.verified_at,
        resolvedAt: row.resolved_at,
        media: row.media
      }))
    });

  } catch (error) {
    console.error('Get My Incidents Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve your incident reports' });
  }
};

/**
 * GET /api/incidents/:id
 * Fetches single incident detail with full status history and official remarks.
 * Enforces ownership access check for normal citizens.
 */
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Support lookup by integer ID or readable string incident_code (INC-2026-000001)
    let condition = 'i.id = $1';
    let queryParam = id;
    if (isNaN(parseInt(id, 10)) || id.startsWith('INC-')) {
      condition = 'i.incident_code = $1';
    }

    const query = `
      SELECT 
        i.id,
        i.incident_code,
        i.user_id,
        u.name AS citizen_name,
        u.phone AS citizen_phone,
        u.email AS citizen_email,
        u.district AS citizen_district,
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        i.location_address,
        i.status,
        i.source,
        i.created_at,
        i.updated_at,
        i.verified_at,
        i.resolved_at,
        it.id AS incident_type_id,
        it.name AS incident_type_name,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'filePath', m.file_path,
            'fileName', m.file_name,
            'mimeType', m.mime_type,
            'fileSize', m.file_size
          )) FROM incident_media m WHERE m.incident_id = i.id), '[]'
        ) AS media,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', h.id,
            'oldStatus', h.old_status,
            'newStatus', h.new_status,
            'changedBy', h.changed_by,
            'changedByName', cb.name,
            'changedByRole', cb.role,
            'remarks', h.remarks,
            'createdAt', h.created_at
          ) ORDER BY h.id ASC) 
          FROM incident_status_history h 
          LEFT JOIN users cb ON h.changed_by = cb.id 
          WHERE h.incident_id = i.id), '[]'
        ) AS status_history
      FROM incidents i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      WHERE ${condition};
    `;

    const result = await pool.query(query, [queryParam]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident report not found' });
    }

    const row = result.rows[0];

    // Access Control: Citizens can only view their own reports; Officials/Admins can view any
    const isOwner = row.user_id === user.id;
    const isOfficial = ['station', 'collector', 'admin', 'rescue_team', 'station_admin'].includes((user.role || '').toLowerCase());

    if (!isOwner && !isOfficial) {
      return res.status(403).json({ success: false, error: 'Access Denied. You are not authorized to view this incident report.' });
    }

    // Strip citizen personal data if user is not official and not owner
    const responseData = {
      id: row.id,
      incidentCode: row.incident_code,
      incidentTypeId: row.incident_type_id,
      incidentTypeName: row.incident_type_name || 'General Incident',
      severity: row.severity,
      description: row.description,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      locationAddress: row.location_address,
      status: row.status,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      verifiedAt: row.verified_at,
      resolvedAt: row.resolved_at,
      media: row.media,
      statusHistory: row.status_history,
      ...(isOfficial ? {
        citizen: {
          id: row.user_id,
          name: row.citizen_name,
          phone: row.citizen_phone,
          email: row.citizen_email,
          district: row.citizen_district
        }
      } : {})
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get Incident By ID Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incident details' });
  }
};

/**
 * GET /api/incidents
 * Official & Admin Incidents Management Dashboard Endpoint
 * Supports pagination, filters (type, severity, status, district, date), sorting, and stats
 */
const getAllIncidents = async (req, res) => {
  try {
    const {
      type,
      severity,
      status,
      district,
      date,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClauses = [];
    const params = [];

    if (type) {
      params.push(parseInt(type, 10));
      whereClauses.push(`i.incident_type_id = $${params.length}`);
    }

    if (severity) {
      params.push(severity.toUpperCase());
      whereClauses.push(`i.severity = $${params.length}`);
    }

    if (status) {
      params.push(status.toUpperCase());
      whereClauses.push(`i.status = $${params.length}`);
    }

    if (district) {
      params.push(`%${district.trim()}%`);
      whereClauses.push(`(u.district ILIKE $${params.length} OR i.location_address ILIKE $${params.length})`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(i.incident_code ILIKE $${params.length} OR i.description ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let sortSQL = 'ORDER BY i.created_at DESC';
    if (sortBy === 'oldest') sortSQL = 'ORDER BY i.created_at ASC';
    else if (sortBy === 'highest_severity') sortSQL = `
      ORDER BY CASE i.severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MODERATE' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 END ASC, i.created_at DESC`;

    const mainQuery = `
      SELECT 
        i.id,
        i.incident_code,
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        i.location_address,
        i.status,
        i.created_at,
        i.updated_at,
        u.name AS citizen_name,
        u.phone AS citizen_phone,
        u.district AS citizen_district,
        it.name AS incident_type_name,
        (SELECT COUNT(*) FROM incident_media m WHERE m.incident_id = i.id) AS media_count
      FROM incidents i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      ${whereSQL}
      ${sortSQL}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const result = await pool.query(mainQuery, [...params, parseInt(limit, 10), offset]);

    // Dashboard Aggregate Statistics Query
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_incidents,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS new_reports,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') AS under_review,
        COUNT(*) FILTER (WHERE status = 'VERIFIED') AS verified,
        COUNT(*) FILTER (WHERE severity IN ('HIGH', 'CRITICAL')) AS high_critical,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved
      FROM incidents;
    `;
    const statsResult = await pool.query(statsQuery);

    return res.status(200).json({
      success: true,
      stats: statsResult.rows[0],
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        incidentCode: row.incident_code,
        incidentTypeName: row.incident_type_name || 'General Incident',
        severity: row.severity,
        description: row.description,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        locationAddress: row.location_address,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        mediaCount: parseInt(row.media_count, 10),
        citizen: {
          name: row.citizen_name,
          phone: row.citizen_phone,
          district: row.citizen_district
        }
      }))
    });

  } catch (error) {
    console.error('Get All Incidents Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve incidents dashboard data' });
  }
};

/**
 * PATCH /api/incidents/:id/status
 * Updates incident status and logs official remarks in incident_status_history.
 * Triggers notification to citizen.
 */
const updateIncidentStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const officialId = req.user.id;

    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESPONSE_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const newStatus = (status || '').toUpperCase();

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status specified. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Lookup target incident
    let condition = 'id = $1';
    let queryParam = id;
    if (isNaN(parseInt(id, 10)) || id.startsWith('INC-')) {
      condition = 'incident_code = $1';
    }

    const checkResult = await client.query(`SELECT id, incident_code, user_id, status FROM incidents WHERE ${condition}`, [queryParam]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident report not found' });
    }

    const targetIncident = checkResult.rows[0];
    const oldStatus = targetIncident.status;

    if (oldStatus === newStatus) {
      return res.status(400).json({ success: false, error: `Incident is already in '${newStatus}' status.` });
    }

    await client.query('BEGIN');

    // Update timestamps based on state
    let timestampUpdate = ', updated_at = CURRENT_TIMESTAMP';
    if (newStatus === 'VERIFIED') timestampUpdate += ', verified_at = CURRENT_TIMESTAMP';
    if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') timestampUpdate += ', resolved_at = CURRENT_TIMESTAMP';

    const updateQuery = `
      UPDATE incidents 
      SET status = $1 ${timestampUpdate}
      WHERE id = $2 
      RETURNING id, incident_code, status, updated_at, verified_at, resolved_at;
    `;
    const updateRes = await client.query(updateQuery, [newStatus, targetIncident.id]);

    const sanitizedRemarks = remarks ? sanitizeInput(remarks) : null;

    // Log in incident_status_history
    await client.query(`
      INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, remarks)
      VALUES ($1, $2, $3, $4, $5);
    `, [targetIncident.id, oldStatus, newStatus, officialId, sanitizedRemarks]);

    await client.query('COMMIT');

    // Trigger notification to citizen user
    notifyCitizenStatusUpdate({
      userId: targetIncident.user_id,
      incidentCode: targetIncident.incident_code,
      oldStatus,
      newStatus,
      remarks: sanitizedRemarks
    }).catch(err => console.error('Notification Trigger Error:', err));

    return res.status(200).json({
      success: true,
      message: `Incident ${targetIncident.incident_code} status updated to ${newStatus}`,
      data: {
        incidentId: targetIncident.incident_code,
        oldStatus,
        newStatus,
        remarks: sanitizedRemarks,
        updatedAt: updateRes.rows[0].updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Incident Status Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update incident status' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/incidents/nearby?lat=LAT&lng=LNG&radius=5000
 * PostGIS spatial distance query returning incidents within distance radius in meters
 */
const getNearbyIncidents = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusMeters = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ success: false, error: 'Valid lat and lng query parameters are required' });
    }

    const hasLocationCol = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'incidents' AND column_name = 'location';
    `);

    let query;
    let queryParams = [lngNum, latNum, radiusMeters];

    if (hasLocationCol.rows.length > 0) {
      query = `
        SELECT 
          i.id, i.incident_code, i.severity, i.description, i.latitude, i.longitude,
          i.location_address, i.status, i.created_at, it.name AS incident_type_name,
          ROUND(
            ST_Distance(
              i.location::geography, 
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            )::numeric, 1
          ) AS distance_meters
        FROM incidents i
        LEFT JOIN incident_types it ON i.incident_type_id = it.id
        WHERE ST_DWithin(
          i.location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3
        )
        ORDER BY distance_meters ASC;
      `;
    } else {
      query = `
        SELECT 
          i.id, i.incident_code, i.severity, i.description, i.latitude, i.longitude,
          i.location_address, i.status, i.created_at, it.name AS incident_type_name,
          ROUND(
            ( 6371000 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians($2)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($1)) +
                  sin(radians($2)) * sin(radians(i.latitude))
                ))
            ) )::numeric, 1
          ) AS distance_meters
        FROM incidents i
        LEFT JOIN incident_types it ON i.incident_type_id = it.id
        WHERE ( 6371000 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($2)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($1)) +
              sin(radians($2)) * sin(radians(i.latitude))
            ))
        ) ) <= $3
        ORDER BY distance_meters ASC;
      `;
    }

    const result = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      center: { latitude: latNum, longitude: lngNum },
      radiusMeters,
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        incidentCode: row.incident_code,
        incidentTypeName: row.incident_type_name || 'General Incident',
        severity: row.severity,
        description: row.description,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        locationAddress: row.location_address,
        status: row.status,
        distanceMeters: parseFloat(row.distance_meters),
        distanceKm: parseFloat((row.distance_meters / 1000).toFixed(2)),
        createdAt: row.created_at
      }))
    });

  } catch (error) {
    console.error('Get Nearby Incidents Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to query nearby spatial incidents' });
  }
};

/**
 * GET /api/incidents/map
 * Public/authenticated map marker feed with privacy filtering (excludes personal citizen details)
 */
const getMapIncidents = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id,
        i.incident_code,
        i.severity,
        i.description,
        i.latitude,
        i.longitude,
        i.location_address,
        i.status,
        i.created_at,
        it.name AS incident_type_name
      FROM incidents i
      LEFT JOIN incident_types it ON i.incident_type_id = it.id
      WHERE i.status NOT IN ('REJECTED', 'CLOSED')
      ORDER BY i.created_at DESC;
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        incidentCode: row.incident_code,
        incidentTypeName: row.incident_type_name || 'General Incident',
        severity: row.severity,
        description: row.description,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        locationAddress: row.location_address,
        status: row.status,
        createdAt: row.created_at
      }))
    });

  } catch (error) {
    console.error('Get Map Incidents Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve spatial map markers' });
  }
};

module.exports = {
  submitIncident,
  getMyIncidents,
  getIncidentById,
  getAllIncidents,
  updateIncidentStatus,
  getNearbyIncidents,
  getMapIncidents
};
