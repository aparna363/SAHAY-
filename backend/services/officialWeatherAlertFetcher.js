const pool = require('../db');

const {
  mapSeverityLevel,
  getHighestSeverityLevel,
} = require('../utils/severityMapper');

const {
  sendDistrictRoleNotification,
} = require('./notificationService');


// ============================================================
// CONFIGURATION
// ============================================================

const OFFICIAL_FETCH_TIMEOUT = 15000;
const SECONDARY_FETCH_TIMEOUT = 10000;
const OFFICIAL_CACHE_DURATION = 3 * 60 * 1000;
const WEATHER_POLL_INTERVAL = 20 * 60 * 1000;


// ============================================================
// KERALA DISTRICTS
// ============================================================

const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];


// ============================================================
// DISTRICT COORDINATES
// ============================================================

const DISTRICT_COORDS = {
  Thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
  Kollam: { lat: 8.8932, lon: 76.6141 },
  Pathanamthitta: { lat: 9.2648, lon: 76.7870 },
  Alappuzha: { lat: 9.4981, lon: 76.3388 },
  Kottayam: { lat: 9.5916, lon: 76.5222 },
  Idukki: { lat: 9.8494, lon: 76.9720 },
  Ernakulam: { lat: 9.9816, lon: 76.2999 },
  Thrissur: { lat: 10.5276, lon: 76.2144 },
  Palakkad: { lat: 10.7867, lon: 76.6548 },
  Malappuram: { lat: 11.0510, lon: 76.0711 },
  Kozhikode: { lat: 11.2588, lon: 75.7804 },
  Wayanad: { lat: 11.6854, lon: 76.1320 },
  Kannur: { lat: 11.8745, lon: 75.3704 },
  Kasaragod: { lat: 12.5102, lon: 74.9852 },
};


// ============================================================
// MEMORY CACHE
// ============================================================

const officialFeedCache = new Map();


// ============================================================
// CHECK CONSTRAINT HELPERS
// ============================================================

const constraintValueCache = new Map();

async function getAllowedCheckValues(
  tableName,
  constraintName
) {
  const cacheKey =
    `${tableName}:${constraintName}`;

  if (
    constraintValueCache.has(cacheKey)
  ) {
    return constraintValueCache.get(cacheKey);
  }

  try {
    const result = await pool.query(
      `
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid =
        $1::regclass
        AND conname = $2
        AND contype = 'c'
      `,
      [
        `public.${tableName}`,
        constraintName,
      ]
    );

    if (
      result.rows.length === 0 ||
      !result.rows[0].definition
    ) {
      return [];
    }

    const definition =
      result.rows[0].definition;

    /*
     * Extract values such as:
     *
     * 'SUCCESS'
     * 'FAILED'
     * 'STALE'
     *
     * from the CHECK definition.
     */

    const values = [];

    const regex =
      /'([^']+)'/g;

    let match;

    while (
      (match = regex.exec(definition)) !== null
    ) {
      if (
        !values.includes(match[1])
      ) {
        values.push(match[1]);
      }
    }

    constraintValueCache.set(
      cacheKey,
      values
    );

    return values;

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not inspect constraint ${constraintName}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// GET VALID DATABASE STATUS
// ============================================================

async function getValidStatus(
  tableName,
  constraintName,
  preferredStatus,
  fallbackStatus = null
) {
  const allowed =
    await getAllowedCheckValues(
      tableName,
      constraintName
    );

  if (
    allowed.length === 0
  ) {
    /*
     * If the constraint cannot be inspected,
     * return the preferred value and let PostgreSQL
     * report the actual issue.
     */
    return preferredStatus;
  }

  const preferredUpper =
    String(
      preferredStatus || ''
    ).toUpperCase();

  const exactMatch =
    allowed.find(
      value =>
        String(value).toUpperCase() ===
        preferredUpper
    );

  if (exactMatch) {
    return exactMatch;
  }

  if (fallbackStatus) {
    const fallbackUpper =
      String(
        fallbackStatus
      ).toUpperCase();

    const fallbackMatch =
      allowed.find(
        value =>
          String(value).toUpperCase() ===
          fallbackUpper
      );

    if (fallbackMatch) {
      return fallbackMatch;
    }
  }

  /*
   * Use the first valid value from the
   * actual database constraint.
   */
  return allowed[0];
}


// ============================================================
// SAFE FETCH
// ============================================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 15000
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }
}


// ============================================================
// ACTIVE SOURCES
// ============================================================

