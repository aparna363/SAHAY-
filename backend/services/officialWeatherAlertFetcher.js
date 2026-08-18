/**
 * Official Weather Alert Fetcher & Background Polling Engine
 *
 * Requirements:
 * 1. Data Source: Official/Government meteorological data (e.g. IMD / KSDMA CAP RSS feed).
 * 2. Fallback: OpenWeatherMap One Call API 3.0 `alerts` field if official source unavailable.
 *    Clearly flag `source_type` as 'OFFICIAL' vs 'SECONDARY'.
 * 3. Never invent alert levels from raw weather metrics — strictly use source category data mapped via pure mapper.
 * 4. Audit Logging: Server-side record of every fetch attempt in `weather_alert_fetch_logs`.
 * 5. Reliability: Cache last successfully fetched alert with timestamp. On fetch failure, show cached alert
 *    with clear "last updated X ago" label or "Unable to verify current alert status" if no cache.
 * 6. Notifications: Push via FCM on level change (RED/ORANGE for Citizen; YELLOW/ORANGE/RED for Rescue Team).
 */

const pool = require('../db');
const { mapSeverityLevel, getHighestSeverityLevel } = require('../utils/severityMapper');
const { sendDistrictRoleNotification } = require('./notificationService');

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
  'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
  'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

const DISTRICT_COORDS = {
  thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
  kollam: { lat: 8.8932, lon: 76.6141 },
  pathanamthitta: { lat: 9.2648, lon: 76.7870 },
  alappuzha: { lat: 9.4981, lon: 76.3388 },
  kottayam: { lat: 9.5916, lon: 76.5222 },
  idukki: { lat: 9.8497, lon: 76.9804 },
  ernakulam: { lat: 9.9816, lon: 76.2999 },
  thrissur: { lat: 10.5276, lon: 76.2144 },
  palakkad: { lat: 10.7867, lon: 76.6548 },
  malappuram: { lat: 11.0720, lon: 76.0740 },
  kozhikode: { lat: 11.2588, lon: 75.7804 },
  wayanad: { lat: 11.6854, lon: 76.1320 },
  kannur: { lat: 11.8745, lon: 75.3704 },
  kasaragod: { lat: 12.5102, lon: 74.9852 }
};

/**
 * Normalizes district name
 */
function cleanDistrict(raw) {
  if (!raw) return 'Ernakulam';
  return String(raw).trim().replace(/\s+district$/i, '');
}

/**
 * Retrieves active weather data sources ordered by priority
 */
async function getActiveSources() {
  try {
    const res = await pool.query(
      `SELECT * FROM weather_alert_sources WHERE is_active = TRUE ORDER BY priority ASC`
    );
    return res.rows;
  } catch (err) {
    console.error('[WeatherAlertFetcher] Error fetching active sources:', err.message);
    return [];
  }
}

/**
 * Retrieves custom severity mappings for a source
 */
async function getSourceSeverityMappings(sourceId) {
  try {
    const res = await pool.query(
      `SELECT * FROM weather_severity_mappings WHERE source_id = $1 AND is_active = TRUE`,
      [sourceId]
    );
    return res.rows;
  } catch (err) {
    return [];
  }
}

/**
 * Helper to parse RSS/CAP XML content into structured alert items
 */
