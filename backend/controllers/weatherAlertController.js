const pool = require('../db');
const { fetchAlertsForDistrict, KERALA_DISTRICTS } = require('../services/officialWeatherAlertFetcher');
const { mapSeverityLevel } = require('../utils/severityMapper');
const { sendDistrictRoleNotification } = require('../services/notificationService');

/**
 * Calculates human-readable "Last updated X ago" string from ISO date
 */
function formatLastUpdatedLabel(isoDateStr) {
  if (!isoDateStr) return 'Unable to verify status';
  try {
    const diffMs = Date.now() - new Date(isoDateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Last updated just now';
    if (diffMins === 1) return 'Last updated 1 minute ago';
    if (diffMins < 60) return `Last updated ${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Last updated 1 hour ago';
    if (diffHours < 24) return `Last updated ${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Last updated ${diffDays} days ago`;
  } catch {
    return 'Last updated recently';
  }
}

/**
 * Nearest district lookup by coordinates
 */
function findNearestDistrict(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'Ernakulam';
  }

  const DISTRICT_COORDS = {
    'Thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
    'Kollam': { lat: 8.8932, lon: 76.6141 },
    'Pathanamthitta': { lat: 9.2648, lon: 76.7870 },
    'Alappuzha': { lat: 9.4981, lon: 76.3388 },
    'Kottayam': { lat: 9.5916, lon: 76.5222 },
    'Idukki': { lat: 9.8497, lon: 76.9804 },
    'Ernakulam': { lat: 9.9816, lon: 76.2999 },
    'Thrissur': { lat: 10.5276, lon: 76.2144 },
    'Palakkad': { lat: 10.7867, lon: 76.6548 },
    'Malappuram': { lat: 11.0720, lon: 76.0740 },
    'Kozhikode': { lat: 11.2588, lon: 75.7804 },
    'Wayanad': { lat: 11.6854, lon: 76.1320 },
    'Kannur': { lat: 11.8745, lon: 75.3704 },
    'Kasaragod': { lat: 12.5102, lon: 74.9852 }
  };

  let minDistance = Infinity;
  let closestDistrict = 'Ernakulam';

  for (const [name, coords] of Object.entries(DISTRICT_COORDS)) {
    const dist = Math.hypot(coords.lat - latitude, coords.lon - longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestDistrict = name;
    }
  }

  return closestDistrict;
}

/**
 * GET /api/weather-alerts/current
 * Returns role-aware alert payload with safeguards.
 */
async function getCurrentWeatherAlert(req, res) {
  try {
    let { district, lat, lon } = req.query;
    const userRole = (req.user?.role || 'citizen').toLowerCase();

    if (!district && lat && lon) {
      district = findNearestDistrict(lat, lon);
    }
    if (!district) {
      district = req.user?.district || 'Ernakulam';
    }

    // Try fetching cached or live alerts
    const alertData = await fetchAlertsForDistrict(district);

    const isRescueTeam = ['rescue_team', 'rescue', 'official', 'collector', 'admin'].includes(userRole);

    // Filter fields based on role
    const activeAlertsFormatted = alertData.activeAlerts.map(a => {
      const base = {
        alert_id: a.alert_id,
        title: a.title,
        hazard_type: a.hazard_type,
        mapped_severity: a.mapped_severity,
        raw_severity: a.raw_severity,
        description: a.description,
        safety_instructions: a.safety_instructions,
        expires_at: a.expires_at
      };
      if (isRescueTeam) {
        return {
          ...base,
          issued_at: a.issued_at,
          affected_zones: a.affected_zones,
          source_reference_url: a.source_reference_url,
          source_type: a.source_type,
          source_name: a.source_name,
          raw_payload: a.raw_payload
        };
      }
      return base;
    });

    const lastUpdatedLabel = formatLastUpdatedLabel(alertData.lastSuccessfulFetch);

    return res.json({
      success: true,
      district: alertData.district,
      highestSeverity: alertData.highestSeverity,
      fetchStatus: alertData.fetchStatus,
      lastSuccessfulFetch: alertData.lastSuccessfulFetch,
      lastUpdatedLabel: lastUpdatedLabel,
      isStale: alertData.fetchStatus === 'STALE',
      isUnverified: alertData.highestSeverity === 'UNVERIFIED',
      activeAlertsCount: activeAlertsFormatted.length,
      primaryAlert: activeAlertsFormatted[0] || null,
      activeAlerts: activeAlertsFormatted,
      activeAdvisories: alertData.activeAdvisories || [],
      message: alertData.highestSeverity === 'UNVERIFIED' 
        ? 'Unable to verify current alert status' 
        : alertData.fetchStatus === 'STALE'
        ? `Cached status (${lastUpdatedLabel})`
        : 'Current official weather alert status'
    });

  } catch (error) {
    console.error('[WeatherAlertController] getCurrentWeatherAlert error:', error);
    return res.status(500).json({
      success: false,
      highestSeverity: 'UNVERIFIED',
      fetchStatus: 'UNVERIFIED',
      message: 'Unable to verify current alert status',
      error: error.message
    });
  }
}

/**
 * POST /api/weather-alerts/refresh
 * Forces an immediate fetch for district
 */
async function refreshWeatherAlert(req, res) {
  try {
    let { district, lat, lon } = req.body;
    if (!district && lat && lon) {
      district = findNearestDistrict(lat, lon);
    }
    if (!district) {
      district = req.user?.district || 'Ernakulam';
    }

    const alertData = await fetchAlertsForDistrict(district, true);
    return res.json({
      success: true,
      message: 'Weather alert refreshed successfully',
      data: alertData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh weather alert',
      error: error.message
    });
  }
}

/**
 * POST /api/weather-alerts/collector/advisory
 * Collector broadcasts a manual local advisory
 */
async function createCollectorAdvisory(req, res) {
  try {
    const { district, title, instruction, expiresHours = 24 } = req.body;
    const userId = req.user?.id || null;
    const userName = req.user?.name || 'District Collector';

    if (!district || !title || !instruction) {
      return res.status(400).json({ success: false, message: 'District, title, and instruction are required.' });
    }

    const expiresAt = new Date(Date.now() + (expiresHours * 3600 * 1000));

    const result = await pool.query(
      `INSERT INTO district_manual_advisories (district, issued_by_user_id, issued_by_name, title, instruction, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [district, userId, userName, title, instruction, expiresAt]
    );

    // Refresh district cache with new advisory
    await fetchAlertsForDistrict(district);

    // Broadcast FCM notification to Citizens & Rescue Teams in district
    await sendDistrictRoleNotification({
      district,
      roles: ['citizen', 'rescue_team', 'rescue', 'official'],
      title: `📢 District Advisory: ${title}`,
      message: `${instruction} (Issued by ${userName})`,
      referenceType: 'MANUAL_ADVISORY',
      referenceId: result.rows[0].id
    });

    return res.json({
      success: true,
      message: 'Local advisory issued and pushed to district users.',
      advisory: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to issue local advisory', error: error.message });
  }
}

/**
 * GET /api/weather-alerts/collector/district-view
 * Collector district jurisdiction view (zones, active alert level, active users count)
 */
async function getCollectorDistrictView(req, res) {
  try {
    const district = req.query.district || req.user?.district || 'Ernakulam';

    // 1. Get cached alert status for district
    const cacheRes = await pool.query(
      `SELECT * FROM weather_alert_zone_cache WHERE LOWER(district) = LOWER($1)`,
      [district]
    );
    const cached = cacheRes.rows[0] || {};

    // 2. Count active citizens and rescue teams in district
    const usersCountRes = await pool.query(
      `SELECT LOWER(role) as role, COUNT(*) as count FROM users WHERE LOWER(district) = LOWER($1) GROUP BY LOWER(role)`,
      [district]
    );

    let citizensCount = 0;
    let rescueCount = 0;

    usersCountRes.rows.forEach(r => {
      if (r.role === 'citizen') citizensCount += parseInt(r.count, 10);
      if (['rescue_team', 'rescue', 'official'].includes(r.role)) rescueCount += parseInt(r.count, 10);
    });

    // 3. Get raw payload details for cross-verification
    const alertsRes = await pool.query(
      `SELECT * FROM official_weather_alerts WHERE LOWER(district) = LOWER($1) AND is_active = TRUE ORDER BY fetched_at DESC`,
      [district]
    );

    // 4. Get active advisories
    const advisoriesRes = await pool.query(
      `SELECT * FROM district_manual_advisories WHERE LOWER(district) = LOWER($1) AND is_active = TRUE ORDER BY issued_at DESC`,
      [district]
    );

    return res.json({
      success: true,
      district,
      highestSeverity: cached.highest_severity || 'GREEN',
      fetchStatus: cached.fetch_status || 'HEALTHY',
      lastSuccessfulFetch: cached.last_successful_fetch,
      lastUpdatedLabel: formatLastUpdatedLabel(cached.last_successful_fetch),
      activeCitizensCount: citizensCount,
      activeRescueTeamsCount: rescueCount,
      activeAlerts: alertsRes.rows,
      activeAdvisories: advisoriesRes.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch collector district view', error: error.message });
  }
}

/**
 * GET /api/weather-alerts/history
 * Returns alert history for district over past 30/90 days
 */
async function getAlertHistory(req, res) {
  try {
    const district = req.query.district || req.user?.district || 'Ernakulam';
    const days = parseInt(req.query.days || '30', 10);

    const resHistory = await pool.query(
      `SELECT * FROM official_weather_alerts 
       WHERE LOWER(district) = LOWER($1) AND fetched_at >= NOW() - ($2 || ' days')::INTERVAL 
       ORDER BY fetched_at DESC`,
      [district, days]
    );

    return res.json({
      success: true,
      district,
      days,
      history: resHistory.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch alert history', error: error.message });
  }
}

/**
 * GET /api/weather-alerts/admin/sources
 * Admin: Get active weather data sources
 */
async function getAdminDataSources(req, res) {
  try {
    const resSources = await pool.query(`SELECT * FROM weather_alert_sources ORDER BY priority ASC`);
    return res.json({ success: true, sources: resSources.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/weather-alerts/admin/sources
 * Admin: Add or update weather data source
 */
async function saveAdminDataSource(req, res) {
  try {
    const { id, name, region, api_endpoint, api_key, source_type, priority, is_active } = req.body;
    if (id) {
      const resUpdate = await pool.query(
        `UPDATE weather_alert_sources SET name=$1, region=$2, api_endpoint=$3, api_key=$4, source_type=$5, priority=$6, is_active=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [name, region, api_endpoint, api_key, source_type, priority, is_active, id]
      );
      return res.json({ success: true, source: resUpdate.rows[0] });
    } else {
      const resInsert = await pool.query(
        `INSERT INTO weather_alert_sources (name, region, api_endpoint, api_key, source_type, priority, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, region, api_endpoint, api_key, source_type, priority, is_active]
      );
      return res.json({ success: true, source: resInsert.rows[0] });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/weather-alerts/admin/mappings
 * Admin: Get severity mapping table
 */
async function getAdminSeverityMappings(req, res) {
  try {
    const resMap = await pool.query(
      `SELECT m.*, s.name as source_name, s.source_type 
       FROM weather_severity_mappings m
       JOIN weather_alert_sources s ON m.source_id = s.id
       ORDER BY m.source_id ASC, m.id ASC`
    );
    return res.json({ success: true, mappings: resMap.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/weather-alerts/admin/mappings
 * Admin: Update mapping with audit trail
 */
async function updateAdminSeverityMapping(req, res) {
  try {
    const { id, mapped_level, description, is_active } = req.body;
    const userId = req.user?.id || null;
    const userName = req.user?.name || 'Admin';

    // Get old value for audit log
    const oldRes = await pool.query(`SELECT * FROM weather_severity_mappings WHERE id = $1`, [id]);
    if (oldRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mapping rule not found' });
    }

    const oldValue = oldRes.rows[0];

    const newRes = await pool.query(
      `UPDATE weather_severity_mappings SET mapped_level = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [mapped_level, description, is_active, id]
    );

    const newValue = newRes.rows[0];

    // Log mapping audit
    await pool.query(
      `INSERT INTO weather_mapping_audit_logs (mapping_id, changed_by_user_id, changed_by_name, action, old_value, new_value)
       VALUES ($1, $2, $3, 'UPDATE', $4, $5)`,
      [id, userId, userName, JSON.stringify(oldValue), JSON.stringify(newValue)]
    );

    return res.json({ success: true, mapping: newValue, message: 'Severity mapping updated successfully with audit trail.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/weather-alerts/admin/system-health
 * Admin: System health, last fetch times, failure counts
 */
async function getAdminSystemHealth(req, res) {
  try {
    const cacheRes = await pool.query(`SELECT * FROM weather_alert_zone_cache ORDER BY district ASC`);
    const logsRes = await pool.query(
      `SELECT * FROM weather_alert_fetch_logs ORDER BY fetched_at DESC LIMIT 50`
    );
    const failureCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM weather_alert_fetch_logs WHERE status = 'FAILURE' AND fetched_at >= NOW() - INTERVAL '24 hours'`
    );

    return res.json({
      success: true,
      zones: cacheRes.rows,
      recentLogs: logsRes.rows,
      failedFetches24h: parseInt(failureCountRes.rows[0]?.count || '0', 10)
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/weather-alerts/admin/audit-logs
 * Admin: Full system audit logs
 */
async function getAdminAuditLogs(req, res) {
  try {
    const mappingAudit = await pool.query(`SELECT * FROM weather_mapping_audit_logs ORDER BY created_at DESC LIMIT 50`);
    const fetchLogs = await pool.query(`SELECT * FROM weather_alert_fetch_logs ORDER BY fetched_at DESC LIMIT 50`);
    const advisories = await pool.query(`SELECT * FROM district_manual_advisories ORDER BY issued_at DESC LIMIT 50`);

    return res.json({
      success: true,
      mappingAudits: mappingAudit.rows,
      fetchLogs: fetchLogs.rows,
      manualAdvisories: advisories.rows
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getCurrentWeatherAlert,
  refreshWeatherAlert,
  createCollectorAdvisory,
  getCollectorDistrictView,
  getAlertHistory,
  getAdminDataSources,
  saveAdminDataSource,
  getAdminSeverityMappings,
  updateAdminSeverityMapping,
  getAdminSystemHealth,
  getAdminAuditLogs
};
