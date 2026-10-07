/**
 * Official Weather Alert Fetcher & Background Polling Engine
 *
 * Requirements:
 * 1. Data Source: Official/Government meteorological data (e.g. IMD / KSDMA CAP RSS feed).
 * 2. Fallback: OpenWeatherMap One Call API 3.0 alerts field if official source unavailable.
 *    Clearly flag source_type as OFFICIAL vs SECONDARY.
 * 3. Never invent alert levels from raw weather metrics.
 *    Severity is mapped only through severityMapper.
 * 4. Audit Logging: Server-side record of every fetch attempt.
 * 5. Reliability:
 *    - Cache last successfully fetched alert with timestamp.
 *    - On fetch failure, use cached alert.
 *    - If no cache exists, return UNVERIFIED.
 * 6. Notifications:
 *    - Citizens: RED / ORANGE
 *    - Rescue Teams: YELLOW / ORANGE / RED
 */

const pool = require('../db');

const {
  mapSeverityLevel,
  getHighestSeverityLevel
} = require('../utils/severityMapper');

const {
  sendDistrictRoleNotification
} = require('./notificationService');


/* ============================================================
   KERALA DISTRICTS
============================================================ */

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
  'Kasaragod'
];


/* ============================================================
   DISTRICT COORDINATES
============================================================ */

const DISTRICT_COORDS = {

  thiruvananthapuram: {
    lat: 8.5241,
    lon: 76.9366
  },

  kollam: {
    lat: 8.8932,
    lon: 76.6141
  },

  pathanamthitta: {
    lat: 9.2648,
    lon: 76.7870
  },

  alappuzha: {
    lat: 9.4981,
    lon: 76.3388
  },

  kottayam: {
    lat: 9.5916,
    lon: 76.5222
  },

  idukki: {
    lat: 9.8497,
    lon: 76.9804
  },

  ernakulam: {
    lat: 9.9816,
    lon: 76.2999
  },

  thrissur: {
    lat: 10.5276,
    lon: 76.2144
  },

  palakkad: {
    lat: 10.7867,
    lon: 76.6548
  },

  malappuram: {
    lat: 11.0720,
    lon: 76.0740
  },

  kozhikode: {
    lat: 11.2588,
    lon: 75.7804
  },

  wayanad: {
    lat: 11.6854,
    lon: 76.1320
  },

  kannur: {
    lat: 11.8745,
    lon: 75.3704
  },

  kasaragod: {
    lat: 12.5102,
    lon: 74.9852
  }

};


/* ============================================================
   OFFICIAL FEED CACHE
============================================================ */

const officialFeedCache = {

  url: null,

  text: null,

  error: null,

  timestamp: 0,

  hasLoggedFailure: false

};


/* ============================================================
   CONSTANTS
============================================================ */

const OFFICIAL_FETCH_TIMEOUT = 15000;

const SECONDARY_FETCH_TIMEOUT = 10000;

const OFFICIAL_CACHE_DURATION = 3 * 60 * 1000;


/* ============================================================
   DISTRICT NORMALIZATION
============================================================ */

function cleanDistrict(raw) {

  if (!raw) {
    return 'Ernakulam';
  }

  return String(raw)
    .trim()
    .replace(/\s+district$/i, '');

}


/* ============================================================
   FETCH WITH TIMEOUT
============================================================ */

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = 15000
) {

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;

  } catch (err) {

    if (err.name === 'AbortError') {

      throw new Error(
        `Request timed out after ${timeoutMs / 1000} seconds`
      );

    }

    throw err;

  } finally {

    clearTimeout(timeoutId);

  }

}


/* ============================================================
   ACTIVE WEATHER SOURCES
============================================================ */

async function getActiveSources() {

  try {

    const res = await pool.query(
      `
      SELECT *
      FROM weather_alert_sources
      WHERE is_active = TRUE
      ORDER BY priority ASC
      `
    );

    return res.rows;

  } catch (err) {

    console.error(
      '[WeatherAlertFetcher] Error fetching active sources:',
      err.message
    );

    return [];

  }

}


