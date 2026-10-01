const sosService = require('../services/sosService');
const pool = require('../db');
const { createNotification } = require('../services/notificationService');
const { broadcastEvent } = require('../services/socketService');

/**
 * POST /api/sos
 * Creates a new emergency SOS request
 */
async function createSOS(req, res) {
  try {
    const user = req.user || {};
    const {
      emergencyType,
      description,
      affectedPeople,
      latitude,
      longitude,
      address,
      district,
      taluk,
      reporterName,
      reporterPhone
    } = req.body;

    if (!emergencyType) {
      return res.status(400).json({ success: false, error: 'Emergency type is required.' });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Accurate GPS coordinates are required.' });
    }

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const result = await sosService.createSOSRequest({
      userId: user.id || req.body?.userId || null,
      emergencyType,
      description,
      affectedPeople: parseInt(affectedPeople, 10) || 1,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || null,
      district: district || user.district || null,
      taluk: taluk || null,
      photoUrl,
      reporterName: reporterName || user.name || 'Anonymous Citizen',
      reporterPhone: reporterPhone || user.phone || null
    });

    return res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS Dispatched successfully to First Responders.',
      sos: result.sos,
      nearbyResources: result.nearbyResources
    });
  } catch (err) {
    if (err.code === 'DUPLICATE_ACTIVE_SOS') {
      return res.status(409).json({
        success: false,
        error: err.message,
        code: 'DUPLICATE_ACTIVE_SOS',
        existingSOS: err.existingSOS
      });
    }
    console.error('Error creating SOS:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch SOS request.' });
  }
}

/**
 * GET /api/sos/active-my
 * Returns the currently active SOS for the authenticated citizen
 */
