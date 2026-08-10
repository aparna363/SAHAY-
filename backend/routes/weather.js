const express = require('express');

const router = express.Router();

const pool = require('../db');

const {
    reverseGeocode
} = require('../services/locationService');

const {
    fetchWeatherData
} = require('../services/weatherService');

const {
    getCurrentAlert,
    getAllKeralaAlerts,
    saveDisasterAlert
} = require('../services/alertService');


/**
 * ============================================================
 * DISTRICT CENTER COORDINATES
 * ============================================================
 *
 * These coordinates are ONLY used when the user manually
 * selects a district.
 *
 * They are NEVER used for browser GPS detection.
 * ============================================================
 */

const DISTRICT_CENTER_COORDS = {

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
 * HELPER
 * ============================================================
 */

function getDistrictCoordinates(district) {

    if (!district) {
        return null;
    }

    const key =
        String(district)
            .trim()
            .toLowerCase();

    return DISTRICT_CENTER_COORDS[key] || null;
}


/**
 * ============================================================
 * PROCESS WEATHER REQUEST
 * ============================================================
 */

async function processWeatherRequest(
    latitude,
    longitude,
    requestedDistrict = null
) {

    let lat =
        Number.parseFloat(latitude);

    let lon =
        Number.parseFloat(longitude);

    /**
     * --------------------------------------------------------
     * GPS REQUEST
     * --------------------------------------------------------
     *
     * If latitude + longitude are supplied,
     * ALWAYS use those coordinates.
     *
     * Never replace them with district coordinates.
     * --------------------------------------------------------
     */

    const hasValidGPS =
        Number.isFinite(lat) &&
        Number.isFinite(lon);

    /**
     * --------------------------------------------------------
     * MANUAL DISTRICT REQUEST
     * --------------------------------------------------------
     *
     * Only if GPS coordinates are NOT supplied.
     * --------------------------------------------------------
     */

    if (
        !hasValidGPS &&
        requestedDistrict
    ) {

        const districtCoords =
            getDistrictCoordinates(
                requestedDistrict
            );

        if (districtCoords) {

            lat =
                districtCoords.lat;

            lon =
                districtCoords.lon;
        }
    }

    /**
     * No valid coordinates.
     */
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        throw new Error(
            'Valid GPS coordinates or Kerala district required.'
        );
    }

    /**
     * --------------------------------------------------------
     * LOG EXACT COORDINATES
     * --------------------------------------------------------
     */

    console.log(
        '[Weather API] Coordinates received:',
        lat,
        lon
    );

    console.log(
        '[Weather API] GPS:',
        hasValidGPS
    );

    /**
     * --------------------------------------------------------
     * REVERSE GEOCODING
     * --------------------------------------------------------
     */

    const locationInfo =
        await reverseGeocode(
            lat,
            lon
        );

    /**
     * --------------------------------------------------------
     * FINAL DISTRICT
     * --------------------------------------------------------
     *
     * GPS always wins.
     *
     * Manual district is used only when GPS is absent.
     * --------------------------------------------------------
     */

    const finalDistrict =
        hasValidGPS
            ? locationInfo.district
            : (
                requestedDistrict ||
                locationInfo.district
            );

    const finalState =
        locationInfo.state ||
        'Kerala';

    const finalCountry =
        locationInfo.country ||
        'India';

    /**
     * --------------------------------------------------------
     * WEATHER
     * --------------------------------------------------------
     */

    const weatherInfo =
        await fetchWeatherData(
            lat,
            lon
        );

    /**
     * --------------------------------------------------------
     * ALERT
     * --------------------------------------------------------
     */

    let alertInfo = null;

    try {

        alertInfo =
            await getCurrentAlert(
                finalDistrict,
                weatherInfo
            );

    } catch (alertError) {

        console.warn(
            '[Weather API] Alert service error:',
            alertError.message
        );

        alertInfo = null;
    }

    const recordTimestamp =
        new Date().toISOString();

    /**
     * --------------------------------------------------------
     * DATABASE HISTORY
     * --------------------------------------------------------
     *
     * Database is NOT used to determine GPS.
     *
     * It is only used to save weather history.
     * --------------------------------------------------------
     */

    try {

        await pool.query(
            `
            INSERT INTO weather_history
            (
                district,
                state,
                latitude,
                longitude,
                temperature,
                humidity,
                wind_speed,
                rain_probability,
                condition,
                recorded_at
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
                finalDistrict,
                finalState,
                lat,
                lon,
                weatherInfo.temperature,
                weatherInfo.humidity,
                weatherInfo.windSpeed,
                weatherInfo.rainProbability,
                weatherInfo.condition
            ]
        );

    } catch (dbError) {

        /**
         * Database logging failure should NOT
         * prevent the user from receiving weather.
         */
        console.warn(
            '[Weather API] Weather history DB insert failed:',
            dbError.message
        );
    }

    /**
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return {

        success: true,

        data: {

            district:
                finalDistrict,

            placeName:
                locationInfo.placeName ||
                finalDistrict,

            village:
                locationInfo.village ||
                null,

            town:
                locationInfo.town ||
                null,

            municipality:
                locationInfo.municipality ||
                null,

            suburb:
                locationInfo.suburb ||
                null,

            taluk:
                locationInfo.taluk ||
                null,

            state:
                finalState,

            country:
                finalCountry,

            postcode:
                locationInfo.postcode ||
                null,

            latitude:
                lat,

            longitude:
                lon,

            temperature:
                weatherInfo.temperature,

            humidity:
                weatherInfo.humidity,

            windSpeed:
                weatherInfo.windSpeed,

            rainProbability:
                weatherInfo.rainProbability,

            weatherCode:
                weatherInfo.weatherCode,

            condition:
                weatherInfo.condition,

            icon:
                weatherInfo.icon,

            alert:
                alertInfo,

            source:
                hasValidGPS
                    ? 'Browser GPS + OpenStreetMap'
                    : 'Manual District',

            updatedAt:
                recordTimestamp
        }
    };
}


/**
 * ============================================================
 * POST /api/weather
 * ============================================================
 *
 * GPS:
 * {
 *   latitude: 9.45,
 *   longitude: 76.80
 * }
 *
 * Manual:
 * {
 *   district: "Kottayam"
 * }
 * ============================================================
 */

router.post('/', async (req, res) => {

    try {

        const body =
            req.body || {};

        const result =
            await processWeatherRequest(
                body.latitude,
                body.longitude,
                body.district
            );

        return res.json(result);

    } catch (error) {

        console.error(
            '[Weather API] POST /api/weather error:',
            error
        );

        return res.status(500).json({

            success: false,

            error:
                'Failed to process weather request',

            details:
                error.message
        });
    }
});


/**
 * ============================================================
 * GET /api/weather
 * ============================================================
 *
 * Example:
 *
 * /api/weather?latitude=9.45&longitude=76.80
 *
 * OR:
 *
 * /api/weather?district=Kottayam
 *
 * IMPORTANT:
 * Do NOT call router.handle() here.
 * ============================================================
 */

router.get('/', async (req, res) => {

    try {

        const {
            latitude,
            longitude,
            district
        } = req.query;

        const result =
            await processWeatherRequest(
                latitude,
                longitude,
                district
            );

        return res.json(result);

    } catch (error) {

        console.error(
            '[Weather API] GET /api/weather error:',
            error
        );

        return res.status(500).json({

            success: false,

            error:
                'Failed to process weather request',

            details:
                error.message
        });
    }
});


/**
 * ============================================================
 * GET /api/weather/alerts/all
 * Fetch active disaster alerts for ALL 14 districts of Kerala
 * ============================================================
 */
router.get('/alerts/all', async (req, res) => {
    try {
        const alerts = await getAllKeralaAlerts();
        return res.json({
            success: true,
            alerts
        });
    } catch (error) {
        console.error('[Weather API] GET /api/weather/alerts/all error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch all Kerala alerts',
            details: error.message
        });
    }
});


/**
 * ============================================================
 * POST /api/weather/alerts
 * Save/Update official disaster alert in PostgreSQL DB
 * ============================================================
 */
router.post('/alerts', async (req, res) => {
    try {
        const { district, alertLevel, alertType, description, source, durationHours } = req.body || {};
        if (!district || !alertLevel || !alertType) {
            return res.status(400).json({
                success: false,
                error: 'District, alertLevel, and alertType are required fields'
            });
        }

        const newAlert = await saveDisasterAlert({
            district,
            alertLevel,
            alertType,
            description,
            source,
            durationHours: Number(durationHours) || 24
        });

        return res.json({
            success: true,
            message: `Alert recorded successfully for ${newAlert.district}`,
            alert: newAlert
        });
    } catch (error) {
        console.error('[Weather API] POST /api/weather/alerts error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save disaster alert',
            details: error.message
        });
    }
});


module.exports = router;