-- ============================================================
-- SAHAY: Intelligent Live Disaster & Safe Evacuation Map Schema
-- PostgreSQL + PostGIS Spatial Schema & Telemetry Seeds
-- ============================================================

-- Ensure PostGIS is active
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Road Hazards & Road Conditions Table
CREATE TABLE IF NOT EXISTS road_hazards (
  id SERIAL PRIMARY KEY,
  road_name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'SAFE' CHECK (status IN ('SAFE', 'CAUTION', 'HAZARDOUS', 'BLOCKED')),
  hazard_type VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL DEFAULT 'MODERATE' CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  start_lat NUMERIC(10, 6) NOT NULL,
  start_lng NUMERIC(10, 6) NOT NULL,
  end_lat NUMERIC(10, 6) NOT NULL,
  end_lng NUMERIC(10, 6) NOT NULL,
  geometry GEOMETRY(LineString, 4326),
  reported_by VARCHAR(100) DEFAULT 'KSDMA Traffic Cell',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_hazards_district ON road_hazards(district);
CREATE INDEX IF NOT EXISTS idx_road_hazards_status ON road_hazards(status);
CREATE INDEX IF NOT EXISTS idx_road_hazards_geom ON road_hazards USING GIST(geometry);

-- 2. IoT Sensors Telemetry Table
CREATE TABLE IF NOT EXISTS iot_sensors (
  id SERIAL PRIMARY KEY,
  sensor_code VARCHAR(50) UNIQUE NOT NULL,
  sensor_name VARCHAR(255) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL CHECK (sensor_type IN ('WATER_LEVEL', 'RAINFALL', 'LANDSLIDE', 'TEMPERATURE', 'WIND')),
  district VARCHAR(100) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  location GEOMETRY(Point, 4326),
  current_value NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  threshold_warning NUMERIC(10, 2) NOT NULL,
  threshold_critical NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE')),
  battery_pct INTEGER DEFAULT 98,
  last_telemetry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iot_sensors_district ON iot_sensors(district);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_type ON iot_sensors(sensor_type);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_status ON iot_sensors(status);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_loc ON iot_sensors USING GIST(location);

-- 3. Enhance Hazard Zones Table if exists or create
CREATE TABLE IF NOT EXISTS hazard_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hazard_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  description TEXT,
  source VARCHAR(100) DEFAULT 'KSDMA / CWC',
  active BOOLEAN DEFAULT TRUE,
  geometry GEOMETRY(Geometry, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hazard_zones_geom ON hazard_zones USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_hazard_zones_active ON hazard_zones(active);

-- Seed realistic active Hazard Zones across Kerala if only 1 exists
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM hazard_zones) <= 1 THEN
    -- Wayanad Meppadi-Chooralmala Landslide & Flash Flood Zone
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Meppadi-Chooralmala High Vulnerability Landslide Zone',
      'LANDSLIDE',
      'CRITICAL',
      'Active debris flow and severe soil saturation warning along hill slopes. Evacuation advised.',
      'Geological Survey of India / KSDMA',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[76.115,11.535],[76.145,11.535],[76.155,11.565],[76.120,11.570],[76.115,11.535]]]}')
    );

    -- Idukki Munnar Gap Road Mudslide Zone
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Munnar Gap Road Mudslide & Rockfall Hazard Area',
      'LANDSLIDE',
      'HIGH',
      'Steep embankment rockfall alert due to persistent heavy rainfall.',
      'Idukki DDMA',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[77.050,10.065],[77.085,10.065],[77.090,10.095],[77.045,10.090],[77.050,10.065]]]}')
    );

    -- Ernakulam Aluva Periyar River Flood Inundation Basin
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Aluva Periyar Lowland Inundation Belt',
      'FLOOD',
      'HIGH',
      'Periyar river overflow risk due to dam shutter regulation. Lowland settlements on alert.',
      'Central Water Commission',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[76.335,10.090],[76.375,10.090],[76.380,10.125],[76.330,10.120],[76.335,10.090]]]}')
    );

    -- Pathanamthitta Ranni Pamba River Catchment Surge
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Ranni Pamba River Flood & Inundation Sector',
      'FLOOD',
      'CRITICAL',
      'Pamba river level exceeding danger mark by 1.1m. Evacuation camps activated.',
      'Pathanamthitta DEOC',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[76.760,9.365],[76.810,9.365],[76.815,9.400],[76.755,9.395],[76.760,9.365]]]}')
    );

    -- Alappuzha Kuttanad Waterlogging Zone
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Kuttanad Below-Sea-Level Waterlogging Zone',
      'HEAVY_RAIN',
      'WARNING',
      'Extensive waterlogging across paddy lands and roads due to high tide and heavy runoff.',
      'Alappuzha DDMA',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[76.380,9.410],[76.450,9.410],[76.460,9.470],[76.375,9.465],[76.380,9.410]]]}')
    );

    -- Kottayam Meenachil River Flood Zone
    INSERT INTO hazard_zones (name, hazard_type, severity, description, source, active, geometry)
    VALUES (
      'Meenachil River Basin Flash Flood Sector',
      'FLOOD',
      'HIGH',
      'Meenachil river water level nearing warning mark around Pala and Erattupetta.',
      'Kottayam DDMA',
      TRUE,
      ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[76.660,9.680],[76.720,9.680],[76.725,9.725],[76.650,9.720],[76.660,9.680]]]}')
    );
  END IF;
