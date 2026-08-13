/**
 * ============================================================
 * SAHAY - Dynamic Alert Service
 * ============================================================
 *
 * Responsibilities:
 * 1. Fetch official district alerts from PostgreSQL
 * 2. Fetch weather telemetry
 * 3. Calculate dynamic weather alerts
 * 4. Use exact user GPS coordinates when available
 * 5. Detect nearby/inside hazard zones using PostGIS
 * 6. Combine district + weather + location hazard information
 *
 * PostgreSQL tables used:
 *   - disaster_alerts
 *   - hazard_zones
 *
 * PostGIS:
 *   - Geometry SRID: 4326
 *   - Spatial distance calculated using geography/meters
 *
 * ============================================================
 */

const pool = require('../db');
const { fetchWeatherData } = require('./weatherService');

/**
 * ============================================================
 * Standard District Coordinates for Kerala's 14 Districts
 * ============================================================
 *
 * These coordinates are used ONLY as a fallback when the
 * user's actual GPS coordinates are not available.
 */

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

/**
 * ============================================================
 * Kerala District List
 * ============================================================
 */

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

/**
 * ============================================================
 * Alert Priority
 * ============================================================
 */

const ALERT_PRIORITY = {
  GREEN: 0,
  YELLOW: 1,
  ORANGE: 2,
  RED: 3
};

/**
 * ============================================================
 * Hazard Severity Priority
 * ============================================================
 */

const HAZARD_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/**
 * ============================================================
 * Clean and normalize district names
 * ============================================================
 */

function cleanDistrictName(rawDistrict) {
  if (!rawDistrict) {
    return 'Thiruvananthapuram';
  }

  let district = String(rawDistrict)
    .trim()
    .replace(/\s+district$/i, '')
    .trim();

  return district || 'Thiruvananthapuram';
}

/**
 * ============================================================
 * Validate GPS coordinates
 * ============================================================
 */

function isValidCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * ============================================================
 * Get Alert Priority
 * ============================================================
 */

function getAlertPriority(level) {
  return (
    ALERT_PRIORITY[
      String(level || 'GREEN').toUpperCase()
    ] || 0
  );
}

/**
 * ============================================================
 * Get Hazard Priority
 * ============================================================
 */

function getHazardPriority(severity) {
  return (
    HAZARD_PRIORITY[
      String(severity || 'LOW').toUpperCase()
    ] || 0
  );
}

/**
 * ============================================================
 * Dynamic Weather Alert Engine
 * ============================================================
 *
 * Evaluates weather information and creates a dynamic alert.
 */

