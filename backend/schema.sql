-- 0. Enable PostGIS Spatial Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table (Profile Information)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'approved',
  district VARCHAR(100) NOT NULL,
  panchayat VARCHAR(100),
  designation VARCHAR(100),
  department_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Separate Login Table (Authentication Credentials)
CREATE TABLE IF NOT EXISTS login (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'approved',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_login_phone ON login(phone);
CREATE INDEX IF NOT EXISTS idx_login_email ON login(email);
CREATE INDEX IF NOT EXISTS idx_login_user_id ON login(user_id);

-- 3. Incident Types Table
CREATE TABLE IF NOT EXISTS incident_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Main Production Incidents Table with PostGIS Spatial Geometry
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_code VARCHAR(50) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_type_id INTEGER REFERENCES incident_types(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  location GEOMETRY(Point, 4326),
  location_address TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESPONSE_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  source VARCHAR(50) DEFAULT 'CITIZEN_APP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Spatial GIST Index for PostGIS spatial queries (nearby incidents, maps)
CREATE INDEX IF NOT EXISTS incidents_location_idx ON incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- 5. Incident Media Attachments Table
CREATE TABLE IF NOT EXISTS incident_media (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Incident Status Progression & Official Audit History
CREATE TABLE IF NOT EXISTS incident_status_history (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50) DEFAULT 'INCIDENT',
  reference_id VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Weather History Table
CREATE TABLE IF NOT EXISTS weather_history (
  id SERIAL PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT 'Kerala',
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  temperature NUMERIC(5, 2),
  humidity NUMERIC(5, 2),
  wind_speed NUMERIC(5, 2),
  rain_probability NUMERIC(5, 2),
  condition VARCHAR(100),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Disaster Alerts Table
CREATE TABLE IF NOT EXISTS disaster_alerts (
  id SERIAL PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  description TEXT,
  source VARCHAR(100) DEFAULT 'IMD / KSDMA',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP
);

-- 10. Shelters Table
CREATE TABLE IF NOT EXISTS shelters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  capacity INTEGER DEFAULT 100,
  available_capacity INTEGER DEFAULT 100,
  contact_number VARCHAR(20)
);

-- 11. Volunteers Table
CREATE TABLE IF NOT EXISTS volunteers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  district VARCHAR(100) NOT NULL,
  availability VARCHAR(50) DEFAULT 'available',
  skills TEXT
);

-- 12. Rescue Units Table (Official Station / Emergency Response Directory)
CREATE TABLE IF NOT EXISTS rescue_units (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(30) UNIQUE NOT NULL,
    unit_name VARCHAR(150) NOT NULL,
    unit_type VARCHAR(30) NOT NULL
        CHECK (unit_type IN ('Fire & Safety', 'Police', 'NDRF', 'KSDMA')),
    district VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive', 'Busy', 'Offline')),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    team_leader VARCHAR(100),
    team_size INTEGER DEFAULT 0,
    current_location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 13. Rescue Team Members Table (Roster & Availability)
CREATE TABLE IF NOT EXISTS rescue_team_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    unit_id VARCHAR(100),
    district VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    employee_service_id VARCHAR(100),
    agency_type_code VARCHAR(50),
    designation VARCHAR(150),
    specialization VARCHAR(150),
    role VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    experience VARCHAR(50),
    availability VARCHAR(50) DEFAULT 'Available',
    current_assignment VARCHAR(255) DEFAULT 'Base Station',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Agency Types Table
CREATE TABLE IF NOT EXISTS agency_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Agency Designations Table
CREATE TABLE IF NOT EXISTS agency_designations (
    id SERIAL PRIMARY KEY,
    agency_type_code VARCHAR(50) NOT NULL,
    designation_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Agency Specializations Table
CREATE TABLE IF NOT EXISTS agency_specializations (
    id SERIAL PRIMARY KEY,
    agency_type_code VARCHAR(50) NOT NULL,
    specialization_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Agency Resources Table
CREATE TABLE IF NOT EXISTS agency_resources (
    id SERIAL PRIMARY KEY,
    agency_type_code VARCHAR(50) NOT NULL,
    resource_name VARCHAR(200) NOT NULL,
    resource_category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Operational Roles Table
CREATE TABLE IF NOT EXISTS operational_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