END $$;

-- 4. Seed Road Hazards / Conditions
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM road_hazards) = 0 THEN
    -- Wayanad Meppadi blocked road
    INSERT INTO road_hazards (road_name, district, status, hazard_type, description, severity, start_lat, start_lng, end_lat, end_lng, geometry, reported_by)
    VALUES
    (
      'SH-59 Meppadi - Chooralmala Road',
      'Wayanad',
      'BLOCKED',
      'Landslide Debris',
      'Massive mudslide blocking road near 9th hairpin curve. Completely impassable for vehicles.',
      'CRITICAL',
      11.5510, 76.1260, 11.5620, 76.1380,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.1260, 11.5510), ST_MakePoint(76.1380, 11.5620)), 4326),
      'Wayanad District Police'
    ),
    (
      'Kalpetta - Mananthavady Highway (NH-766 Bypass)',
      'Wayanad',
      'CAUTION',
      'Waterlogging',
      'Minor water accumulation on left shoulder near Pookode junction. Slow-moving traffic.',
      'LOW',
      11.5420, 76.0240, 11.5510, 76.0350,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.0240, 11.5420), ST_MakePoint(76.0350, 11.5510)), 4326),
      'Motor Vehicles Department'
    ),
    (
      'Meppadi Town Bypass Connecting Route',
      'Wayanad',
      'SAFE',
      'Clear Route',
      'Fully inspected by Fire & Rescue team. Safe alternate corridor to St. Joseph Camp.',
      'LOW',
      11.5540, 76.1150, 11.5590, 76.1280,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.1150, 11.5540), ST_MakePoint(76.1280, 11.5590)), 4326),
      'KSDMA Rapid Team'
    ),
    (
      'NH-85 Kochi - Dhanushkodi Road (Gap Road Stretch)',
      'Idukki',
      'BLOCKED',
      'Rockfall & Landslide',
      'Boulders and mud on roadway. Traffic diverted through Nedumkandam.',
      'CRITICAL',
      10.0720, 77.0710, 10.0810, 77.0850,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(77.0710, 10.0720), ST_MakePoint(77.0850, 10.0810)), 4326),
      'National Highways Authority'
    ),
    (
      'Aluva - Kalady Road near Marthanda Varma Bridge',
      'Ernakulam',
      'HAZARDOUS',
      'Periyar Overflow',
      'Water overtopping road by 0.4 meters. Heavy vehicles permitted, small cars diverted.',
      'HIGH',
      10.1060, 76.3520, 10.1140, 76.3630,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.3520, 10.1060), ST_MakePoint(76.3630, 10.1140)), 4326),
      'Ernakulam City Police'
    ),
    (
      'Kozhencherry - Ranni State Highway',
      'Pathanamthitta',
      'BLOCKED',
      'Flooding & Uprooted Trees',
      'Submerged under 1.2m of river water. Rescue boat services operational.',
      'CRITICAL',
      9.3550, 76.7450, 9.3720, 76.7620,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.7450, 9.3550), ST_MakePoint(76.7620, 9.3720)), 4326),
      'Fire & Safety Ranni Unit'
    ),
    (
      'AC Road (Alappuzha - Changanassery Road)',
      'Alappuzha',
      'HAZARDOUS',
      'Waterlogged Stretches',
      'Water on roadway at Mankombu and Pallathuruthy. Caution advised during high tide.',
      'MODERATE',
      9.4750, 76.4100, 9.4880, 76.4420,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.4100, 9.4750), ST_MakePoint(76.4420, 9.4880)), 4326),
      'PWD Roads Division'
    ),
    (
      'Pala - Erattupetta Road',
      'Kottayam',
      'CAUTION',
      'Fallen Electrical Poles',
      'Single lane traffic operating. KSEB restoration underway.',
      'MODERATE',
      9.7020, 76.6850, 9.7110, 76.7020,
      ST_SetSRID(ST_MakeLine(ST_MakePoint(76.6850, 9.7020), ST_MakePoint(76.7020, 9.7110)), 4326),
      'Kottayam Traffic Cell'
    );
  END IF;
