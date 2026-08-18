const pool = require('../db');

async function inspectDbAlerts() {
  try {
    const res = await pool.query('SELECT * FROM disaster_alerts');
    console.log('📋 Current disaster_alerts table rows (Count:', res.rows.length, '):');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error querying disaster_alerts:', err.message);
    process.exit(1);
  }
}

inspectDbAlerts();