/* ============================================================
   SOURCE SEVERITY MAPPINGS
============================================================ */

async function getSourceSeverityMappings(sourceId) {

  try {

    const res = await pool.query(
      `
      SELECT *
      FROM weather_severity_mappings
      WHERE source_id = $1
        AND is_active = TRUE
      `,
      [sourceId]
    );

    return res.rows;

  } catch (err) {

    console.error(
      '[WeatherAlertFetcher] Error loading severity mappings:',
      err.message
    );

    return [];

  }

}


/* ============================================================
   XML DECODING
============================================================ */

function decodeXml(value) {

  if (!value) {
    return '';
  }

  return String(value)
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/gi, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();

}


/* ============================================================
   RSS/XML TAG EXTRACTION
============================================================ */

function extractXmlTag(xml, tagName) {

  const regex = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    'i'
  );

  const match = xml.match(regex);

  return match
    ? decodeXml(match[1])
    : '';

}


/* ============================================================
   RSS FEED PARSER
============================================================ */

function parseRSSFeedText(xmlText, districtName) {

  const items = [];

  if (!xmlText || typeof xmlText !== 'string') {
    return items;
  }


  /*
   * Standard RSS:
   * <item>...</item>
   */
  const itemMatches =
    xmlText.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];


  for (const itemXml of itemMatches) {

    const title =
      extractXmlTag(itemXml, 'title');

    const description =
      extractXmlTag(itemXml, 'description');

    const category =
      extractXmlTag(itemXml, 'category');

    const link =
      extractXmlTag(itemXml, 'link') ||
      'https://mausam.imd.gov.in';

    const pubDate =
      extractXmlTag(itemXml, 'pubDate');


    const rawCategory =
      category ||
      title.match(/red|orange|yellow|green/i)?.[0] ||
      'Advisory';


    const titleLower =
      title.toLowerCase();

    const descriptionLower =
      description.toLowerCase();

    const districtLower =
      districtName.toLowerCase();


    /*
     * Only use alerts that:
     * - mention the district
     * - OR mention Kerala
     */
    const districtMatch =
      titleLower.includes(districtLower) ||
      descriptionLower.includes(districtLower) ||
      titleLower.includes('kerala') ||
      descriptionLower.includes('kerala');


    if (!title || !districtMatch) {
      continue;
    }


    let hazardType =
      'Meteorological Warning';


    if (
      titleLower.includes('rain') ||
      descriptionLower.includes('rain')
    ) {

      hazardType = 'Heavy Rainfall';

    } else if (
      titleLower.includes('flood') ||
      descriptionLower.includes('flood')
    ) {

      hazardType = 'Flood Alert';

    } else if (
      titleLower.includes('landslide') ||
      descriptionLower.includes('landslide')
    ) {

      hazardType = 'Landslide Warning';

    } else if (
      titleLower.includes('cyclone') ||
      descriptionLower.includes('cyclone')
    ) {

      hazardType = 'Cyclone Warning';

    }


    let issuedAt;

    if (pubDate) {

      const parsedDate =
        new Date(pubDate);

      issuedAt =
        Number.isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();

    } else {

      issuedAt =
        new Date().toISOString();

    }


    items.push({

      alert_id:
        `IMD-${districtName}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

      hazard_type:
        hazardType,

      raw_severity:
        rawCategory,

      title,

      description:
        description ||
        `Official weather alert issued for ${districtName}.`,

      safety_instructions:
        descriptionLower.includes('safety')
          ? description
          : 'Stay indoors during heavy downpours. Keep emergency contacts ready.',

      affected_zones:
        [districtName],

      source_reference_url:
        link,

      issued_at:
        issuedAt,

      expires_at:
        new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),

      raw_payload:
        {
          xml: itemXml
        }

    });

  }


  return items;

}


/* ============================================================
   OPENWEATHERMAP FALLBACK
============================================================ */

async function fetchOpenWeatherAlerts(
  source,
  district
) {

  const coords =
    DISTRICT_COORDS[district.toLowerCase()] ||
    {
      lat: 9.9816,
      lon: 76.2999
    };


  const apiKey =
    source.api_key ||
    process.env.OPENWEATHER_API_KEY ||
    '';


  if (!apiKey) {

    throw new Error(
      'OPENWEATHER_API_KEY is not configured'
    );

  }


  /*
   * OpenWeatherMap One Call API 3.0
   */
  const url =
    `${source.api_endpoint}` +
    `?lat=${coords.lat}` +
    `&lon=${coords.lon}` +
    `&appid=${apiKey}`;


  const response =
    await fetchWithTimeout(

      url,

      {
        headers: {
          'User-Agent':
            'SAHAY-Disaster-Management-System/1.0',

          'Accept':
            'application/json'
        }
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


  if (!Array.isArray(data.alerts)) {

    return [];

  }


  return data.alerts.map((alert, index) => ({

    alert_id:
      `OWM-${district}-${alert.start || Date.now()}-${index}`,

    hazard_type:
      alert.event || 'Weather Warning',

    raw_severity:
      alert.severity ||
      alert.event ||
      'Moderate',

    title:
      alert.event ||
      'Weather Warning',

    description:
      alert.description ||
      `Secondary weather alert issued for ${district}.`,

    safety_instructions:
      'Follow local authority guidelines.',

    affected_zones:
      [district],

    source_reference_url:
      'https://openweathermap.org',

    issued_at:
      alert.start
        ? new Date(alert.start * 1000).toISOString()
        : new Date().toISOString(),

    expires_at:
      alert.end
        ? new Date(alert.end * 1000).toISOString()
        : new Date(
            Date.now() +
            12 * 60 * 60 * 1000
          ).toISOString(),

    raw_payload:
      alert

  }));

}


/* ============================================================
   FETCH ALERTS FOR DISTRICT
============================================================ */

async function fetchAlertsForDistrict(
  districtName,
  force = false
) {

  const district =
    cleanDistrict(districtName);


  const sources =
    await getActiveSources();


  let fetchedAlerts = [];

  let successSource = null;

  let isFallback = false;

  let fetchErrorMessage = null;


  /* ==========================================================
     TRY SOURCES IN PRIORITY ORDER
  ========================================================== */

  for (const source of sources) {

    try {


      /* ======================================================
         OFFICIAL SOURCE
      ====================================================== */

      if (source.source_type === 'OFFICIAL') {

        const now =
          Date.now();

        let text = null;


        const cacheIsValid =
          !force &&
          officialFeedCache.url === source.api_endpoint &&
          officialFeedCache.text &&
          (now - officialFeedCache.timestamp <
            OFFICIAL_CACHE_DURATION);


        if (cacheIsValid) {

          console.log(
            `[WeatherAlertFetcher] Using cached official feed for ${source.name}`
          );

          text =
            officialFeedCache.text;

        } else {

          console.log(
            `[WeatherAlertFetcher] Fetching official feed: ${source.name}`
          );


          const response =
            await fetchWithTimeout(

              source.api_endpoint,

              {
                headers: {

                  'User-Agent':
                    'SAHAY-Disaster-Management-System/1.0',

                  'Accept':
                    'application/rss+xml, application/xml, text/xml, */*',

                  'Cache-Control':
                    'no-cache'

                }

              },

              OFFICIAL_FETCH_TIMEOUT

            );


          if (!response.ok) {

            const errMsg =
              `HTTP ${response.status} from ${source.name}`;

            officialFeedCache.url =
              source.api_endpoint;

            officialFeedCache.text =
              null;

            officialFeedCache.error =
              errMsg;

            officialFeedCache.timestamp =
              now;

            throw new Error(errMsg);

          }


          text =
            await response.text();


          if (!text || !text.trim()) {

            throw new Error(
              `Empty response received from ${source.name}`
            );

          }


          /*
           * Save successful feed to memory cache
           */
          officialFeedCache.url =
            source.api_endpoint;

          officialFeedCache.text =
            text;

          officialFeedCache.error =
            null;

          officialFeedCache.timestamp =
            now;

          officialFeedCache.hasLoggedFailure =
            false;


          console.log(
            `[WeatherAlertFetcher] Official feed received successfully from ${source.name}`
          );

        }


        if (text) {

          const parsed =
            parseRSSFeedText(
              text,
              district
            );


          fetchedAlerts =
            parsed;

          successSource =
            source;

          break;

        }

      }


      /* ======================================================
         SECONDARY SOURCE
      ====================================================== */

      else if (
        source.source_type === 'SECONDARY'
      ) {

        console.log(
          `[WeatherAlertFetcher] Trying secondary source '${source.name}' for ${district}`
        );


        fetchedAlerts =
          await fetchOpenWeatherAlerts(
            source,
            district
          );


        successSource =
          source;

        isFallback =
          true;

        break;

      }

    } catch (err) {

      fetchErrorMessage =
        err.message;


      if (
        source.source_type === 'OFFICIAL'
      ) {

        if (
          !officialFeedCache.hasLoggedFailure
        ) {

          console.warn(
            `[WeatherAlertFetcher] Source '${source.name}' feed unreachable: ${err.message}. Trying fallback source.`
          );

          officialFeedCache.hasLoggedFailure =
            true;

        }

      } else {

        console.warn(
          `[WeatherAlertFetcher] Source '${source.name}' fetch failed for ${district}: ${err.message}`
        );

      }

    }

  }


  /* ==========================================================
     SEVERITY MAPPING
  ========================================================== */

  const customMappings =
    successSource
      ? await getSourceSeverityMappings(
          successSource.id
        )
      : [];


  const mappedAlerts =
    fetchedAlerts.map(alert => ({

      ...alert,

      mapped_severity:
        mapSeverityLevel(
          alert.raw_severity,
          customMappings
        )

    }));


  const highestSeverity =
    getHighestSeverityLevel(
      mappedAlerts
    );


  /* ==========================================================
     PREVIOUS SEVERITY
  ========================================================== */

  let previousSeverity =
    'GREEN';


  try {

    const cacheRes =
      await pool.query(

        `
        SELECT highest_severity
        FROM weather_alert_zone_cache
        WHERE LOWER(district) = LOWER($1)
        `,

        [district]

      );


    if (
      cacheRes.rows.length > 0
    ) {

      previousSeverity =
        cacheRes.rows[0].highest_severity ||
        'GREEN';

    }

  } catch (err) {

    console.warn(
      `[WeatherAlertFetcher] Unable to read previous severity for ${district}: ${err.message}`
    );

  }


  /* ==========================================================
     SUCCESS / FALLBACK SOURCE
  ========================================================== */

  if (successSource) {


    /* ========================================================
       FETCH LOG
    ======================================================== */

    try {

      await pool.query(

        `
        INSERT INTO weather_alert_fetch_logs
        (
          district,
          source_id,
          source_name,
          status,
          http_code,
          raw_response,
          mapped_level,
          alerts_count
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
          $8
        )
        `,

        [
          district,

          successSource.id,

          successSource.name,

          isFallback
            ? 'FALLBACK'
            : 'SUCCESS',

          200,

          JSON.stringify(
            mappedAlerts.map(
              alert => alert.raw_payload
            )
          ),

          highestSeverity,

          mappedAlerts.length
        ]

      );

    } catch (err) {

      console.error(
        `[WeatherAlertFetcher] Fetch audit log failed for ${district}:`,
        err.message
      );

    }


    /* ========================================================
       DEACTIVATE OLD ALERTS
    ======================================================== */

    await pool.query(

      `
      UPDATE official_weather_alerts
      SET is_active = FALSE
      WHERE LOWER(district) = LOWER($1)
      `,

      [district]

    );


    /* ========================================================
       INSERT NEW ALERTS
    ======================================================== */

    for (
      const alert of mappedAlerts
    ) {

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
          TRUE
        )
        `,

        [

          alert.alert_id,

          successSource.id,

          successSource.name,

          successSource.source_type,

          district,

          alert.hazard_type,

          alert.raw_severity,

          alert.mapped_severity,

          alert.title,

          alert.description,

          alert.safety_instructions,

          alert.affected_zones,

          alert.source_reference_url,

          JSON.stringify(
            alert.raw_payload
          ),

          alert.issued_at,

          alert.expires_at

        ]

      );

    }


    /* ========================================================
       MANUAL DISTRICT ADVISORIES
    ======================================================== */

    const advisoryRes =
      await pool.query(

        `
        SELECT *
        FROM district_manual_advisories
        WHERE LOWER(district) = LOWER($1)
          AND is_active = TRUE
          AND
          (
            expires_at IS NULL
            OR expires_at > NOW()
          )
        ORDER BY issued_at DESC
        `,

        [district]

      );


    /* ========================================================
       UPDATE WEATHER ZONE CACHE
    ======================================================== */

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
        $3,
        $4,
        NOW(),
        'HEALTHY',
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
          NOW(),

        fetch_status =
          'HEALTHY',

        updated_at =
          NOW()
      `,

      [

        district,

        highestSeverity,

        JSON.stringify(
          mappedAlerts
        ),

        JSON.stringify(
          advisoryRes.rows
        )

      ]

    );


    /* ========================================================
       PUSH NOTIFICATIONS
    ======================================================== */

    if (
      previousSeverity !==
      highestSeverity
    ) {

      console.log(
        `⚡ Weather Alert level changed for ${district}: ${previousSeverity} ➔ ${highestSeverity}`
      );


      /* ------------------------------------------------------
         CITIZENS
      ------------------------------------------------------ */

      if (
        ['RED', 'ORANGE']
          .includes(highestSeverity)
      ) {

        try {

          await sendDistrictRoleNotification({

            district,

            roles: [
              'citizen'
            ],

            title:
              `🚨 ${highestSeverity} Weather Alert for ${district}`,

            message:
              `Official meteorological warning issued for ${district}. Level: ${highestSeverity}. Tap to view instructions.`,

            referenceType:
              'WEATHER_ALERT',

            referenceId:
              district

          });

        } catch (err) {

          console.error(
            `[WeatherAlertFetcher] Citizen notification failed for ${district}:`,
            err.message
          );

        }

      }


      /* ------------------------------------------------------
         RESCUE TEAMS
      ------------------------------------------------------ */

      if (
        [
          'YELLOW',
          'ORANGE',
          'RED'
        ].includes(highestSeverity)
      ) {

        try {

          await sendDistrictRoleNotification({

            district,

            roles: [
              'rescue_team',
              'rescue',
              'official'
            ],

            title:
              `⚠️ Operational Weather Update: ${highestSeverity} Alert (${district})`,

            message:
              `Weather alert level updated to ${highestSeverity} in ${district}. Prepare team readiness.`,

            referenceType:
              'WEATHER_ALERT',

            referenceId:
              district

          });

        } catch (err) {

          console.error(
            `[WeatherAlertFetcher] Rescue notification failed for ${district}:`,
            err.message
          );

        }

      }

    }


    /* ========================================================
       SUCCESS RESPONSE
    ======================================================== */

    return {

      district,

      highestSeverity,

      activeAlerts:
        mappedAlerts,

      activeAdvisories:
        advisoryRes.rows,

      fetchStatus:
        isFallback
          ? 'FALLBACK'
          : 'HEALTHY',

      lastSuccessfulFetch:
        new Date().toISOString(),

      sourceName:
        successSource.name,

      sourceType:
        successSource.source_type

    };

  }


  /* ==========================================================
     ALL SOURCES FAILED
  ========================================================== */

  try {

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
        mapped_level,
        alerts_count
      )
      VALUES
      (
        $1,
        NULL,
        'ALL_SOURCES_FAILED',
        'FAILURE',
        500,
        $2,
        'UNVERIFIED',
        0
      )
      `,

      [
        district,

        fetchErrorMessage ||
        'All weather alert sources failed to respond'

      ]

    );

  } catch (err) {

    console.error(
      `[WeatherAlertFetcher] Failed to write failure audit log for ${district}:`,
      err.message
    );

  }


  /* ==========================================================
     CHECK DATABASE CACHE
  ========================================================== */

  try {

    const cacheRes =
      await pool.query(

        `
        SELECT *
        FROM weather_alert_zone_cache
        WHERE LOWER(district) = LOWER($1)
        `,

        [district]

      );


    if (
      cacheRes.rows.length > 0
    ) {

      const cached =
        cacheRes.rows[0];


      await pool.query(

        `
        UPDATE weather_alert_zone_cache
        SET
          fetch_status = 'STALE',
          updated_at = NOW()
        WHERE LOWER(district) = LOWER($1)
        `,

        [district]

      );


      console.warn(
        `[WeatherAlertFetcher] Using cached weather alert for ${district}.`
      );


      return {

        district,

        highestSeverity:
          cached.highest_severity,

        activeAlerts:
          cached.active_alerts || [],

        activeAdvisories:
          cached.active_advisories || [],

        fetchStatus:
          'STALE',

        lastSuccessfulFetch:
          cached.last_successful_fetch,

        errorMessage:
          fetchErrorMessage

      };

    }

  } catch (err) {

    console.error(
      `[WeatherAlertFetcher] Error reading weather cache for ${district}:`,
      err.message
    );

  }


  /* ==========================================================
     NO CACHE AVAILABLE
  ========================================================== */

  return {

    district,

    highestSeverity:
      'UNVERIFIED',

    activeAlerts:
      [],

    activeAdvisories:
      [],

    fetchStatus:
      'UNVERIFIED',

    lastSuccessfulFetch:
      null,

    errorMessage:
      'Unable to verify current alert status'

  };

}


