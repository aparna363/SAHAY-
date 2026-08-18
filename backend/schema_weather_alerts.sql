-- Weather Alert Sources (Official Gov API / Secondary fallback)
CREATE TABLE IF NOT EXISTS weather_alert_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region VARCHAR(100) DEFAULT 'Kerala',
  api_endpoint TEXT NOT NULL,
  api_key VARCHAR(255),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('OFFICIAL', 'SECONDARY')),
  priority INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Severity Mappings (Source Raw Category -> 4 Alert Levels)
CREATE TABLE IF NOT EXISTS weather_severity_mappings (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES weather_alert_sources(id) ON DELETE CASCADE,
  source_category VARCHAR(100) NOT NULL,
  mapped_level VARCHAR(20) NOT NULL CHECK (mapped_level IN ('GREEN', 'YELLOW', 'ORANGE', 'RED')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, source_category)
);

-- Mapping Audit Logs (Safety Critical Change Audit)
CREATE TABLE IF NOT EXISTS weather_mapping_audit_logs (
  id SERIAL PRIMARY KEY,
  mapping_id INTEGER,
  changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Official Weather Alerts Store
CREATE TABLE IF NOT EXISTS official_weather_alerts (
  id SERIAL PRIMARY KEY,
  alert_id VARCHAR(255) NOT NULL,
  source_id INTEGER REFERENCES weather_alert_sources(id) ON DELETE SET NULL,
  source_name VARCHAR(100) NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'OFFICIAL',
  district VARCHAR(100) NOT NULL,
  hazard_type VARCHAR(100) NOT NULL,
  raw_severity VARCHAR(100) NOT NULL,
  mapped_severity VARCHAR(20) NOT NULL CHECK (mapped_severity IN ('GREEN', 'YELLOW', 'ORANGE', 'RED')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  safety_instructions TEXT,
  affected_zones TEXT[],
  source_reference_url TEXT,
  raw_payload JSONB,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- District Collector Manual Local Advisories (Additive to official alerts)
CREATE TABLE IF NOT EXISTS district_manual_advisories (
  id SERIAL PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  issued_by_name VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  instruction TEXT NOT NULL,
  severity_tag VARCHAR(50) DEFAULT 'ADVISORY',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- System Fetch & Health Audit Logs
CREATE TABLE IF NOT EXISTS weather_alert_fetch_logs (
  id SERIAL PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  source_id INTEGER REFERENCES weather_alert_sources(id) ON DELETE SET NULL,
  source_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'FALLBACK')),
  http_code INTEGER,
  error_message TEXT,
  raw_response JSONB,
  mapped_level VARCHAR(20),
  alerts_count INTEGER DEFAULT 0,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Alert Zone Cache (Last successfully fetched status per zone)
CREATE TABLE IF NOT EXISTS weather_alert_zone_cache (
  id SERIAL PRIMARY KEY,
  district VARCHAR(100) UNIQUE NOT NULL,
  highest_severity VARCHAR(20) NOT NULL CHECK (highest_severity IN ('GREEN', 'YELLOW', 'ORANGE', 'RED')),
  active_alerts JSONB DEFAULT '[]'::jsonb,
  active_advisories JSONB DEFAULT '[]'::jsonb,
  last_successful_fetch TIMESTAMP NOT NULL,
  fetch_status VARCHAR(20) DEFAULT 'HEALTHY' CHECK (fetch_status IN ('HEALTHY', 'STALE', 'UNVERIFIED')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Default Official & Secondary Sources if table is empty
INSERT INTO weather_alert_sources (name, region, api_endpoint, api_key, source_type, priority, is_active)
SELECT 'India Meteorological Department (IMD) Feed', 'Kerala', 'https://ksdma.kerala.gov.in/alerts-feed/rss', '', 'OFFICIAL', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM weather_alert_sources WHERE name = 'India Meteorological Department (IMD) Feed');

INSERT INTO weather_alert_sources (name, region, api_endpoint, api_key, source_type, priority, is_active)
SELECT 'OpenWeatherMap One Call API 3.0 Alerts (Secondary Fallback)', 'Global', 'https://api.openweathermap.org/data/3.0/onecall', '', 'SECONDARY', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM weather_alert_sources WHERE name = 'OpenWeatherMap One Call API 3.0 Alerts (Secondary Fallback)');

-- Seed Default Severity Mappings for Official IMD / Standard Weather Feeds
INSERT INTO weather_severity_mappings (source_id, source_category, mapped_level, description)
SELECT s.id, m.cat, m.lvl, m.desc
FROM weather_alert_sources s
CROSS JOIN (VALUES
  ('Red Warning', 'RED', 'Severe/Extreme meteorological threat requiring immediate action'),
  ('Extreme', 'RED', 'Extreme danger weather warning'),
  ('Severe', 'RED', 'Severe emergency weather warning'),
  ('Orange Warning', 'ORANGE', 'Moderate to high weather warning requiring high alert'),
  ('Moderate', 'ORANGE', 'Moderate weather warning requiring vigilance'),
  ('Yellow Advisory', 'YELLOW', 'Advisory / minor weather warning requiring updates'),
  ('Minor', 'YELLOW', 'Minor weather advisory'),
  ('Advisory', 'YELLOW', 'General weather advisory'),
  ('Green', 'GREEN', 'No alert / normal conditions'),
  ('Nil', 'GREEN', 'No warning in force'),
  ('None', 'GREEN', 'No active warning')
) AS m(cat, lvl, desc)
WHERE NOT EXISTS (SELECT 1 FROM weather_severity_mappings WHERE source_id = s.id AND source_category = m.cat);
