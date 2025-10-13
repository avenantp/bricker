// Get ALL actual tables that exist in the database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllTables() {
  console.log('🔍 Querying actual database schema...\n');

  // Try to query pg_tables directly via RPC or raw query
  // Since we can't use rpc, let's try a different approach

  // Get all tables by trying common table names and checking which exist
  const possibleTables = [
    // Old architecture
    'nodes',
    'node_items',
    'node_lineage',
    'relationships',
    'references',
    'branches',
    'data_models',
    'data_model_members',

    // New architecture
    'datasets',
    'columns',
    'lineage',
    'workspaces',
    'projects',
    'project_datasets',
    'workspace_datasets',

    // Core tables
    'users',
    'companies',
    'company_members',
    'subscription_plans',

    // Supporting tables
    'project_members',
    'configurations',
    'audit_logs',
    'invitations',
    'environments',
    'connections',
    'macros',
    'templates',
    'template_fragments',

    // Git sync
    'git_commits',
    'metadata_changes'
  ];

  const existingTables = [];
  const missingTables = [];

  console.log('Checking tables...\n');

  for (const tableName of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          missingTables.push(tableName);
          console.log(`❌ ${tableName}`);
        } else {
          // Other error (might be permission issue)
          console.log(`⚠️  ${tableName} - error: ${error.code}`);
        }
      } else {
        // Table exists
        existingTables.push({ name: tableName, rows: count || 0 });
        console.log(`✅ ${tableName} (${count || 0} rows)`);
      }
    } catch (err) {
      missingTables.push(tableName);
      console.log(`❌ ${tableName} - ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log('='.repeat(80));
  console.log(`\n✅ Tables that EXIST: ${existingTables.length}`);
  console.log(`❌ Tables that DON'T EXIST: ${missingTables.length}\n`);

  console.log('Existing Tables:');
  existingTables.forEach(t => {
    console.log(`  • ${t.name} (${t.rows} rows)`);
  });

  console.log('\nMissing Tables:');
  missingTables.forEach(t => {
    console.log(`  • ${t}`);
  });

  // Now check which deprecated tables actually exist
  const deprecatedThatExist = [];
  const deprecatedTables = ['nodes', 'node_items', 'node_lineage', 'relationships', 'references', 'data_models', 'data_model_members', 'branches'];

  for (const table of deprecatedTables) {
    const exists = existingTables.find(t => t.name === table);
    if (exists) {
      deprecatedThatExist.push(exists);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🗑️  DEPRECATED TABLES THAT ACTUALLY EXIST\n');
  console.log('='.repeat(80));

  if (deprecatedThatExist.length === 0) {
    console.log('\n✅ No deprecated tables found! All have been removed or never existed.');
  } else {
    console.log(`\nFound ${deprecatedThatExist.length} deprecated tables:\n`);
    deprecatedThatExist.forEach(t => {
      console.log(`  • ${t.name} (${t.rows} rows) - CAN BE REMOVED`);
    });

    // Generate cleanup SQL only for tables that exist
    console.log('\n' + '='.repeat(80));
    console.log('\n🔧 SQL TO REMOVE (ONLY EXISTING TABLES)\n');
    console.log('='.repeat(80));
    console.log('\n-- Only drops tables that actually exist\n');
    console.log('DO $$');
    console.log('BEGIN');
    deprecatedThatExist.forEach(t => {
      console.log(`  DROP TABLE IF EXISTS ${t.name} CASCADE;`);
      console.log(`  RAISE NOTICE '✅ Removed table: ${t.name}';`);
    });
    console.log('END $$;');
  }

  return { existingTables, missingTables, deprecatedThatExist };
}

getAllTables().catch(console.error);