/* ============================================================
   POLL ALL DISTRICTS
============================================================ */

async function pollAllDistricts() {

  officialFeedCache.hasLoggedFailure =
    false;


  console.log(
    '🔄 [WeatherAlertFetcher] Polling official weather alert feeds for all districts...'
  );


  for (
    const district of KERALA_DISTRICTS
  ) {

    try {

      await fetchAlertsForDistrict(
        district
      );

    } catch (err) {

      console.error(
        `[WeatherAlertFetcher] Error polling ${district}:`,
        err.message
      );

    }

  }


  console.log(
    '✅ [WeatherAlertFetcher] Weather alert poll completed.'
  );

}


/* ============================================================
   START BACKGROUND POLLING
============================================================ */

function startPollingTimer(
  intervalMs = 20 * 60 * 1000
) {

  /*
   * Initial poll after server startup
   */
  setTimeout(() => {

    pollAllDistricts()
      .catch(err => {

        console.error(
          '[WeatherAlertFetcher] Initial poll failed:',
          err.message
        );

      });

  }, 5000);


  /*
   * Periodic polling
   */
  setInterval(() => {

    pollAllDistricts()
      .catch(err => {

        console.error(
          '[WeatherAlertFetcher] Periodic poll failed:',
          err.message
        );

      });

  }, intervalMs);


  console.log(
    `⏰ [WeatherAlertFetcher] Background weather alert polling started (Interval: ${intervalMs / 60000} mins)`
  );

}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

  fetchAlertsForDistrict,

  pollAllDistricts,

  startPollingTimer,

  KERALA_DISTRICTS

};