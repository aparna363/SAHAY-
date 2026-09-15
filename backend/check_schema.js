const pool = require('./db');

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check if missions or evidence tables exist
    for (const tbl of ['missions', 'rescue_missions', 'rescue_evidence', 'evidence', 'incident_evidence', 'rescue_teams', 'incidents', 'hazard_zones', 'road_hazards', 'shelters', 'hospitals']) {
      const colRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [tbl]);
      if (colRes.rows.length > 0) {
        console.log(`\nTable [${tbl}] columns:`, colRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
