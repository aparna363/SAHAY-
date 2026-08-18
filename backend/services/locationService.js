/**
 * ============================================================
 * SAHAY - Location Service
 * ============================================================
 *
 * Browser:
 *   GPS latitude + longitude
 *          ↓
 * Backend:
 *   OpenStreetMap Nominatim Reverse Geocoding
 *          ↓
 * Village / Town / Taluk / District / State / Country
 *
 * IMPORTANT:
 * - No IP-based geolocation
 * - No nearest-district guessing
 * - No database required for GPS detection
 * - GPS coordinates come from the user's browser/device
 * ============================================================
 */

const NOMINATIM_URL =
    'https://nominatim.openstreetmap.org/reverse';

/**
 * Kerala districts.
 *
 * These names are NOT used to determine the user's location.
 * They are only used to normalize the district name returned
 * by Nominatim.
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
 * Normalize text for district comparison.
 */
function normalizeText(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .toLowerCase()
        .replace(/\s+district\b/gi, '')
        .replace(/\s+taluk\b/gi, '')
        .trim();
}

/**
 * Find official Kerala district name from
 * Nominatim address fields.
 */
function findKeralaDistrict(address) {

    const candidates = [
        address.state_district,
        address.district,
        address.county,
        address.city_district,
        address.municipality,
        address.city,
        address.town,
        address.village
    ].filter(Boolean);

    // First try exact matching
    for (const candidate of candidates) {

        const normalizedCandidate =
            normalizeText(candidate);

        const exactMatch =
            KERALA_DISTRICTS.find(
                district =>
                    normalizeText(district) ===
                    normalizedCandidate
            );

        if (exactMatch) {
            return exactMatch;
        }
    }

    // Then try contains matching
    for (const candidate of candidates) {

        const normalizedCandidate =
            normalizeText(candidate);

        const containsMatch =
            KERALA_DISTRICTS.find(
                district =>
                    normalizedCandidate.includes(
                        normalizeText(district)
                    )
            );

        if (containsMatch) {
            return containsMatch;
        }
    }

    return null;
}

/**
 * Reverse geocode GPS coordinates.
 *
 * Input:
 *   latitude
 *   longitude
 *
 * Output:
 *   locality + district + state + country
 */
async function reverseGeocode(latitude, longitude) {

    const lat = Number.parseFloat(latitude);
    const lon = Number.parseFloat(longitude);

    /**
     * Validate coordinates.
     */
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return {
            district: 'Unknown',
            placeName: 'Unknown location',
            village: null,
            town: null,
            municipality: null,
            suburb: null,
            taluk: null,
            state: 'Kerala',
            country: 'India',
            postcode: null,
            source: 'Invalid GPS coordinates'
        };
    }

    /**
     * Validate latitude / longitude ranges.
     */
    if (
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {

        return {
            district: 'Unknown',
            placeName: 'Invalid location',
            village: null,
            town: null,
            municipality: null,
            suburb: null,
            taluk: null,
            state: 'Kerala',
            country: 'India',
            postcode: null,
            source: 'Invalid GPS coordinates'
        };
    }

    const url =
        `${NOMINATIM_URL}` +
        `?format=json` +
        `&lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}` +
        `&zoom=18` +
        `&addressdetails=1`;

    try {

        const controller =
            new AbortController();

        const timeoutId =
            setTimeout(
                () => controller.abort(),
                10000
            );

        const response =
            await fetch(
                url,
                {
                    method: 'GET',

                    headers: {
                        'User-Agent':
                            'SAHAY-Emergency-Portal/1.0',

                        'Accept':
                            'application/json'
                    },

                    signal: controller.signal
                }
            );

        clearTimeout(timeoutId);

        if (!response.ok) {

            throw new Error(
                `Nominatim HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const address =
            data.address || {};

        /**
         * Most specific locality available.
         *
         * Example:
         *
         * Erumely South
         * Charuveli
         * Kanjirappally
         */
        const placeName =
            address.village ||
            address.hamlet ||
            address.suburb ||
            address.town ||
            address.city ||
            address.municipality ||
            address.county ||
            null;

        /**
         * Find district from Nominatim.
         */
        let district =
            findKeralaDistrict(address);

        /**
         * If address fields don't contain the district,
         * check display_name.
         *
         * IMPORTANT:
         * We still do NOT calculate nearest district.
         */
        if (!district) {

            const displayName =
                String(
                    data.display_name || ''
                ).toLowerCase();

            district =
                KERALA_DISTRICTS.find(
                    item =>
                        displayName.includes(
                            item.toLowerCase()
                        )
                ) || null;
        }

        /**
         * State.
         */
        const state =
            address.state ||
            'Kerala';

        /**
         * Country.
         */
        const country =
            address.country ||
            'India';

        /**
         * Detailed logging.
         *
         * This is VERY useful for debugging
         * your Erumeli/Kottayam problem.
         */
        console.log(
            '=========================================='
        );

        console.log(
            '[LocationService] GPS coordinates received'
        );

        console.log(
            'Latitude:',
            lat
        );

        console.log(
            'Longitude:',
            lon
        );

        console.log(
            'Nominatim display name:',
            data.display_name
        );

        console.log(
            'Resolved place:',
            placeName
        );

        console.log(
            'Resolved district:',
            district
        );

        console.log(
            'State:',
            state
        );

        console.log(
            'Country:',
            country
        );

        console.log(
            '=========================================='
        );

        /**
         * Return result.
         */
        return {

            district:
                district || 'Unknown',

            placeName:
                placeName
                    ? (
                        district && !placeName.toLowerCase().includes(district.toLowerCase())
                            ? `${placeName}, ${district}, ${state}`
                            : `${placeName}, ${state}`
                    )
                    : (
                        district
                            ? `${district}, ${state}`
                            : `${state}, India`
                    ),

            village:
                address.village ||
                null,

            town:
                address.town ||
                null,

            municipality:
                address.municipality ||
                null,

            suburb:
                address.suburb ||
                null,

            taluk:
                address.taluk ||
                null,

            state,

            country,

            postcode:
                address.postcode ||
                null,

            source:
                'Browser GPS + OpenStreetMap Nominatim'
        };

    } catch (error) {

        console.warn(
            '[LocationService] Reverse geocoding failed:',
            error.message
        );

        /**
         * DO NOT GUESS THE DISTRICT.
         *
         * If Nominatim fails, we return Unknown.
         */
        return {

            district: 'Unknown',

            placeName:
                'Location detected, address unavailable',

            village: null,

            town: null,

            municipality: null,

            suburb: null,

            taluk: null,

            state: 'Kerala',

            country: 'India',

            postcode: null,

            source:
                'Browser GPS - Reverse geocoding unavailable'
        };
    }
}

module.exports = {
    reverseGeocode,
    KERALA_DISTRICTS
};