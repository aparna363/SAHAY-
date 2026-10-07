const pool = require('../db');
const {
  mapSeverityLevel,
  getHighestSeverityLevel,
} = require('./severityMapper');
const { sendDistrictRoleNotification } = require('./notificationService');

// ============================================================
// SAHAY - Official Weather Alert Fetcher
// ============================================================
// Primary source:
//   KSDMA / IMD RSS feed
//
// Secondary source:
//   OpenWeather Current Weather API
//
// Final fallback:
//   Cached official alerts / manual advisories
//
// IMPORTANT:
//   OPENWEATHER_API_KEY must be configured in Render Environment
//   Variables. Do NOT hard-code the API key here.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const OFFICIAL_FETCH_TIMEOUT = 15000;
const SECONDARY_FETCH_TIMEOUT = 10000;

const OFFICIAL_CACHE_DURATION = 3 * 60 * 1000;
const WEATHER_POLL_INTERVAL = 20 * 60 * 1000;

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
  thiruvananthapuram: {
    lat: 8.5241,
    lon: 76.9366,
  },

  kollam: {
    lat: 8.8932,
    lon: 76.6141,
  },

  pathanamthitta: {
    lat: 9.2648,
    lon: 76.7870,
  },

  alappuzha: {
    lat: 9.4981,
    lon: 76.3388,
  },

  kottayam: {
    lat: 9.5916,
    lon: 76.5222,
  },

  idukki: {
    lat: 9.8494,
    lon: 76.9720,
  },

  ernakulam: {
    lat: 9.9816,
    lon: 76.2999,
  },

  thrissur: {
    lat: 10.5276,
    lon: 76.2144,
  },

  palakkad: {
    lat: 10.7867,
    lon: 76.6548,
  },

  malappuram: {
    lat: 11.0510,
    lon: 76.0711,
  },

  kozhikode: {
    lat: 11.2588,
    lon: 75.7804,
  },

  wayanad: {
    lat: 11.6854,
    lon: 76.1320,
  },

  kannur: {
    lat: 11.8745,
    lon: 75.3704,
  },

  kasaragod: {
    lat: 12.5102,
    lon: 74.9852,
  },
};


// ============================================================
// IN-MEMORY OFFICIAL FEED CACHE
// ============================================================

const officialFeedCache = new Map();


// ============================================================
// HELPERS
// ============================================================

function normalizeDistrictName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


function escapeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}


function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function decodeXml(value) {
  return stripHtml(escapeHtml(value))
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/gi, '')
    .trim();
}


function getTagValue(block, tagName) {
  const regex = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    'i'
  );

  const match = block.match(regex);

  return match ? decodeXml(match[1]) : '';
}


function getAttributeValue(block, tagName, attributeName) {
  const regex = new RegExp(
    `<${tagName}[^>]*\\s${attributeName}=["']([^"']+)["'][^>]*>`,
    'i'
  );

  const match = block.match(regex);

  return match ? match[1] : '';
}


function safeDate(value) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}


// ============================================================
// FETCH WITH TIMEOUT
// ============================================================

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 10000
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeoutMs}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


// ============================================================
// GET ACTIVE WEATHER SOURCES
// ============================================================

async function getActiveSources() {
  const result = await pool.query(`
    SELECT *
    FROM weather_alert_sources
    WHERE is_active = TRUE
    ORDER BY priority ASC
  `);

  return result.rows;
}


// ============================================================
// GET SOURCE SEVERITY MAPPINGS
// ============================================================

