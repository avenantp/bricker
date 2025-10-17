import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const sql = readFileSync('./supabase/migrations/014_add_deleted_at_to_datasets.sql', 'utf8');

    console.log('Applying migration: 014_add_deleted_at_to_datasets.sql');
    console.log('Migration size:', sql.length, 'bytes');

    // Use pg client for DDL operations
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });

    await client.connect();
    console.log('Connected to database');

    // Execute migration
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    await client.end();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

applyMigration();
