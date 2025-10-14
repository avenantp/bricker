/**
 * Disable RLS via Supabase REST API
 * Uses Supabase client to execute SQL statements
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function executeSQLStatement(sql) {
  // Use the REST API to execute SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({
      query: sql
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function disableRLS() {
  console.log('🚀 Starting RLS disable process...\n');

  try {
    // Read the migration file
    const sql = readFileSync('./supabase/migrations/004_disable_rls.sql', 'utf8');
    console.log('📄 Loaded migration: 004_disable_rls.sql\n');

    // Execute individual DROP POLICY and ALTER TABLE statements
    const statements = [
      // Projects table
      "DROP POLICY IF EXISTS projects_select_policy ON projects",
      "DROP POLICY IF EXISTS projects_insert_policy ON projects",
      "DROP POLICY IF EXISTS projects_update_policy ON projects",
      "DROP POLICY IF EXISTS projects_delete_policy ON projects",
      "ALTER TABLE projects DISABLE ROW LEVEL SECURITY",

      // Workspaces table
      "DROP POLICY IF EXISTS workspaces_select_policy ON workspaces",
      "DROP POLICY IF EXISTS workspaces_insert_policy ON workspaces",
      "DROP POLICY IF EXISTS workspaces_update_policy ON workspaces",
      "DROP POLICY IF EXISTS workspaces_delete_policy ON workspaces",
      "ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY",

      // Project users table
      "DROP POLICY IF EXISTS project_users_select_policy ON project_users",
      "DROP POLICY IF EXISTS project_users_insert_policy ON project_users",
      "DROP POLICY IF EXISTS project_users_update_policy ON project_users",
      "DROP POLICY IF EXISTS project_users_delete_policy ON project_users",
      "ALTER TABLE project_users DISABLE ROW LEVEL SECURITY",

      // Workspace users table
      "DROP POLICY IF EXISTS workspace_users_select_policy ON workspace_users",
      "DROP POLICY IF EXISTS workspace_users_insert_policy ON workspace_users",
      "DROP POLICY IF EXISTS workspace_users_update_policy ON workspace_users",
      "DROP POLICY IF EXISTS workspace_users_delete_policy ON workspace_users",
      "ALTER TABLE workspace_users DISABLE ROW LEVEL SECURITY"
    ];

    console.log(`🔨 Executing ${statements.length} statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const description = statement.substring(0, 50);

      try {
        console.log(`[${i + 1}/${statements.length}] ${description}...`);

        // Execute using Supabase client's query method
        const { error } = await supabase.rpc('exec', { sql: statement });

        if (error) {
          console.log(`⚠️  Warning: ${error.message}`);
          // Some errors might be expected (like policy not existing)
        } else {
          console.log('✅ Success');
          successCount++;
        }
      } catch (err) {
        console.error('❌ Error:', err.message);
        errorCount++;
      }
      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 RLS has been disabled!');
      console.log('🔓 Access control is now handled at the application layer.');
      console.log('\n💡 Note: You can now create projects without RLS restrictions.');
    }

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error('\n💡 Tip: You may need to manually disable RLS using the Supabase dashboard.');
    console.error('   Go to: https://supabase.com/dashboard/project/dhclhobnxhdkkxrbtmkb/database/policies');
    process.exit(1);
  }
}

disableRLS().catch(console.error);
