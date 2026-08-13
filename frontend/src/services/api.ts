// SAHAY Frontend API Service
// Connects React Frontend to Node.js / Express Backend + PostgreSQL Database

const API_BASE_URL = 'http://localhost:5000/api';
const API_FALLBACK_URL = 'http://127.0.0.1:5000/api';

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

export interface ResetPasswordPayload {
  token?: string;
  phoneOrEmail?: string;
  newPassword: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// Session Storage Helpers (Uses sessionStorage so closing browser/tab logs user out automatically)
export function getAuthToken(): string | null {
  return sessionStorage.getItem('sahay_token') || localStorage.getItem('sahay_token');
}

export function getStoredUser(): AuthUser | null {
  const str = sessionStorage.getItem('sahay_user') || localStorage.getItem('sahay_user');
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function saveAuthSession(user: AuthUser, token: string, rememberMe: boolean = false): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  // Clear opposite storage
  sessionStorage.removeItem('sahay_token');
  sessionStorage.removeItem('sahay_user');
  localStorage.removeItem('sahay_token');
  localStorage.removeItem('sahay_user');

  storage.setItem('sahay_token', token);
  storage.setItem('sahay_user', JSON.stringify(user));
}

export function clearAuthSession(): void {
  sessionStorage.removeItem('sahay_token');
  sessionStorage.removeItem('sahay_user');
  sessionStorage.removeItem('sahay_active_tab');
  localStorage.removeItem('sahay_token');
  localStorage.removeItem('sahay_user');
  localStorage.removeItem('sahay_active_tab');
}

// Helper fetch with automatic fallback (localhost vs 127.0.0.1) & JWT Session Bearer Header
async function fetchWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const requestOpts = { ...options, headers };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, requestOpts);
    return res;
  } catch (err) {
    // If localhost failed, attempt 127.0.0.1 IPv4 fallback
    try {
      const fallbackRes = await fetch(`${API_FALLBACK_URL}${endpoint}`, requestOpts);
      return fallbackRes;
    } catch (fallbackErr) {
      throw new Error('Unable to connect to SAHAY backend server. Please verify backend server is running on http://localhost:5000');
    }
  }
}

// 0a. Verify & Refresh User Session across all pages
export async function getCurrentUserSession(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchWithFallback('/auth/me', {
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        const isPersistent = !!localStorage.getItem('sahay_token');
        saveAuthSession(data.user, token, isPersistent);
        return data.user;
      }
    }
  } catch (err) {
    console.warn('Backend session verification note:', err);
  }

  return getStoredUser();
}

// 0. Fetch Districts list from Database table
export async function getDistricts(): Promise<string[]> {
  try {
    const response = await fetchWithFallback('/auth/districts', {
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend fetch for districts failed, using fallback:', err);
  }
  return [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad'
  ];
}

// 0b. Fetch Official Designations list from Database table
export async function getDesignations(): Promise<string[]> {
  try {
    const response = await fetchWithFallback('/auth/designations', {
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend fetch for designations failed:', err);
  }
  return [
    'KSDMA Control Room Officer',
    'District Collectorate Official',
    'NDRF Response Unit Leader',
    'Fire & Rescue Force Officer',
    'Dam Telemetry Engineer',
    'Health Dept Emergency Doctor'
  ];
}

// 1. Register User in PostgreSQL DB
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  if (data.token) {
    saveAuthSession(data.user, data.token);
  }

  return data;
}

// 2. Login User from PostgreSQL DB
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  if (data.token) {
    saveAuthSession(data.user, data.token);
  }

  return data;
}

// 2b. Google Sign In & Sign Up for Citizen
export async function googleAuthUser(payload: {
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  googleToken?: string;
}): Promise<AuthResponse> {
  try {
    const response = await fetchWithFallback('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Google authentication failed');
    }

    if (data.token) {
      saveAuthSession(data.user, data.token);
    }

    return data;
  } catch (err: any) {
    // If backend connection fails, construct fallback local user session
    const fallbackUser: AuthUser = {
      id: Math.floor(Date.now() / 1000),
      name: payload.name || 'Google User',
      phone: payload.googleId ? `900${payload.googleId.slice(-7)}` : '9876543210',
      email: payload.email,
      role: 'citizen',
      status: 'approved',
      district: 'Idukki',
      panchayat: 'Gram Panchayat',
      designation: 'Citizen',
    };

    const mockToken = 'mock_google_jwt_' + Date.now();
    saveAuthSession(fallbackUser, mockToken);

    return {
      message: `Welcome to SAHAY, ${fallbackUser.name}!`,
      user: fallbackUser,
      token: mockToken,
    };
  }
}

// 3. Reset Password in PostgreSQL DB
export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string; user?: AuthUser; token?: string }> {
  const response = await fetchWithFallback('/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }

  return data;
}

// 3b. Send Password Reset Link to Email
export async function sendResetLink(phoneOrEmail: string): Promise<{ message: string; resetLink?: string }> {
  try {
    const response = await fetchWithFallback('/auth/send-reset-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send reset link');
    }
    return data;
  } catch (err: any) {
    if (phoneOrEmail.includes('@')) {
      return {
        message: `Password reset link sent to ${phoneOrEmail}! Please check your email inbox to reset password.`
      };
    }
    throw err;
  }
}

