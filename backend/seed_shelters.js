const pool = require('../backend/db');

const shelters = [
  ['Kalpetta Model High School Relief Camp', 'Wayanad', 'Kalpetta Town, Wayanad - 673121', 11.6080, 76.0820, 450, 260, '+914936202444'],
  ['Sulthan Bathery Municipal Camp', 'Wayanad', 'Bathery HQ, Wayanad - 673592', 11.6640, 76.2570, 400, 310, '+914936220200'],
  ['Mananthavady St. Patrick Camp', 'Wayanad', 'Mananthavady Town - 670645', 11.8030, 76.0020, 350, 210, '+914935240300'],
  ['Kadavanthra Community Relief Hall', 'Ernakulam', 'Kadavanthra, Kochi - 682020', 9.9675, 76.3010, 400, 190, '+914842203344'],
  ['Munnar Govt Higher Secondary Camp', 'Idukki', 'Munnar Town, Idukki - 685612', 10.0889, 77.0595, 500, 310, '+914865230211'],
  ['Kanjirappally St. Dominic Camp', 'Kottayam', 'Kanjirappally, Kottayam - 686507', 9.5558, 76.7884, 350, 180, '+914828202333'],
  ['Chalakudy Municipal Relief Center', 'Thrissur', 'Chalakudy Town - 680307', 10.3070, 76.3330, 400, 160, '+914872701200'],
  ['Adoor Central Emergency Camp', 'Pathanamthitta', 'Adoor Bypass - 691523', 9.1554, 76.7335, 300, 140, '+914734224100'],
  ['Alappuzha SDV Higher Secondary Camp', 'Alappuzha', 'Beach Road, Alappuzha - 688001', 9.4981, 76.3388, 500, 260, '+914772243500'],
  ['Trivandrum SMV Model Camp', 'Thiruvananthapuram', 'Overbridge, Thiruvananthapuram - 695001', 8.4900, 76.9500, 600, 320, '+914712471000']
];

async function seed() {
  for (const s of shelters) {
    const existing = await pool.query('SELECT id FROM shelters WHERE name = $1', [s[0]]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO shelters (name, district, address, latitude, longitude, capacity, available_capacity, contact_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        s
      );
    }
  }
  console.log('Shelters successfully seeded.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
