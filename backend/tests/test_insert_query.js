const pool = require('../db');

async function test() {
  try {
    const draftCode = 'SAH-RLF-TEST-' + Date.now().toString().slice(-4);
    // Method 1: Separate parameters for ST_MakePoint
    const res = await pool.query(
      `INSERT INTO relief_claims (
        claim_id, citizen_id, disaster_type, disaster_date,
        assistance_category, district, latitude, longitude,
        affected_location, status
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography, 'DRAFT'
      ) RETURNING id, claim_id, affected_location;`,
      [
        draftCode, 1, 'Flood', '2026-09-10',
        'Immediate Relief', 'Wayanad', 11.605, 76.083,
        76.083, 11.605
      ]
    );
    console.log('SUCCESS with separate params!', res.rows[0]);
  } catch (err) {
    console.error('FAILED with separate params:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