function parseRSSFeedText(xmlText, districtName) {
  const items = [];
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>(.*?)<\/title>/i);
    const descMatch = itemXml.match(/<description>(.*?)<\/description>/i);
    const categoryMatch = itemXml.match(/<category>(.*?)<\/category>/i);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i);

    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    const rawCategory = categoryMatch ? categoryMatch[1].trim() : (title.match(/red|orange|yellow|green/i)?.[0] || 'Advisory');
    const link = linkMatch ? linkMatch[1].trim() : 'https://mausam.imd.gov.in';

    // Only match item if it mentions district or applies state-wide
    if (!title || (!title.toLowerCase().includes(districtName.toLowerCase()) && 
        !description.toLowerCase().includes(districtName.toLowerCase()) && 
        !title.toLowerCase().includes('kerala'))) {
      continue;
    }

    items.push({
      alert_id: `IMD-${districtName}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      hazard_type: title.includes('Rain') ? 'Heavy Rainfall' : title.includes('Flood') ? 'Flood Alert' : 'Meteorological Warning',
      raw_severity: rawCategory,
      title: title,
      description: description || `Official weather alert issued for ${districtName}.`,
      safety_instructions: description.includes('Safety') ? description : 'Stay indoors during heavy downpours. Keep emergency contacts ready.',
      affected_zones: [districtName],
      source_reference_url: link,
      issued_at: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      raw_payload: { xml: itemXml }
    });
  }

  return items;
}

/**
 * Attempts to fetch official alerts for a given district from primary / secondary sources.
 */
async function fetchAlertsForDistrict(districtName, force = false) {
  const district = cleanDistrict(districtName);
  const sources = await getActiveSources();

  let fetchedAlerts = [];
  let successSource = null;
  let isFallback = false;
  let httpCode = 200;
  let fetchErrorMessage = null;

  // Try each source in priority order
  for (const source of sources) {
    try {
      if (source.source_type === 'OFFICIAL') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        const response = await fetch(source.api_endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          const parsed = parseRSSFeedText(text, district);
          fetchedAlerts = parsed;
          successSource = source;
          break;
        } else {
          fetchErrorMessage = `HTTP ${response.status} from ${source.name}`;
        }
      } else if (source.source_type === 'SECONDARY') {
        // OpenWeatherMap fallback
        const coords = DISTRICT_COORDS[district.toLowerCase()] || { lat: 9.9816, lon: 76.2999 };
        const apiKey = source.api_key || process.env.OPENWEATHER_API_KEY || '';
        
        if (apiKey) {
          const url = `${source.api_endpoint}?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.alerts)) {
              fetchedAlerts = data.alerts.map((a, i) => ({
                alert_id: `OWM-${district}-${a.start || Date.now()}-${i}`,
                hazard_type: a.event || 'Weather Warning',
                raw_severity: a.severity || a.event || 'Moderate',
                title: a.event || 'Weather Warning',
                description: a.description || `Secondary alert issued for ${district}.`,
                safety_instructions: 'Follow local authority guidelines.',
                affected_zones: [district],
                source_reference_url: 'https://openweathermap.org',
                issued_at: a.start ? new Date(a.start * 1000).toISOString() : new Date().toISOString(),
                expires_at: a.end ? new Date(a.end * 1000).toISOString() : new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
                raw_payload: a
              }));
            }
            successSource = source;
            isFallback = true;
            break;
          }
        }
      }
    } catch (err) {
      fetchErrorMessage = err.message;
      console.warn(`[WeatherAlertFetcher] Source '${source.name}' fetch failed for ${district}:`, err.message);
    }
  }

  const customMappings = successSource ? await getSourceSeverityMappings(successSource.id) : [];

  // Map each raw alert's severity
  const mappedAlerts = fetchedAlerts.map(alert => ({
    ...alert,
    mapped_severity: mapSeverityLevel(alert.raw_severity, customMappings)
  }));

  const highestSeverity = getHighestSeverityLevel(mappedAlerts);

  // Get previous cached state for level change comparison
  let previousSeverity = 'GREEN';
  try {
    const cacheRes = await pool.query(
      `SELECT highest_severity FROM weather_alert_zone_cache WHERE LOWER(district) = LOWER($1)`,
      [district]
    );
    if (cacheRes.rows.length > 0) {
      previousSeverity = cacheRes.rows[0].highest_severity;
    }
  } catch (err) {
    // Ignore
  }

  // Handle success vs failure
  if (successSource) {
    // 1. Log successful fetch
    await pool.query(
      `INSERT INTO weather_alert_fetch_logs (district, source_id, source_name, status, http_code, raw_response, mapped_level, alerts_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        district,
        successSource.id,
        successSource.name,
        isFallback ? 'FALLBACK' : 'SUCCESS',
        200,
        JSON.stringify(mappedAlerts.map(a => a.raw_payload)),
        highestSeverity,
        mappedAlerts.length
      ]
    );

    // 2. Clear old active alerts for district & insert new ones
    await pool.query(`UPDATE official_weather_alerts SET is_active = FALSE WHERE LOWER(district) = LOWER($1)`, [district]);
    
    for (const a of mappedAlerts) {
      await pool.query(
        `INSERT INTO official_weather_alerts 
         (alert_id, source_id, source_name, source_type, district, hazard_type, raw_severity, mapped_severity, title, description, safety_instructions, affected_zones, source_reference_url, raw_payload, issued_at, expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)`,
        [
          a.alert_id,
          successSource.id,
          successSource.name,
          successSource.source_type,
          district,
          a.hazard_type,
          a.raw_severity,
          a.mapped_severity,
          a.title,
          a.description,
          a.safety_instructions,
          a.affected_zones,
          a.source_reference_url,
          JSON.stringify(a.raw_payload),
          a.issued_at,
          a.expires_at
        ]
      );
    }

    // 3. Fetch active manual collector advisories for district
    const advisoryRes = await pool.query(
      `SELECT * FROM district_manual_advisories WHERE LOWER(district) = LOWER($1) AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY issued_at DESC`,
      [district]
    );

    // 4. Update zone cache
    await pool.query(
      `INSERT INTO weather_alert_zone_cache (district, highest_severity, active_alerts, active_advisories, last_successful_fetch, fetch_status, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), 'HEALTHY', NOW())
       ON CONFLICT (district) DO UPDATE SET
         highest_severity = EXCLUDED.highest_severity,
         active_alerts = EXCLUDED.active_alerts,
         active_advisories = EXCLUDED.active_advisories,
         last_successful_fetch = NOW(),
         fetch_status = 'HEALTHY',
         updated_at = NOW()`,
      [district, highestSeverity, JSON.stringify(mappedAlerts), JSON.stringify(advisoryRes.rows)]
    );

    // 5. Trigger FCM push notifications on level change
    if (previousSeverity !== highestSeverity) {
      console.log(`⚡ Weather Alert level changed for ${district}: ${previousSeverity} ➔ ${highestSeverity}`);

      // Citizens notified on RED / ORANGE
      if (['RED', 'ORANGE'].includes(highestSeverity)) {
        await sendDistrictRoleNotification({
          district,
          roles: ['citizen'],
          title: `🚨 ${highestSeverity} Weather Alert for ${district}`,
          message: `Official meteorological warning issued for ${district}. Level: ${highestSeverity}. Tap to view instructions.`,
          referenceType: 'WEATHER_ALERT',
          referenceId: district
        });
      }

      // Rescue Teams notified on YELLOW / ORANGE / RED (earlier warning)
      if (['YELLOW', 'ORANGE', 'RED'].includes(highestSeverity)) {
        await sendDistrictRoleNotification({
          district,
          roles: ['rescue_team', 'rescue', 'official'],
          title: `⚠️ Operational Weather Update: ${highestSeverity} Alert (${district})`,
          message: `Weather alert level updated to ${highestSeverity} in ${district}. Prepare team readiness.`,
          referenceType: 'WEATHER_ALERT',
          referenceId: district
        });
      }
    }

    return {
      district,
      highestSeverity,
      activeAlerts: mappedAlerts,
      activeAdvisories: advisoryRes.rows,
      fetchStatus: 'HEALTHY',
      lastSuccessfulFetch: new Date().toISOString(),
      sourceName: successSource.name,
      sourceType: successSource.source_type
    };

  } else {
    // Fetch failed from all sources!
    // Log failure server-side
    await pool.query(
      `INSERT INTO weather_alert_fetch_logs (district, source_id, source_name, status, http_code, error_message, mapped_level, alerts_count)
       VALUES ($1, NULL, 'ALL_SOURCES_FAILED', 'FAILURE', 500, $2, 'UNVERIFIED', 0)`,
      [district, fetchErrorMessage || 'All weather alert sources failed to respond']
    );

    // Check if cached version exists
    const cacheRes = await pool.query(
      `SELECT * FROM weather_alert_zone_cache WHERE LOWER(district) = LOWER($1)`,
      [district]
    );

    if (cacheRes.rows.length > 0) {
      const cached = cacheRes.rows[0];
      await pool.query(
        `UPDATE weather_alert_zone_cache SET fetch_status = 'STALE', updated_at = NOW() WHERE LOWER(district) = LOWER($1)`,
        [district]
      );
      return {
        district,
        highestSeverity: cached.highest_severity,
        activeAlerts: cached.active_alerts || [],
        activeAdvisories: cached.active_advisories || [],
        fetchStatus: 'STALE',
        lastSuccessfulFetch: cached.last_successful_fetch,
        errorMessage: fetchErrorMessage
      };
    }

    // No cache available at all! Return UNVERIFIED status
    return {
      district,
      highestSeverity: 'UNVERIFIED',
      activeAlerts: [],
      activeAdvisories: [],
      fetchStatus: 'UNVERIFIED',
      lastSuccessfulFetch: null,
      errorMessage: 'Unable to verify current alert status'
    };
  }
}

/**
 * Polls all districts in Kerala every 15-30 minutes.
 */
async function pollAllDistricts() {
  console.log('🔄 [WeatherAlertFetcher] Polling official weather alert feeds for all districts...');
  for (const district of KERALA_DISTRICTS) {
    try {
      await fetchAlertsForDistrict(district);
    } catch (err) {
      console.error(`[WeatherAlertFetcher] Error polling ${district}:`, err.message);
    }
  }
  console.log('✅ [WeatherAlertFetcher] Weather alert poll completed.');
}

/**
 * Starts background polling cron (runs every 20 minutes)
 */
function startPollingTimer(intervalMs = 20 * 60 * 1000) {
  // Execute initial poll on server startup
  setTimeout(() => {
    pollAllDistricts().catch(err => console.error('[WeatherAlertFetcher] Initial poll failed:', err.message));
  }, 5000);

  // Set periodic interval
  setInterval(() => {
    pollAllDistricts().catch(err => console.error('[WeatherAlertFetcher] Periodic poll failed:', err.message));
  }, intervalMs);

  console.log(`⏰ [WeatherAlertFetcher] Background weather alert polling started (Interval: ${intervalMs / 60000} mins)`);
}

module.exports = {
  fetchAlertsForDistrict,
  pollAllDistricts,
  startPollingTimer,
  KERALA_DISTRICTS
};
