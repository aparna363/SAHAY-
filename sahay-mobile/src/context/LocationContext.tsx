import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Location from 'expo-location';
import { fetchWeatherData } from '../api/apiClient';

interface LocationState {
  latitude: number;
  longitude: number;
  district: string;
  panchayat: string;
  addressName: string;
  permissionGranted: boolean;
  isLoading: boolean;
  errorMsg: string | null;
  refreshLocation: () => Promise<void>;
}

const defaultKeralaLocation: LocationState = {
  latitude: 11.0720,
  longitude: 76.0740,
  district: 'Malappuram',
  panchayat: 'Pullikuth Colony',
  addressName: 'Pullikuth Colony, Malappuram',
  permissionGranted: false,
  isLoading: false,
  errorMsg: null,
  refreshLocation: async () => {},
};

const LocationContext = createContext<LocationState>(defaultKeralaLocation);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationState, setLocationState] = useState<LocationState>({
    ...defaultKeralaLocation,
    isLoading: true,
  });

  const requestAndFetchLocation = async () => {
    setLocationState(prev => ({ ...prev, isLoading: true, errorMsg: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationState(prev => ({
          ...prev,
          permissionGranted: false,
          isLoading: false,
          errorMsg: 'Permission to access location was denied. Defaulting to Kerala district telemetry.',
        }));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      let detectedDistrict = 'Malappuram';
      let detectedPanchayat = 'Local Sector';
      let formattedAddress = `GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

      // 1. Primary reverse geocode via backend weather API
      try {
        const backendWeather = await fetchWeatherData(lat, lng);
        if (backendWeather) {
          detectedDistrict = backendWeather.district || 'Malappuram';
          formattedAddress = backendWeather.placeName || `${detectedDistrict}, Kerala`;
        }
      } catch (backendErr) {
        console.warn('Backend geocode note:', backendErr);
        // 2. Fallback reverse geocode via Expo Location
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

          if (reverseGeocode && reverseGeocode.length > 0) {
            const item = reverseGeocode[0];
            detectedDistrict = item.subregion || item.city || item.region || 'Malappuram';
            detectedPanchayat = item.district || item.street || item.name || 'Local Sector';
            formattedAddress = [item.name || item.street, item.city || item.subregion, item.region].filter(Boolean).join(', ');
          }
        } catch (expoErr) {
          console.warn('Expo reverse geocode note:', expoErr);
        }
      }

      setLocationState({
        latitude: lat,
        longitude: lng,
        district: detectedDistrict,
        panchayat: detectedPanchayat,
        addressName: formattedAddress,
        permissionGranted: true,
        isLoading: false,
        errorMsg: null,
        refreshLocation: requestAndFetchLocation,
      });
    } catch (err: any) {
      console.warn('GPS location request error:', err);
      setLocationState(prev => ({
        ...prev,
        isLoading: false,
        errorMsg: err.message || 'GPS location unavailable',
        refreshLocation: requestAndFetchLocation,
      }));
    }
  };

  useEffect(() => {
    requestAndFetchLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ ...locationState, refreshLocation: requestAndFetchLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
