const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { sendCollectorCredentialsEmail, ADMIN_EMAIL } = require('../services/email');

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
