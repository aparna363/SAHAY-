const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('--- Migrating Database for Field Visit Officer Module ---');

    // 1. Add columns to relief_verifications
    await client.query(`
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS scheduled_visit_date TIMESTAMP;
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS scheduled_visit_notes TEXT;
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS applicant_acknowledged BOOLEAN DEFAULT FALSE;
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS applicant_acknowledgement_notes TEXT;
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS applicant_name_confirmed VARCHAR(255);
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS verified_damage_category VARCHAR(100);
      ALTER TABLE relief_verifications ADD COLUMN IF NOT EXISTS officer_evidence_summary JSONB DEFAULT '[]'::jsonb;
    `);

    // 2. Add columns to relief_claims
    await client.query(`
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS scheduled_visit_date TIMESTAMP;
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS correction_instructions TEXT;
      ALTER TABLE relief_claims ADD COLUMN IF NOT EXISTS field_damage_category VARCHAR(100);
    `);

    // 3. Ensure role 'field_officer' can be used
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await client.query(`ALTER TABLE login DROP CONSTRAINT IF EXISTS login_role_check;`);

    // 4. Seed / Ensure Dedicated Field Visit Officer user exists
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Admin@123', salt);

    // Kottayam Field Officer
    const checkKtm = await client.query("SELECT id FROM users WHERE email = 'fieldofficer.kottayam@kerala.gov.in'");
    let ktmOfficerId;
    if (checkKtm.rows.length === 0) {
      const ins = await client.query(`
        INSERT INTO users (name, phone, email, password_hash, role, status, district, panchayat, designation, department_id)
        VALUES ('Sujith Menon', '9447102030', 'fieldofficer.kottayam@kerala.gov.in', $1, 'field_officer', 'approved', 'Kottayam', 'Meenachil', 'Revenue Field Verification Officer', 'REV-FO-KTM-01')
        RETURNING id;
      `, [passHash]);
      ktmOfficerId = ins.rows[0].id;
    } else {
      ktmOfficerId = checkKtm.rows[0].id;
    }

    // Pathanamthitta Field Officer
    const checkPta = await client.query("SELECT id FROM users WHERE email = 'fieldofficer.pta@kerala.gov.in'");
    let ptaOfficerId;
    if (checkPta.rows.length === 0) {
      const ins = await client.query(`
        INSERT INTO users (name, phone, email, password_hash, role, status, district, panchayat, designation, department_id)
        VALUES ('Rajesh G. Nair', '9447102031', 'fieldofficer.pta@kerala.gov.in', $1, 'field_officer', 'approved', 'Pathanamthitta', 'Adoor', 'Senior Disaster Field Officer', 'REV-FO-PTA-01')
        RETURNING id;
      `, [passHash]);
      ptaOfficerId = ins.rows[0].id;
    } else {
      ptaOfficerId = checkPta.rows[0].id;
    }

    // Sync into login table
    await client.query(`
      INSERT INTO login (user_id, phone, email, password_hash, role, status)
      SELECT id, phone, email, password_hash, role, status FROM users
      WHERE id IN ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    `, [ktmOfficerId, ptaOfficerId]);

    // 5. Ensure existing claims have taluk, village, coordinates, and assign some to Kottayam & Pathanamthitta officers
    // Update claims in Kottayam with realistic locations if missing
    await client.query(`
      UPDATE relief_claims SET
        taluk = COALESCE(taluk, 'Meenachil'),
        village = COALESCE(village, 'Pala'),
        priority = COALESCE(priority, 'HIGH')
      WHERE district = 'Kottayam';
    `);

    // Assign claim 3 to ktmOfficerId as TODAY'S VISIT (VISIT_SCHEDULED)
    const today = new Date();
    today.setHours(11, 30, 0, 0);
    const todayIso = today.toISOString();

    await client.query(`
      UPDATE relief_claims SET
        assigned_officer_id = $1,
        status = 'VISIT_SCHEDULED',
        scheduled_visit_date = $2,
        priority = 'CRITICAL',
        taluk = 'Meenachil',
        village = 'Erattupetta'
      WHERE id = 3;
    `, [ktmOfficerId, todayIso]);

    await client.query(`
      INSERT INTO relief_verifications (
        claim_id, officer_id, assigned_at, scheduled_visit_date, scheduled_visit_notes,
        verification_status, applicant_verified, location_verified
      ) VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '2 days', $3, 'Scheduled morning field visit with applicant at site. Verify house structural crack.', 'VISIT_SCHEDULED', TRUE, TRUE)
      ON CONFLICT DO NOTHING;
    `, [3, ktmOfficerId, todayIso]);

    // Assign claim 4 to ktmOfficerId as PENDING VISIT (UNDER_FIELD_VERIFICATION)
    await client.query(`
      UPDATE relief_claims SET
        assigned_officer_id = $1,
        status = 'UNDER_FIELD_VERIFICATION',
        priority = 'HIGH',
        taluk = 'Kanjirappally',
        village = 'Mundakayam'
      WHERE id = 4;
    `, [ktmOfficerId]);

    await client.query(`
      INSERT INTO relief_verifications (
        claim_id, officer_id, assigned_at, verification_status, reverification_notes
      ) VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '1 day', 'ASSIGNED', 'Assigned by Collector for physical site verification.')
      ON CONFLICT DO NOTHING;
    `, [4, ktmOfficerId]);

    // Assign claim 5 to ktmOfficerId as FIELD_VISIT_COMPLETED (Ready for verification report submission)
    await client.query(`
      UPDATE relief_claims SET
        assigned_officer_id = $1,
        status = 'FIELD_VISIT_COMPLETED',
        scheduled_visit_date = CURRENT_TIMESTAMP - INTERVAL '1 day',
        priority = 'HIGH',
        taluk = 'Vaikom',
        village = 'Thalayolaparambu'
      WHERE id = 5;
    `, [ktmOfficerId]);

    await client.query(`
      INSERT INTO relief_verifications (
        claim_id, officer_id, assigned_at, scheduled_visit_date, inspection_started_at, inspection_completed_at,
        verification_status, applicant_verified, location_verified, officer_latitude, officer_longitude,
        damage_observed, verified_damage_category, verified_loss_estimate
      ) VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day',
        'FIELD_VISIT_COMPLETED', TRUE, TRUE, 9.7123, 76.4521,
        'Site inspection carried out. Retaining wall collapsed and 2 rooms inundated.', 'Severely Damaged', 85000.00)
      ON CONFLICT DO NOTHING;
    `, [5, ktmOfficerId]);

    // Assign claim 7 to ktmOfficerId as REQUIRES_CORRECTION
    await client.query(`
      UPDATE relief_claims SET
        assigned_officer_id = $1,
        status = 'REQUIRES_CORRECTION',
        priority = 'MEDIUM',
        taluk = 'Changanassery',
        village = 'Kurichy',
        correction_instructions = 'Survey number mismatch on land tax receipt. Need original Aadhaar copy and updated revenue deed.'
      WHERE id = 7;
    `, [ktmOfficerId]);

    await client.query(`
      INSERT INTO relief_verifications (
        claim_id, officer_id, assigned_at, inspection_completed_at, verification_status,
        damage_observed, verified_damage_category, verified_loss_estimate, reverification_notes,
        officer_remarks
      ) VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 'REQUIRES_CORRECTION',
        'Claimed area differs from actual cadastral survey. Discrepancy in land records.', 'Partially Damaged', 20000.00,
        'Applicant requested to upload rectified land ownership certificate.', 'Awaiting correction from citizen.')
      ON CONFLICT DO NOTHING;
    `, [7, ktmOfficerId]);

    // Also link some claims to Pathanamthitta officer
    await client.query(`
      UPDATE relief_claims SET
        assigned_officer_id = $1
      WHERE id IN (
        SELECT id FROM relief_claims
        WHERE district = 'Pathanamthitta' AND status IN ('UNDER_VERIFICATION', 'SUBMITTED')
        LIMIT 2
      );
    `, [ptaOfficerId]);

    console.log('✓ Migration and seed data applied successfully!');
    console.log(`Kottayam Field Officer ID: ${ktmOfficerId} (${'fieldofficer.kottayam@kerala.gov.in'})`);
    console.log(`Pathanamthitta Field Officer ID: ${ptaOfficerId} (${'fieldofficer.pta@kerala.gov.in'})`);
  } catch (err) {
    console.error('Migration Error:', err);
    throw err;
  } finally {
    client.release();
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