async function getActiveCitizenSOS(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: true, activeSOS: null });
    }
    const result = await sosService.getActiveCitizenSOS(userId);
    return res.status(200).json({
      success: true,
      activeSOS: result ? result.sos : null,
      nearbyResources: result ? result.nearbyResources : null
    });
  } catch (err) {
    console.error('Error fetching active SOS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/sos/my-history
 * Returns all SOS requests submitted by the authenticated citizen
 */
async function getCitizenSOSHistory(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: true, history: [] });
    }
    const result = await pool.query(
      `SELECT * FROM sos_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return res.status(200).json({ success: true, history: result.rows });
  } catch (err) {
    console.error('Error fetching citizen SOS history:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/sos/:id
 * Returns single SOS details with status audit timeline & nearby resources
 */
async function getSOSById(req, res) {
  try {
    const id = req.params.id;
    const result = await sosService.getSOSDetails(id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'SOS request not found.' });
    }
    return res.status(200).json({
      success: true,
      sos: result.sos,
      timeline: result.timeline,
      nearbyResources: result.nearbyResources
    });
  } catch (err) {
    console.error('Error fetching SOS details:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/sos/:id/cancel
 * Citizen cancels active SOS
 */
async function cancelSOS(req, res) {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const { reason } = req.body;
    const updated = await sosService.cancelSOSRequest(id, userId, reason);
    return res.status(200).json({
      success: true,
      message: 'SOS request has been successfully cancelled.',
      sos: updated
    });
  } catch (err) {
    console.error('Error cancelling SOS:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/sos/rescue-feed
 * Rescue teams fetch pending and active SOS requests in their district
 */
async function getRescueFeed(req, res) {
  try {
    const district = req.query.district || req.user?.district || 'Kottayam';
    const feed = await sosService.getRescueFeedSOS(district, req.user);
    return res.status(200).json({
      success: true,
      district,
      feed
    });
  } catch (err) {
    console.error('Error getting rescue feed SOS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/sos/:id/accept
 * Rescue team accepts SOS request
 */
async function acceptSOS(req, res) {
  try {
    const id = req.params.id;
    const rescueUser = req.user;
    if (!rescueUser) {
      return res.status(401).json({ success: false, error: 'Rescue unit authentication required.' });
    }
    const updated = await sosService.acceptSOSByRescueTeam(id, rescueUser);
    return res.status(200).json({
      success: true,
      message: 'SOS accepted! Unit assigned to emergency mission.',
      sos: updated
    });
  } catch (err) {
    console.error('Error accepting SOS:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/sos/:id/status
 * Update status (Rescue In Progress, Resolved, Acknowledged)
 */
async function updateStatus(req, res) {
  try {
    const id = req.params.id;
    const { status, resolutionNotes } = req.body;
    const updated = await sosService.updateSOSStatus(id, {
      status,
      resolutionNotes,
      changedByUserId: req.user?.id,
      userRole: req.user?.role
    });
    return res.status(200).json({
      success: true,
      message: `SOS status updated to ${status}.`,
      sos: updated
    });
  } catch (err) {
    console.error('Error updating SOS status:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/sos/:id/assign
 * Authority / Collector manually assigns rescue team
 */
async function assignRescueTeam(req, res) {
  try {
    const id = req.params.id;
    const { teamId, teamName, teamPhone, remarks } = req.body;

    if (!teamId && !teamName) {
      return res.status(400).json({ success: false, error: 'Rescue Team details are required.' });
    }

    const details = await sosService.getSOSDetails(id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'SOS request not found.' });
    }
    const sos = details.sos;

    const resUpdate = await pool.query(
      `UPDATE sos_requests 
       SET status = 'Team Assigned',
           assigned_team_id = $1,
           assigned_team_name = $2,
           assigned_team_phone = $3,
           assigned_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [teamId || null, teamName, teamPhone || null, sos.id]
    );

    const updated = resUpdate.rows[0];

    await pool.query(
      `INSERT INTO sos_status_history (sos_id, old_status, new_status, changed_by, remarks)
       VALUES ($1, $2, 'Team Assigned', $3, $4)`,
      [sos.id, sos.status, req.user?.id || null, remarks || `Assigned to ${teamName} by District Authority`]
    );

    // Notify Citizen
    if (sos.user_id) {
      await createNotification({
        userId: sos.user_id,
        type: 'SOS_TEAM_ASSIGNED',
        title: '🚑 Rescue Team Assigned',
        message: `District Control Room has dispatched rescue team "${teamName}" for your emergency (${sos.sos_code}).`,
        referenceType: 'SOS',
        referenceId: sos.sos_code
      });
    }

    broadcastEvent('sos:updated', updated, sos.district);

    return res.status(200).json({
      success: true,
      message: `Rescue team ${teamName} assigned to SOS.`,
      sos: updated
    });
  } catch (err) {
    console.error('Error assigning rescue team to SOS:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/sos/collector
 * Collector Dashboard SOS metrics and filtered list
 */
async function getCollectorSOS(req, res) {
  try {
    const district = req.query.district || req.user?.district || 'Kottayam';
    const filters = {
      emergencyType: req.query.emergencyType,
      taluk: req.query.taluk,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const data = await sosService.getCollectorSOSData(district, filters);
    return res.status(200).json({
      success: true,
      district,
      ...data
    });
  } catch (err) {
    console.error('Error fetching collector SOS data:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/sos/map-markers
 * Map markers for Live Disaster Map
 */
async function getMapSOSMarkers(req, res) {
  try {
    const district = req.query.district;
    const includeResolved = req.query.includeResolved === 'true';
    const markers = await sosService.getMapSOSMarkers(district, includeResolved);
    return res.status(200).json({
      success: true,
      markers
    });
  } catch (err) {
    console.error('Error getting map SOS markers:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createSOS,
  getActiveCitizenSOS,
  getCitizenSOSHistory,
  getSOSById,
  cancelSOS,
  getRescueFeed,
  acceptSOS,
  updateStatus,
  assignRescueTeam,
  getCollectorSOS,
  getMapSOSMarkers
};
