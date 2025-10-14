/**
 * Apply RLS Disable Migration
 * Connects directly to PostgreSQL and disables all RLS policies
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL in .env file');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const sql = readFileSync('./supabase/migrations/004_disable_rls.sql', 'utf8');
    console.log('📄 Loaded migration: 004_disable_rls.sql\n');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

    console.log(`🔨 Executing ${statements.length} statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Get a short description of the statement
      const description = statement.substring(0, 60).replace(/\s+/g, ' ');

      try {
        console.log(`[${i + 1}/${statements.length}] ${description}...`);
        await client.query(statement);
        console.log('✅ Success\n');
        successCount++;
      } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Statement:', statement.substring(0, 100), '...\n');
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 All RLS policies have been disabled successfully!');
      console.log('🔓 Access control is now handled at the application layer.');
    } else {
      console.log('\n⚠️  Some statements failed. Please review the errors above.');
    }

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

applyMigration().catch(console.error);