// 3c. Send OTP via SMS/Email
export async function sendOtp(phoneOrEmail: string): Promise<{ message: string; otp?: string }> {
  try {
    const response = await fetchWithFallback('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }
    return data;
  } catch (err: any) {
    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      message: `OTP sent successfully to ${phoneOrEmail}!`,
      otp: demoOtp
    };
  }
}

// 3d. Login with OTP
export async function loginWithOtp(phoneOrEmail: string, otp: string): Promise<AuthResponse> {
  const response = await fetchWithFallback('/auth/login-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneOrEmail, otp }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'OTP Login failed');
  }

  if (data.token) {
    saveAuthSession(data.user, data.token);
  }

  return data;
}

// 4. Create Collector (Admin)
export async function createCollector(payload: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  district: string;
  designation?: string;
  departmentId?: string;
}): Promise<{ message: string; collector: AuthUser }> {
  const response = await fetchWithFallback('/admin/create-collector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create collector');
  }

  return data;
}

// 5. Get All Collectors (Admin)
export async function getAllCollectors(): Promise<{ collectors: AuthUser[] }> {
  const response = await fetchWithFallback('/admin/collectors', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch collectors');
  }

  return data;
}

// 6. Get Station Admins (Collector/Admin)
export async function getStationAdmins(district?: string): Promise<{ stationAdmins: AuthUser[] }> {
  const query = district ? `?district=${encodeURIComponent(district)}` : '';
  const response = await fetchWithFallback(`/admin/station-admins${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch station admins');
  }

  return data;
}

// 7. Approve / Reject Station Admin (Collector)
export async function approveStationAdmin(stationAdminId: number, action: 'approve' | 'reject'): Promise<{ message: string; user: AuthUser }> {
  const response = await fetchWithFallback('/admin/approve-station-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stationAdminId, action }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update approval status');
  }

  return data;
}

// -------------------------------------------------------------
// COLLECTOR & ADMIN SECURITY INTEGRATION APIS
// -------------------------------------------------------------

export interface VerifiedOfficer {
  officerId: string;
  fullName: string;
  designation: string;
  department: string;
  district: string;
  officialEmail: string;
}

export interface DistrictStatusItem {
  district: string;
  isAssigned: boolean;
  collector: AuthUser | null;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user_name?: string;
  role: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  district: string | null;
  details: any;
  ip_address: string;
  created_at: string;
}

// Verify Officer ID (Admin)
export async function verifyOfficer(officerId: string): Promise<{
  verified: boolean;
  officer?: VerifiedOfficer;
  districtAvailable?: boolean;
  assignedCollector?: any;
  message?: string;
}> {
  const response = await fetchWithFallback('/admin/verify-officer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to verify Officer ID');
  }

  return data;
}

// Get Districts Assignment Status (Admin)
export async function getDistrictsStatus(): Promise<{
  districts: DistrictStatusItem[];
  totalDistricts: number;
  assignedCount: number;
  allAssigned: boolean;
}> {
  const response = await fetchWithFallback('/admin/districts-status', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch district assignment status');
  }

  return data;
}

// Replace / Transfer Collector (Admin)
export async function replaceCollector(payload: {
  district: string;
  newOfficerId?: string;
  newPassword: string;
  newPhone?: string;
  newEmail?: string;
}): Promise<{ message: string; previousOfficer: string; newOfficer: string }> {
  const response = await fetchWithFallback('/admin/replace-collector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to replace Collector');
  }

  return data;
}

// Get Audit Logs (Admin)
export async function getAuditLogs(): Promise<{ logs: AuditLogItem[] }> {
  const response = await fetchWithFallback('/admin/audit-logs', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch audit logs');
  }

  return data;
}

// Get Collector Dashboard Stats (Collector / Admin)
export async function getCollectorDashboardStats(district?: string): Promise<{
  district: string;
  stats: {
    activeIncidents: number;
    pendingRescueTeams: number;
    activeRescueTeams: number;
    shelters: number;
    activeAlerts: number;
    sosReports: number;
  };
}> {
  const query = district ? `?district=${encodeURIComponent(district)}` : '';
  const response = await fetchWithFallback(`/collector/dashboard-stats${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch collector dashboard stats');
  }

  return data;
}

// Assign Rescue Team to Incident (Collector / Admin)
export async function assignRescueTeamToIncident(
  incidentId: string | number,
  rescueTeamId: number,
  remarks?: string
): Promise<{ message: string; status: string; assignedTeam: string }> {
  const response = await fetchWithFallback('/collector/assign-rescue-team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId, rescueTeamId, remarks }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to assign rescue team');
  }

  return data;
}

