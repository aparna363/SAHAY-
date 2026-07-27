// SAHAY Frontend API Service
// Connects React Frontend to Node.js / Express Backend + PostgreSQL Database

const API_BASE_URL = 'http://localhost:5000/api/auth';
const API_FALLBACK_URL = 'http://127.0.0.1:5000/api/auth';

export type UserRole = 'citizen' | 'rescue_team' | 'collector';

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
  phoneOrEmail: string;
  newPassword: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    role: UserRole;
    district: string;
    panchayat?: string;
    designation?: string;
    departmentId?: string;
  };
  token: string;
}

// Helper fetch with automatic fallback (localhost vs 127.0.0.1)
async function fetchWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return res;
  } catch (err) {
    // If localhost failed, attempt 127.0.0.1 IPv4 fallback
    try {
      const fallbackRes = await fetch(`${API_FALLBACK_URL}${endpoint}`, options);
      return fallbackRes;
    } catch (fallbackErr) {
      throw new Error('Unable to connect to SAHAY backend server. Please verify backend server is running on http://localhost:5000');
    }
  }
}

// 1. Register User in PostgreSQL DB
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/register', {
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
    localStorage.setItem('sahay_token', data.token);
    localStorage.setItem('sahay_user', JSON.stringify(data.user));
  }

  return data;
}

// 2. Login User from PostgreSQL DB
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetchWithFallback('/login', {
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
    localStorage.setItem('sahay_token', data.token);
    localStorage.setItem('sahay_user', JSON.stringify(data.user));
  }

  return data;
}

// 3. Reset Password in PostgreSQL DB
export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  const response = await fetchWithFallback('/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Password reset failed');
  }

  return data;
}
