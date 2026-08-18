const { Pool } = require('pg');
require('dotenv').config();

// Supported DB password fallbacks
const passwordsToTry = [
  process.env.PGPASSWORD,
  'aparna',
  'postgres',
  'root',
  'admin',
  '1234'
].filter((p, idx, arr) => p !== undefined && arr.indexOf(p) === idx);

let pool = null;

function createPool(pass) {
  return new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'sahay_db',
    password: pass,
    port: parseInt(process.env.PGPORT || '5432', 10),
  });
}

// Initial pool
pool = createPool(process.env.PGPASSWORD || 'aparna');

// Auto-initialize DB schema (Users table + Separate Login table)
const initDb = async () => {
  for (const pass of passwordsToTry) {
    const testPool = createPool(pass);
    try {
      const client = await testPool.connect();

      // 1. Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(255),
          password_hash VARCHAR(255),
          role VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'approved',
          district VARCHAR(100) NOT NULL,
          panchayat VARCHAR(100),
          designation VARCHAR(100),
          department_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';`);
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);

      // 2. Create separate login table with separate phone & email columns
      await client.query(`
        CREATE TABLE IF NOT EXISTS login (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          phone VARCHAR(20),
          email VARCHAR(255),
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'approved',
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`ALTER TABLE login ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
      await client.query(`ALTER TABLE login ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
      await client.query(`ALTER TABLE login ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';`);
      await client.query(`ALTER TABLE login DROP CONSTRAINT IF EXISTS login_role_check;`);

      // Ensure user_id constraint
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'login_user_id_key'
          ) THEN
            ALTER TABLE login ADD CONSTRAINT login_user_id_key UNIQUE (user_id);
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore if constraint exists or duplicate rows temporarily present
        END $$;
      `);

      // 3. Create weather_history table
      await client.query(`
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
      `);

      // 4. Create disaster_alerts table
      await client.query(`
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
      `);

      // 5. Create incident_reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS incident_reports (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          disaster_type VARCHAR(100) NOT NULL,
          description TEXT,
          latitude NUMERIC(10, 6),
          longitude NUMERIC(10, 6),
          image_url TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 6. Create shelters table
      await client.query(`
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
      `);

      // 7. Create volunteers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS volunteers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          district VARCHAR(100) NOT NULL,
          availability VARCHAR(50) DEFAULT 'available',
          skills TEXT
        );
      `);

      // --- INCIDENT REPORT MODULE SCHEMAS & POSTGIS FALLBACK SAFE ---
      let hasPostGIS = false;
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
        hasPostGIS = true;
        console.log(`🌍 PostGIS Extension Enabled`);
      } catch (gisErr) {
        console.log(`ℹ️ PostGIS Note: Extension not present in local PostgreSQL (${gisErr.message}). Using native coordinates & Haversine spatial queries.`);
      }

      // Incident Types
      await client.query(`
        CREATE TABLE IF NOT EXISTS incident_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed Default Incident Types if empty
      const typesCheck = await client.query(`SELECT COUNT(*) FROM incident_types;`);
      if (parseInt(typesCheck.rows[0].count, 10) === 0) {
        const defaultTypes = [
          ['Flood', 'River overflow, flash floods, or rising water levels in residential areas'],
          ['Waterlogging', 'Stagnant rain waterlogging on roads, streets, or farmland'],
          ['Landslide', 'Mudslide, soil erosion, or rockfalls blocking access or damaging buildings'],
          ['Road Blockage', 'Fallen debris, debris flow, or destroyed roads cutting off transportation'],
          ['Fallen Tree', 'Uprooted trees or fallen branches blocking roads or power lines'],
          ['Fire', 'Wildfires, structural fires, or electrical line hazards during emergency'],
          ['Lightning', 'Lightning damage to structures, transformers, or individuals'],
          ['Building Damage', 'Structural instability, roof collapse, or wall damage from disaster'],
          ['Dam/River Issue', 'Shutter opening warnings, riverbank breach, or high current risks'],
          ['Other', 'Other unclassified disaster or emergency situation requiring assistance']
        ];
        for (const [name, desc] of defaultTypes) {
          await client.query(
            `INSERT INTO incident_types (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING;`,
            [name, desc]
          );
        }
        console.log(`📋 Seeded ${defaultTypes.length} default Incident Types`);
      }

      // Base Incidents Table (Always works with NUMERIC lat/lng)
      await client.query(`
        CREATE TABLE IF NOT EXISTS incidents (
          id SERIAL PRIMARY KEY,
          incident_code VARCHAR(50) NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          incident_type_id INTEGER REFERENCES incident_types(id) ON DELETE SET NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
          description TEXT NOT NULL,
          latitude NUMERIC(10, 6) NOT NULL,
          longitude NUMERIC(10, 6) NOT NULL,
          location_address TEXT,
          status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESPONSE_ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
          source VARCHAR(50) DEFAULT 'CITIZEN_APP',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP,
          resolved_at TIMESTAMP
        );
      `);

      // If PostGIS extension is active, add geometry column & spatial index
      if (hasPostGIS) {
        try {
          await client.query(`ALTER TABLE incidents ADD COLUMN IF NOT EXISTS location GEOMETRY(Point, 4326);`);
          await client.query(`CREATE INDEX IF NOT EXISTS incidents_location_idx ON incidents USING GIST(location);`);
        } catch (postgisErr) {
          console.log(`ℹ️ PostGIS Geometry Note: ${postgisErr.message}`);
        }
      }

      // Clean up legacy generic location strings in existing database records
      try {
        await client.query(`
          UPDATE incidents 
          SET location_address = CONCAT('Location (', ROUND(latitude::numeric, 4), '°, ', ROUND(longitude::numeric, 4), '°)')
          WHERE location_address IS NULL 
             OR location_address = 'Browser Live GPS Position' 
             OR location_address LIKE 'Browser Live GPS Position%' 
             OR location_address LIKE 'Selected on Map%';
        `);
      } catch (cleanErr) {
        // Ignore table missing warning on first boot
      }

      // Incident Media
      await client.query(`
        CREATE TABLE IF NOT EXISTS incident_media (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          file_path VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Incident Status History
      await client.query(`
        CREATE TABLE IF NOT EXISTS incident_status_history (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
          old_status VARCHAR(30),
          new_status VARCHAR(30) NOT NULL,
          changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Notifications Table
      await client.query(`
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
      `);

      // 8. Authorized Officers Table (Development / Verification Directory)
      await client.query(`
        CREATE TABLE IF NOT EXISTS authorized_officers (
          id SERIAL PRIMARY KEY,
          officer_id VARCHAR(100) NOT NULL UNIQUE,
          full_name VARCHAR(255) NOT NULL,
          designation VARCHAR(100) NOT NULL,
          department VARCHAR(100) NOT NULL,
          district VARCHAR(100) NOT NULL,
          official_email VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 8b. Authorized Stations Table (Station Unit Verification Directory)
      await client.query(`
        CREATE TABLE IF NOT EXISTS authorized_stations (
          id SERIAL PRIMARY KEY,
          unit_id VARCHAR(100) NOT NULL UNIQUE,
          unit_name VARCHAR(255) NOT NULL,
          agency_type VARCHAR(100) NOT NULL,
          district VARCHAR(100) NOT NULL,
          official_email VARCHAR(255) NOT NULL,
          contact_number VARCHAR(50),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 9. Audit Logs Table (Platform Security & Audit Trail)
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id VARCHAR(100),
          district VARCHAR(100),
          details JSONB,
          ip_address VARCHAR(50),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 10. Family Members Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS family_members (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          relation VARCHAR(100) NOT NULL,
          age INTEGER,
          gender VARCHAR(50),
          phone VARCHAR(20),
          blood_group VARCHAR(10),
          medical_needs VARCHAR(255),
          is_emergency_contact BOOLEAN DEFAULT FALSE,
          status VARCHAR(50) DEFAULT 'Safe',
          location VARCHAR(255) DEFAULT 'Home',
          govt_id VARCHAR(50),
          notes TEXT,
          last_checkin TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);
      `);


      // Database-level protection: Enforce maximum 1 active Collector per district
      try {
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_one_collector_per_district
          ON users (LOWER(district))
          WHERE role = 'collector' AND (status IS NULL OR status != 'revoked');
        `);
      } catch (idxErr) {
        console.log(`ℹ️ Unique index note: ${idxErr.message}`);
      }

      // Seed Demo Authorized Officers for Kerala's 14 Districts if empty
      const officerCheck = await client.query(`SELECT COUNT(*) FROM authorized_officers;`);
      if (parseInt(officerCheck.rows[0].count, 10) === 0) {
        const demoOfficers = [
          ['KL-DEMO-ALP-001', 'Alex Varghese IAS', 'District Collector & Magistrate', 'Revenue Department', 'Alappuzha', 'collector.alappuzha@kerala.gov.in'],
          ['KL-DEMO-EKM-001', 'NSK Umesh IAS', 'District Collector & Magistrate', 'Revenue Department', 'Ernakulam', 'collector.ernakulam@kerala.gov.in'],
          ['KL-DEMO-IDK-001', 'V. Vigneshwari IAS', 'District Collector & Magistrate', 'Revenue Department', 'Idukki', 'collector.idukki@kerala.gov.in'],
          ['KL-DEMO-KNR-001', 'Arun K Vijayan IAS', 'District Collector & Magistrate', 'Revenue Department', 'Kannur', 'collector.kannur@kerala.gov.in'],
          ['KL-DEMO-KSD-001', 'K. Inbasekar IAS', 'District Collector & Magistrate', 'Revenue Department', 'Kasaragod', 'collector.kasaragod@kerala.gov.in'],
          ['KL-DEMO-KLM-001', 'Devidas N IAS', 'District Collector & Magistrate', 'Revenue Department', 'Kollam', 'collector.kollam@kerala.gov.in'],
          ['KL-DEMO-KTM-001', 'John V Samuel IAS', 'District Collector & Magistrate', 'Revenue Department', 'Kottayam', 'collector.kottayam@kerala.gov.in'],
          ['KL-DEMO-KKD-001', 'Snehil Kumar Singh IAS', 'District Collector & Magistrate', 'Revenue Department', 'Kozhikode', 'collector.kozhikode@kerala.gov.in'],
          ['KL-DEMO-MLP-001', 'Vinod VR IAS', 'District Collector & Magistrate', 'Revenue Department', 'Malappuram', 'collector.malappuram@kerala.gov.in'],
          ['KL-DEMO-PKD-001', 'Dr. S. Chithra IAS', 'District Collector & Magistrate', 'Revenue Department', 'Palakkad', 'collector.palakkad@kerala.gov.in'],
          ['KL-DEMO-PTA-001', 'A. Shibu IAS', 'District Collector & Magistrate', 'Revenue Department', 'Pathanamthitta', 'collector.pathanamthitta@kerala.gov.in'],
          ['KL-DEMO-TVM-001', 'Geromic George IAS', 'District Collector & Magistrate', 'Revenue Department', 'Thiruvananthapuram', 'collector.tvm@kerala.gov.in'],
          ['KL-DEMO-TCR-001', 'Arjun Pandian IAS', 'District Collector & Magistrate', 'Revenue Department', 'Thrissur', 'collector.thrissur@kerala.gov.in'],
          ['KL-DEMO-WYD-001', 'D.R. Meghashree IAS', 'District Collector & Magistrate', 'Revenue Department', 'Wayanad', 'collector.wayanad@kerala.gov.in']
        ];

        for (const [id, name, desig, dept, dist, email] of demoOfficers) {
          await client.query(`
            INSERT INTO authorized_officers (officer_id, full_name, designation, department, district, official_email)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (officer_id) DO NOTHING;
          `, [id, name, desig, dept, dist, email]);
        }
        console.log(`📋 Seeded 14 Demo Authorized Officers for Kerala Districts`);
      }

      // 8c. Rescue Units Table (Official Rescue Unit Directory as requested)
      await client.query(`
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
      `);

      // Seed Demo Rescue Units for Unit ID Verification if empty
      const rescueUnitCheck = await client.query(`SELECT COUNT(*) FROM rescue_units;`);
      if (parseInt(rescueUnitCheck.rows[0].count, 10) === 0) {
        const demoRescueUnits = [
          ['arr.frs', 'Adoor Fire & Safety Station', 'Fire & Safety', 'Pathanamthitta', '04734-222101', 'arr.frs@kerala.gov.in', 'Active', 9.1554, 76.7335, 'Officer Rajesh Kumar', 15, 'Adoor Town Center'],
          ['idk.frs', 'Munnar Fire & Safety Unit', 'Fire & Safety', 'Idukki', '04865-230201', 'munnar.frs@kerala.gov.in', 'Active', 10.0889, 77.0595, 'Inspector Suresh Nair', 12, 'Munnar Hill Station'],
          ['ekm.ndrf', 'Ernakulam 10th NDRF Battalion', 'NDRF', 'Ernakulam', '0484-2422001', 'ndrf.ernakulam@ndrf.gov.in', 'Active', 9.9816, 76.2999, 'Commandant A.K. Sharma', 45, 'Kalamassery Base'],
          ['tvm.pol', 'Thiruvananthapuram Central Police Unit', 'Police', 'Thiruvananthapuram', '0471-2338100', 'controlroom.tvm@keralapolice.gov.in', 'Active', 8.5241, 76.9366, 'ACP Thomas Philip', 30, 'Trivandrum City'],
          ['wyd.frs', 'Kalpetta Fire & Safety Station', 'Fire & Safety', 'Wayanad', '04936-202201', 'kalpetta.frs@kerala.gov.in', 'Active', 11.6103, 76.0827, 'Station Officer M. Roy', 18, 'Kalpetta Town'],
          ['kkd.ksdma', 'Kozhikode District Emergency Cell', 'KSDMA', 'Kozhikode', '0495-2371000', 'deoc.kozhikode@kerala.gov.in', 'Active', 11.2588, 75.7804, 'Nodal Officer Anjali Menon', 20, 'Kozhikode Civil Station'],
          ['pta.frs', 'Pathanamthitta Central Fire & Safety', 'Fire & Safety', 'Pathanamthitta', '0468-2222301', 'pta.frs@kerala.gov.in', 'Active', 9.2648, 76.7870, 'Officer V. George', 16, 'Pathanamthitta HQ'],
          ['tcr.frs', 'Thrissur Main Fire & Safety Unit', 'Fire & Safety', 'Thrissur', '0487-2423101', 'thrissur.frs@kerala.gov.in', 'Active', 10.5276, 76.2144, 'Station Commander K. Das', 22, 'Thrissur Round'],
          ['pkd.pol', 'Palakkad Disaster Response Police Unit', 'Police', 'Palakkad', '0491-2534000', 'policeresponse.pkd@keralapolice.gov.in', 'Active', 10.7867, 76.6548, 'DYSP Radhakrishnan', 25, 'Palakkad Fort'],
          ['ksd.frs', 'Kasaragod Central Fire & Safety', 'Fire & Safety', 'Kasaragod', '04994-220101', 'kasaragod.frs@kerala.gov.in', 'Active', 12.4996, 74.9869, 'Officer B. Hegde', 14, 'Kasaragod Bus Stand']
        ];

        for (const [uid, uname, utype, dist, phone, email, st, lat, lng, leader, size, loc] of demoRescueUnits) {
          await client.query(`
            INSERT INTO rescue_units (unit_id, unit_name, unit_type, district, contact_number, email, status, latitude, longitude, team_leader, team_size, current_location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (unit_id) DO NOTHING;
          `, [uid, uname, utype, dist, phone, email, st, lat, lng, leader, size, loc]);
        }
        console.log(`📋 Seeded Demo Rescue Units in rescue_units Table`);
      }

      // --- OFFICIAL WEATHER ALERTS SCHEMAS ---
      await client.query(`
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
      `);

      // Seed Initial Default Official & Secondary Sources if table is empty
      await client.query(`
        INSERT INTO weather_alert_sources (name, region, api_endpoint, api_key, source_type, priority, is_active)
        SELECT 'India Meteorological Department (IMD) Feed', 'Kerala', 'https://ksdma.kerala.gov.in/alerts-feed/rss', '', 'OFFICIAL', 1, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM weather_alert_sources WHERE name = 'India Meteorological Department (IMD) Feed');

        INSERT INTO weather_alert_sources (name, region, api_endpoint, api_key, source_type, priority, is_active)
        SELECT 'OpenWeatherMap One Call API 3.0 Alerts (Secondary Fallback)', 'Global', 'https://api.openweathermap.org/data/3.0/onecall', '', 'SECONDARY', 2, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM weather_alert_sources WHERE name = 'OpenWeatherMap One Call API 3.0 Alerts (Secondary Fallback)');
      `);

      // Seed default mappings
      await client.query(`
        INSERT INTO weather_severity_mappings (source_id, source_category, mapped_level, description)
        SELECT s.id, m.cat, m.lvl, m.descr
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
        ) AS m(cat, lvl, descr)
        WHERE NOT EXISTS (SELECT 1 FROM weather_severity_mappings WHERE source_id = s.id AND source_category = m.cat);
      `);



      // Migration: If legacy phone_or_email column exists, migrate data into separate phone & email columns
      const hasPhoneOrEmail = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'login' AND column_name = 'phone_or_email';
      `);

      if (hasPhoneOrEmail.rows.length > 0) {
        await client.query(`
          UPDATE login 
          SET email = phone_or_email 
          WHERE phone_or_email LIKE '%@%' AND (email IS NULL OR email = '');
        `);
        await client.query(`
          UPDATE login 
          SET phone = phone_or_email 
          WHERE phone_or_email NOT LIKE '%@%' AND (phone IS NULL OR phone = '');
        `);

        // Sync missing phone and email from users table
        await client.query(`
          UPDATE login l 
          SET phone = COALESCE(l.phone, u.phone), 
              email = COALESCE(l.email, u.email) 
          FROM users u 
          WHERE l.user_id = u.id;
        `);

        // Keep 1 single latest login entry per user_id
        await client.query(`
          DELETE FROM login l1 
          USING login l2 
          WHERE l1.user_id = l2.user_id AND l1.id < l2.id;
        `);

        // Drop legacy column
        await client.query(`ALTER TABLE login DROP COLUMN IF EXISTS phone_or_email;`);

        // Add UNIQUE constraint on user_id if not present
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'login_user_id_key'
            ) THEN
              ALTER TABLE login ADD CONSTRAINT login_user_id_key UNIQUE (user_id);
            END IF;
          EXCEPTION WHEN OTHERS THEN NULL;
          END $$;
        `);
      }

      // 3. Seed Admin directly (developer seeded)
      const bcrypt = require('bcryptjs');
      const adminEmail = 'sahayapp26@gmail.com';
      const salt = await bcrypt.genSalt(10);
      const passHash = await bcrypt.hash('Admin@123', salt);

      // Ensure users.phone is nullable so admin does not require a phone number
      await client.query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;`);

      let adminId;
      const adminCheck = await client.query("SELECT id FROM users WHERE email = $1 OR role = 'admin'", [adminEmail]);

      if (adminCheck.rows.length === 0) {
        const insertAdminUser = await client.query(`
          INSERT INTO users (name, phone, email, password_hash, role, status, district, designation, department_id)
          VALUES ('Platform System Admin', NULL, $1, $2, 'admin', 'approved', 'State HQ', 'System Administrator', 'SAHAY-SYS-01')
          RETURNING id;
        `, [adminEmail, passHash]);

        adminId = insertAdminUser.rows[0].id;
      } else {
        adminId = adminCheck.rows[0].id;
        // Update password hash, email, and clear phone number for admin user
        await client.query(`UPDATE users SET email = $1, phone = NULL, password_hash = $2, role = 'admin', status = 'approved' WHERE id = $3`, [adminEmail, passHash, adminId]);
      }

      // Sync all users from users table into login table (1 row per user, separate phone & email)
      await client.query(`
        INSERT INTO login (user_id, phone, email, password_hash, role, status)
        SELECT id, phone, email, password_hash, role, status FROM users
        ON CONFLICT (user_id) DO UPDATE SET 
          phone = EXCLUDED.phone, 
          email = EXCLUDED.email, 
          password_hash = EXCLUDED.password_hash, 
          role = EXCLUDED.role, 
          status = EXCLUDED.status;
      `);

      console.log(`🔑 Admin Account Configured & Seeded`);

      console.log(`✓ PostgreSQL Connected: 'users' table & separate 'login' table synchronized with Admin seed`);
      client.release();
      module.exports = testPool;
      return;
    } catch (err) {
      console.error('DB Init Step Note:', err.message);
    }
  }
  console.log('ℹ️ PostgreSQL Note: Connected pool initialized.');
};

initDb();

module.exports = pool;