async function getSourceSeverityMappings(sourceId) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM weather_alert_severity_mappings
      WHERE source_id = $1
      `,
      [sourceId]
    );

    return result.rows;
  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Unable to load severity mappings for source ${sourceId}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// FIND SEVERITY FROM SOURCE MAPPING
// ============================================================

function findMappedSeverity(
  sourceValue,
  mappings
) {
  if (!sourceValue || !Array.isArray(mappings)) {
    return null;
  }

  const normalized = String(sourceValue)
    .trim()
    .toLowerCase();

  const mapping = mappings.find((item) => {
    const sourceLevel = String(
      item.source_level ||
      item.source_severity ||
      item.level ||
      ''
    )
      .trim()
      .toLowerCase();

    return sourceLevel === normalized;
  });

  if (!mapping) {
    return null;
  }

  return (
    mapping.severity_level ||
    mapping.mapped_severity ||
    mapping.target_severity ||
    null
  );
}


// ============================================================
// DETECT HAZARD TYPE
// ============================================================

function detectHazardType(text) {
  const value = String(text || '').toLowerCase();

  if (
    value.includes('landslide') ||
    value.includes('land slip') ||
    value.includes('mudslide')
  ) {
    return 'LANDSLIDE';
  }

  if (
    value.includes('flood') ||
    value.includes('flash flood') ||
    value.includes('waterlogging')
  ) {
    return 'FLOOD';
  }

  if (
    value.includes('cyclone') ||
    value.includes('storm')
  ) {
    return 'CYCLONE';
  }

  if (
    value.includes('thunderstorm') ||
    value.includes('lightning')
  ) {
    return 'THUNDERSTORM';
  }

  if (
    value.includes('heavy rain') ||
    value.includes('very heavy rain') ||
    value.includes('extremely heavy rain') ||
    value.includes('rainfall') ||
    value.includes('rain')
  ) {
    return 'HEAVY_RAIN';
  }

  if (
    value.includes('coastal') ||
    value.includes('high wave') ||
    value.includes('rough sea')
  ) {
    return 'COASTAL_HAZARD';
  }

  return 'WEATHER';
}


// ============================================================
// DETECT SEVERITY FROM TEXT
// ============================================================

function detectSeverityFromText(text) {
  const value = String(text || '').toLowerCase();

  if (
    value.includes('red alert') ||
    value.includes('red warning') ||
    value.includes('extremely heavy') ||
    value.includes('severe') ||
    value.includes('very severe') ||
    value.includes('extreme')
  ) {
    return 'RED';
  }

  if (
    value.includes('orange alert') ||
    value.includes('orange warning') ||
    value.includes('very heavy') ||
    value.includes('heavy to very heavy')
  ) {
    return 'ORANGE';
  }

  if (
    value.includes('yellow alert') ||
    value.includes('yellow warning') ||
    value.includes('heavy rain') ||
    value.includes('moderate risk')
  ) {
    return 'YELLOW';
  }

  return 'GREEN';
}


// ============================================================
// CHECK WHETHER ALERT BELONGS TO DISTRICT
// ============================================================

function alertMatchesDistrict(
  text,
  districtName
) {
  const normalizedText = String(text || '').toLowerCase();

  const district = normalizeDistrictName(
    districtName
  );

  if (
    normalizedText.includes(district)
  ) {
    return true;
  }

  // Kerala-wide alerts are relevant to all districts.
  if (
    normalizedText.includes('kerala') ||
    normalizedText.includes('entire state') ||
    normalizedText.includes('statewide')
  ) {
    return true;
  }

  return false;
}


// ============================================================
// PARSE RSS / XML FEED
// ============================================================

function parseRSSFeedText(
  xmlText,
  districtName
) {
  const alerts = [];

  if (!xmlText) {
    return alerts;
  }

  const itemMatches = xmlText.match(
    /<item\b[\s\S]*?<\/item>/gi
  ) || [];

  for (const item of itemMatches) {
    const title =
      getTagValue(item, 'title') ||
      getTagValue(item, 'name');

    const description =
      getTagValue(item, 'description') ||
      getTagValue(item, 'summary') ||
      getTagValue(item, 'content');

    const category =
      getTagValue(item, 'category') ||
      getTagValue(item, 'event');

    const link =
      getTagValue(item, 'link') ||
      getAttributeValue(item, 'link', 'href');

    const pubDate =
      getTagValue(item, 'pubDate') ||
      getTagValue(item, 'published') ||
      getTagValue(item, 'updated');

    const combinedText = [
      title,
      description,
      category,
    ]
      .filter(Boolean)
      .join(' ');

    if (
      !alertMatchesDistrict(
        combinedText,
        districtName
      )
    ) {
      continue;
    }

    const severity =
      detectSeverityFromText(
        combinedText
      );

    const hazardType =
      detectHazardType(
        combinedText
      );

    alerts.push({
      district: districtName,
      title:
        title ||
        `${hazardType} Alert`,
      description:
        description ||
        title ||
        'Official weather advisory',
      severity,
      hazard_type: hazardType,
      source: 'IMD/KSDMA',
      source_url: link || null,
      issued_at: safeDate(pubDate),
      is_official: true,
    });
  }

  return alerts;
}


// ============================================================
// FETCH OFFICIAL SOURCE
// ============================================================

async function fetchOfficialSource(
  source,
  districtName
) {
  const cacheKey = String(
    source.id
  );

  const cached =
    officialFeedCache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp <
      OFFICIAL_CACHE_DURATION
  ) {
    return parseRSSFeedText(
      cached.text,
      districtName
    );
  }

  console.log(
    `[WeatherAlertFetcher] Fetching official feed: ${source.name}`
  );

  const response =
    await fetchWithTimeout(
      source.api_endpoint,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'SAHAY-Disaster-Management-System/1.0',
          Accept:
            'application/rss+xml, application/xml, text/xml, */*',
          'Cache-Control':
            'no-cache',
        },
      },
      OFFICIAL_FETCH_TIMEOUT
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} from ${source.name}`
    );
  }

  const text =
    await response.text();

  if (!text || text.trim().length === 0) {
    throw new Error(
      'Official feed returned an empty response'
    );
  }

  officialFeedCache.set(
    cacheKey,
    {
      timestamp: Date.now(),
      text,
    }
  );

  return parseRSSFeedText(
    text,
    districtName
  );
}


