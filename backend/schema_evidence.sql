-- SAHAY Rescue Team Evidence Collection Schema
CREATE TABLE IF NOT EXISTS rescue_evidence (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  incident_code VARCHAR(50),
  rescue_unit_id VARCHAR(50),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name VARCHAR(255),
  evidence_type VARCHAR(50) DEFAULT 'PHOTO', -- PHOTO, VIDEO, REPORT
  file_url TEXT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  description TEXT,
  people_rescued INTEGER DEFAULT 0,
  people_injured INTEGER DEFAULT 0,
  people_missing INTEGER DEFAULT 0,
  people_evacuated INTEGER DEFAULT 0,
  medical_assistance_needed BOOLEAN DEFAULT FALSE,
  flood_depth VARCHAR(50),
  road_condition VARCHAR(50),
  building_damage VARCHAR(50),
  infrastructure_damage VARCHAR(50),
  other_observations TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOMETRY(Point, 4326),
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rescue_evidence_incident_id ON rescue_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_rescue_evidence_unit_id ON rescue_evidence(rescue_unit_id);
