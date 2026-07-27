const { Client } = require('pg');
require('dotenv').config();

async function createDatabaseIfNotExists() {
  // Connect to default 'postgres' database
  const client = new Client({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT || '5432', 10),
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'sahay_db'");
    if (res.rows.length === 0) {
      await client.query("CREATE DATABASE sahay_db");
      console.log("✓ Database 'sahay_db' created successfully in PostgreSQL!");
    } else {
      console.log("✓ Database 'sahay_db' already exists in PostgreSQL.");
    }
  } catch (err) {
    console.log("Database Creation Note:", err.message);
  } finally {
    await client.end();
  }
}

createDatabaseIfNotExists();
