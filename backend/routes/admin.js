const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { sendCollectorCredentialsEmail, ADMIN_EMAIL } = require('../services/email');
const { createAuditLog } = require('../utils/auditLogger');

// -------------------------------------------------------------
// POST /api/admin/verify-officer
// Verifies Officer ID against authorized_officers directory and checks district assignment
// -------------------------------------------------------------
router.post('/verify-officer', async (req, res) => {
  try {
    const { officerId } = req.body;
    if (!officerId || !officerId.trim()) {
      return res.status(400).json({ verified: false, message: 'Officer ID is required.' });
    }

    const cleanId = officerId.trim().toUpperCase();
    const result = await pool.query(
      `SELECT a.id, a.officer_id, a.full_name, a.designation, a.department, a.official_email, a.status,
              d.name as district
       FROM authorized_officers a
       LEFT JOIN districts d ON a.district_id = d.id
       WHERE UPPER(a.officer_id) = $1 AND (LOWER(a.status) = 'active' OR a.status IS NULL)`,
      [cleanId]
    );

    if (result.rows.length === 0) {
      await createAuditLog(req, 'VERIFY_OFFICER_FAILED', 'Officer', cleanId, null, { reason: 'ID not found in authorized directory' });
      return res.status(404).json({ verified: false, message: 'Officer ID could not be verified in official directory.' });
    }

    const officer = result.rows[0];

    // Check if district already has an active collector account
    const districtCheck = await pool.query(
      "SELECT id, name, email FROM users WHERE role = 'collector' AND LOWER(district) = LOWER($1) AND (status IS NULL OR status != 'revoked')",
      [officer.district]
    );

    const isAssigned = districtCheck.rows.length > 0;

    await createAuditLog(req, 'OFFICER_VERIFIED', 'Officer', officer.officer_id, officer.district, {
      fullName: officer.full_name,
      districtAvailable: !isAssigned
    });

    return res.status(200).json({
      verified: true,
      officer: {
        officerId: officer.officer_id,
        fullName: officer.full_name,
        designation: officer.designation,
        department: officer.department,
        district: officer.district,
        officialEmail: officer.official_email
      },
      districtAvailable: !isAssigned,
      assignedCollector: isAssigned ? districtCheck.rows[0] : null
    });
  } catch (err) {
    console.error('Verify Officer Error:', err);
    return res.status(500).json({ verified: false, message: 'Officer verification failed: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/districts-status
// Returns assignment status for all 14 Kerala districts
// -------------------------------------------------------------
router.get('/districts-status', async (req, res) => {
  try {
    const KERALA_DISTRICTS = [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
      'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
      'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ];

    const collectorsRes = await pool.query(
      "SELECT id, name, phone, email, district, designation, department_id, created_at FROM users WHERE role = 'collector' AND (status IS NULL OR status != 'revoked')"
    );

    const collectorsMap = {};
    collectorsRes.rows.forEach(c => {
      collectorsMap[(c.district || '').toLowerCase()] = c;
    });

    const statusList = KERALA_DISTRICTS.map(d => {
      const col = collectorsMap[d.toLowerCase()];
      return {
        district: d,
        isAssigned: !!col,
        collector: col || null
      };
    });

    const assignedCount = statusList.filter(s => s.isAssigned).length;

    return res.status(200).json({
      districts: statusList,
      totalDistricts: 14,
      assignedCount,
      allAssigned: assignedCount >= 14
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch district status: ' + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/create-collector
// Admin only: Creates a District Collector account
// -------------------------------------------------------------
router.post('/create-collector', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, phone, email, password, district, designation, departmentId } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Collector Full Name is required' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Mobile Phone is required' });
    if (!password || password.trim().length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!district || !district.trim()) return res.status(400).json({ error: 'Assigned District is required' });

    // Enforce 1 Collector per district rule
    const districtCheck = await client.query(
      "SELECT id, name FROM users WHERE role = 'collector' AND LOWER(district) = LOWER($1) AND (status IS NULL OR status != 'revoked')",
      [district.trim()]
    );

    if (districtCheck.rows.length > 0) {
      return res.status(400).json({
        error: `District ${district} already has an active Collector account (${districtCheck.rows[0].name}). Only 1 Collector account per district is permitted.`
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const userEmail = email ? email.trim().toLowerCase() : `${cleanPhone}@collector.sahay.gov.in`;

    const existing = await client.query(
      'SELECT id FROM users WHERE phone = $1 OR (email IS NOT NULL AND LOWER(email) = $2)',
      [cleanPhone, userEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An official account with this phone or email already exists.' });
    }

    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password.trim(), salt);

    const insertUser = await client.query(`
      INSERT INTO users (name, phone, email, password_hash, role, status, district, designation, department_id)
      VALUES ($1, $2, $3, $4, 'collector', 'approved', $5, $6, $7)
      RETURNING id, name, phone, email, role, status, district, designation, department_id, created_at;
    `, [
      name.trim(),
      cleanPhone,
      userEmail,
      passwordHash,
      district.trim(),
      designation ? designation.trim() : 'District Collector & Magistrate',
      departmentId ? departmentId.trim() : `IAS-KLA-${district.substring(0, 3).toUpperCase()}`
    ]);

    const newCollector = insertUser.rows[0];

    await client.query(`
      INSERT INTO login (user_id, phone, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, 'collector', 'approved')
      ON CONFLICT (user_id) DO UPDATE SET 
        phone = EXCLUDED.phone, 
        email = EXCLUDED.email, 
        password_hash = EXCLUDED.password_hash, 
        role = EXCLUDED.role, 
        status = EXCLUDED.status;
    `, [newCollector.id, cleanPhone, userEmail, passwordHash]);

    await client.query('COMMIT');

    await createAuditLog(req, 'COLLECTOR_CREATED', 'Collector', newCollector.id, newCollector.district, {
      name: newCollector.name,
      email: newCollector.email,
      departmentId: newCollector.department_id
    });

    // Trigger sending credentials email from official admin email sahayapp26@gmail.com
    const emailResult = await sendCollectorCredentialsEmail({
      recipientEmail: userEmail,
      recipientName: newCollector.name,
      district: newCollector.district,
      password: password.trim(),
    });

    return res.status(201).json({
      message: `District Collector for ${newCollector.district} created successfully! Credentials email dispatched from ${ADMIN_EMAIL}.`,
      collector: newCollector,
      emailStatus: emailResult
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create Collector Error:', err);
    return res.status(500).json({ error: 'Failed to create District Collector: ' + err.message });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// POST /api/admin/replace-collector
// Admin endpoint: Transfer/replace an officer for an existing district Collector account
// -------------------------------------------------------------
router.post('/replace-collector', async (req, res) => {
  const client = await pool.connect();
  try {
    const { district, newOfficerId, newPassword, newPhone, newEmail } = req.body;
    if (!district || !district.trim()) return res.status(400).json({ error: 'District is required' });
    if (!newPassword || newPassword.trim().length < 6) return res.status(400).json({ error: 'New Password must be at least 6 characters' });

    let officerName = 'New Appointed Collector';
    let designation = 'District Collector & Magistrate';
    let deptId = `IAS-KLA-${district.substring(0, 3).toUpperCase()}`;
    let officialEmail = newEmail;

    if (newOfficerId && newOfficerId.trim()) {
      const officerRes = await client.query(
        `SELECT a.id, a.officer_id, a.full_name, a.designation, a.department, a.official_email, a.status,
                d.name as district
         FROM authorized_officers a
         LEFT JOIN districts d ON a.district_id = d.id
         WHERE UPPER(a.officer_id) = $1`,
        [newOfficerId.trim().toUpperCase()]
      );
      if (officerRes.rows.length > 0) {
        const off = officerRes.rows[0];
        officerName = off.full_name;
        designation = off.designation;
        deptId = off.officer_id;
        officialEmail = off.official_email || newEmail;
      }
    }

    const existingAcc = await client.query(
      "SELECT id, name, email, phone FROM users WHERE role = 'collector' AND LOWER(district) = LOWER($1)",
      [district.trim()]
    );

    if (existingAcc.rows.length === 0) {
      return res.status(404).json({ error: `No Collector account exists for district ${district}. Use Add Collector instead.` });
    }

    const collectorId = existingAcc.rows[0].id;
    const oldName = existingAcc.rows[0].name;

    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    const cleanPhone = newPhone ? newPhone.replace(/\D/g, '') : existingAcc.rows[0].phone;
    const userEmail = officialEmail ? officialEmail.trim().toLowerCase() : existingAcc.rows[0].email;

    await client.query(`
      UPDATE users SET 
        name = $1, 
        phone = $2, 
        email = $3, 
        password_hash = $4, 
        designation = $5, 
        department_id = $6, 
        status = 'approved',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7;
    `, [officerName, cleanPhone, userEmail, passwordHash, designation, deptId, collectorId]);

    await client.query(`
      UPDATE login SET 
        phone = $1, 
        email = $2, 
        password_hash = $3, 
        status = 'approved'
      WHERE user_id = $4;
    `, [cleanPhone, userEmail, passwordHash, collectorId]);

    await client.query('COMMIT');

    await createAuditLog(req, 'COLLECTOR_REPLACED', 'Collector', collectorId, district, {
      previousOfficer: oldName,
      newOfficer: officerName,
      newOfficerId: newOfficerId || 'DIRECT_TRANSFER'
    });

    const emailResult = await sendCollectorCredentialsEmail({
      recipientEmail: userEmail,
      recipientName: officerName,
      district: district,
      password: newPassword.trim()
    });

    return res.status(200).json({
      message: `District Collector for ${district} successfully transferred to ${officerName}. Access credentials sent to ${userEmail}.`,
      previousOfficer: oldName,
      newOfficer: officerName,
      emailStatus: emailResult
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Replace Collector Error:', err);
    return res.status(500).json({ error: 'Failed to replace Collector: ' + err.message });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// GET /api/admin/collectors
// Returns list of all appointed District Collectors
// -------------------------------------------------------------
router.get('/collectors', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, role, status, district, designation, department_id, created_at FROM users WHERE role = 'collector' ORDER BY district ASC"
    );
    return res.status(200).json({ collectors: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch collectors: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/station-admins
// Collector endpoint: Fetch station admins for a specific district
// -------------------------------------------------------------
router.get('/station-admins', async (req, res) => {
  try {
    const { district } = req.query;

    let query = "SELECT id, name, phone, email, role, status, district, panchayat, designation, department_id, created_at FROM users WHERE role IN ('station', 'station_admin', 'rescue_team')";
    const params = [];

    if (district && district !== 'All') {
      query += " AND LOWER(district) = LOWER($1)";
      params.push(district);
    }

    query += " ORDER BY status DESC, created_at DESC";

    const result = await pool.query(query, params);
    return res.status(200).json({ stationAdmins: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch station admins: ' + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/admin/approve-station-admin
// Collector endpoint: Approve or Reject a Station Admin
// -------------------------------------------------------------
router.post('/approve-station-admin', async (req, res) => {
  try {
    const { stationAdminId, action } = req.body; // action: 'approve' | 'reject'

    if (!stationAdminId) return res.status(400).json({ error: 'Station Admin ID is required' });
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updateResult = await pool.query(
      "UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, district, role, status",
      [newStatus, stationAdminId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Station user not found' });
    }

    await pool.query(
      "UPDATE login SET status = $1 WHERE user_id = $2",
      [newStatus, stationAdminId]
    );

    const updatedUser = updateResult.rows[0];

    await createAuditLog(req, action === 'approve' ? 'RESCUE_TEAM_APPROVED' : 'RESCUE_TEAM_REJECTED', 'RescueTeam', updatedUser.id, updatedUser.district, {
      stationName: updatedUser.name,
      status: newStatus
    });

    return res.status(200).json({
      message: `Station user ${updatedUser.name} has been ${newStatus.toUpperCase()} successfully.`,
      user: updatedUser
    });

  } catch (err) {
    console.error('Approve Station Error:', err);
    return res.status(500).json({ error: 'Failed to update approval status: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/audit-logs
// Returns list of platform security & audit logs
// -------------------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.role, a.action, a.entity_type, a.entity_id, a.district, a.details, a.ip_address, a.created_at, u.name as user_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    return res.status(200).json({ logs: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/admin/overview
// Admin platform metrics overview
// -------------------------------------------------------------
router.get('/overview', async (req, res) => {
  try {
    const citizensCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'citizen'");
    const collectorsCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'collector'");
    const stationsPending = await pool.query("SELECT COUNT(*) FROM users WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'pending'");
    const stationsApproved = await pool.query("SELECT COUNT(*) FROM users WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'approved'");

    return res.status(200).json({
      overview: {
        totalCitizens: parseInt(citizensCount.rows[0].count, 10),
        totalCollectors: parseInt(collectorsCount.rows[0].count, 10),
        pendingStations: parseInt(stationsPending.rows[0].count, 10),
        approvedStations: parseInt(stationsApproved.rows[0].count, 10)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin overview: ' + err.message });
  }
});

module.exports = router;
