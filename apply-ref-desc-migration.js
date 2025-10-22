import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

// Local Supabase database URL
const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function applyMigration() {
  try {
    // Read migration SQL
    const sql = readFileSync('./supabase/migrations/09_remove_reference_description.sql', 'utf8');

    console.log('Applying migration: 09_remove_reference_description.sql');
    console.log('SQL content length:', sql.length, 'bytes');
    console.log('');

    const client = new Client(DATABASE_URL);

    await client.connect();
    console.log('✓ Connected to database');

    // Execute the migration
    await client.query(sql);
    console.log('✓ Migration executed successfully');

    await client.end();

    console.log('\n✅ Migration completed successfully!');
    console.log('\nChanges applied:');
    console.log('  - Dropped reference_description column from columns table');

  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

applyMigration();
