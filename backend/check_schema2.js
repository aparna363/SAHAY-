const pool = require('./db');

async function checkMore() {
  try {
    for (const tbl of ['rescue_units', 'incident_media', 'incident_reports', 'incident_status_history', 'notifications']) {
      const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [tbl]);
      if (colRes.rows.length > 0) {
        console.log(`\nTable [${tbl}] columns:`, colRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      }
    }
    const sampleInc = await pool.query("SELECT * FROM incidents LIMIT 1");
    console.log('\nSample incident:', sampleInc.rows[0]);
    const sampleUnits = await pool.query("SELECT * FROM rescue_units LIMIT 2");
    console.log('\nSample rescue_units:', sampleUnits.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkMore();