async function getActiveSources() {
  try {
    const result =
      await pool.query(`
        SELECT *
        FROM weather_alert_sources
        WHERE is_active = TRUE
        ORDER BY priority ASC, id ASC
      `);

    return result.rows;

  } catch (error) {
    console.error(
      '[WeatherAlertFetcher] Could not load weather sources:',
      error.message
    );

    return [];
  }
}


// ============================================================
// SOURCE SEVERITY MAPPINGS
// ============================================================

async function getSourceSeverityMappings(
  sourceId
) {
  try {
    const result =
      await pool.query(
        `
        SELECT *
        FROM weather_severity_mappings
        WHERE source_id = $1
        `,
        [sourceId]
      );

    return result.rows;

  } catch (error) {
    console.warn(
      '[WeatherAlertFetcher] Could not load severity mappings:',
      error.message
    );

    return [];
  }
}


// ============================================================
// XML CLEANER
// ============================================================

function cleanXmlText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(
      /<!\[CDATA\[/gi,
      ''
    )
    .replace(
      /\]\]>/gi,
      ''
    )
    .replace(
      /<[^>]*>/g,
      ' '
    )
    .replace(
      /&amp;/gi,
      '&'
    )
    .replace(
      /&lt;/gi,
      '<'
    )
    .replace(
      /&gt;/gi,
      '>'
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


// ============================================================
// XML TAG EXTRACTION
// ============================================================

function extractXmlTag(
  block,
  tagName
) {
  const regex =
    new RegExp(
      `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
      'i'
    );

  const match =
    block.match(regex);

  return match
    ? cleanXmlText(match[1])
    : '';
}


// ============================================================
// RSS PARSER
// ============================================================

function parseRSSFeedText(
  xmlText,
  districtName
) {
  const alerts = [];

  if (!xmlText) {
    return alerts;
  }

  const itemMatches =
    xmlText.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  for (
    const item of itemMatches
  ) {
    const title =
      extractXmlTag(
        item,
        'title'
      ) ||
      'Weather Alert';

    const description =
      extractXmlTag(
        item,
        'description'
      ) || '';

    const category =
      extractXmlTag(
        item,
        'category'
      ) || '';

    const link =
      extractXmlTag(
        item,
        'link'
      ) || '';

    const pubDate =
      extractXmlTag(
        item,
        'pubDate'
      ) || '';

    const content =
      `${title} ${description} ${category}`
        .toLowerCase();

    const districtMatched =
      content.includes(
        districtName.toLowerCase()
      );

    const genericKeralaAlert =
      content.includes('kerala') ||
      content.includes('rainfall') ||
      content.includes('flood') ||
      content.includes('landslide') ||
      content.includes('thunderstorm') ||
      content.includes('cyclone') ||
      content.includes('wind');

    if (
      !districtMatched &&
      !genericKeralaAlert
    ) {
      continue;
    }

    let hazardType =
      'WEATHER';

    if (
      content.includes('landslide') ||
      content.includes('mudslide')
    ) {
      hazardType =
        'LANDSLIDE';
    } else if (
      content.includes('flood') ||
      content.includes('river')
    ) {
      hazardType =
        'FLOOD';
    } else if (
      content.includes('cyclone')
    ) {
      hazardType =
        'CYCLONE';
    } else if (
      content.includes('thunderstorm') ||
      content.includes('lightning')
    ) {
      hazardType =
        'THUNDERSTORM';
    } else if (
      content.includes('wind') ||
      content.includes('storm')
    ) {
      hazardType =
        'STORM';
    } else if (
      content.includes('rain')
    ) {
      hazardType =
        'HEAVY_RAINFALL';
    }

    let rawSeverity =
      'NORMAL';

    if (
      content.includes('red alert') ||
      content.includes('red warning')
    ) {
      rawSeverity =
        'RED';
    } else if (
      content.includes('orange alert') ||
      content.includes('orange warning')
    ) {
      rawSeverity =
        'ORANGE';
    } else if (
      content.includes('yellow alert') ||
      content.includes('yellow warning')
    ) {
      rawSeverity =
        'YELLOW';
    }

    let mappedSeverity =
      rawSeverity;

    try {
      mappedSeverity =
        mapSeverityLevel(
          rawSeverity
        );
    } catch {
      mappedSeverity =
        rawSeverity;
    }

    let issuedAt =
      new Date();

    if (pubDate) {
      const parsed =
        new Date(pubDate);

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        issuedAt =
          parsed;
      }
    }

    alerts.push({
      alertId:
        `${districtName}-${Date.now()}-${alerts.length}`,

      district:
        districtName,

      hazardType,

      rawSeverity,

      mappedSeverity,

      title,

      description,

      safetyInstructions:
        'Follow official disaster-management instructions and avoid unsafe areas.',

      /*
       * IMPORTANT:
       * affected_zones is PostgreSQL ARRAY,
       * not JSONB.
       *
       * Therefore keep this as a JavaScript
       * array and DO NOT JSON.stringify it.
       */
      affectedZones: [
        districtName,
      ],

      sourceReferenceUrl:
        link || null,

      rawPayload: {
        title,
        description,
        category,
        link,
        pubDate,
      },

      issuedAt,
    });
  }

  return alerts;
}


// ============================================================
// OPENWEATHER CURRENT WEATHER
// ============================================================

async function fetchOpenWeatherAlerts(
  districtName,
  source
) {
  const coords =
    DISTRICT_COORDS[
      districtName
    ];

  if (!coords) {
    throw new Error(
      `Coordinates not available for ${districtName}`
    );
  }

  const apiKey =
    source?.api_key ||
    process.env.OPENWEATHER_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY is not configured'
    );
  }

  const endpoint =
    source?.api_endpoint ||
    'https://api.openweathermap.org/data/2.5/weather';

  const url =
    `${endpoint}` +
    `?lat=${coords.lat}` +
    `&lon=${coords.lon}` +
    `&appid=${encodeURIComponent(apiKey)}` +
    `&units=metric`;

  const response =
    await fetchWithTimeout(
      url,
      {
        method: 'GET',

        headers: {
          'User-Agent':
            'SAHAY-Disaster-Management-Platform/1.0',

          'Accept':
            'application/json',
        },
      },
      SECONDARY_FETCH_TIMEOUT
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${responseText.slice(0, 300)}`
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      'OpenWeather returned invalid JSON'
    );
  }

  const weather =
    Array.isArray(
      data.weather
    )
      ? data.weather[0]
      : null;

  const main =
    data.main || {};

  const wind =
    data.wind || {};

  const rain =
    data.rain || {};

  const weatherMain =
    String(
      weather?.main || ''
    ).toLowerCase();

  const weatherDescription =
    String(
      weather?.description || ''
    );

  const temperature =
    Number.isFinite(
      main.temp
    )
      ? main.temp
      : null;

  const humidity =
    Number.isFinite(
      main.humidity
    )
      ? main.humidity
      : null;

  const windSpeed =
    Number.isFinite(
      wind.speed
    )
      ? wind.speed
      : null;

  const rainfall =
    Number.isFinite(
      rain['1h']
    )
      ? rain['1h']
      : Number.isFinite(
          rain['3h']
        )
        ? rain['3h']
        : 0;

  let hazardType =
    'WEATHER';

  if (
    weatherMain.includes(
      'thunderstorm'
    )
  ) {
    hazardType =
      'THUNDERSTORM';
  } else if (
    weatherMain.includes(
      'rain'
    ) ||
    weatherMain.includes(
      'drizzle'
    )
  ) {
    hazardType =
      'RAINFALL';
  } else if (
    weatherMain.includes(
      'squall'
    ) ||
    weatherMain.includes(
      'tornado'
    )
  ) {
    hazardType =
      'STORM';
  }

  let rawSeverity =
    'NORMAL';

  if (
    rainfall >= 64.5 ||
    weatherMain.includes(
      'tornado'
    ) ||
    weatherMain.includes(
      'squall'
    )
  ) {
    rawSeverity =
      'RED';
  } else if (
    rainfall >= 20.5 ||
    weatherMain.includes(
      'thunderstorm'
    )
  ) {
    rawSeverity =
      'ORANGE';
  } else if (
    rainfall >= 7.5 ||
    weatherMain.includes(
      'rain'
    ) ||
    weatherMain.includes(
      'drizzle'
    )
  ) {
    rawSeverity =
      'YELLOW';
  }

  let mappedSeverity =
    rawSeverity;

  try {
    mappedSeverity =
      mapSeverityLevel(
        rawSeverity
      );
  } catch {
    mappedSeverity =
      rawSeverity;
  }

  return {
    alertId:
      `OWM-${districtName}-${Date.now()}`,

    district:
      districtName,

    hazardType,

    rawSeverity,

    mappedSeverity,

    title:
      `Weather Conditions - ${districtName}`,

    description:
      `${weatherDescription || 'Current weather conditions'}. ` +
      `Temperature: ${
        temperature !== null
          ? `${temperature}°C`
          : 'N/A'
      }, ` +
      `Humidity: ${
        humidity !== null
          ? `${humidity}%`
          : 'N/A'
      }, ` +
      `Rainfall: ${rainfall} mm, ` +
      `Wind speed: ${
        windSpeed !== null
          ? `${windSpeed} m/s`
          : 'N/A'
      }.`,

    safetyInstructions:
      rawSeverity === 'RED'
        ? 'Avoid travel through waterlogged and exposed areas. Follow official emergency instructions.'
        : rawSeverity === 'ORANGE'
          ? 'Exercise caution during outdoor travel and monitor official weather advisories.'
          : rawSeverity === 'YELLOW'
            ? 'Stay alert to changing weather conditions and follow local advisories.'
            : 'Continue monitoring weather conditions.',

    /*
     * PostgreSQL array.
     */
    affectedZones: [
      districtName,
    ],

    sourceReferenceUrl:
      'https://openweathermap.org/',

    rawPayload: {
      provider:
        'OpenWeatherMap',

      district:
        districtName,

      coordinates:
        coords,

      temperature,

      humidity,

      rainfall,

      windSpeed,

      weatherMain,

      weatherDescription,

      observedAt:
        new Date().toISOString(),

      originalResponse:
        data,
    },

    issuedAt:
      new Date(),

    expiresAt:
      new Date(
        Date.now() +
        60 * 60 * 1000
      ),
  };
}


