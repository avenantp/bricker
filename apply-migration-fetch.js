import fetch from 'node-fetch';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

// Parse the connection string to get individual components
const dbUrlMatch = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!dbUrlMatch) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = dbUrlMatch;

console.log('Database connection info:');
console.log('  Host:', host);
console.log('  Port:', port);
console.log('  Database:', database);
console.log('  User:', user);
console.log('');

async function applyMigration() {
  try {
    // Read migration SQL
    const sql = readFileSync('./supabase/migrations/015_cleanup_audit_columns.sql', 'utf8');

    console.log('Applying migration: 015_cleanup_audit_columns.sql');
    console.log('SQL content length:', sql.length, 'bytes');
    console.log('');

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');

    console.log('Found', statements.length, 'SQL statements to execute\n');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 80) + '...');

      // Use pg client via dynamic import
      const { Client } = await import('pg');
      const client = new Client({
        user,
        password,
        host,
        port: parseInt(port),
        database,
        ssl: {
          rejectUnauthorized: false // Supabase uses SSL
        }
      });

      try {
        await client.connect();
        await client.query(statement);
        console.log('✓ Success\n');
        await client.end();
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠ Already exists (skipping)\n');
          await client.end();
        } else {
          throw err;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nChanges applied:');
    console.log('  - Added deleted_at column to datasets table');
    console.log('  - Added index idx_datasets_deleted_at');
    console.log('  - Created soft_delete_dataset() function');

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
