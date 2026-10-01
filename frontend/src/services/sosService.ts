import { getAuthToken } from './api';

const API_BASE_URL = 'http://localhost:5000/api';

export type SOSEmergencyType =
  | 'Flood'
  | 'Landslide'
  | 'Fire'
  | 'Medical Emergency'
  | 'Accident'
  | 'Other';

export type SOSStatus =
  | 'Pending'
  | 'Acknowledged'
  | 'Team Assigned'
  | 'Rescue In Progress'
  | 'Resolved'
  | 'Cancelled';

export interface SOSRequest {
  id: number;
  sos_code: string;
  user_id: number | null;
  emergency_type: SOSEmergencyType;
  description: string | null;
  affected_people: number;
  latitude: number;
  longitude: number;
  address: string | null;
  district: string;
  taluk: string | null;
  photo_url: string | null;
  status: SOSStatus;
  assigned_team_id: number | null;
  assigned_team_name: string | null;
  assigned_team_phone: string | null;
  assigned_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface SOSTimelineItem {
  id: number;
  sos_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number | null;
  changed_by_name?: string;
  changed_by_role?: string;
  remarks: string | null;
  created_at: string;
}

export interface NearbyRescueTeam {
  id: number;
  unitId: string;
  unitName: string;
  unitType: string;
  district: string;
  contactNumber: string;
  status: string;
  distanceKm: number;
  teamLeader: string;
  teamSize: number;
  currentWorkload: number;
  priorityScore: number;
}

export interface NearbyHospital {
  id: number;
  name: string;
  district: string;
  address: string;
  contactNumber: string;
  emergencyAvailable: boolean;
  traumaCareLevel: string;
  availableBeds: number;
  distanceKm: number;
}

export interface NearbyShelter {
  id: number;
  name: string;
  district: string;
  address: string;
  contactNumber: string;
  availableCapacity: number;
  distanceKm: number;
}

export interface SOSNearbyResources {
  nearbyTeams: NearbyRescueTeam[];
  nearbyHospitals: NearbyHospital[];
  nearbyShelters: NearbyShelter[];
}

export interface CreateSOSPayload {
  emergencyType: SOSEmergencyType;
  description?: string;
  affectedPeople: number;
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  taluk?: string;
  photo?: File | null;
  reporterName?: string;
  reporterPhone?: string;
}

export interface CollectorSOSMetrics {
  totalActive: number;
  pending: number;
  teamAssigned: number;
  inProgress: number;
  resolved: number;
  cancelled: number;
  totalAffectedActive: number;
}

/**
 * Helper to build auth headers
 */
function getHeaders(isFormData = false): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * 1. Create a new SOS Request
 */
export async function createSOS(
  payload: CreateSOSPayload
): Promise<{ success: boolean; sos: SOSRequest; nearbyResources: SOSNearbyResources; error?: string; code?: string; existingSOS?: SOSRequest }> {
  const formData = new FormData();
  formData.append('emergencyType', payload.emergencyType);
  if (payload.description) formData.append('description', payload.description);
  formData.append('affectedPeople', String(payload.affectedPeople || 1));
  formData.append('latitude', String(payload.latitude));
  formData.append('longitude', String(payload.longitude));
  if (payload.address) formData.append('address', payload.address);
  if (payload.district) formData.append('district', payload.district);
  if (payload.taluk) formData.append('taluk', payload.taluk);
  if (payload.reporterName) formData.append('reporterName', payload.reporterName);
  if (payload.reporterPhone) formData.append('reporterPhone', payload.reporterPhone);
  if (payload.photo) formData.append('photo', payload.photo);

  const res = await fetch(`${API_BASE_URL}/sos`, {
    method: 'POST',
    headers: getHeaders(true),
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.error || 'Failed to dispatch SOS');
    error.code = data.code;
    error.existingSOS = data.existingSOS;
    throw error;
  }
  return data;
}

/**
 * 2. Get active citizen SOS
 */
export async function fetchActiveCitizenSOS(): Promise<{
  activeSOS: SOSRequest | null;
  nearbyResources: SOSNearbyResources | null;
}> {
  const res = await fetch(`${API_BASE_URL}/sos/active-my`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    return { activeSOS: null, nearbyResources: null };
  }
  const data = await res.json();
  return {
    activeSOS: data.activeSOS || null,
    nearbyResources: data.nearbyResources || null
  };
}

/**
 * 3. Get citizen SOS history
 */
export async function fetchCitizenSOSHistory(): Promise<SOSRequest[]> {
  const res = await fetch(`${API_BASE_URL}/sos/my-history`, {
    headers: getHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}

/**
 * 4. Get SOS Details by ID or Code
 */
export async function fetchSOSDetails(idOrCode: string | number): Promise<{
  sos: SOSRequest;
  timeline: SOSTimelineItem[];
  nearbyResources: SOSNearbyResources;
} | null> {
  const res = await fetch(`${API_BASE_URL}/sos/${idOrCode}`, {
    headers: getHeaders()
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

/**
 * 5. Cancel active SOS (Citizen)
 */
export async function cancelSOS(
  idOrCode: string | number,
  reason: string
): Promise<SOSRequest> {
  const res = await fetch(`${API_BASE_URL}/sos/${idOrCode}/cancel`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cancel SOS');
  return data.sos;
}

/**
 * 6. Get Rescue Feed SOS
 */
export async function fetchRescueFeedSOS(district?: string): Promise<SOSRequest[]> {
  const url = district
    ? `${API_BASE_URL}/sos/rescue-feed?district=${encodeURIComponent(district)}`
    : `${API_BASE_URL}/sos/rescue-feed`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.feed || [];
}

/**
 * 7. Accept SOS (Rescue Team)
 */
export async function acceptSOS(idOrCode: string | number): Promise<SOSRequest> {
  const res = await fetch(`${API_BASE_URL}/sos/${idOrCode}/accept`, {
    method: 'PATCH',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept SOS');
  return data.sos;
}

/**
 * 8. Update SOS Status (Rescue Team / Authority)
 */
export async function updateSOSStatus(
  idOrCode: string | number,
  status: SOSStatus,
  resolutionNotes?: string
): Promise<SOSRequest> {
  const res = await fetch(`${API_BASE_URL}/sos/${idOrCode}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status, resolutionNotes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update SOS status');
  return data.sos;
}

/**
 * 9. Assign Rescue Team (Collector / Authority)
 */
export async function assignRescueTeam(
  idOrCode: string | number,
  payload: { teamId?: number; teamName: string; teamPhone?: string; remarks?: string }
): Promise<SOSRequest> {
  const res = await fetch(`${API_BASE_URL}/sos/${idOrCode}/assign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to assign rescue team');
  return data.sos;
}

/**
 * 10. Get Collector SOS Data & Metrics
 */
export async function fetchCollectorSOS(
  district?: string,
  filters?: { emergencyType?: string; taluk?: string; status?: string; dateFrom?: string; dateTo?: string }
): Promise<{ metrics: CollectorSOSMetrics; requests: SOSRequest[] }> {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (filters?.emergencyType) params.append('emergencyType', filters.emergencyType);
  if (filters?.taluk) params.append('taluk', filters.taluk);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const res = await fetch(`${API_BASE_URL}/sos/collector?${params.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    return {
      metrics: { totalActive: 0, pending: 0, teamAssigned: 0, inProgress: 0, resolved: 0, cancelled: 0, totalAffectedActive: 0 },
      requests: []
    };
  }
  const data = await res.json();
  return {
    metrics: data.metrics,
    requests: data.requests || []
  };
}

/**
 * 11. Fetch Map SOS Markers
 */
export async function fetchMapSOSMarkers(
  district?: string,
  includeResolved = false
): Promise<SOSRequest[]> {
  const params = new URLSearchParams();
  if (district && district !== 'All Kerala') params.append('district', district);
  if (includeResolved) params.append('includeResolved', 'true');

  const res = await fetch(`${API_BASE_URL}/sos/map-markers?${params.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.markers || [];
}

/**
 * Helper to perform reverse geocoding via OpenStreetMap Nominatim
 */
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number
): Promise<{ address: string; district: string; taluk: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'SAHAY-Disaster-Management-Kerala/1.0' } }
    );
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();
    const addr = data.address || {};
    const district = addr.state_district || addr.county || addr.district || '';
    const taluk = addr.subdistrict || addr.county || addr.town || addr.village || '';
    const address = data.display_name || `${taluk}, ${district}`;
    return {
      address,
      district: district.replace(/district/i, '').trim(),
      taluk: taluk.replace(/taluk/i, '').trim()
    };
  } catch (err) {
    return {
      address: `GPS Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
      district: '',
      taluk: ''
    };
  }
}