// ============================================================
// OFFICIAL SOURCE
// ============================================================

async function fetchOfficialSource(
  districtName,
  source
) {
  const endpoint =
    source.api_endpoint;

  if (!endpoint) {
    throw new Error(
      'Official source API endpoint is missing'
    );
  }

  const response =
    await fetchWithTimeout(
      endpoint,
      {
        method: 'GET',

        headers: {
          'User-Agent':
            'SAHAY-Disaster-Management-Platform/1.0',

          'Accept':
            'application/rss+xml, application/xml, text/xml, */*',

          'Cache-Control':
            'no-cache',
        },
      },
      OFFICIAL_FETCH_TIMEOUT
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${responseText.slice(0, 300)}`
    );
  }

  const alerts =
    parseRSSFeedText(
      responseText,
      districtName
    );

  officialFeedCache.set(
    districtName,
    {
      timestamp:
        Date.now(),

      alerts,
    }
  );

  return {
    alerts,

    httpCode:
      response.status,

    rawResponse:
      responseText,
  };
}


// ============================================================
// MEMORY CACHE
// ============================================================

function getMemoryCachedAlerts(
  districtName
) {
  const cached =
    officialFeedCache.get(
      districtName
    );

  if (!cached) {
    return [];
  }

  if (
    Date.now() -
      cached.timestamp >
    OFFICIAL_CACHE_DURATION
  ) {
    return [];
  }

  return (
    cached.alerts || []
  );
}


// ============================================================
// DATABASE CACHE
// ============================================================

async function getCachedAlerts(
  districtName
) {
  try {
    const result =
      await pool.query(
        `
        SELECT *
        FROM official_weather_alerts
        WHERE LOWER(district) = LOWER($1)
          AND is_active = TRUE
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
        ORDER BY issued_at DESC
        `,
        [districtName]
      );

    return result.rows.map(
      row => ({
        id:
          row.id,

        alertId:
          row.alert_id,

        district:
          row.district,

        hazardType:
          row.hazard_type,

        rawSeverity:
          row.raw_severity,

        mappedSeverity:
          row.mapped_severity,

        title:
          row.title,

        description:
          row.description,

        safetyInstructions:
          row.safety_instructions,

        affectedZones:
          row.affected_zones,

        sourceReferenceUrl:
          row.source_reference_url,

        rawPayload:
          row.raw_payload,

        issuedAt:
          row.issued_at,

        expiresAt:
          row.expires_at,

        sourceId:
          row.source_id,

        sourceName:
          row.source_name,

        sourceType:
          row.source_type,
      })
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not load cached alerts for ${districtName}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// MANUAL ADVISORIES
// ============================================================

async function getManualAdvisories(
  districtName
) {
  try {
    const result =
      await pool.query(
        `
        SELECT *
        FROM district_manual_advisories
        WHERE LOWER(district) = LOWER($1)
          AND (
            is_active = TRUE
            OR is_active IS NULL
          )
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
        ORDER BY issued_at DESC
        `,
        [districtName]
      );

    return result.rows.map(
      advisory => ({
        id:
          advisory.id,

        district:
          advisory.district,

        title:
          advisory.title,

        description:
          advisory.instruction,

        instruction:
          advisory.instruction,

        severity:
          advisory.severity_tag ||
          'YELLOW',

        issuedAt:
          advisory.issued_at,

        expiresAt:
          advisory.expires_at,

        issuedBy:
          advisory.issued_by_name,
      })
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not load manual advisories for ${districtName}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// PREVIOUS SEVERITY
// ============================================================

async function getPreviousSeverity(
  districtName
) {
  try {
    const result =
      await pool.query(
        `
        SELECT highest_severity
        FROM weather_alert_zone_cache
        WHERE LOWER(district) = LOWER($1)
        ORDER BY updated_at DESC
        LIMIT 1
        `,
        [districtName]
      );

    if (
      result.rows.length === 0
    ) {
      return 'NORMAL';
    }

    return (
      result.rows[0].highest_severity ||
      'NORMAL'
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not get previous severity for ${districtName}:`,
      error.message
    );

    return 'NORMAL';
  }
}


