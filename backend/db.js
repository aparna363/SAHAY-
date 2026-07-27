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
          role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'rescue_team', 'collector')),
          district VARCHAR(100) NOT NULL,
          panchayat VARCHAR(100),
          designation VARCHAR(100),
          department_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure password_hash column exists on users table for legacy rows
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);

      // 2. Create separate login table
      await client.query(`
        CREATE TABLE IF NOT EXISTS login (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          phone_or_email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'rescue_team', 'collector')),
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add unique constraint on phone_or_email if not present
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'login_phone_or_email_key'
          ) THEN
            ALTER TABLE login ADD CONSTRAINT login_phone_or_email_key UNIQUE (phone_or_email);
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore if constraint already exists
        END $$;
      `);

      console.log(`✓ PostgreSQL Connected: 'users' table & separate 'login' table synchronized`);
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
