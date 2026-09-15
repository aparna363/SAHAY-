/**
 * SAHAY AI Disaster Copilot Client Service
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('sahay_token') || sessionStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface NearestShelter {
  id: number;
  name: string;
  distanceKm: number;
  district?: string;
  address?: string;
  capacity?: number;
  availableCapacity?: number;
  contactNumber?: string;
  latitude?: number;
  longitude?: number;
}

export interface NearestHospital {
  id: number;
  name: string;
  distanceKm: number;
  contactNumber?: string;
}

export interface RiskAssessmentData {
  score: number;
  level: 'Low' | 'Moderate' | 'High' | 'Critical';
  reasons: string[];
  recommendedAction: string;
}

export interface LocationContext {
  requestedDistrict?: string | null;
  requestedPlace?: string | null;
  requestedState?: string | null;
  locationSource: 'USER_REQUEST' | 'CURRENT_GPS' | 'NONE';
  locationConfidence?: 'EXACT' | 'DISTRICT' | 'CURRENT_GPS' | 'UNKNOWN';
  calculateDistance?: boolean;
}

export interface CorrectionDetail {
  original: string;
  corrected: string;
  confidence: number;
  type: 'SPELLING' | 'TYPO' | 'LOCATION' | 'DOMAIN_TERM' | 'NORMALIZATION' | 'PROTECTED_TERM';
}

export interface AIChatResponse {
  success: boolean;
  sessionId?: string;
  conversationId?: number;
  originalQuery?: string;
  correctedQuery?: string;
  corrections?: CorrectionDetail[];
  correctionConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  intent?: string;
  disasterType: string;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  requiresContext?: boolean;
  requiresSOS: boolean;
  locationContext?: LocationContext;
  requestedDistrict?: string | null;
  requestedPlace?: string | null;
  locationSource?: 'USER_REQUEST' | 'CURRENT_GPS' | 'NONE';
  locationConfidence?: 'EXACT' | 'DISTRICT' | 'CURRENT_GPS' | 'UNKNOWN';
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  riskAssessment?: RiskAssessmentData;
  nearestShelter?: NearestShelter | null;
  nearestHospital?: NearestHospital | null;
  showShelterButton: boolean;
  showSOSButton: boolean;
  showReliefButton: boolean;
  emergencyContacts?: Record<string, string>;
  language?: 'en' | 'ml';
  generatedAt?: string;
  error?: string;
}

/**
 * Send query to AI Copilot
 */
export async function sendCopilotMessage(params: {
  message: string;
  latitude?: number | null;
  longitude?: number | null;
  sessionId?: string;
  language?: 'en' | 'ml';
}): Promise<AIChatResponse> {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}: Failed to reach SAHAY AI`);
  }

  return response.json();
}

/**
 * Fetch PostGIS-computed Risk Assessment
 */
export async function fetchRiskAssessment(coords: { latitude: number; longitude: number }): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/ai/risk-assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(coords)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch risk assessment');
  }

  return response.json();
}

/**
 * Fetch nearest shelters via PostGIS
 */
export async function fetchNearbyShelters(coords: { lat: number; lng: number }): Promise<NearestShelter[]> {
  const response = await fetch(`${API_BASE_URL}/ai/nearby-shelters?lat=${coords.lat}&lng=${coords.lng}`, {
    headers: {
      ...getAuthHeader()
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch nearby shelters');
  }

  const data = await response.json();
  return data.shelters || [];
}

/**
 * Trigger AI-assisted SOS
 */
export async function dispatchCopilotSOS(payload: {
  latitude: number;
  longitude: number;
  disasterType?: string;
  severity?: string;
  description?: string;
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/ai/sos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to dispatch SOS');
  }

  return response.json();
}

/**
 * Fetch past AI conversations for logged in citizen
 */
export async function fetchAIConversations(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/conversations`, {
      headers: { ...getAuthHeader() }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.conversations || [];
  } catch {
    return [];
  }
}