// ============================================================
// DEACTIVATE OLD ALERTS
// ============================================================

async function deactivateOldOfficialAlerts(
  districtName
) {
  try {
    await pool.query(
      `
      UPDATE official_weather_alerts
      SET is_active = FALSE
      WHERE LOWER(district) = LOWER($1)
        AND is_active = TRUE
      `,
      [districtName]
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not deactivate old alerts for ${districtName}:`,
      error.message
    );
  }
}


// ============================================================
// INSERT WEATHER ALERT
// ============================================================

async function insertWeatherAlert(
  alert,
  source
) {
  try {
    const sourceType =
      source?.source_type ||
      'SECONDARY';

    const sourceName =
      source?.name ||
      'Weather Source';

    const sourceId =
      source?.id ||
      null;

    /*
     * IMPORTANT:
     *
     * affected_zones is PostgreSQL ARRAY.
     *
     * Do NOT use JSON.stringify().
     */
    const affectedZones =
      Array.isArray(
        alert.affectedZones
      )
        ? alert.affectedZones
        : [];

    const result =
      await pool.query(
        `
        INSERT INTO official_weather_alerts
        (
          alert_id,
          source_id,
          source_name,
          source_type,
          district,
          hazard_type,
          raw_severity,
          mapped_severity,
          title,
          description,
          safety_instructions,
          affected_zones,
          source_reference_url,
          raw_payload,
          issued_at,
          expires_at,
          fetched_at,
          is_active
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          NOW(),
          TRUE
        )
        RETURNING *
        `,
        [
          alert.alertId ||
            `SAHAY-${Date.now()}`,

          sourceId,

          sourceName,

          sourceType,

          alert.district,

          alert.hazardType ||
            'WEATHER',

          alert.rawSeverity ||
            'NORMAL',

          alert.mappedSeverity ||
            'NORMAL',

          alert.title ||
            'Weather Alert',

          alert.description ||
            '',

          alert.safetyInstructions ||
            '',

          /*
           * PASS ARRAY DIRECTLY
           */
          affectedZones,

          alert.sourceReferenceUrl ||
            null,

          JSON.stringify(
            alert.rawPayload || {}
          ),

          alert.issuedAt ||
            new Date(),

          alert.expiresAt ||
            null,
        ]
      );

    return result.rows[0];

  } catch (error) {
    console.error(
      '[WeatherAlertFetcher] Could not insert weather alert:',
      error.message
    );

    return null;
  }
}


// ============================================================
// WEATHER ZONE CACHE
// ============================================================

async function updateWeatherZoneCache(
  districtName,
  highestSeverity,
  activeAlerts = [],
  activeAdvisories = [],
  requestedStatus = 'SUCCESS'
) {
  try {
    /*
     * The exact allowed values are obtained from
     * the PostgreSQL CHECK constraint.
     *
     * This prevents the fetcher from assuming that
     * SUCCESS / FAILED / STALE are the only names.
     */

    const validStatus =
      await getValidStatus(
        'weather_alert_zone_cache',
        'weather_alert_zone_cache_fetch_status_check',
        requestedStatus,
        'SUCCESS'
      );

    await pool.query(
      `
      INSERT INTO weather_alert_zone_cache
      (
        district,
        highest_severity,
        active_alerts,
        active_advisories,
        last_successful_fetch,
        fetch_status,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3::jsonb,
        $4::jsonb,
        CASE
          WHEN $5 IN (
            'SUCCESS',
            'SUCCESSFUL',
            'COMPLETED',
            'OK'
          )
          THEN NOW()
          ELSE NULL
        END,
        $5,
        NOW()
      )
      ON CONFLICT (district)
      DO UPDATE SET
        highest_severity =
          EXCLUDED.highest_severity,

        active_alerts =
          EXCLUDED.active_alerts,

        active_advisories =
          EXCLUDED.active_advisories,

        last_successful_fetch =
          CASE
            WHEN $5 IN (
              'SUCCESS',
              'SUCCESSFUL',
              'COMPLETED',
              'OK'
            )
            THEN NOW()
            ELSE weather_alert_zone_cache.last_successful_fetch
          END,

        fetch_status =
          EXCLUDED.fetch_status,

        updated_at =
          NOW()
      `,
      [
        districtName,

        highestSeverity ||
          'NORMAL',

        JSON.stringify(
          activeAlerts || []
        ),

        JSON.stringify(
          activeAdvisories || []
        ),

        validStatus,
      ]
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not update weather zone cache for ${districtName}:`,
      error.message
    );
  }
}


