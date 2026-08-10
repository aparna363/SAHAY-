import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from 'react';

import {
    fetchWeatherData,
    type WeatherData
} from '../services/api';


/**
 * ============================================================
 * TYPES
 * ============================================================
 */

export type PermissionState =
    | 'prompt'
    | 'granted'
    | 'denied'
    | 'unavailable'
    | 'timeout'
    | 'unsupported';


export interface Coords {
    latitude: number;
    longitude: number;
}


export interface LocationData {

    latitude: number;
    longitude: number;

    accuracy: number;

    placeName: string;

    village?: string | null;
    town?: string | null;
    municipality?: string | null;
    suburb?: string | null;
    taluk?: string | null;

    district: string;
    state: string;
    country: string;

    postcode?: string | null;

    timestamp: number;

    source: string;

    isGPS: boolean;
}


export interface LocationInfo {

    district: string;
    state: string;
    country: string;

    placeName?: string;

    isGPS: boolean;
}


interface LocationContextType {

    coords: Coords | null;

    location: LocationData | null;

    locationInfo: LocationInfo;

    weatherData: WeatherData | null;

    permissionState: PermissionState;

    isPromptOpen: boolean;

    loading: boolean;

    error: string | null;

    accuracy: number | null;

    requestLocation: () => void;

    refreshLocation: () => void;

    denyLocation: () => void;

    openPromptModal: () => void;

    closePromptModal: () => void;

    setManualDistrict: (district: string) => void;
}


/**
 * ============================================================
 * CONTEXT
 * ============================================================
 */

const LocationContext =
    createContext<LocationContextType | undefined>(
        undefined
    );


/**
 * ============================================================
 * PROVIDER
 * ============================================================
 */

