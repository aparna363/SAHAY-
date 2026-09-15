import { getAuthToken } from './api';

const API_BASE_URL = 'http://localhost:5000/api';
const API_FALLBACK_URL = 'http://127.0.0.1:5000/api';

async function fetchMapEndpoint(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const primaryUrl = `${API_BASE_URL}${endpoint}`;
    return await fetch(primaryUrl, { ...options, headers });
  } catch (primaryErr) {
    console.warn(`[mapService] Primary API failed, trying fallback:`, primaryErr);
    const fallbackUrl = `${API_FALLBACK_URL}${endpoint}`;
    return await fetch(fallbackUrl, { ...options, headers });
  }
}

export type IncidentSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'RESPONSE_ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export type RescueTeamStatus = 'AVAILABLE' | 'ON_DUTY' | 'EN_ROUTE' | 'AT_SCENE' | 'OFFLINE';

export interface MapIncident {
  id: number;
  incidentCode: string;
  incidentTypeName: string;
  severity: IncidentSeverity;
  description: string;
  latitude: number;
  longitude: number;
  geojson?: any;
  locationAddress?: string;
  status: IncidentStatus;
  createdAt: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
  reporter?: {
    name?: string;
    phone?: string;
    district?: string;
  };
  assignment?: {
    assignedTeam?: string;
    assignedAt?: string;
  } | null;
  updatedAt?: string;
}

export interface MapShelter {
  id: number;
  name: string;
  district: string;
  address?: string;
  latitude: number;
  longitude: number;
  capacity: number;
  availableCapacity: number;
  contactNumber?: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
  status?: string;
}

export interface MapHospital {
  id: number;
  name: string;
  district: string;
  address?: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  emergencyAvailable: boolean;
  bedCapacity: number;
  availableBeds: number;
  traumaCareLevel?: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
}

export interface MapRescueTeam {
  id: number;
  unitId: string;
  unitName: string;
  unitType: string;
  district: string;
  contactNumber?: string;
  email?: string;
  status: RescueTeamStatus;
  latitude: number;
  longitude: number;
  teamLeader?: string;
  teamSize?: number;
  currentLocation?: string;
  assignedIncidentId?: string | null;
  lastLocationUpdate?: string;
  minutesSinceUpdate?: number;
  isStale?: boolean;
  distanceMeters?: number | null;
  distanceKm?: number | null;
}

export interface MapHazardZone {
  id: number;
  name: string;
  hazardType: string;
  severity: string;
  description?: string;
  source?: string;
  active: boolean;
  geojson?: any;
  createdAt?: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
}

export interface MapSummaryStats {
  activeIncidents: number;
  highCriticalIncidents: number;
  openShelters: number;
  availableShelterBeds: number;
  totalHospitals: number;
  availableHospitalBeds: number;
  availableTeams: number;
  onDutyTeams: number;
  totalRescueTeams: number;
  activeAlerts: number;
}

export interface MapWeatherAlert {
  id: number;
  district: string;
  alert_level: string;
  alert_type: string;
  description?: string;
  source?: string;
  start_time?: string;
  end_time?: string;
}

export interface NearbySafetyResponse {
  success: boolean;
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  incidents: MapIncident[];
  shelters: MapShelter[];
  hospitals: MapHospital[];
  alerts: MapWeatherAlert[];
  nearestShelter: MapShelter | null;
  nearestHospital: MapHospital | null;
}

export interface NearestResourcesResponse {
  success: boolean;
  incident: {
    id: number;
    incidentCode: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    latitude: number;
    longitude: number;
    locationAddress?: string;
  };
  nearestRescueTeam: MapRescueTeam | null;
  nearestTeams: MapRescueTeam[];
  nearestShelter: MapShelter | null;
  nearestShelters: MapShelter[];
  nearestHospital: MapHospital | null;
  nearestHospitals: MapHospital[];
  nearestHazardZones: MapHazardZone[];
}

/**
 * Fetch role-filtered incidents for map visualization
 */