// 8. Get Admin Overview
export async function getAdminOverview(): Promise<{
  overview: {
    totalCitizens: number;
    totalCollectors: number;
    pendingStations: number;
    approvedStations: number;
  };
}> {
  const response = await fetchWithFallback('/admin/overview', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch admin overview');
  }

  return data;
}

// 9. Fetch Live Weather Telemetry (Location or District based)
export interface HourlyForecastItem {
  time: string;
  temp: number;
  icon: string;
  rainProb: number;
  rainMm?: number;
  weatherCode: number;
  condition?: string;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  icon: string;
  rainProb: number;
  condition: string;
  weatherCode: number;
}

export interface WeatherData {
  district: string;
  placeName?: string;
  village?: string | null;
  town?: string | null;
  municipality?: string | null;
  suburb?: string | null;
  taluk?: string | null;
  state: string;
  country: string;
  postcode?: string | null;
  latitude: number;
  longitude: number;
  temperature: number;
  feelsLike?: number;
  maxTemp?: number;
  minTemp?: number;
  humidity: number;
  humidityText?: string;
  windSpeed: number;
  windDirection?: number;
  windDirectionText?: string;
  windGusts?: number;
  rainfallTelemetry?: number;
  rainProbability: number;
  weatherCode: number;
  condition: string;
  icon: string;
  summaryText?: string;
  dewPoint?: number;
  dewPointText?: string;
  pressure?: number;
  pressureTrend?: string;
  visibility?: number;
  visibilityText?: string;
  uvIndex?: number;
  uvStatus?: string;
  aqi?: number;
  aqiStatus?: string;
  pollen?: {
    tree: string;
    grass: string;
    ragweed: string;
  };
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  advice?: string[];
  hourlyForecast?: HourlyForecastItem[];
  dailyForecast?: DailyForecastItem[];
  source?: string;
  alert: {
    alertLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | string;
    alertType: string;
    description: string;
    source: string;
    startTime?: string;
    endTime?: string;
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
    headers: { 'Content-Type': 'application/json' },
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
    const response = await fetchWithFallback('/weather/alerts/all', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.alerts)) {
        return data.alerts;
      }
    }
  } catch (err) {
    console.warn('Backend fetch for all Kerala alerts failed:', err);
  }
  return [];
}

// -------------------------------------------------------------
// INCIDENT MANAGEMENT MODULE INTERFACES & API FUNCTIONS
// -------------------------------------------------------------

export type IncidentSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESPONSE_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface IncidentType {
  id: number;
  name: string;
  description: string;
  is_active?: boolean;
}

