#!/usr/bin/env node

/**
 * Check actual columns in specific tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

async function checkColumns() {
  console.log('🔍 Checking actual columns in key tables...\n');

  const tables = ['workspaces', 'datasets', 'databricks_connections', 'environments'];

  for (const tableName of tables) {
    console.log(`\n📋 ${tableName}:`);
    console.log('─'.repeat(80));

    try {
      // Try to select all columns from the table (limit 0 to just get structure)
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`  ✅ Columns found (${columns.length}):`);
        columns.forEach(col => {
          console.log(`     • ${col}`);
        });
      } else {
        // Table exists but has no rows - try to get count to confirm
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.log(`  ❌ Error checking table: ${countError.message}`);
        } else {
          console.log(`  ℹ️  Table exists but has no rows (${count} rows)`);
          console.log(`  ℹ️  Cannot determine columns without data. Trying direct query...`);

          // Try a different approach - select with specific known columns
          const testColumns = [
            'created_at', 'updated_at', 'id', 'workspace_id', 'project_id',
            'name', 'description', 'git_branch_name', 'source_branch',
            'git_commit_sha', 'source_commit_sha', 'databricks_workspace_url',
            'platform_url', 'target_platform'
          ];

          console.log(`  🔎 Testing for known columns:`);
          for (const col of testColumns) {
            const { error: testError } = await supabase
              .from(tableName)
              .select(col)
              .limit(0);

            if (!testError) {
              console.log(`     ✅ ${col}`);
            }
          }
        }
      }

    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
    }
  }
}

checkColumns();
