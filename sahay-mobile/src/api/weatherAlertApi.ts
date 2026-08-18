import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_FALLBACK_URL, API_LOCALHOST_URL } from './apiClient';

export interface WeatherAlertItem {
  alert_id: string;
  title: string;
  hazard_type: string;
  mapped_severity: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'UNVERIFIED';
  raw_severity: string;
  description: string;
  safety_instructions?: string;
  expires_at?: string;
  // Rescue team metadata
  issued_at?: string;
  affected_zones?: string[];
  source_reference_url?: string;
  source_type?: string;
  source_name?: string;
  raw_payload?: any;
}

export interface ManualAdvisoryItem {
  id: number;
  district: string;
  title: string;
  instruction: string;
  issued_by_name?: string;
  issued_at: string;
  expires_at?: string;
}

export interface CurrentWeatherAlertResponse {
  success: boolean;
  district: string;
  highestSeverity: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'UNVERIFIED';
  fetchStatus: 'HEALTHY' | 'STALE' | 'UNVERIFIED';
  lastSuccessfulFetch: string | null;
  lastUpdatedLabel: string;
  isStale: boolean;
  isUnverified: boolean;
  activeAlertsCount: number;
  primaryAlert: WeatherAlertItem | null;
  activeAlerts: WeatherAlertItem[];
  activeAdvisories: ManualAdvisoryItem[];
  message: string;
}

const fetchWithUrlFallback = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = await AsyncStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const urls = [API_BASE_URL, API_FALLBACK_URL, API_LOCALHOST_URL];
  let lastErr: any = null;

  for (const baseUrl of urls) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('Network request failed across all server URLs');
};

/**
 * Fetches current weather alert status for a given district or lat/lon
 */
export async function getCurrentWeatherAlert(params: { district?: string; lat?: number; lon?: number }): Promise<CurrentWeatherAlertResponse> {
  const queryParts: string[] = [];
  if (params.district) queryParts.push(`district=${encodeURIComponent(params.district)}`);
  if (params.lat !== undefined) queryParts.push(`lat=${params.lat}`);
  if (params.lon !== undefined) queryParts.push(`lon=${params.lon}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  try {
    const res = await fetchWithUrlFallback(`/weather-alerts/current${queryString}`);
    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      district: params.district || 'Unknown',
      highestSeverity: 'UNVERIFIED',
      fetchStatus: 'UNVERIFIED',
      lastSuccessfulFetch: null,
      lastUpdatedLabel: 'Unable to verify status',
      isStale: true,
      isUnverified: true,
      activeAlertsCount: 0,
      primaryAlert: null,
      activeAlerts: [],
      activeAdvisories: [],
      message: 'Unable to verify current alert status'
    };
  }
}

/**
 * Triggers manual refresh request
 */
export async function refreshWeatherAlert(params: { district?: string; lat?: number; lon?: number }): Promise<CurrentWeatherAlertResponse> {
  try {
    const res = await fetchWithUrlFallback('/weather-alerts/refresh', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    const json = await res.json();
    return json.data || json;
  } catch (error: any) {
    return getCurrentWeatherAlert(params);
  }
}
