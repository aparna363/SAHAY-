const pool = require('../db');

const bcrypt = require('bcryptjs');

async function main() {
  const hash = await bcrypt.hash('Password@123', 10);
  await pool.query("UPDATE login SET password_hash = $1 WHERE user_id = 44", [hash]);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = 44", [hash]);
  console.log('Collector 44 password updated to Password@123');
  pool.end();
}

main().catch(console.error);