export const LocationProvider:
    React.FC<{ children: React.ReactNode }> =
    ({ children }) => {

        /**
         * ----------------------------------------------------
         * GPS coordinates
         * ----------------------------------------------------
         */

        const [coords, setCoords] =
            useState<Coords | null>(() => {

                const saved =
                    localStorage.getItem(
                        'sahay_gps_coords'
                    );

                if (!saved) {
                    return null;
                }

                try {

                    return JSON.parse(saved);

                } catch {

                    return null;
                }
            });


        /**
         * ----------------------------------------------------
         * Permission state
         * ----------------------------------------------------
         */

        const [permissionState, setPermissionState] =
            useState<PermissionState>(() => {

                const saved =
                    localStorage.getItem(
                        'sahay_location_permission'
                    );

                return (
                    (saved as PermissionState) ||
                    'prompt'
                );
            });


        /**
         * ----------------------------------------------------
         * Location prompt
         * ----------------------------------------------------
         */

        const [isPromptOpen, setIsPromptOpen] =
            useState<boolean>(() => {

                const saved =
                    localStorage.getItem(
                        'sahay_location_permission'
                    );

                return (
                    !saved ||
                    saved === 'prompt'
                );
            });


        /**
         * ----------------------------------------------------
         * Location data
         * ----------------------------------------------------
         */

        const [location, setLocation] =
            useState<LocationData | null>(() => {

                const saved =
                    localStorage.getItem(
                        'sahay_location_data'
                    );

                if (!saved) {
                    return null;
                }

                try {

                    return JSON.parse(saved);

                } catch {

                    return null;
                }
            });


        /**
         * ----------------------------------------------------
         * Weather
         * ----------------------------------------------------
         */

        const [weatherData, setWeatherData] =
            useState<WeatherData | null>(null);


        const [loading, setLoading] =
            useState(false);


        const [error, setError] =
            useState<string | null>(null);


        const [accuracy, setAccuracy] =
            useState<number | null>(null);


        /**
         * ====================================================
         * LOCATION INFO
         * ====================================================
         */

        const locationInfo: LocationInfo = {

            district:
                location?.district || '',

            state:
                location?.state || 'Kerala',

            country:
                location?.country || 'India',

            placeName:
                location?.placeName ||
                location?.district ||
                '',

            isGPS:
                location?.isGPS || false
        };


        /**
         * ====================================================
         * LOAD WEATHER + LOCATION
         * ====================================================
         */

        const loadLocationWeather =
            useCallback(
                async (
                    latitude: number,
                    longitude: number,
                    accuracyValue: number,
                    timestampValue: number
                ) => {

                    setLoading(true);

                    setError(null);

                    try {

                        /**
                         * IMPORTANT:
                         *
                         * Send the EXACT GPS coordinates
                         * received from the browser.
                         */
                        console.log(
                            '[LocationContext] Sending GPS:',
                            {
                                latitude,
                                longitude,
                                accuracy:
                                    accuracyValue
                            }
                        );


                        const data =
                            await fetchWeatherData(
                                latitude,
                                longitude
                            );


                        setWeatherData(data);


                        const newLocation:
                            LocationData = {

                                latitude:
                                    data.latitude ??
                                    latitude,

                                longitude:
                                    data.longitude ??
                                    longitude,

                                accuracy:
                                    accuracyValue,

                                placeName:
                                    data.placeName ||
                                    data.district ||
                                    'Unknown location',

                                village:
                                    data.village ||
                                    null,

                                town:
                                    data.town ||
                                    null,

                                municipality:
                                    data.municipality ||
                                    null,

                                suburb:
                                    data.suburb ||
                                    null,

                                taluk:
                                    data.taluk ||
                                    null,

                                district:
                                    data.district ||
                                    'Unknown',

                                state:
                                    data.state ||
                                    'Kerala',

                                country:
                                    data.country ||
                                    'India',

                                postcode:
                                    data.postcode ||
                                    null,

                                timestamp:
                                    timestampValue,

                                source:
                                    data.source ||
                                    'Browser GPS + OpenStreetMap',

                                isGPS:
                                    true
                            };


                        /**
                         * Save location.
                         */

                        setLocation(
                            newLocation
                        );


                        localStorage.setItem(
                            'sahay_location_data',
                            JSON.stringify(
                                newLocation
                            )
                        );


                        /**
                         * Save GPS coordinates.
                         */

                        const newCoords: Coords = {

                            latitude,

                            longitude
                        };


                        setCoords(
                            newCoords
                        );


                        localStorage.setItem(
                            'sahay_gps_coords',
                            JSON.stringify(
                                newCoords
                            )
                        );


                        console.log(
                            '[LocationContext] Final location:',
                            newLocation
                        );

                    } catch (err: any) {

                        console.error(
                            '[LocationContext] Weather/location error:',
                            err
                        );

                        setError(
                            err?.message ||
                            'Unable to fetch location data.'
                        );

                    } finally {

                        setLoading(false);
                    }

                },
                []
            );


        /**
         * ====================================================
         * REQUEST BROWSER GPS
         * ====================================================
         */

        const requestLocation =
            useCallback(() => {

                console.log(
                    '[LocationContext] Requesting browser GPS...'
                );


                setIsPromptOpen(false);

                setLoading(true);

                setError(null);


                /**
                 * Browser support check.
                 */

                if (
                    !navigator.geolocation
                ) {

                    setPermissionState(
                        'unsupported'
                    );

                    setError(
                        'Geolocation is not supported by this browser.'
                    );

                    setLoading(false);

                    return;
                }


                /**
                 * IMPORTANT:
                 *
                 * Browser asks the operating system for
                 * the actual device location.
                 *
                 * enableHighAccuracy = true
                 * maximumAge = 0
                 *
                 * means:
                 * - Prefer GPS
                 * - Don't intentionally use an old cached
                 *   browser position
                 */

                navigator.geolocation.getCurrentPosition(

                    /**
                     * SUCCESS
                     */
                    (position) => {

                        const {
                            latitude,
                            longitude,
                            accuracy:
                                positionAccuracy
                        } = position.coords;


                        const timestamp =
                            position.timestamp ||
                            Date.now();


                        console.log(
                            '================================'
                        );

                        console.log(
                            '[GPS SUCCESS]'
                        );

                        console.log(
                            'Latitude:',
                            latitude
                        );

                        console.log(
                            'Longitude:',
                            longitude
                        );

                        console.log(
                            'Accuracy:',
                            positionAccuracy,
                            'meters'
                        );

                        console.log(
                            'Timestamp:',
                            new Date(timestamp)
                        );

                        console.log(
                            '================================'
                        );


                        setPermissionState(
                            'granted'
                        );


                        localStorage.setItem(
                            'sahay_location_permission',
                            'granted'
                        );


                        setAccuracy(
                            positionAccuracy
                        );


                        /**
                         * Send EXACT coordinates
                         * to backend.
                         */

                        loadLocationWeather(
                            latitude,
                            longitude,
                            positionAccuracy,
                            timestamp
                        );
                    },


                    /**
                     * ERROR
                     */
                    (err) => {

                        console.warn(
                            '[GPS ERROR]',
                            err.code,
                            err.message
                        );


                        setLoading(false);


                        let state:
                            PermissionState =
                            'denied';


                        let message =
                            'Unable to determine your current location.';


                        if (
                            err.code ===
                            err.PERMISSION_DENIED
                        ) {

                            state =
                                'denied';

                            message =
                                'Location permission was denied. Please allow location access in your browser settings.';

                        } else if (
                            err.code ===
                            err.POSITION_UNAVAILABLE
                        ) {

                            state =
                                'unavailable';

                            message =
                                'Your device could not determine its GPS location. Please enable Location/GPS and try again.';

                        } else if (
                            err.code ===
                            err.TIMEOUT
                        ) {

                            state =
                                'timeout';

                            message =
                                'GPS request timed out. Please move to an open area and try again.';
                        }


                        setPermissionState(
                            state
                        );


                        localStorage.setItem(
                            'sahay_location_permission',
                            state
                        );


                        setError(
                            message
                        );
                    },


                    /**
                     * GPS OPTIONS
                     */
                    {
                        enableHighAccuracy: true,

                        timeout: 30000,

                        maximumAge: 0
                    }
                );

            }, [
                loadLocationWeather
            ]);


        /**
         * ====================================================
         * MANUAL DISTRICT
         * ====================================================
         *
         * This is optional.
         *
         * It is used when the user manually chooses
         * Kottayam, Ernakulam etc.
         * ====================================================
         */

        const setManualDistrict =
            useCallback(
                async (district: string) => {

                    if (!district) {
                        return;
                    }


                    console.log(
                        '[LocationContext] Manual district:',
                        district
                    );


                    setLoading(true);

                    setError(null);


                    try {

                        const data =
                            await fetchWeatherData(
                                undefined,
                                undefined,
                                district
                            );


                        setWeatherData(
                            data
                        );


                        const manualLocation:
                            LocationData = {

                                latitude:
                                    data.latitude,

                                longitude:
                                    data.longitude,

                                accuracy: 0,

                                placeName:
                                    data.placeName ||
                                    district,

                                village:
                                    data.village ||
                                    null,

                                town:
                                    data.town ||
                                    null,

                                municipality:
                                    data.municipality ||
                                    null,

                                suburb:
                                    data.suburb ||
                                    null,

                                taluk:
                                    data.taluk ||
                                    null,

                                district:
                                    data.district ||
                                    district,

                                state:
                                    data.state ||
                                    'Kerala',

                                country:
                                    data.country ||
                                    'India',

                                postcode:
                                    data.postcode ||
                                    null,

                                timestamp:
                                    Date.now(),

                                source:
                                    'Manual District Selection',

                                isGPS:
                                    false
                            };


                        setLocation(
                            manualLocation
                        );


                        /**
                         * IMPORTANT:
                         *
                         * Manual district selection must
                         * remove the GPS coordinate cache.
                         */

                        setCoords(null);

                        localStorage.removeItem(
                            'sahay_gps_coords'
                        );


                        localStorage.setItem(
                            'sahay_location_data',
                            JSON.stringify(
                                manualLocation
                            )
                        );

                    } catch (err: any) {

                        console.error(
                            '[LocationContext] Manual district error:',
                            err
                        );

                        setError(
                            err?.message ||
                            'Unable to load district weather.'
                        );

                    } finally {

                        setLoading(false);
                    }

                },
                []
            );


        /**
         * ====================================================
         * REFRESH GPS
         * ====================================================
         */

        const refreshLocation =
            useCallback(() => {

                /**
                 * Clear old location first.
                 */

                setError(null);

                requestLocation();

            }, [
                requestLocation
            ]);


        /**
         * ====================================================
         * DENY LOCATION
         * ====================================================
         */

        const denyLocation =
            useCallback(() => {

                setIsPromptOpen(false);

                setPermissionState(
                    'denied'
                );

                localStorage.setItem(
                    'sahay_location_permission',
                    'denied'
                );

                setError(
                    'Location permission is required to detect your current location.'
                );

            }, []);


        /**
         * ====================================================
         * PROMPT CONTROLS
         * ====================================================
         */

        const openPromptModal =
            useCallback(() => {

                setIsPromptOpen(true);

            }, []);


        const closePromptModal =
            useCallback(() => {

                setIsPromptOpen(false);

            }, []);


        /**
         * ====================================================
         * AUTO REQUEST
         * ====================================================
         *
         * If the user previously granted permission,
         * request a fresh GPS position when the app loads.
         * ====================================================
         */

        useEffect(() => {

            const savedPermission =
                localStorage.getItem(
                    'sahay_location_permission'
                );


            if (
                savedPermission ===
                'granted'
            ) {

                console.log(
                    '[LocationContext] Previous GPS permission found. Requesting fresh GPS...'
                );


                requestLocation();
            }

        }, [
            requestLocation
        ]);


        /**
         * ====================================================
         * PROVIDER
         * ====================================================
         */

        return (

            <LocationContext.Provider
                value={{

                    coords,

                    location,

                    locationInfo,

                    weatherData,

                    permissionState,

                    isPromptOpen,

                    loading,

                    error,

                    accuracy,

                    requestLocation,

                    refreshLocation,

                    denyLocation,

                    openPromptModal,

                    closePromptModal,

                    setManualDistrict
                }}
            >

                {children}

            </LocationContext.Provider>
        );
    };


/**
 * ============================================================
 * HOOK
 * ============================================================
 */

export const useLocation =
    (): LocationContextType => {

        const context =
            useContext(
                LocationContext
            );


        if (!context) {

            throw new Error(
                'useLocation must be used within a LocationProvider'
            );
        }


        return context;
    };