const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('../config/database');

const DEFAULT_PASSWORD = 'Aitechtures@2024';

const USERS = [
  { name: 'Aman Verma',         email: 'amanverma@aitechtures.com',      role: 'employee' },
  { name: 'Ankit',              email: 'ankit@aitechtures.com',           role: 'employee' },
  { name: 'Antima Yadav',       email: 'antima_03@aitechtures.com',       role: 'employee' },
  { name: 'Ashmi',              email: 'ashmi@aitechtures.com',           role: 'employee' },
  { name: 'Gaurav',             email: 'gaurav@aitechtures.com',          role: 'employee' },
  { name: 'Harshala Patil',     email: 'harshala09@aitechtures.com',      role: 'employee' },
  { name: 'Jash Doshi',         email: 'JashDoshi@aitechtures.com',       role: 'employee' },
  { name: 'Joel Nazareth',      email: 'joelnaz@aitechtures.com',         role: 'employee' },
  { name: 'Kevin Garda',        email: 'kevin@aitechtures.com',           role: 'employee' },
  { name: 'Madhavee Kadivar',   email: 'madhaveekadivar@aitechtures.com', role: 'employee' },
  { name: 'Nelson Pinto',       email: 'nelsonpinto@aitechtures.com',     role: 'employee' },
  { name: 'Pratham Bamaniya',   email: 'pratham@aitechtures.com',         role: 'employee' },
  { name: 'Rohan Vikas Patil',  email: 'rohanpatil@aitechtures.com',      role: 'employee' },
  { name: 'Rohit Kadlag',       email: 'rohitkadlag@aitechtures.com',     role: 'employee' },
  { name: 'Sachin Kaythamwar',  email: 'sachin@aitechtures.com',          role: 'employee' },
  { name: 'Sachin Mehta',       email: 'sachinmehta@aitechtures.com',     role: 'employee' },
  { name: 'Shrey',              email: 'sm@aitechtures.com',              role: 'admin'    },
  { name: 'Shreya',             email: 'shreyag@aitechtures.com',         role: 'employee' },
  { name: 'Swain',              email: 'swaind@aitechtures.com',          role: 'employee' },
  { name: 'System Admin',       email: 'accounts@aitechtures.com',        role: 'admin'    },
  { name: 'Vishal Singh',       email: 'vishal@aitechtures.com',          role: 'employee' },
  { name: 'Yamini Chaudhari',   email: 'yamini_chaudhari@aitechtures.com',role: 'employee' },
];

async function seed() {
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  let created = 0;
  let skipped = 0;

  for (const user of USERS) {
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email.toLowerCase()]);
      if (existing.rows.length > 0) {
        console.log(`  SKIP  ${user.name} <${user.email}> (already exists)`);
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [user.name, user.email.toLowerCase(), passwordHash, user.role]
      );
      console.log(`  OK    ${user.name} <${user.email}> [${user.role}]`);
      created++;
    } catch (err) {
      console.error(`  FAIL  ${user.name}: ${err.message}`);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  console.log(`\nDefault password for all seeded users: ${DEFAULT_PASSWORD}`);
  console.log('Ask each user to change their password after first login.\n');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
