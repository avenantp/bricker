// Query the actual database schema to get ALL tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Required tables according to refactored architecture
const REQUIRED_TABLES = [
  // Multi-tenant foundation (M.0)
  'companies',
  'users',

  // Core entities (M.1)
  'projects',
  'project_members',
  'workspaces',
  'datasets',
  'columns',
  'lineage',

  // Mapping tables (M.0.3)
  'project_datasets',
  'workspace_datasets',

  // Git sync tables (3.6)
  'git_commits',
  'metadata_changes',

  // Supporting tables (3.7-3.10)
  'environments',
  'connections',
  'macros',
  'templates',
  'template_fragments',

  // Additional tables
  'subscription_plans',
  'invitations',
  'configurations'
];

async function getAllDatabaseTables() {
  console.log('🔍 Querying database schema for ALL tables...\n');

  // Use a raw SQL query to get all tables in public schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    console.error('❌ Error querying database schema:', error.message);
    console.log('\n⚠️  RPC function might not be available. Using fallback method...\n');
    return await fallbackMethod();
  }

  return data.map(row => row.table_name);
}

async function fallbackMethod() {
  // Try to infer tables by attempting to query common table names
  const commonTables = [
    // Current known tables
    'nodes', 'node_items', 'node_lineage', 'relationships', 'references',
    'branches', 'data_models', 'data_model_members',
    'datasets', 'columns', 'lineage', 'workspaces', 'projects',
    'project_datasets', 'workspace_datasets',
    'users', 'companies', 'company_members', 'subscription_plans',
    'project_members', 'configurations', 'audit_logs', 'invitations',
    'environments', 'connections', 'macros', 'templates',
    'template_fragments', 'git_commits', 'metadata_changes',

    // Potentially missed tables
    'audit_log', 'node_state', 'node_states', 'user_preferences',
    'workspace_members', 'project_configurations', 'dataset_versions',
    'column_versions', 'lineage_versions', 'sync_history',
    'conflict_resolutions', 'change_history', 'activity_logs',
    'notifications', 'api_keys', 'webhooks', 'integrations',
    'jobs', 'job_executions', 'schedules', 'tags', 'comments'
  ];

  const existingTables = [];

  for (const tableName of commonTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error || error.code !== '42P01') {
        existingTables.push(tableName);
      }
    } catch (err) {
      // Ignore
    }
  }

  return existingTables;
}

async function analyzeAndGenerateCleanup() {
  const allTables = await getAllDatabaseTables();

  console.log('📊 DATABASE ANALYSIS\n');
  console.log('='.repeat(80));
  console.log(`\nTotal tables found: ${allTables.length}\n`);

  // Categorize tables
  const required = [];
  const deprecated = [];
  const unknown = [];

  for (const table of allTables) {
    if (REQUIRED_TABLES.includes(table)) {
      required.push(table);
    } else if ([
      'nodes', 'node_items', 'node_lineage',
      'relationships', 'references',
      'data_models', 'data_model_members',
      'branches'
    ].includes(table)) {
      deprecated.push(table);
    } else {
      unknown.push(table);
    }
  }

  // Get row counts
  console.log('✅ REQUIRED TABLES (Keep These)\n');
  console.log('='.repeat(80));
  for (const table of required) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`  ✓ ${table.padEnd(30)} (${count || 0} rows)`);
  }

  console.log('\n🗑️  DEPRECATED TABLES (Old Architecture - Remove)\n');
  console.log('='.repeat(80));
  for (const table of deprecated) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`  ✗ ${table.padEnd(30)} (${count || 0} rows) - REMOVE`);
  }

  console.log('\n⚠️  UNKNOWN/UNSPECIFIED TABLES (Review These)\n');
  console.log('='.repeat(80));
  for (const table of unknown) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    console.log(`  ? ${table.padEnd(30)} (${count || 0} rows) - REVIEW`);
  }

  // Generate cleanup SQL
  const tablesToRemove = [...deprecated, ...unknown];

  if (tablesToRemove.length === 0) {
    console.log('\n✅ Database is clean! No tables to remove.\n');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🔧 CLEANUP SQL SCRIPT\n');
  console.log('='.repeat(80));
  console.log('\n-- WARNING: This will remove ALL deprecated and unknown tables');
  console.log('-- Review the unknown tables list above before running this script\n');
  console.log('DO $$');
  console.log('BEGIN');

  for (const table of tablesToRemove) {
    const category = deprecated.includes(table) ? 'deprecated' : 'unknown';
    console.log(`  -- ${category.toUpperCase()}: ${table}`);
    console.log(`  DROP TABLE IF EXISTS public.${table} CASCADE;`);
    console.log(`  RAISE NOTICE '✅ Removed table: ${table}';`);
    console.log('');
  }

  console.log("  RAISE NOTICE '';");
  console.log("  RAISE NOTICE '==========================================';");
  console.log("  RAISE NOTICE 'CLEANUP COMPLETE!';");
  console.log("  RAISE NOTICE '==========================================';");
  console.log(`  RAISE NOTICE 'Removed ${tablesToRemove.length} tables';`);
  console.log("  RAISE NOTICE '';");
  console.log('END $$;');

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 SUMMARY\n');
  console.log('='.repeat(80));
  console.log(`\n✅ Required tables (keep):     ${required.length}`);
  console.log(`🗑️  Deprecated tables (remove):  ${deprecated.length}`);
  console.log(`⚠️  Unknown tables (review):     ${unknown.length}`);
  console.log(`\n📝 Total tables to remove:     ${tablesToRemove.length}`);
  console.log(`\n✓ Tables that will remain:     ${required.length}\n`);
}

analyzeAndGenerateCleanup().catch(console.error);