function computeDynamicAlert(
  districtName,
  weatherInfo = {}
) {
  const district = cleanDistrictName(districtName);

  const temp = Number(
    weatherInfo.temperature ?? 28
  );

  const humidity = Number(
    weatherInfo.humidity ?? 80
  );

  const windSpeed = Number(
    weatherInfo.windSpeed ?? 15
  );

  const rainProb = Number(
    weatherInfo.rainProbability ?? 40
  );

  const condition = String(
    weatherInfo.condition || 'Cloudy'
  );

  const weatherCode = Number(
    weatherInfo.weatherCode ?? 0
  );

  const distLower = district.toLowerCase();

  /**
   * Kerala geographical classifications
   */

  const isHighRange = [
    'idukki',
    'wayanad'
  ].includes(distLower);

  const isRiverBasin = [
    'ernakulam',
    'pathanamthitta',
    'kottayam',
    'thrissur',
    'malappuram'
  ].includes(distLower);

  const isCoastal = [
    'thiruvananthapuram',
    'kollam',
    'alappuzha',
    'kozhikode',
    'kannur',
    'kasaragod'
  ].includes(distLower);

  let alertLevel = 'GREEN';

  let alertType =
    'Normal Weather Conditions';

  let description =
    `No active disaster warning. Normal weather conditions in ${district} ` +
    `(${temp}°C, ${rainProb}% precipitation probability).`;

  /**
   * ==========================================================
   * RED ALERT
   * ==========================================================
   */

  if (
    rainProb >= 85 ||
    [65, 82, 95, 96, 99].includes(weatherCode) ||
    windSpeed >= 40
  ) {
    alertLevel = 'RED';

    if (isHighRange) {
      alertType =
        'Heavy Rainfall & Landslide Warning';

      description =
        `Red Alert conditions detected for ${district} high ranges. ` +
        `Heavy rainfall expected (${rainProb}% rain probability, ` +
        `${windSpeed} km/h wind). High risk of landslides and flash floods. ` +
        `Avoid unnecessary travel.`;
    } else if (isRiverBasin) {
      alertType =
        'Flood Warning & High River Inundation';

      description =
        `Red Alert conditions detected for ${district}. ` +
        `Heavy rainfall may cause rapid river-level rise ` +
        `(${rainProb}% rain probability). Residents in low-lying areas ` +
        `should remain on high alert.`;
    } else if (isCoastal) {
      alertType =
        'Urban Inundation & Sea Surge Warning';

      description =
        `Red Alert conditions detected along ${district} coastal and ` +
        `urban areas. Heavy rainfall (${rainProb}%) and strong winds ` +
        `(${windSpeed} km/h) are possible. Avoid coastal waters.`;
    } else {
      alertType =
        'Extremely Heavy Downpour Warning';

      description =
        `Red Alert conditions detected in ${district}. ` +
        `Heavy rainfall (${rainProb}% precipitation probability) ` +
        `is expected. Follow local safety instructions.`;
    }
  }

  /**
   * ==========================================================
   * ORANGE ALERT
   * ==========================================================
   */

  else if (
    rainProb >= 65 ||
    [63, 81].includes(weatherCode) ||
    windSpeed >= 25
  ) {
    alertLevel = 'ORANGE';

    if (isHighRange) {
      alertType =
        'Heavy Downpour & Slopewatch Advisory';

      description =
        `Orange Alert conditions detected for ${district} hills. ` +
        `Persistent heavy showers (${rainProb}% rain probability, ` +
        `${temp}°C). Watch for soil movement on steep slopes.`;
    } else if (isRiverBasin) {
      alertType =
        'Heavy Rain & River Discharge Alert';

      description =
        `Orange Alert conditions detected for ${district} river basins. ` +
        `Heavy rainfall (${rainProb}% probability) may cause waterlogging ` +
        `in low-lying areas.`;
    } else if (isCoastal) {
      alertType =
        'High Waves & Squally Wind Advisory';

      description =
        `Orange Alert conditions detected for ${district}. ` +
        `Rough sea conditions and gusty winds (${windSpeed} km/h) ` +
        `may occur. Coastal residents should remain cautious.`;
    } else {
      alertType =
        'Heavy Rain & Waterlogging Advisory';

      description =
        `Orange Alert conditions detected for ${district}. ` +
        `Substantial rainfall expected (${rainProb}% probability). ` +
        `Local drainage systems may be affected.`;
    }
  }

  /**
   * ==========================================================
   * YELLOW ALERT
   * ==========================================================
   */

  else if (
    rainProb >= 40 ||
    [53, 55, 61, 80].includes(weatherCode) ||
    humidity >= 85
  ) {
    alertLevel = 'YELLOW';

    alertType =
      'Moderate Showers & Weather Watch';

    description =
      `Yellow Alert conditions detected for ${district}. ` +
      `Moderate rainfall with possible gusty breezes expected ` +
      `(${rainProb}% rain probability, ${windSpeed} km/h wind). ` +
      `Stay updated.`;
  }

  /**
   * ==========================================================
   * Return weather alert
   * ==========================================================
   */

  return {
    district,
    alertLevel,
    alertType,
    description,

    source:
      'Dynamic Weather Telemetry',

    startTime:
      new Date().toISOString(),

    endTime:
      new Date(
        Date.now() + 24 * 3600 * 1000
      ).toISOString(),

    weather: {
      temperature: temp,
      humidity,
      windSpeed,
      rainProbability: rainProb,
      condition,
      weatherCode
    }
  };
}

/**
 * ============================================================
 * Get Nearby Hazard Zones
 * ============================================================
 *
 * Uses PostGIS to find:
 *
 * 1. Hazard zones containing the user
 * 2. Hazard zones near the user
 *
 * radiusMeters defaults to 5 km.
 */

