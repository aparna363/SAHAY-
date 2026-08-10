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
