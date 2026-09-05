/**
 * Migration runner — executes SQL migration files in order.
 * Usage: npm run migrate
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s)`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running migration: ${file}`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      // If table already exists, skip gracefully
      if (err.code === '42P07') {
        console.log(`  ⚠ ${file} skipped (tables already exist)`);
      } else {
        console.error(`  ✗ ${file} failed:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log('All migrations applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
