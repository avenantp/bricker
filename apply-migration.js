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
    const sql = readFileSync('./supabase/migrations/005_fix_workspace_members_rls.sql', 'utf8');

    console.log('Applying migration: 005_fix_workspace_members_rls.sql');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct query if rpc doesn't exist
      const result = await supabase.from('_migrations').select('*').limit(1);
      if (result.error) {
        console.error('Error applying migration:', error);
        process.exit(1);
      }

      // Apply via direct SQL
      console.log('Attempting direct SQL execution...');
      const { error: sqlError } = await supabase.rpc('exec', { query: sql });
      if (sqlError) {
        console.error('Error:', sqlError);
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
