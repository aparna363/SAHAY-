-- ============================================================
-- SAHAY: SOS Emergency Response System Database Schema
-- PostgreSQL + PostGIS Extension
-- ============================================================

-- Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. SOS Requests Table
CREATE TABLE IF NOT EXISTS sos_requests (
    id SERIAL PRIMARY KEY,
    sos_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    emergency_type VARCHAR(100) NOT NULL CHECK (
        emergency_type IN ('Flood', 'Landslide', 'Fire', 'Medical Emergency', 'Accident', 'Other')
    ),
    description TEXT,
    affected_people INTEGER NOT NULL DEFAULT 1 CHECK (affected_people > 0),
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    location GEOMETRY(Point, 4326),
    address TEXT,
    district VARCHAR(100) NOT NULL,
    taluk VARCHAR(100),
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
        status IN ('Pending', 'Acknowledged', 'Team Assigned', 'Rescue In Progress', 'Resolved', 'Cancelled')
    ),
    assigned_team_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_team_name VARCHAR(255),
    assigned_team_phone VARCHAR(30),
    assigned_at TIMESTAMP,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_sos_requests_district ON sos_requests(LOWER(district));
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_sos_requests_user_id ON sos_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_created_at ON sos_requests(created_at DESC);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE INDEX IF NOT EXISTS idx_sos_requests_geom ON sos_requests USING GIST(location);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. SOS Status History Audit Trail
CREATE TABLE IF NOT EXISTS sos_status_history (
    id SERIAL PRIMARY KEY,
    sos_id INTEGER NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sos_status_history_sos_id ON sos_status_history(sos_id);
