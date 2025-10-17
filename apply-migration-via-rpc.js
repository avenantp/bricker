import { createClient } from '@supabase/supabase-js';
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
    console.log('Applying migration: 014_add_deleted_at_to_datasets.sql');
    console.log('Connecting to Supabase...\n');

    // Step 1: Add deleted_at column to datasets table
    console.log('Step 1: Adding deleted_at column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE datasets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;'
    });

    if (alterError && !alterError.message.includes('already exists')) {
      throw alterError;
    }
    console.log('✓ Column added\n');

    // Step 2: Add index
    console.log('Step 2: Adding index...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_datasets_deleted_at ON datasets(deleted_at) WHERE deleted_at IS NULL;'
    });

    if (indexError && !indexError.message.includes('already exists')) {
      throw indexError;
    }
    console.log('✓ Index created\n');

    // Step 3: Add comment
    console.log('Step 3: Adding column comment...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      query: "COMMENT ON COLUMN datasets.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';"
    });

    if (commentError) {
      console.warn('Warning: Could not add comment:', commentError.message);
    } else {
      console.log('✓ Comment added\n');
    }

    console.log('✅ Migration completed successfully!');
    console.log('\nChanges applied:');
    console.log('  - Added deleted_at column to datasets table');
    console.log('  - Added index idx_datasets_deleted_at');
    console.log('  - Added column comment');

  } catch (err) {
    console.error('❌ Migration failed:');
    console.error('Error:', err.message);
    if (err.details) {
      console.error('Details:', err.details);
    }
    if (err.hint) {
      console.error('Hint:', err.hint);
    }
    process.exit(1);
  }
}

applyMigration();
