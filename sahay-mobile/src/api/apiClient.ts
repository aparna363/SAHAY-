// SAHAY Mobile API Client - React Native + Expo Integration
// Single source of truth connecting to existing SAHAY Node.js / Express Backend + PostgreSQL / PostGIS DB

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Determine Host IP dynamically for Expo Go / Emulator / Device
const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  let hostIp = 'localhost';
  if (debuggerHost) {
    hostIp = debuggerHost.split(':')[0];
  }
  return `http://${hostIp}:5000/api`;
};

export const API_BASE_URL = getBaseUrl();
export const API_FALLBACK_URL = 'http://10.0.2.2:5000/api'; // Android Emulator alias
export const API_LOCALHOST_URL = 'http://localhost:5000/api';

export type UserRole = 'citizen' | 'rescue_team' | 'collector' | 'station' | 'station_admin';

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: UserRole | string;
  status?: 'pending' | 'approved' | 'rejected' | string;
  district: string;
  panchayat?: string;
  designation?: string;
  departmentId?: string;
  department_id?: string;
  created_at?: string;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  district: string;
  panchayat?: string;
  designation?: string;
  departmentId?: string;
}

export interface LoginPayload {
  phoneOrEmail: string;
  password?: string;
  role?: UserRole;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// Token Storage Helpers
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('sahay_token');
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const str = await AsyncStorage.getItem('sahay_user');
    if (!str) return null;
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function saveAuthSession(user: AuthUser, token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('sahay_token', token);
    await AsyncStorage.setItem('sahay_user', JSON.stringify(user));
  } catch (err) {
    console.error('Error saving auth session:', err);
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem('sahay_token');
    await AsyncStorage.removeItem('sahay_user');
  } catch (err) {
    console.error('Error clearing auth session:', err);
  }
}

// Helper fetch with multi-host fallback (Expo LAN IP -> Android 10.0.2.2 -> localhost)
async function fetchWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const requestOpts = { ...options, headers };

  // Try 1: Dynamic LAN Host IP
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, requestOpts);
    return res;
  } catch (err1) {
    // Try 2: Android Emulator IP
    try {
      const res = await fetch(`${API_FALLBACK_URL}${endpoint}`, requestOpts);
      return res;
    } catch (err2) {
      // Try 3: Localhost fallback
      try {
        const res = await fetch(`${API_LOCALHOST_URL}${endpoint}`, requestOpts);
        return res;
      } catch (err3) {
        throw new Error('Unable to connect to SAHAY backend server. Please verify backend process is running on port 5000.');
      }
    }
  }
}

// Session verification
export async function getCurrentUserSession(): Promise<AuthUser | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchWithFallback('/auth/me', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        await saveAuthSession(data.user, token);
        return data.user;
      }
    }
  } catch (err) {
    console.warn('Backend session verification warning:', err);
  }

  return await getStoredUser();
}

// Get Districts list from PostgreSQL
export async function getDistricts(): Promise<string[]> {
  try {
    const response = await fetchWithFallback('/auth/districts', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Backend fetch for districts failed:', err);
  }
  return [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad'
  ];
}

// User Registration
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  if (data.token && data.user) {
    await saveAuthSession(data.user, data.token);
  }

  return data;
}

// User Login
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  if (data.token && data.user) {
    await saveAuthSession(data.user, data.token);
  }

  return data;
}

// Weather Telemetry API
export interface WeatherData {
  district: string;
  placeName?: string;
  latitude: number;
  longitude: number;
  temperature: number;
  feelsLike?: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  weatherCode: number;
  condition: string;
  icon: string;
  alert: {
    alertLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | string;
    alertType: string;
    description: string;
    source: string;
    officialAlert?: {
      alertLevel: string;
      alertType?: string;
      description?: string;
      source?: string;
    };
    localRisk?: {
      level: string;
      reason?: string;
    };
  };
  updatedAt: string;
}

export async function fetchWeatherData(latitude?: number, longitude?: number, district?: string): Promise<WeatherData> {
  const payload: any = {};
  if (latitude !== undefined && longitude !== undefined) {
    payload.latitude = latitude;
    payload.longitude = longitude;
  }
  if (district) {
    payload.district = district;
  }

  const response = await fetchWithFallback('/weather', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch weather telemetry');
  }

  return data.data;
}

export async function fetchAllKeralaAlerts(): Promise<any[]> {
  try {
    const response = await fetchWithFallback('/weather/alerts/all', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.alerts)) {
        return data.alerts;
      }
    }
  } catch (err) {
    console.warn('Fetch alerts failed:', err);
  }
  return [];
}

// Incident Management API
export type IncidentSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESPONSE_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface IncidentReport {
  id: number;
  incidentCode: string;
  incidentTypeName: string;
  severity: IncidentSeverity;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
  status: IncidentStatus;
  createdAt: string;
  citizen?: {
    name: string;
    phone: string;
    district: string;
  };
}

export async function submitIncidentReportApi(payload: {
  incidentTypeId?: number;
  incidentTypeName: string;
  severity: IncidentSeverity;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetchWithFallback('/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Submission failed' };
    }
    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unable to submit incident.' };
  }
}

export async function fetchMyIncidentReports(): Promise<IncidentReport[]> {
  try {
    const res = await fetchWithFallback('/incidents/my', { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) return data.data;
  } catch (err) {
    console.error('Fetch My Incident Reports Error:', err);
  }
  return [];
}

export async function fetchOfficialIncidents(district?: string): Promise<{ incidents: IncidentReport[] }> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const res = await fetchWithFallback(`/incidents${query}`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return { incidents: data.data };
    }
  } catch (err) {
    console.error('Fetch Official Incidents Error:', err);
  }
  return { incidents: [] };
}

export async function updateIncidentStatusApi(id: string | number, status: IncidentStatus, remarks?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithFallback(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update status' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

// Rescue Operational APIs
export interface RescueDashboardStats {
  newAssignments: number;
  activeOperations: number;
  completedOperations: number;
  teamStatus: string;
  availableMembers: number;
  totalMembers: number;
}

export async function getRescueDashboardStats(district?: string): Promise<{ district: string; stats: RescueDashboardStats }> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetchWithFallback(`/rescue/dashboard-stats${query}`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return { district: data.district || district || 'Kottayam', stats: data.stats };
    }
  } catch (err) {
    console.warn('Backend fetch for rescue stats failed:', err);
  }
  return {
    district: district || 'Kottayam',
    stats: {
      newAssignments: 3,
      activeOperations: 2,
      completedOperations: 14,
      teamStatus: 'Available',
      availableMembers: 8,
      totalMembers: 10,
    }
  };
}

export async function updateRescueOperationStatus(
  incidentId: string | number,
  status: string,
  remarks?: string,
  rescuedCount?: number
): Promise<{ message: string }> {
  const response = await fetchWithFallback(`/rescue/operations/${incidentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remarks, rescuedCount }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update operation status');
  return data;
}

export async function getTeamMembers(district?: string): Promise<{ teamMembers: any[] }> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetchWithFallback(`/rescue/team-members${query}`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return { teamMembers: data.teamMembers || [] };
    }
  } catch (err) {
    console.warn('Failed to fetch team members:', err);
  }
  return { teamMembers: [] };
}

export async function submitEmergencySupportRequest(payload: {
  requestType: string;
  priority: string;
  reason: string;
}): Promise<{ message: string }> {
  const response = await fetchWithFallback('/rescue/emergency-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to submit support request');
  return data;
}