// ============================================================
// FETCH LOG
// ============================================================

async function saveFetchLog(
  districtName,
  sourceId,
  sourceName,
  requestedStatus,
  httpCode = null,
  errorMessage = null,
  rawResponse = null,
  mappedLevel = null,
  alertsCount = 0
) {
  try {
    const validStatus =
      await getValidStatus(
        'weather_alert_fetch_logs',
        'weather_alert_fetch_logs_status_check',
        requestedStatus,
        requestedStatus === 'SUCCESS'
          ? 'SUCCESS'
          : 'FAILED'
      );

    await pool.query(
      `
      INSERT INTO weather_alert_fetch_logs
      (
        district,
        source_id,
        source_name,
        status,
        http_code,
        error_message,
        raw_response,
        mapped_level,
        alerts_count,
        fetched_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        NOW()
      )
      `,
      [
        districtName,

        sourceId,

        sourceName,

        validStatus,

        httpCode,

        errorMessage,

        rawResponse,

        mappedLevel,

        alertsCount,
      ]
    );

  } catch (error) {
    console.warn(
      '[WeatherAlertFetcher] Could not save fetch log:',
      error.message
    );
  }
}


// ============================================================
// NOTIFICATION
// ============================================================

async function sendWeatherNotification(
  districtName,
  highestSeverity,
  alerts
) {
  try {
    if (
      typeof sendDistrictRoleNotification !==
      'function'
    ) {
      return;
    }

    if (
      !alerts ||
      alerts.length === 0
    ) {
      return;
    }

    /*
     * Different versions of notificationService may use
     * different signatures.
     *
     * If it accepts one argument, pass an alert object.
     * Otherwise use the older multi-argument form.
     */

    if (
      sendDistrictRoleNotification.length === 1
    ) {
      const alert =
        alerts[0];

      await sendDistrictRoleNotification({
        ...alert,

        district:
          districtName,

        severity:
          highestSeverity,

        mappedSeverity:
          highestSeverity,
      });

      return;
    }

    await sendDistrictRoleNotification(
      districtName,
      highestSeverity,
      alerts
    );

  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Notification failed for ${districtName}:`,
      error.message
    );
  }
}


// ============================================================
// FETCH ALERTS FOR DISTRICT
// ============================================================

async function fetchAlertsForDistrict(
  districtName
) {
  const sources =
    await getActiveSources();

  if (
    sources.length === 0
  ) {
    return {
      alerts: [],
      source: null,
      status: 'UNVERIFIED',
    };
  }


  // ----------------------------------------------------------
  // OFFICIAL SOURCES
  // ----------------------------------------------------------

  const officialSources =
    sources.filter(
      source =>
        String(
          source.source_type
        ).toUpperCase() ===
        'OFFICIAL'
    );


  for (
    const source of officialSources
  ) {
    try {
      console.log(
        `[WeatherAlertFetcher] Fetching official feed: ${source.name}`
      );

      const result =
        await fetchOfficialSource(
          districtName,
          source
        );

      await saveFetchLog(
        districtName,
        source.id,
        source.name,
        'SUCCESS',
        result.httpCode,
        null,
        result.rawResponse,
        null,
        result.alerts.length
      );

      if (
        result.alerts.length > 0
      ) {
        return {
          alerts:
            result.alerts,

          source,

          status:
            'SUCCESS',

          httpCode:
            result.httpCode,

          rawResponse:
            result.rawResponse,
        };
      }

    } catch (error) {
      console.warn(
        `[WeatherAlertFetcher] Source '${source.name}' feed unreachable: ${error.message}. Trying fallback source.`
      );

      await saveFetchLog(
        districtName,
        source.id,
        source.name,
        'FAILED',
        null,
        error.message
      );
    }
  }


  // ----------------------------------------------------------
  // SECONDARY SOURCES
  // ----------------------------------------------------------

  const secondarySources =
    sources.filter(
      source =>
        String(
          source.source_type
        ).toUpperCase() ===
        'SECONDARY'
    );


  for (
    const source of secondarySources
  ) {
    try {
      console.log(
        `[WeatherAlertFetcher] Trying secondary source '${source.name}' for ${districtName}`
      );

      const weatherAlert =
        await fetchOpenWeatherAlerts(
          districtName,
          source
        );

      await saveFetchLog(
        districtName,
        source.id,
        source.name,
        'SUCCESS',
        200,
        null,
        JSON.stringify(
          weatherAlert.rawPayload || {}
        ),
        weatherAlert.mappedSeverity,
        1
      );

      return {
        alerts: [
          weatherAlert,
        ],

        source,

        status:
          'SUCCESS',

        httpCode:
          200,

        rawResponse:
          JSON.stringify(
            weatherAlert.rawPayload || {}
          ),
      };

    } catch (error) {
      console.warn(
        `[WeatherAlertFetcher] Source '${source.name}' fetch failed for ${districtName}: ${error.message}`
      );

      await saveFetchLog(
        districtName,
        source.id,
        source.name,
        'FAILED',
        null,
        error.message
      );
    }
  }


  // ----------------------------------------------------------
  // MEMORY CACHE
  // ----------------------------------------------------------

  const memoryCache =
    getMemoryCachedAlerts(
      districtName
    );

  if (
    memoryCache.length > 0
  ) {
    return {
      alerts:
        memoryCache,

      source:
        officialSources[0] ||
        null,

      status:
        'STALE',
    };
  }


  // ----------------------------------------------------------
  // DATABASE CACHE
  // ----------------------------------------------------------

  const databaseCache =
    await getCachedAlerts(
      districtName
    );

  if (
    databaseCache.length > 0
  ) {
    return {
      alerts:
        databaseCache,

      source:
        officialSources[0] ||
        null,

      status:
        'STALE',
    };
  }


  return {
    alerts: [],

    source:
      officialSources[0] ||
      secondarySources[0] ||
      null,

    status:
      'UNVERIFIED',
  };
}


// ============================================================
// PROCESS DISTRICT
// ============================================================

async function processDistrict(
  districtName
) {
  try {
    console.log(
      `[WeatherAlertFetcher] Processing ${districtName}...`
    );

    const previousSeverity =
      await getPreviousSeverity(
        districtName
      );

    const fetchResult =
      await fetchAlertsForDistrict(
        districtName
      );

    let alerts =
      fetchResult.alerts || [];

    const source =
      fetchResult.source || null;

    const fetchStatus =
      fetchResult.status ||
      'UNVERIFIED';


    // --------------------------------------------------------
    // MANUAL ADVISORIES
    // --------------------------------------------------------

    const manualAdvisories =
      await getManualAdvisories(
        districtName
      );


    // --------------------------------------------------------
    // NOTHING AVAILABLE
    // --------------------------------------------------------

    if (
      alerts.length === 0 &&
      manualAdvisories.length === 0
    ) {
      await saveFetchLog(
        districtName,
        source?.id || null,
        source?.name ||
          'Weather Alert Fetcher',
        'FAILED',
        null,
        'No weather alerts or manual advisories available',
        null,
        'NORMAL',
        0
      );

      await updateWeatherZoneCache(
        districtName,
        'NORMAL',
        [],
        [],
        'FAILED'
      );

      return {
        district:
          districtName,

        alerts: [],

        advisories: [],

        severity:
          'NORMAL',

        previousSeverity,

        status:
          fetchStatus,
      };
    }


    // --------------------------------------------------------
    // DEACTIVATE PREVIOUS ALERTS
    // --------------------------------------------------------

    if (
      alerts.length > 0
    ) {
      await deactivateOldOfficialAlerts(
        districtName
      );
    }


    // --------------------------------------------------------
    // INSERT ALERTS
    // --------------------------------------------------------

    const insertedAlerts = [];

    for (
      const alert of alerts
    ) {
      const inserted =
        await insertWeatherAlert(
          alert,
          source
        );

      if (inserted) {
        insertedAlerts.push(
          inserted
        );
      }
    }


    // --------------------------------------------------------
    // SEVERITY
    // --------------------------------------------------------

    const severityValues =
      insertedAlerts.length > 0
        ? insertedAlerts.map(
            alert =>
              alert.mapped_severity ||
              alert.raw_severity ||
              'NORMAL'
          )
        : alerts.map(
            alert =>
              alert.mappedSeverity ||
              alert.rawSeverity ||
              'NORMAL'
          );


    let highestSeverity =
      'NORMAL';

    if (
      severityValues.length > 0
    ) {
      try {
        highestSeverity =
          getHighestSeverityLevel(
            severityValues
          );
      } catch {
        highestSeverity =
          severityValues[0] ||
          'NORMAL';
      }
    }


    // --------------------------------------------------------
    // UPDATE CACHE
    // --------------------------------------------------------

    await updateWeatherZoneCache(
      districtName,

      highestSeverity,

      insertedAlerts.length > 0
        ? insertedAlerts
        : alerts,

      manualAdvisories,

      'SUCCESS'
    );


    // --------------------------------------------------------
    // NOTIFICATION
    // --------------------------------------------------------

    if (
      highestSeverity !==
      previousSeverity
    ) {
      await sendWeatherNotification(
        districtName,
        highestSeverity,
        insertedAlerts.length > 0
          ? insertedAlerts
          : alerts
      );
    }


    // --------------------------------------------------------
    // SUCCESS LOG
    // --------------------------------------------------------

    await saveFetchLog(
      districtName,
      source?.id || null,
      source?.name ||
        'Weather Alert Fetcher',
      'SUCCESS',
      fetchResult.httpCode ||
        null,
      null,
      fetchResult.rawResponse ||
        null,
      highestSeverity,
      alerts.length
    );


    console.log(
      `[WeatherAlertFetcher] ${districtName}: ${highestSeverity} (${alerts.length} alert(s), ${manualAdvisories.length} advisory/advisories)`
    );


    return {
      district:
        districtName,

      alerts:
        insertedAlerts.length > 0
          ? insertedAlerts
          : alerts,

      advisories:
        manualAdvisories,

      severity:
        highestSeverity,

      previousSeverity,

      status:
        fetchStatus,

      source:
        source?.name ||
        null,
    };

  } catch (error) {
    console.error(
      `[WeatherAlertFetcher] Error processing ${districtName}:`,
      error.message
    );

    await saveFetchLog(
      districtName,
      null,
      'Weather Alert Fetcher',
      'FAILED',
      null,
      error.message
    );

    return {
      district:
        districtName,

      alerts: [],

      advisories: [],

      severity:
        'NORMAL',

      status:
        'FAILED',

      error:
        error.message,
    };
  }
}


// ============================================================
// POLL ALL DISTRICTS
// ============================================================

async function pollAllDistricts() {
  console.log(
    '[WeatherAlertFetcher] Polling official weather alert feeds for all districts...'
  );

  const results = [];

  for (
    const district of KERALA_DISTRICTS
  ) {
    try {
      const result =
        await processDistrict(
          district
        );

      results.push(
        result
      );

    } catch (error) {
      console.error(
        `[WeatherAlertFetcher] District ${district} failed:`,
        error.message
      );

      results.push({
        district,

        alerts: [],

        advisories: [],

        severity:
          'NORMAL',

        status:
          'FAILED',

        error:
          error.message,
      });
    }
  }

  console.log(
    '✅ [WeatherAlertFetcher] Weather alert poll completed.'
  );

  return results;
}


// ============================================================
// POLLING TIMER
// ============================================================

let pollingTimer = null;

function startWeatherAlertPolling(
  intervalMs = WEATHER_POLL_INTERVAL
) {
  if (pollingTimer) {
    console.log(
      '[WeatherAlertFetcher] Polling timer already running.'
    );

    return pollingTimer;
  }

  console.log(
    `[WeatherAlertFetcher] Background weather alert polling started (Interval: ${Math.round(intervalMs / 60000)} mins)`
  );

  /*
   * Wait for database initialization before
   * performing the first complete district poll.
   */
  setTimeout(() => {
    pollAllDistricts()
      .catch(error => {
        console.error(
          '[WeatherAlertFetcher] Initial polling failed:',
          error.message
        );
      });
  }, 10000);

  pollingTimer =
    setInterval(() => {
      pollAllDistricts()
        .catch(error => {
          console.error(
            '[WeatherAlertFetcher] Scheduled polling failed:',
            error.message
          );
        });
    }, intervalMs);

  return pollingTimer;
}


// ============================================================
// STOP POLLING
// ============================================================

function stopWeatherAlertPolling() {
  if (pollingTimer) {
    clearInterval(
      pollingTimer
    );

    pollingTimer = null;

    console.log(
      '[WeatherAlertFetcher] Background weather alert polling stopped.'
    );
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  pollAllDistricts,

  processDistrict,

  fetchAlertsForDistrict,

  fetchOpenWeatherAlerts,

  startWeatherAlertPolling,

  /*
   * server.js currently uses startPollingTimer()
   */
  startPollingTimer:
    startWeatherAlertPolling,

  stopWeatherAlertPolling,

  KERALA_DISTRICTS,

  DISTRICT_COORDS,
};