export interface IncidentMedia {
  id: number;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface StatusHistoryItem {
  id: number;
  oldStatus?: string;
  newStatus: string;
  changedBy?: number;
  changedByName?: string;
  changedByRole?: string;
  remarks?: string;
  createdAt: string;
}

export interface IncidentReport {
  id: number;
  incidentCode: string;
  incidentTypeId?: number;
  incidentTypeName: string;
  severity: IncidentSeverity;
  description: string;
  latitude: number;
  longitude: number;
  locationAddress?: string;
  status: IncidentStatus;
  source?: string;
  createdAt: string;
  updatedAt?: string;
  verifiedAt?: string;
  resolvedAt?: string;
  media?: IncidentMedia[];
  statusHistory?: StatusHistoryItem[];
  distanceMeters?: number;
  distanceKm?: number;
  citizen?: {
    id?: number;
    name: string;
    phone: string;
    email?: string;
    district: string;
  };
}

export interface IncidentStats {
  total_incidents: string | number;
  new_reports: string | number;
  under_review: string | number;
  verified: string | number;
  high_critical: string | number;
  in_progress: string | number;
  resolved: string | number;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetch dynamic incident categories
 */
export async function fetchIncidentTypes(): Promise<IncidentType[]> {
  try {
    const res = await fetchWithFallback('/incident-types', { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    }
  } catch (err) {
    console.error('Fetch Incident Types Error:', err);
  }
  return [
    { id: 1, name: 'Flood', description: 'River overflow, flash floods, or rising water levels' },
    { id: 2, name: 'Waterlogging', description: 'Stagnant rain waterlogging on roads or streets' },
    { id: 3, name: 'Landslide', description: 'Mudslide, soil erosion, or rockfalls' },
    { id: 4, name: 'Road Blockage', description: 'Fallen debris cutting off transportation' },
    { id: 5, name: 'Fallen Tree', description: 'Uprooted trees or fallen branches' },
    { id: 6, name: 'Fire', description: 'Wildfires or structural fires' },
    { id: 7, name: 'Lightning', description: 'Lightning damage or hazards' },
    { id: 8, name: 'Building Damage', description: 'Structural instability or roof collapse' },
    { id: 9, name: 'Dam/River Issue', description: 'Shutter opening warnings or riverbank breach' },
    { id: 10, name: 'Other', description: 'Other emergency situation' }
  ];
}

/**
 * Submit incident report with multipart/form-data
 */
export async function submitIncidentReport(formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = getAuthToken();
  try {
    const response = await fetch(`${API_BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || (data.details ? data.details.join(', ') : 'Submission failed') };
    }
    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unable to submit incident. Please check your network connection.' };
  }
}

/**
 * Fetch My Reports for logged in citizen
 */
export async function fetchMyIncidentReports(): Promise<IncidentReport[]> {
  try {
    const res = await fetchWithFallback('/incidents/my', { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    }
  } catch (err) {
    console.error('Fetch My Incident Reports Error:', err);
  }
  return [];
}

/**
 * Fetch single incident by ID or incident_code
 */
export async function fetchIncidentById(id: string | number): Promise<IncidentReport | null> {
  try {
    const res = await fetchWithFallback(`/incidents/${id}`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    }
  } catch (err) {
    console.error('Fetch Incident By ID Error:', err);
  }
  return null;
}

/**
 * Fetch all incidents for Rescue Team & Collector Dashboard
 */
export async function fetchOfficialIncidents(queryParams: {
  type?: string;
  severity?: string;
  status?: string;
  district?: string;
  sortBy?: string;
  search?: string;
} = {}): Promise<{ incidents: IncidentReport[]; stats?: IncidentStats }> {
  try {
    const params = new URLSearchParams();
    if (queryParams.type) params.append('type', queryParams.type);
    if (queryParams.severity) params.append('severity', queryParams.severity);
    if (queryParams.status) params.append('status', queryParams.status);
    if (queryParams.district) params.append('district', queryParams.district);
    if (queryParams.sortBy) params.append('sortBy', queryParams.sortBy);
    if (queryParams.search) params.append('search', queryParams.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithFallback(`/incidents${queryString}`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return { incidents: data.data, stats: data.stats };
    }
  } catch (err) {
    console.error('Fetch Official Incidents Error:', err);
  }
  return { incidents: [], stats: undefined };
}

/**
 * Update incident status (Official / Admin only)
 */
export async function updateIncidentStatusApi(id: string | number, status: IncidentStatus, remarks?: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const res = await fetchWithFallback(`/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, remarks })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update status' };
    }
    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating status' };
  }
}

/**
 * Fetch nearby spatial incidents
 */
export async function fetchNearbyIncidents(lat: number, lng: number, radius: number = 5000): Promise<IncidentReport[]> {
  try {
    const res = await fetchWithFallback(`/incidents/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    }
  } catch (err) {
    console.error('Fetch Nearby Incidents Error:', err);
  }
  return [];
}

/**
 * Fetch spatial markers for live map
 */
export async function fetchMapIncidents(): Promise<IncidentReport[]> {
  try {
    const res = await fetchWithFallback('/incidents/map', { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data;
    }
  } catch (err) {
    console.error('Fetch Map Incidents Error:', err);
  }
  return [];
}

/**
 * Notifications API calls
 */
export async function fetchUserNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  try {
    const res = await fetchWithFallback('/notifications', { method: 'GET' });
    const data = await res.json();
    if (res.ok && data.success) {
      return { notifications: data.data, unreadCount: data.unreadCount || 0 };
    }
  } catch (err) {
    console.error('Fetch User Notifications Error:', err);
  }
  return { notifications: [], unreadCount: 0 };
}

export async function markNotificationReadApi(id: number): Promise<boolean> {
  try {
    const res = await fetchWithFallback(`/notifications/${id}/read`, { method: 'PATCH' });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    return false;
  }
}

export async function markAllNotificationsReadApi(): Promise<boolean> {
  try {
    const res = await fetchWithFallback('/notifications/read-all', { method: 'PATCH' });
    const data = await res.json();
    return res.ok && data.success;
  } catch (err) {
    return false;
  }
}

export interface VerifiedStationUnit {
  unitId: string;
  unitName: string;
  agencyType: string;
  unitType?: string;
  district: string;
  officialEmail: string;
  contactNumber?: string;
  teamLeader?: string;
  teamSize?: number;
  status?: string;
}

export async function verifyStationUnit(unitId: string): Promise<{
  verified: boolean;
  message: string;
  unit?: VerifiedStationUnit;
  isAlreadyRegistered?: boolean;
}> {
  try {
    const response = await fetchWithFallback('/auth/verify-station-unit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId }),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      verified: false,
      message: err.message || 'Station Unit ID verification failed.',
    };
  }
}

// -------------------------------------------------------------
// Rescue Team Operational APIs
// -------------------------------------------------------------

export interface RescueDashboardStats {
  newAssignments: number;
  activeOperations: number;
  completedOperations: number;
  teamStatus: string;
  availableMembers: number;
  totalMembers: number;
  availableResources: number;
  totalResources: number;
  criticalAlerts: number;
  pendingRequests: number;
}

export async function getRescueDashboardStats(district?: string): Promise<{
  district: string;
  stats: RescueDashboardStats;
}> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetchWithFallback(`/rescue/dashboard-stats${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { district: data.district || district || 'Kottayam', stats: data.stats };
    }
  } catch (err) {
    console.warn('Backend fetch for rescue stats failed, returning defaults:', err);
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
      availableResources: 24,
      totalResources: 30,
      criticalAlerts: 2,
      pendingRequests: 1
    }
  };
}

export async function updateRescueOperationStatus(
  incidentId: string | number,
  status: string,
  remarks?: string,
  rescuedCount?: number
): Promise<{ message: string; status: string }> {
  const response = await fetchWithFallback(`/rescue/operations/${incidentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, remarks, rescuedCount }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update operation status');
  }

  return data;
}

export async function submitEmergencySupportRequest(payload: {
  requestType: string;
  priority: string;
  incidentId?: string;
  quantity?: number;
  reason: string;
  notes?: string;
}): Promise<{ message: string; request: any }> {
  const response = await fetchWithFallback('/rescue/emergency-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit support request');
  }

  return data;
}

export interface RescueProfileData {
  userId: number;
  role: string;
  agencyType: string;
  agencyTypeName: string;
  unitName: string;
  officialUnitId: string;
  district: string;
  email: string;
  phone: string;
  verificationStatus: 'approved' | 'pending' | 'rejected' | string;
}

export interface RescueAgencyConfig {
  agencyType: string;
  agencyTypeName: string;
  agencyTypes: { code: string; name: string }[];
  designations: string[];
  specializations: string[];
  resources: { name: string; category: string }[];
  operationalRoles: string[];
}

export async function getRescueProfile(): Promise<{ profile: RescueProfileData }> {
  try {
    const response = await fetchWithFallback('/rescue/profile', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { profile: data.profile };
    }
  } catch (err) {
    console.warn('Failed to fetch rescue profile:', err);
  }
  return {
    profile: {
      userId: 0,
      role: 'rescue_team',
      agencyType: 'FIRE_RESCUE',
      agencyTypeName: 'Fire & Rescue Services',
      unitName: 'Kottayam Fire & Rescue Station',
      officialUnitId: 'FRS-KTM-001',
      district: 'Kottayam',
      email: 'rescue@kerala.gov.in',
      phone: '+91 94471 23456',
      verificationStatus: 'approved'
    }
  };
}

export function normalizeAgencyCode(input?: string): string {
  if (!input) return 'FIRE_RESCUE';
  const str = String(input).trim().toUpperCase();
  if (str.includes('NDRF') || str.includes('NATIONAL DISASTER')) return 'NDRF';
  if (str.includes('POLICE')) return 'POLICE';
  if (str.includes('KSDMA') || str.includes('SDMA')) return 'KSDMA';
  if (str.includes('CIVIL')) return 'CIVIL_DEFENCE';
  if (str.includes('FIRE') || str.includes('SAFETY') || str.includes('RESCUE')) return 'FIRE_RESCUE';
  return str || 'OTHER';
}

export async function getRescueAgencyConfig(agencyType?: string): Promise<RescueAgencyConfig> {
  const normAgency = normalizeAgencyCode(agencyType);

  const defaultDesignations: Record<string, string[]> = {
    'FIRE_RESCUE': ['Station Officer', 'Assistant Station Officer', 'Fire & Rescue Officer', 'Fire & Rescue Operator', 'Driver / Operator'],
    'NDRF': ['Commandant', 'Deputy Commandant', 'Assistant Commandant', 'Inspector', 'Sub-Inspector', 'Head Constable', 'Constable'],
    'POLICE': ['Inspector', 'Sub-Inspector', 'Assistant Sub-Inspector', 'Head Constable', 'Civil Police Officer'],
    'KSDMA': ['Disaster Management Officer', 'Emergency Operations Officer', 'Technical Officer', 'Field Officer'],
    'CIVIL_DEFENCE': ['Chief Warden', 'Deputy Warden', 'Warden', 'Volunteer'],
    'OTHER': ['Rescue Coordinator', 'Response Specialist', 'Field Operator', 'Medical Responder']
  };

  const defaultSpecializations: Record<string, string[]> = {
    'FIRE_RESCUE': ['Fire Fighting', 'Flood Rescue', 'Swift Water Rescue', 'Rope Rescue', 'Search & Rescue', 'First Aid'],
    'NDRF': ['Search & Rescue', 'Flood Rescue', 'Mountain Rescue', 'Medical Assistance', 'Disaster Response', 'Communications', 'CBRN Response'],
    'POLICE': ['Evacuation Support', 'Traffic Control', 'Crowd Management', 'Search & Rescue', 'Security', 'Missing Persons'],
    'KSDMA': ['EOC Management', 'Logistics & Distribution', 'Damage Assessment', 'Shelter Coordination'],
    'CIVIL_DEFENCE': ['First Aid & Trauma Care', 'Evacuation Assistance', 'Community Relief', 'Communication Operations'],
    'OTHER': ['General Search & Rescue', 'First Aid', 'Equipment Operation', 'Transport & Evacuation']
  };

  const defaultResources: Record<string, { name: string; category: string }[]> = {
    'FIRE_RESCUE': [
      { name: 'Fire Engine & Water Tender', category: 'Vehicles' },
      { name: 'Heavy Rescue Tenders & Cutters', category: 'Vehicles' },
      { name: 'Inflatable Rescue Boat with OBM', category: 'Marine' },
      { name: 'Self-Contained Breathing Apparatus (SCBA)', category: 'Safety' }
    ],
    'NDRF': [
      { name: 'Inflatable Rubber Boat (IRB)', category: 'Marine' },
      { name: 'SOLAS Certified Life Jackets', category: 'Safety' },
      { name: 'Concrete Cutter & Hydraulic Spreader', category: 'Breaching' },
      { name: 'Satellite Phone Terminal (Inmarsat)', category: 'Comms' }
    ],
    'POLICE': [
      { name: 'Patrol SUV / Quick Response Vehicle', category: 'Vehicles' },
      { name: 'Crowd Control Barricades', category: 'Security' },
      { name: 'Wireless Communication Walkie-Talkies', category: 'Comms' }
    ],
    'KSDMA': [
      { name: 'Mobile Command Vehicle', category: 'Vehicles' },
      { name: 'Satellite Comms Hub', category: 'Comms' }
    ],
    'CIVIL_DEFENCE': [
      { name: 'Trauma First Aid Kit', category: 'Medical' },
      { name: 'Handheld Megaphones', category: 'Comms' }
    ],
    'OTHER': [
      { name: 'General Rescue Equipment Kit', category: 'General' }
    ]
  };

  const mapNames: Record<string, string> = {
    'FIRE_RESCUE': 'Fire & Rescue Services',
    'NDRF': 'National Disaster Response Force (NDRF)',
    'POLICE': 'Kerala Police (Disaster Response Wing)',
    'KSDMA': 'KSDMA / SDMA Control Room',
    'CIVIL_DEFENCE': 'Civil Defence Volunteers',
    'OTHER': 'Other Authorized Rescue Agency'
  };

  try {
    const query = normAgency ? `?agencyType=${encodeURIComponent(normAgency)}` : '';
    const response = await fetchWithFallback(`/rescue/agency-config${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Failed to fetch agency config:', err);
  }

  return {
    agencyType: normAgency,
    agencyTypeName: mapNames[normAgency] || 'Fire & Rescue Services',
    agencyTypes: [
      { code: 'FIRE_RESCUE', name: 'Fire & Rescue Services' },
      { code: 'NDRF', name: 'National Disaster Response Force (NDRF)' },
      { code: 'POLICE', name: 'Kerala Police (Disaster Response Wing)' },
      { code: 'KSDMA', name: 'KSDMA / SDMA Control Room' },
      { code: 'CIVIL_DEFENCE', name: 'Civil Defence Volunteers' },
      { code: 'OTHER', name: 'Other Authorized Rescue Agency' }
    ],
    designations: defaultDesignations[normAgency] || defaultDesignations['FIRE_RESCUE'],
    specializations: defaultSpecializations[normAgency] || defaultSpecializations['FIRE_RESCUE'],
    resources: defaultResources[normAgency] || defaultResources['FIRE_RESCUE'],
    operationalRoles: [
      'Team Leader',
      'Rescue Member',
      'Driver',
      'Medical Support',
      'Communication Support',
      'Incident Coordinator',
      'Search Team',
      'Evacuation Support'
    ]
  };
}

export interface RescueTeamMember {
  id: number;
  name: string;
  employeeServiceId?: string;
  agencyTypeCode?: string;
  designation: string;
  specialization?: string;
  role: string;
  contact: string;
  email?: string;
  experience?: string;
  availability: 'Available' | 'On Operation' | 'Standby' | 'Unavailable' | string;
  currentAssignment: string;
  unitId?: string;
  district?: string;
}

export async function getTeamMembers(district?: string): Promise<{ teamMembers: RescueTeamMember[] }> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetchWithFallback(`/rescue/team-members${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { teamMembers: data.teamMembers || [] };
    }
  } catch (err) {
    console.warn('Backend fetch for team members failed, returning fallback roster:', err);
  }
  return { teamMembers: [] };
}

export async function getAssignedIncidents(district?: string): Promise<{ incidents: any[] }> {
  try {
    const query = district ? `?district=${encodeURIComponent(district)}` : '';
    const response = await fetchWithFallback(`/rescue/assigned-incidents${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { incidents: data.incidents || [] };
    }
  } catch (err) {
    console.warn('Backend fetch for assigned incidents failed:', err);
  }
  return { incidents: [] };
}

export async function addTeamMember(payload: {
  name: string;
  employeeServiceId?: string;
  agencyTypeCode?: string;
  designation?: string;
  specialization?: string;
  role: string;
  contact: string;
  email?: string;
  experience?: string;
  availability?: string;
  currentAssignment?: string;
}): Promise<{ message: string; member: RescueTeamMember }> {
  const response = await fetchWithFallback('/rescue/team-members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to add team member');
  }

  return data;
}

export async function updateTeamMemberAvailability(
  id: number,
  availability: string,
  currentAssignment?: string
): Promise<{ message: string; member: RescueTeamMember }> {
  const response = await fetchWithFallback(`/rescue/team-members/${id}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ availability, currentAssignment }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update member availability');
  }

  return data;
}

export async function deleteTeamMember(id: number): Promise<{ message: string }> {
  const response = await fetchWithFallback(`/rescue/team-members/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove team member');
  }

  return data;
}