async function getNearbyHazardAlerts(
  latitude,
  longitude,
  radiusMeters = 5000
) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const radius = Number(radiusMeters);

  if (
    !isValidCoordinates(lat, lon)
  ) {
    return [];
  }

  if (
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return [];
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        hazard_type AS "hazardType",
        severity,
        description,
        source,
        active,

        CASE
          WHEN ST_Covers(
            geometry,
            ST_SetSRID(
              ST_Point($1, $2),
              4326
            )
          )
          THEN TRUE
          ELSE FALSE
        END AS "insideZone",

        ROUND(
          ST_Distance(
            geometry::geography,
            ST_SetSRID(
              ST_Point($1, $2),
              4326
            )::geography
          )::numeric,
          2
        ) AS "distanceMeters"

      FROM hazard_zones

      WHERE active = TRUE

      AND ST_DWithin(
        geometry::geography,
        ST_SetSRID(
          ST_Point($1, $2),
          4326
        )::geography,
        $3
      )

      ORDER BY
        "insideZone" DESC,
        "distanceMeters" ASC
      `,
      [
        lon,
        lat,
        radius
      ]
    );

    return result.rows;
  } catch (error) {
    console.error(
      '[AlertService] Hazard zone query failed:',
      error.message
    );

    return [];
  }
}

/**
 * ============================================================
 * Get Location Hazard Alert
 * ============================================================
 */

async function getLocationHazardAlert(
  latitude,
  longitude
) {
  const hazards =
    await getNearbyHazardAlerts(
      latitude,
      longitude,
      5000
    );

  if (!hazards.length) {
    return {
      hasHazard: false,
      highestSeverity: null,
      nearestHazard: null,
      hazards: []
    };
  }

  /**
   * Sort by severity first and then distance.
   */

  const sortedHazards =
    [...hazards].sort(
      (a, b) => {
        const severityDifference =
          getHazardPriority(b.severity) -
          getHazardPriority(a.severity);

        if (
          severityDifference !== 0
        ) {
          return severityDifference;
        }

        return (
          Number(a.distanceMeters || 0) -
          Number(b.distanceMeters || 0)
        );
      }
    );

  const highest =
    sortedHazards[0];

  const nearest =
    [...hazards].sort(
      (a, b) =>
        Number(a.distanceMeters || 0) -
        Number(b.distanceMeters || 0)
    )[0];

  return {
    hasHazard: true,

    highestSeverity:
      highest.severity,

    nearestHazard: nearest,

    hazards:
      sortedHazards
  };
}

/**
 * ============================================================
 * Get Current Alert
 * ============================================================
 *
 * Supports both:
 *
 * Existing usage:
 *
 * getCurrentAlert(
 *   districtName,
 *   weatherInfo
 * )
 *
 * New location-aware usage:
 *
 * getCurrentAlert(
 *   districtName,
 *   weatherInfo,
 *   latitude,
 *   longitude
 * )
 *
 * GPS coordinates take priority for weather lookup.
 */

async function getCurrentAlert(
  districtName,
  weatherInfo = null,
  latitude = null,
  longitude = null
) {
  const district =
    cleanDistrictName(
      districtName
    );

  /**
   * ==========================================================
   * 1. Get Official District Alert
   * ==========================================================
   */

  let districtAlert = null;

  try {
    const result =
      await pool.query(
        `
        SELECT
          district,
          alert_level AS "alertLevel",
          alert_type AS "alertType",
          description,
          source,
          start_time AS "startTime",
          end_time AS "endTime"
        FROM disaster_alerts
        WHERE LOWER(district) = LOWER($1)
          AND (
            end_time IS NULL
            OR end_time > NOW()
          )
        ORDER BY
          CASE UPPER(alert_level)
            WHEN 'RED' THEN 3
            WHEN 'ORANGE' THEN 2
            WHEN 'YELLOW' THEN 1
            ELSE 0
          END DESC,
          start_time DESC
        LIMIT 1
        `,
        [district]
      );

    if (
      result.rows.length > 0
    ) {
      districtAlert = {
        district,
        ...result.rows[0]
      };
    }
  } catch (error) {
    console.warn(
      '[AlertService] District alert query failed:',
      error.message
    );
  }

  /**
   * ==========================================================
   * 2. Get Weather Telemetry
   * ==========================================================
   *
   * Priority:
   *
   * 1. weatherInfo supplied by caller
   * 2. actual user GPS
   * 3. district center
   */

  let telemetry =
    weatherInfo;

  /**
   * If no weather information was supplied,
   * first try exact GPS.
   */

  if (
    !telemetry ||
    typeof telemetry !== 'object'
  ) {
    if (
      isValidCoordinates(
        latitude,
        longitude
      )
    ) {
      try {
        telemetry =
          await fetchWeatherData(
            Number(latitude),
            Number(longitude)
          );
      } catch (error) {
        console.warn(
          '[AlertService] Exact location weather failed:',
          error.message
        );

        telemetry = null;
      }
    }

    /**
     * Fallback to district-center weather.
     */

    if (!telemetry) {
      const coords =
        DISTRICT_COORDS[
          district.toLowerCase()
        ];

      if (coords) {
        try {
          telemetry =
            await fetchWeatherData(
              coords.lat,
              coords.lon
            );
        } catch (error) {
          console.warn(
            '[AlertService] District weather failed:',
            error.message
          );

          telemetry = null;
        }
      }
    }
  }

  /**
   * ==========================================================
   * 3. Calculate Dynamic Weather Alert
   * ==========================================================
   */

  const weatherAlert =
    computeDynamicAlert(
      district,
      telemetry || {}
    );

  /**
   * ==========================================================
   * 4. Find Location Hazard Zones
   * ==========================================================
   */

  let locationHazard = {
    hasHazard: false,
    highestSeverity: null,
    nearestHazard: null,
    hazards: []
  };

  if (
    isValidCoordinates(
      latitude,
      longitude
    )
  ) {
    locationHazard =
      await getLocationHazardAlert(
        Number(latitude),
        Number(longitude)
      );
  }

  /**
   * ==========================================================
   * 5. Select Base Alert
   * ==========================================================
   *
   * Compare:
   *
   * Official district alert
   * vs
   * Dynamic weather alert
   */

  let finalAlert =
    districtAlert ||
    weatherAlert;

  if (districtAlert) {
    const districtLevel =
      String(
        districtAlert.alertLevel ||
          'GREEN'
      ).toUpperCase();

    const weatherLevel =
      String(
        weatherAlert.alertLevel ||
          'GREEN'
      ).toUpperCase();

    if (
      getAlertPriority(
        weatherLevel
      ) >
      getAlertPriority(
        districtLevel
      )
    ) {
      finalAlert =
        weatherAlert;
    }
  }

  /**
   * ==========================================================
   * 6. Apply Hazard Zone Priority
   * ==========================================================
   *
   * HIGH / CRITICAL hazard zones can increase
   * the final alert level.
   */

  if (
    locationHazard.hasHazard &&
    locationHazard.highestSeverity
  ) {
    const highestHazard =
      locationHazard.hazards[0];

    const severity =
      String(
        locationHazard.highestSeverity
      ).toUpperCase();

    /**
     * CRITICAL → RED
     */

    if (
      severity === 'CRITICAL'
    ) {
      finalAlert = {
        ...finalAlert,

        alertLevel: 'RED',

        alertType:
          `Critical ${
            highestHazard.hazardType
          } Risk`,

        description:
          highestHazard.insideZone
            ? `You are currently inside a critical ${
                String(
                  highestHazard.hazardType
                ).toLowerCase()
              } hazard zone. ${
                highestHazard.description ||
                'Follow local safety instructions immediately.'
              }`
            : `A critical ${
                String(
                  highestHazard.hazardType
                ).toLowerCase()
              } hazard zone has been detected near your location. ${
                highestHazard.description ||
                'Follow local safety instructions.'
              }`
      };
    }

    /**
     * HIGH → RED if user is inside the zone
     * or ORANGE if merely nearby.
     */

    else if (
      severity === 'HIGH'
    ) {
      const newLevel =
        highestHazard.insideZone
          ? 'RED'
          : 'ORANGE';

      if (
        getAlertPriority(
          newLevel
        ) >=
        getAlertPriority(
          finalAlert.alertLevel
        )
      ) {
        finalAlert = {
          ...finalAlert,

          alertLevel:
            newLevel,

          alertType:
            `High ${
              highestHazard.hazardType
            } Risk`,

          description:
            highestHazard.insideZone
              ? `Your current location is inside a high-risk ${
                  String(
                    highestHazard.hazardType
                  ).toLowerCase()
                } hazard zone. ${
                  highestHazard.description ||
                  'Take necessary safety precautions.'
                }`
              : `A high-risk ${
                  String(
                    highestHazard.hazardType
                  ).toLowerCase()
                } hazard zone is approximately ${
                  Math.round(
                    Number(
                      highestHazard.distanceMeters
                    )
                  )
                } metres from your current location. ${
                  highestHazard.description ||
                  'Stay alert and follow local safety instructions.'
                }`
        };
      }
    }

    /**
     * MEDIUM → at least YELLOW
     */

    else if (
      severity === 'MEDIUM'
    ) {
      if (
        getAlertPriority(
          finalAlert.alertLevel
        ) < 1
      ) {
        finalAlert = {
          ...finalAlert,

          alertLevel: 'YELLOW',

          alertType:
            `Nearby ${
              highestHazard.hazardType
            } Risk`,

          description:
            `A ${
              String(
                highestHazard.hazardType
              ).toLowerCase()
            } hazard zone is approximately ${
              Math.round(
                Number(
                  highestHazard.distanceMeters
                )
              )
            } metres from your current location.`
        };
      }
    }
  }

  /**
   * ==========================================================
   * 7. Build Final SAHAY Response
   * ==========================================================
   */

  return {
    ...finalAlert,

    /**
     * Current GPS location
     */

    location: {
      latitude:
        isValidCoordinates(
          latitude,
          longitude
        )
          ? Number(latitude)
          : null,

      longitude:
        isValidCoordinates(
          latitude,
          longitude
        )
          ? Number(longitude)
          : null
    },

    /**
     * Weather information used by the alert engine
     */

    weather:
      telemetry || null,

    /**
     * Location-specific hazards
     */

    locationHazardDetected:
      locationHazard.hasHazard,

    locationHazards:
      locationHazard.hazards,

    nearestHazard:
      locationHazard.nearestHazard,

    /**
     * Indicates whether exact GPS weather
     * was used.
     */

    weatherLocation:
      isValidCoordinates(
        latitude,
        longitude
      )
        ? 'USER_LOCATION'
        : 'DISTRICT_CENTER'
  };
}

/**
 * ============================================================
 * Get All Kerala Alerts
 * ============================================================
 *
 * Fetches:
 * 1. Database alerts first
 * 2. Dynamic weather alerts for districts without DB alerts
 */

async function getAllKeralaAlerts() {
  let dbAlertsMap = {};

  /**
   * ==========================================================
   * Get database alerts
   * ==========================================================
   */

  try {
    const result =
      await pool.query(
        `
        SELECT
          district,
          alert_level AS "alertLevel",
          alert_type AS "alertType",
          description,
          source,
          start_time AS "startTime",
          end_time AS "endTime"
        FROM disaster_alerts
        WHERE (
          end_time IS NULL
          OR end_time > NOW()
        )
        ORDER BY
          CASE UPPER(alert_level)
            WHEN 'RED' THEN 3
            WHEN 'ORANGE' THEN 2
            WHEN 'YELLOW' THEN 1
            ELSE 0
          END DESC,
          start_time DESC
        `
      );

    for (
      const row of result.rows
    ) {
      const key =
        cleanDistrictName(
          row.district
        ).toLowerCase();

      /**
       * Keep the highest-priority/latest
       * alert for each district.
       */

      if (
        !dbAlertsMap[key]
      ) {
        dbAlertsMap[key] =
          row;
      }
    }
  } catch (error) {
    console.warn(
      '[AlertService] getAllKeralaAlerts DB query failed:',
      error.message
    );
  }

  /**
   * ==========================================================
   * Generate alerts for all districts
   * ==========================================================
   */

  const allAlerts = [];

  for (
    const district of KERALA_DISTRICTS
  ) {
    const key =
      district.toLowerCase();

    /**
     * Official database alert exists
     */

    if (
      dbAlertsMap[key]
    ) {
      allAlerts.push({
        district,
        ...dbAlertsMap[key]
      });

      continue;
    }

    /**
     * Otherwise use district-center weather.
     */

    const coords =
      DISTRICT_COORDS[key];

    let weather = null;

    if (coords) {
      try {
        weather =
          await fetchWeatherData(
            coords.lat,
            coords.lon
          );
      } catch (error) {
        console.warn(
          `[AlertService] Weather failed for ${district}:`,
          error.message
        );

        weather = null;
      }
    }

    allAlerts.push(
      computeDynamicAlert(
        district,
        weather || {}
      )
    );
  }

  return allAlerts;
}

/**
 * ============================================================
 * Save Official Disaster Alert
 * ============================================================
 */

async function saveDisasterAlert({
  district,
  alertLevel,
  alertType,
  description,
  source,
  durationHours = 24,
  scope = 'DISTRICT'
}) {
  const cleanDist =
    cleanDistrictName(
      district
    );

  const startTime =
    new Date();

  const endTime =
    new Date(
      Date.now() +
        Number(durationHours) *
          3600 *
          1000
    );

  const result =
    await pool.query(
      `
      INSERT INTO disaster_alerts (
        district,
        alert_level,
        alert_type,
        description,
        source,
        start_time,
        end_time,
        scope
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING
        id,
        district,
        alert_level AS "alertLevel",
        alert_type AS "alertType",
        description,
        source,
        start_time AS "startTime",
        end_time AS "endTime",
        scope
      `,
      [
        cleanDist,
        String(
          alertLevel
        ).toUpperCase(),

        alertType,

        description,

        source ||
          'KSDMA / Official Portal',

        startTime,

        endTime,

        String(
          scope || 'DISTRICT'
        ).toUpperCase()
      ]
    );

  return result.rows[0];
}

/**
 * ============================================================
 * Module Exports
 * ============================================================
 */

module.exports = {
  getCurrentAlert,

  getAllKeralaAlerts,

  computeDynamicAlert,

  saveDisasterAlert,

  cleanDistrictName,

  getNearbyHazardAlerts,

  getLocationHazardAlert,

  DISTRICT_COORDS
};