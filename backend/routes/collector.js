const express = require('express');
const router = express.Router();
const pool = require('../db');
const { createAuditLog } = require('../utils/auditLogger');

// -------------------------------------------------------------
// GET /api/collector/dashboard-stats
// Returns aggregated metrics isolated to Collector's assigned district
// -------------------------------------------------------------
router.get('/dashboard-stats', async (req, res) => {
  try {
    const district = req.query.district || (req.user ? req.user.district : 'Idukki');

    // 1. Active Incidents in district
    const incidentsCount = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR i.location_address LIKE $2)
         AND i.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')`,
      [district, `%${district}%`]
    );

    // 2. Pending Station / Rescue Team approvals
    const pendingStations = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'pending' AND LOWER(district) = LOWER($1)",
      [district]
    );

    // 3. Active Rescue Teams
    const activeStations = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role IN ('station', 'station_admin', 'rescue_team') AND status = 'approved' AND LOWER(district) = LOWER($1)",
      [district]
    );

    // 4. Shelters in district
    const sheltersCount = await pool.query(
      "SELECT COUNT(*) FROM shelters WHERE LOWER(district) = LOWER($1)",
      [district]
    );

    // 5. Active Disaster Alerts
    const alertsCount = await pool.query(
      "SELECT COUNT(*) FROM disaster_alerts WHERE LOWER(district) = LOWER($1)",
      [district]
    );

    // 6. Critical SOS Reports
    const sosCount = await pool.query(
      `SELECT COUNT(*) FROM incidents i
       LEFT JOIN users u ON i.user_id = u.id
       WHERE (LOWER(u.district) = LOWER($1) OR i.location_address LIKE $2)
         AND i.severity IN ('HIGH', 'CRITICAL')
         AND i.status NOT IN ('RESOLVED', 'CLOSED')`,
      [district, `%${district}%`]
    );

    return res.status(200).json({
      district,
      stats: {
        activeIncidents: parseInt(incidentsCount.rows[0].count, 10),
        pendingRescueTeams: parseInt(pendingStations.rows[0].count, 10),
        activeRescueTeams: parseInt(activeStations.rows[0].count, 10),
        shelters: parseInt(sheltersCount.rows[0].count, 10),
        activeAlerts: parseInt(alertsCount.rows[0].count, 10),
        sosReports: parseInt(sosCount.rows[0].count, 10)
      }
    });

  } catch (err) {
    console.error('Collector Stats Error:', err);
    return res.status(500).json({ error: 'Failed to fetch collector dashboard stats: ' + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/collector/assign-rescue-team
// Collector endpoint: Assign an active rescue team/station to an incident in their district
// -------------------------------------------------------------
router.post('/assign-rescue-team', async (req, res) => {
  try {
    const { incidentId, rescueTeamId, remarks } = req.body;
    if (!incidentId) return res.status(400).json({ error: 'Incident ID is required' });
    if (!rescueTeamId) return res.status(400).json({ error: 'Rescue Team ID is required' });

    // Verify incident existence
    const incRes = await pool.query("SELECT id, incident_code, status, severity, user_id FROM incidents WHERE id = $1 OR incident_code = $2", [incidentId, String(incidentId)]);
    if (incRes.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const incident = incRes.rows[0];

    // Verify rescue team existence
    const teamRes = await pool.query("SELECT id, name, phone, district, role, status FROM users WHERE id = $1", [rescueTeamId]);
    if (teamRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rescue Team user not found' });
    }
    const team = teamRes.rows[0];

    // Update incident status to RESPONSE_ASSIGNED
    const oldStatus = incident.status;
    const newStatus = 'RESPONSE_ASSIGNED';

    await pool.query(
      `UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, incident.id]
    );

    // Record status history
    await pool.query(
      `INSERT INTO incident_status_history (incident_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, oldStatus, newStatus, req.user ? req.user.id : null, remarks || `Dispatched Rescue Unit: ${team.name}`]
    );

    // Notify citizen
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'INCIDENT_ASSIGNED', 'Rescue Unit Dispatched', $2, 'INCIDENT', $3)`,
      [
        incident.user_id,
        `Rescue Unit ${team.name} (${team.phone}) has been dispatched to your incident location.`,
        incident.incident_code
      ]
    );

    await createAuditLog(req, 'INCIDENT_RESCUE_ASSIGNED', 'Incident', incident.incident_code, team.district, {
      assignedTeam: team.name,
      teamId: team.id,
      remarks: remarks || ''
    });

    return res.status(200).json({
      message: `Rescue team ${team.name} assigned to incident ${incident.incident_code} successfully.`,
      incidentId: incident.id,
      assignedTeam: team.name,
      status: newStatus
    });

  } catch (err) {
    console.error('Assign Rescue Team Error:', err);
    return res.status(500).json({ error: 'Failed to assign rescue team: ' + err.message });
  }
});

module.exports = router;