// ============================================================
// OPENWEATHER SEVERITY
// ============================================================

function getOpenWeatherSeverity(
  weather,
  rain,
  windSpeed
) {
  const main =
    String(
      weather?.main || ''
    ).toLowerCase();

  const description =
    String(
      weather?.description || ''
    ).toLowerCase();

  const combined = `${main} ${description}`;

  // Thunderstorms
  if (
    combined.includes('thunderstorm')
  ) {
    return 'ORANGE';
  }

  // Very strong wind
  if (
    typeof windSpeed === 'number' &&
    windSpeed >= 17
  ) {
    return 'ORANGE';
  }

  // Heavy / extreme rain
  if (
    combined.includes('heavy rain') ||
    combined.includes('extreme rain')
  ) {
    return 'ORANGE';
  }

  // Rain
  if (
    combined.includes('rain') ||
    combined.includes('drizzle')
  ) {
    return 'YELLOW';
  }

  // Moderate rain amount
  if (
    typeof rain === 'number' &&
    rain >= 10
  ) {
    return 'YELLOW';
  }

  return 'GREEN';
}


// ============================================================
// FETCH OPENWEATHER CURRENT WEATHER
// ============================================================

async function fetchOpenWeatherAlerts(
  source,
  districtName
) {
  const coords =
    DISTRICT_COORDS[
      normalizeDistrictName(districtName)
    ];

  if (!coords) {
    throw new Error(
      `No coordinates configured for ${districtName}`
    );
  }

  const apiKey =
    source.api_key ||
    process.env.OPENWEATHER_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'OPENWEATHER_API_KEY is not configured'
    );
  }

  const url =
    `${source.api_endpoint}` +
    `?lat=${encodeURIComponent(coords.lat)}` +
    `&lon=${encodeURIComponent(coords.lon)}` +
    `&appid=${encodeURIComponent(apiKey)}` +
    `&units=metric`;

  const response =
    await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'SAHAY-Disaster-Management-System/1.0',
        },
      },
      SECONDARY_FETCH_TIMEOUT
    );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} from ${source.name}`
    );
  }

  const data =
    await response.json();

  if (
    !data ||
    !Array.isArray(data.weather) ||
    !data.weather.length
  ) {
    throw new Error(
      'OpenWeather returned no weather data'
    );
  }

  const weather =
    data.weather[0];

  const rainfall =
    data.rain?.['1h'] ??
    data.rain?.['3h'] ??
    0;

  const windSpeed =
    Number(data.wind?.speed || 0);

  const severity =
    getOpenWeatherSeverity(
      weather,
      Number(rainfall),
      windSpeed
    );

  const hazardType =
    detectHazardType(
      `${weather.main} ${weather.description}`
    );

  const title =
    `Weather condition: ${
      weather.description || weather.main
    }`;

  const descriptionParts = [];

  if (
    data.main?.temp !== undefined
  ) {
    descriptionParts.push(
      `Temperature: ${data.main.temp}°C`
    );
  }

  if (
    data.main?.humidity !== undefined
  ) {
    descriptionParts.push(
      `Humidity: ${data.main.humidity}%`
    );
  }

  if (
    windSpeed !== undefined
  ) {
    descriptionParts.push(
      `Wind: ${windSpeed} m/s`
    );
  }

  if (
    Number(rainfall) > 0
  ) {
    descriptionParts.push(
      `Rainfall: ${rainfall} mm`
    );
  }

  return [
    {
      district: districtName,
      title,
      description:
        descriptionParts.join(' | ') ||
        'Current weather observation from OpenWeather',
      severity,
      hazard_type: hazardType,
      source: 'OpenWeather',
      source_url:
        'https://openweathermap.org/',
      issued_at: new Date(),
      is_official: false,
      weather_data: {
        temperature:
          data.main?.temp ?? null,
        feels_like:
          data.main?.feels_like ?? null,
        humidity:
          data.main?.humidity ?? null,
        pressure:
          data.main?.pressure ?? null,
        wind_speed:
          windSpeed,
        rainfall:
          Number(rainfall),
        weather:
          weather.description ||
          weather.main ||
          null,
      },
    },
  ];
}


// ============================================================
// FETCH ALERTS FOR ONE DISTRICT
// ============================================================

async function fetchAlertsForDistrict(
  districtName
) {
  const sources =
    await getActiveSources();

  const officialSources =
    sources.filter(
      (source) =>
        String(source.source_type)
          .toUpperCase() === 'OFFICIAL'
    );

  const secondarySources =
    sources.filter(
      (source) =>
        String(source.source_type)
          .toUpperCase() === 'SECONDARY'
    );

  // ----------------------------------------------------------
  // PRIMARY: OFFICIAL SOURCES
  // ----------------------------------------------------------

  for (const source of officialSources) {
    try {
      const alerts =
        await fetchOfficialSource(
          source,
          districtName
        );

      if (
        alerts.length > 0
      ) {
        return {
          alerts,
          sourceType: 'OFFICIAL',
          sourceName: source.name,
        };
      }

      console.log(
        `[WeatherAlertFetcher] Official source '${source.name}' returned no matching alerts for ${districtName}.`
      );
    } catch (error) {
      console.warn(
        `[WeatherAlertFetcher] Source '${source.name}' feed unreachable: ${error.message}. Trying fallback source.`
      );
    }
  }

  // ----------------------------------------------------------
  // SECONDARY: OPENWEATHER
  // ----------------------------------------------------------

  for (const source of secondarySources) {
    try {
      console.log(
        `[WeatherAlertFetcher] Trying secondary source '${source.name}' for ${districtName}`
      );

      const alerts =
        await fetchOpenWeatherAlerts(
          source,
          districtName
        );

      if (
        alerts.length > 0
      ) {
        return {
          alerts,
          sourceType: 'SECONDARY',
          sourceName: source.name,
        };
      }
    } catch (error) {
      console.warn(
        `[WeatherAlertFetcher] Source '${source.name}' fetch failed for ${districtName}: ${error.message}`
      );
    }
  }

  // ----------------------------------------------------------
  // NOTHING AVAILABLE
  // ----------------------------------------------------------

  return {
    alerts: [],
    sourceType: 'NONE',
    sourceName: null,
  };
}


// ============================================================
// GET CURRENT CACHED ALERTS
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
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
        ORDER BY issued_at DESC
        `,
        [districtName]
      );

    return result.rows;
  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not load cached alerts for ${districtName}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// GET MANUAL ADVISORIES
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
        ORDER BY created_at DESC
        `,
        [districtName]
      );

    return result.rows;
  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Could not load manual advisories for ${districtName}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// SAVE FETCH LOG
// ============================================================

async function saveFetchLog(
  districtName,
  sourceName,
  status,
  message = null
) {
  try {
    await pool.query(
      `
      INSERT INTO weather_alert_fetch_logs
      (
        district,
        source_name,
        status,
        message,
        fetched_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [
        districtName,
        sourceName,
        status,
        message,
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
  sourceName
) {
  const severity =
    alert.severity ||
    'GREEN';

  try {
    const result =
      await pool.query(
        `
        INSERT INTO official_weather_alerts
        (
          district,
          title,
          description,
          severity,
          hazard_type,
          source,
          source_url,
          issued_at,
          is_active,
          is_official
        )
        VALUES
        (
          $1, $2, $3, $4, $5,
          $6, $7, $8, TRUE, $9
        )
        RETURNING *
        `,
        [
          alert.district,
          alert.title,
          alert.description,
          severity,
          alert.hazard_type ||
            'WEATHER',
          sourceName ||
            alert.source ||
            'Unknown',
          alert.source_url ||
            null,
          alert.issued_at ||
            new Date(),
          alert.is_official === true,
        ]
      );

    return result.rows[0];
  } catch (error) {
    console.error(
      `[WeatherAlertFetcher] Could not insert alert for ${alert.district}:`,
      error.message
    );

    return null;
  }
}


// ============================================================
// UPDATE WEATHER ZONE CACHE
// ============================================================

async function updateWeatherZoneCache(
  districtName,
  severity
) {
  try {
    await pool.query(
      `
      INSERT INTO weather_alert_zone_cache
      (
        district,
        severity,
        updated_at
      )
      VALUES
      ($1, $2, NOW())
      ON CONFLICT (district)
      DO UPDATE SET
        severity = EXCLUDED.severity,
        updated_at = NOW()
      `,
      [
        districtName,
        severity,
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
// GET PREVIOUS SEVERITY
// ============================================================

async function getPreviousSeverity(
  districtName
) {
  try {
    const result =
      await pool.query(
        `
        SELECT severity
        FROM weather_alert_zone_cache
        WHERE LOWER(district) = LOWER($1)
        LIMIT 1
        `,
        [districtName]
      );

    return result.rows[0]?.severity ||
      null;
  } catch (error) {
    return null;
  }
}


// ============================================================
// SEND NOTIFICATION ON SEVERITY CHANGE
// ============================================================

async function notifySeverityChange(
  districtName,
  previousSeverity,
  currentSeverity
) {
  if (
    !currentSeverity ||
    currentSeverity === previousSeverity
  ) {
    return;
  }

  try {
    const previousRank = {
      GREEN: 0,
      YELLOW: 1,
      ORANGE: 2,
      RED: 3,
    };

    const currentRank =
      previousRank[currentSeverity] ?? 0;

    const oldRank =
      previousRank[previousSeverity] ?? 0;

    if (currentRank <= oldRank) {
      return;
    }

    await sendDistrictRoleNotification(
      districtName,
      'Weather Alert',
      `Weather severity increased to ${currentSeverity} in ${districtName}.`,
      {
        district: districtName,
        severity: currentSeverity,
      }
    );
  } catch (error) {
    console.warn(
      `[WeatherAlertFetcher] Notification failed for ${districtName}:`,
      error.message
    );
  }
}


// ============================================================
// PROCESS ONE DISTRICT
// ============================================================

async function processDistrict(
  districtName
) {
  const previousSeverity =
    await getPreviousSeverity(
      districtName
    );

  const result =
    await fetchAlertsForDistrict(
      districtName
    );

  let alerts =
    result.alerts || [];

  let status =
    result.sourceType;

  let sourceName =
    result.sourceName;

  // ----------------------------------------------------------
  // FALLBACK TO CACHED OFFICIAL ALERTS
  // ----------------------------------------------------------

  if (
    alerts.length === 0
  ) {
    const cached =
      await getCachedAlerts(
        districtName
      );

    if (cached.length > 0) {
      alerts = cached.map(
        (item) => ({
          district:
            districtName,
          title:
            item.title,
          description:
            item.description,
          severity:
            item.severity ||
            'GREEN',
          hazard_type:
            item.hazard_type ||
            'WEATHER',
          source:
            item.source ||
            'Cached',
          source_url:
            item.source_url ||
            null,
          issued_at:
            item.issued_at ||
            new Date(),
          is_official:
            item.is_official === true,
        })
      );

      status = 'STALE';
      sourceName = 'Cached Alerts';

      console.log(
        `[WeatherAlertFetcher] Using cached alerts for ${districtName}`
      );
    }
  }

  // ----------------------------------------------------------
  // FALLBACK TO MANUAL ADVISORIES
  // ----------------------------------------------------------

  if (
    alerts.length === 0
  ) {
    const manual =
      await getManualAdvisories(
        districtName
      );

    if (manual.length > 0) {
      alerts = manual.map(
        (item) => ({
          district:
            districtName,
          title:
            item.title ||
            'District Weather Advisory',
          description:
            item.description ||
            item.advisory ||
            'Manual weather advisory',
          severity:
            item.severity ||
            'YELLOW',
          hazard_type:
            item.hazard_type ||
            'WEATHER',
          source:
            item.source ||
            'Manual Advisory',
          source_url:
            item.source_url ||
            null,
          issued_at:
            item.created_at ||
            new Date(),
          is_official:
            item.is_official === true,
        })
      );

      status = 'MANUAL';
      sourceName =
        'District Manual Advisory';

      console.log(
        `[WeatherAlertFetcher] Using manual advisory for ${districtName}`
      );
    }
  }

  // ----------------------------------------------------------
  // NO DATA
  // ----------------------------------------------------------

  if (
    alerts.length === 0
  ) {
    await saveFetchLog(
      districtName,
      sourceName ||
        'Weather Sources',
      'UNVERIFIED',
      'No official, secondary, cached, or manual weather data available.'
    );

    return {
      district:
        districtName,
      status:
        'UNVERIFIED',
      severity:
        'GREEN',
      alerts: [],
    };
  }

  // ----------------------------------------------------------
  // DEACTIVATE PREVIOUS ALERTS
  // ----------------------------------------------------------

  await deactivateOldOfficialAlerts(
    districtName
  );

  // ----------------------------------------------------------
  // INSERT CURRENT ALERTS
  // ----------------------------------------------------------

  const insertedAlerts = [];

  for (const alert of alerts) {
    const inserted =
      await insertWeatherAlert(
        alert,
        sourceName ||
          alert.source
      );

    if (inserted) {
      insertedAlerts.push(
        inserted
      );
    }
  }

  // ----------------------------------------------------------
  // CALCULATE HIGHEST SEVERITY
  // ----------------------------------------------------------

  const severityValues =
    insertedAlerts
      .map(
        (alert) =>
          alert.severity
      )
      .filter(Boolean);

  let highestSeverity =
    'GREEN';

  if (
    severityValues.length > 0
  ) {
    try {
      highestSeverity =
        getHighestSeverityLevel(
          severityValues
        ) ||
        'GREEN';
    } catch (error) {
      highestSeverity =
        severityValues.includes('RED')
          ? 'RED'
          : severityValues.includes(
              'ORANGE'
            )
          ? 'ORANGE'
          : severityValues.includes(
              'YELLOW'
            )
          ? 'YELLOW'
          : 'GREEN';
    }
  }

  // ----------------------------------------------------------
  // UPDATE ZONE CACHE
  // ----------------------------------------------------------

  await updateWeatherZoneCache(
    districtName,
    highestSeverity
  );

  // ----------------------------------------------------------
  // NOTIFICATION
  // ----------------------------------------------------------

  await notifySeverityChange(
    districtName,
    previousSeverity,
    highestSeverity
  );

  // ----------------------------------------------------------
  // FETCH LOG
  // ----------------------------------------------------------

  await saveFetchLog(
    districtName,
    sourceName ||
      'Weather Sources',
    status === 'OFFICIAL'
      ? 'SUCCESS'
      : status === 'SECONDARY'
      ? 'SECONDARY'
      : status,
    `${insertedAlerts.length} weather alert/observation record(s) processed.`
  );

  return {
    district:
      districtName,
    status,
    source:
      sourceName,
    severity:
      highestSeverity,
    alerts:
      insertedAlerts,
  };
}


// ============================================================
// POLL ALL KERALA DISTRICTS
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

      results.push(result);
    } catch (error) {
      console.error(
        `[WeatherAlertFetcher] Failed processing ${district}:`,
        error.message
      );

      results.push({
        district,
        status: 'ERROR',
        severity: 'GREEN',
        alerts: [],
      });
    }
  }

  return results;
}


// ============================================================
// START BACKGROUND POLLING
// ============================================================

function startWeatherAlertPolling() {
  console.log(
    `⏰ [WeatherAlertFetcher] Background weather alert polling started (Interval: ${
      WEATHER_POLL_INTERVAL / 60000
    } mins)`
  );

  // Initial poll shortly after server startup.
  setTimeout(async () => {
    try {
      await pollAllDistricts();

      console.log(
        '✅ [WeatherAlertFetcher] Weather alert poll completed.'
      );
    } catch (error) {
      console.error(
        '❌ [WeatherAlertFetcher] Initial weather poll failed:',
        error.message
      );
    }
  }, 5000);

  // Continue polling every 20 minutes.
  setInterval(async () => {
    try {
      await pollAllDistricts();

      console.log(
        '✅ [WeatherAlertFetcher] Weather alert poll completed.'
      );
    } catch (error) {
      console.error(
        '❌ [WeatherAlertFetcher] Scheduled weather poll failed:',
        error.message
      );
    }
  }, WEATHER_POLL_INTERVAL);
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  pollAllDistricts,
  fetchAlertsForDistrict,
  fetchOpenWeatherAlerts,
  startWeatherAlertPolling,
  KERALA_DISTRICTS,
  DISTRICT_COORDS,
};