export async function fetchRoleMapIncidents(params?: {
  district?: string;
  severity?: string;
  status?: string;
  type?: string;
  timeRange?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}): Promise<MapIncident[]> {
  try {
    const query = new URLSearchParams();
    if (params?.district) query.set('district', params.district);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.timeRange) query.set('timeRange', params.timeRange);
    if (params?.lat != null) query.set('lat', String(params.lat));
    if (params?.lng != null) query.set('lng', String(params.lng));
    if (params?.radius != null) query.set('radius', String(params.radius));

    const res = await fetchMapEndpoint(`/map/incidents?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.incidents || [];
    }
  } catch (err) {
    console.error('fetchRoleMapIncidents error:', err);
  }
  return [];
}

/**
 * Calculate PostGIS nearest resources for a specific incident
 */
export async function fetchNearestResources(incidentId: number | string): Promise<NearestResourcesResponse | null> {
  try {
    const res = await fetchMapEndpoint(`/map/incidents/${incidentId}/nearest-resources`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('fetchNearestResources error:', err);
  }
  return null;
}

/**
 * Dispatch an operational rescue unit to an incident
 */
export async function dispatchIncidentTeam(
  incidentId: number | string,
  payload: { rescueTeamId?: number | string; unitId?: string; remarks?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetchMapEndpoint(`/map/incidents/${incidentId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('dispatchIncidentTeam error:', err);
    return { success: false, error: err.message || 'Dispatch network error' };
  }
}

/**
 * Fetch PostGIS hazard zones (polygons)
 */
export async function fetchMapHazardZones(): Promise<MapHazardZone[]> {
  try {
    const res = await fetchMapEndpoint('/map/hazard-zones');
    if (res.ok) {
      const data = await res.json();
      return data.zones || [];
    }
  } catch (err) {
    console.error('fetchMapHazardZones error:', err);
  }
  return [];
}

/**
 * Citizen Safety Map - Nearby PostGIS spatial query
 */
export async function fetchNearbySafetyResources(lat: number, lng: number, radius: number = 25000): Promise<NearbySafetyResponse | null> {
  try {
    const res = await fetchMapEndpoint(`/map/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('fetchNearbySafetyResources error:', err);
  }
  return null;
}

/**
 * Fetch relief shelters
 */
export async function fetchMapShelters(district?: string, lat?: number, lng?: number): Promise<MapShelter[]> {
  try {
    const query = new URLSearchParams();
    if (district) query.set('district', district);
    if (lat != null) query.set('lat', String(lat));
    if (lng != null) query.set('lng', String(lng));

    const res = await fetchMapEndpoint(`/map/shelters?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.shelters || [];
    }
  } catch (err) {
    console.error('fetchMapShelters error:', err);
  }
  return [];
}

/**
 * Fetch hospitals
 */
export async function fetchMapHospitals(district?: string, lat?: number, lng?: number): Promise<MapHospital[]> {
  try {
    const query = new URLSearchParams();
    if (district) query.set('district', district);
    if (lat != null) query.set('lat', String(lat));
    if (lng != null) query.set('lng', String(lng));

    const res = await fetchMapEndpoint(`/map/hospitals?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.hospitals || [];
    }
  } catch (err) {
    console.error('fetchMapHospitals error:', err);
  }
  return [];
}

/**
 * Fetch live rescue teams telemetry (Authorized personnel only)
 */
export async function fetchMapRescueTeams(district?: string): Promise<MapRescueTeam[]> {
  try {
    const query = new URLSearchParams();
    if (district) query.set('district', district);

    const res = await fetchMapEndpoint(`/map/rescue-teams?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.teams || [];
    }
  } catch (err) {
    console.error('fetchMapRescueTeams error:', err);
  }
  return [];
}

/**
 * Update rescue team GPS coordinates
 */
export async function updateRescueTeamGps(payload: {
  unitId?: string;
  latitude: number;
  longitude: number;
  currentLocation?: string;
  status?: string;
}): Promise<boolean> {
  try {
    const res = await fetchMapEndpoint('/map/rescue-teams/location', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('updateRescueTeamGps error:', err);
    return false;
  }
}

/**
 * Fetch role summary metrics
 */
export async function fetchMapSummaryStats(district?: string): Promise<MapSummaryStats> {
  const fallback: MapSummaryStats = {
    activeIncidents: 0,
    highCriticalIncidents: 0,
    openShelters: 0,
    availableShelterBeds: 0,
    totalHospitals: 0,
    availableHospitalBeds: 0,
    availableTeams: 0,
    onDutyTeams: 0,
    totalRescueTeams: 0,
    activeAlerts: 0
  };

  try {
    const query = new URLSearchParams();
    if (district) query.set('district', district);

    const res = await fetchMapEndpoint(`/map/summary?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.stats || fallback;
    }
  } catch (err) {
    console.error('fetchMapSummaryStats error:', err);
  }
  return fallback;
}

/**
 * Fetch weather warnings
 */
export async function fetchMapWeatherAlerts(district?: string): Promise<MapWeatherAlert[]> {
  try {
    const query = new URLSearchParams();
    if (district) query.set('district', district);

    const res = await fetchMapEndpoint(`/map/weather-alerts?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.alerts || [];
    }
  } catch (err) {
    console.error('fetchMapWeatherAlerts error:', err);
  }
  return [];
}

// =============================================================
// NEW: Road Hazards, IoT Sensors, Safe Routing & Safety Status
// =============================================================

export interface MapRoadHazard {
  id: number;
  roadName: string;
  district: string;
  status: 'SAFE' | 'CAUTION' | 'HAZARDOUS' | 'BLOCKED';
  hazardType: string;
  description?: string;
  severity: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  geojson?: any;
  reportedBy?: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
  createdAt?: string;
}

export interface MapIoTSensor {
  id: number;
  sensorCode: string;
  sensorName: string;
  sensorType: 'WATER_LEVEL' | 'RAINFALL' | 'LANDSLIDE' | 'TEMPERATURE' | 'WIND';
  district: string;
  locationName: string;
  latitude: number;
  longitude: number;
  currentValue: number;
  unit: string;
  thresholdWarning: number;
  thresholdCritical: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  batteryPct?: number;
  lastTelemetryAt?: string;
  distanceMeters?: number | null;
  distanceKm?: number | null;
}

export interface RouteRiskBreakdown {
  floodRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  roadRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  incidentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  weatherRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface NormalRouteData {
  id?: string;
  name?: string;
  coordinates: [number, number][];
  distanceKm: number;
  distanceMeters: number;
  travelTimeMinutes: number;
  durationSeconds?: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  isBlocked: boolean;
  hazards: string[];
  warnings: string[];
  riskBreakdown: RouteRiskBreakdown;
  steps: Array<{ instruction: string; distance: number; duration: number }>;
}

export interface SafeRouteData {
  coordinates: [number, number][];
  distanceKm: number;
  distanceMeters: number;
  travelTimeMinutes: number;
  travelTimeSeconds?: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore?: number;
  riskBreakdown?: RouteRiskBreakdown;
  isRerouted: boolean;
  avoidedHazardsCount: number;
  safetyExplanation: string[];
  steps: Array<{ instruction: string; distance: number; duration: number }>;
  hazards?: string[];
  isBlocked?: boolean;
  calculatedAt?: string;
}

export interface RouteComparisonData {
  extraDistanceKm: number;
  extraTimeMinutes: number;
  riskReduction: string;
  normalRiskLevel: string;
  safeRiskLevel: string;
  normalRiskScore?: number;
  safeRiskScore?: number;
  isDetourNeeded: boolean;
  reasons: string[];
  avoidedHazards: string[];
  normalRouteAvoidedReasons?: string[];
}

export interface SafeRouteResponse {
  success: boolean;
  route?: SafeRouteData;
  safeRoute?: SafeRouteData;
  normalRoute?: NormalRouteData;
  comparison?: RouteComparisonData;
  noSafeRouteAvailable?: boolean;
  activeSimulation?: string | null;
  candidateCount?: number;
  error?: string;
}

export interface SimulationScenarioItem {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface EvacuateMeResponse {
  success: boolean;
  citizenLocation: { latitude: number; longitude: number };
  totalViableShelters: number;
  recommendedShelter: any;
  rankedShelters: any[];
  explanation: {
    title: string;
    distance: string;
    riskLevel: string;
    availableCapacity: number;
    reasons: string[];
  } | null;
}

export interface SafetyStatusResponse {
  success: boolean;
  safetyStatus: 'SAFE' | 'WARNING' | 'EMERGENCY';
  statusMessage: string;
  statusColor: 'GREEN' | 'YELLOW' | 'RED';
  emergencyAlert: {
    title: string;
    description: string;
    hazardType?: string;
    severity?: string;
    distanceKm?: string;
  } | null;
  metrics: {
    activeDisastersNearby: number;
    activeIncidentsNearby: number;
    blockedRoadsNearby: number;
    openSheltersNearby: number;
    rescueTeamsNearby: number;
    nearestShelter: (MapShelter & { distanceKm?: number }) | null;
  };
}

/**
 * Fetch road hazards & road safety condition layer
 */
export async function fetchRoadHazards(params?: {
  district?: string;
  status?: string;
  lat?: number;
  lng?: number;
}): Promise<MapRoadHazard[]> {
  try {
    const query = new URLSearchParams();
    if (params?.district) query.set('district', params.district);
    if (params?.status) query.set('status', params.status);
    if (params?.lat != null) query.set('lat', String(params.lat));
    if (params?.lng != null) query.set('lng', String(params.lng));

    const res = await fetchMapEndpoint(`/map/road-hazards?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.roads || [];
    }
  } catch (err) {
    console.error('fetchRoadHazards error:', err);
  }
  return [];
}

/**
 * Fetch environmental IoT sensors telemetry
 */
export async function fetchIoTSensors(params?: {
  district?: string;
  type?: string;
  status?: string;
  lat?: number;
  lng?: number;
}): Promise<MapIoTSensor[]> {
  try {
    const query = new URLSearchParams();
    if (params?.district) query.set('district', params.district);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.lat != null) query.set('lat', String(params.lat));
    if (params?.lng != null) query.set('lng', String(params.lng));

    const res = await fetchMapEndpoint(`/map/iot-sensors?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.sensors || [];
    }
  } catch (err) {
    console.error('fetchIoTSensors error:', err);
  }
  return [];
}

/**
 * Compute intelligent safe route & normal route comparison avoiding disaster zones and blocked roads
 */
export async function requestSafeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  options?: { simulationScenario?: string; district?: string }
): Promise<SafeRouteResponse> {
  try {
    const res = await fetchMapEndpoint('/map/safe-route', {
      method: 'POST',
      body: JSON.stringify({
        origin,
        destination,
        simulationScenario: options?.simulationScenario,
        district: options?.district
      })
    });
    return await res.json();
  } catch (err: any) {
    console.error('requestSafeRoute error:', err);
    return { success: false, error: err.message || 'Routing network failure' };
  }
}

/**
 * Fetch list of developer disaster simulation scenarios
 */
export async function fetchSimulationScenarios(): Promise<{
  success: boolean;
  activeScenario: string | null;
  scenarios: SimulationScenarioItem[];
}> {
  try {
    const res = await fetchMapEndpoint('/map/simulation/scenarios');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[mapService] fetchSimulationScenarios failed:', err);
  }
  return { success: false, activeScenario: null, scenarios: [] };
}

/**
 * Activate a developer disaster simulation scenario
 */
export async function setSimulationScenario(scenarioId: string | null): Promise<any> {
  try {
    const endpoint = scenarioId ? '/map/simulation/scenario' : '/map/simulation/reset';
    const res = await fetchMapEndpoint(endpoint, {
      method: 'POST',
      body: JSON.stringify({ scenarioId })
    });
    return await res.json();
  } catch (err) {
    console.error('[mapService] setSimulationScenario failed:', err);
    return { success: false };
  }
}

/**
 * Inject a real-time hazard event for testing route invalidation
 */
export async function injectRealtimeHazard(district: string = 'Thrissur'): Promise<any> {
  try {
    const res = await fetchMapEndpoint('/map/simulation/inject-realtime-hazard', {
      method: 'POST',
      body: JSON.stringify({ district })
    });
    return await res.json();
  } catch (err) {
    console.error('[mapService] injectRealtimeHazard failed:', err);
    return { success: false };
  }
}

/**
 * Request intelligent evacuation center ranking for citizen
 */
export async function requestEvacuateMe(
  citizenLocation: { lat: number; lng: number },
  district?: string
): Promise<EvacuateMeResponse | null> {
  try {
    const res = await fetchMapEndpoint('/map/evacuate-me', {
      method: 'POST',
      body: JSON.stringify({ citizenLocation, district })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('requestEvacuateMe error:', err);
  }
  return null;
}

/**
 * Fetch dynamic citizen safety status badge & summary counts
 */
export async function fetchCitizenSafetyStatus(
  lat: number,
  lng: number,
  district?: string
): Promise<SafetyStatusResponse | null> {
  try {
    const query = new URLSearchParams();
    query.set('lat', String(lat));
    query.set('lng', String(lng));
    if (district) query.set('district', district);

    const res = await fetchMapEndpoint(`/map/safety-status?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('fetchCitizenSafetyStatus error:', err);
  }
  return null;
}