END $$;

-- 5. Seed IoT Sensors across Kerala
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM iot_sensors) = 0 THEN
    INSERT INTO iot_sensors (sensor_code, sensor_name, sensor_type, district, location_name, latitude, longitude, location, current_value, unit, threshold_warning, threshold_critical, status, battery_pct)
    VALUES
    (
      'IOT-WL-WYD-01',
      'Meppadi Chaliyar River Basin Hydro-Sensor',
      'WATER_LEVEL',
      'Wayanad',
      'Meppadi Stream Gauge Station',
      11.5525, 76.1250,
      ST_SetSRID(ST_MakePoint(76.1250, 11.5525), 4326),
      4.85, 'm', 3.50, 4.50,
      'CRITICAL', 92
    ),
    (
      'IOT-LS-WYD-02',
      'Vellarimala Incline & Soil Shear Extensometer',
      'LANDSLIDE',
      'Wayanad',
      'Vellarimala Hill Slope Ridge',
      11.5410, 76.1380,
      ST_SetSRID(ST_MakePoint(76.1380, 11.5410), 4326),
      14.2, 'tilt_deg', 8.0, 12.0,
      'CRITICAL', 88
    ),
    (
      'IOT-RF-WYD-03',
      'Kalpetta Automated Meteorological Rain Gauge',
      'RAINFALL',
      'Wayanad',
      'Civil Station Kalpetta',
      11.6090, 76.0825,
      ST_SetSRID(ST_MakePoint(76.0825, 11.6090), 4326),
      68.4, 'mm/h', 45.0, 60.0,
      'CRITICAL', 97
    ),
    (
      'IOT-WL-EKM-01',
      'Aluva Periyar Barrage Acoustic Water Sensor',
      'WATER_LEVEL',
      'Ernakulam',
      'Aluva Manappuram Ghat',
      10.1080, 76.3560,
      ST_SetSRID(ST_MakePoint(76.3560, 10.1080), 4326),
      3.42, 'm', 2.80, 3.80,
      'WARNING', 94
    ),
    (
      'IOT-WD-EKM-02',
      'Kochi Marine Drive Coastal Anemometer',
      'WIND',
      'Ernakulam',
      'Marine Drive Coast Guard Berth',
      9.9820, 76.2750,
      ST_SetSRID(ST_MakePoint(76.2750, 9.9820), 4326),
      48.5, 'km/h', 40.0, 65.0,
      'WARNING', 99
    ),
    (
      'IOT-WL-PTA-01',
      'Ranni Bridge Pamba Ultrasonic Level Gauge',
      'WATER_LEVEL',
      'Pathanamthitta',
      'Ranni Old Bridge Pamba',
      9.3810, 76.7820,
      ST_SetSRID(ST_MakePoint(76.7820, 9.3810), 4326),
      6.12, 'm', 4.50, 5.50,
      'CRITICAL', 91
    ),
    (
      'IOT-RF-IDK-01',
      'Munnar High Plateau Rain Sensor',
      'RAINFALL',
      'Idukki',
      'Devikulam Hill Station',
      10.0620, 77.1020,
      ST_SetSRID(ST_MakePoint(77.1020, 10.0620), 4326),
      52.0, 'mm/h', 40.0, 55.0,
      'WARNING', 95
    ),
    (
      'IOT-TP-TVM-01',
      'Thiruvananthapuram Weather Node',
      'TEMPERATURE',
      'Thiruvananthapuram',
      'Palayam Observatory',
      8.5020, 76.9530,
      ST_SetSRID(ST_MakePoint(76.9530, 8.5020), 4326),
      29.5, '°C', 36.0, 40.0,
      'NORMAL', 100
    ),
    (
      'IOT-WL-KTM-01',
      'Pala Meenachil River Telemetered Gauge',
      'WATER_LEVEL',
      'Kottayam',
      'Pala Municipal Bypass Bridge',
      9.7120, 76.6820,
      ST_SetSRID(ST_MakePoint(76.6820, 9.7120), 4326),
      2.90, 'm', 2.50, 3.50,
      'WARNING', 96
    );
  END IF;
END $$;
