import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:BPF4kpq.dwe4dqd3fce@db.dhclhobnxhdkkxrbtmkb.supabase.co:5432/postgres'
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = fs.readFileSync('supabase/migrations/08_remove_fqn_columns.sql', 'utf8');
    console.log('✓ Read migration file');

    await client.query(sql);
    console.log('✓ Migration applied successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
