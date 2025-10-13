// Analyze which tables can be removed based on refactored architecture
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables required by the new refactored architecture
const REQUIRED_TABLES = new Set([
  // Multi-tenant foundation
  'companies',
  'users',
  'company_members',
  'subscription_plans',

  // Core entities with multi-tenancy
  'projects',
  'project_members',
  'workspaces',

  // New refactored tables
  'datasets',
  'columns',
  'lineage',

  // Mapping tables for shared resources
  'project_datasets',
  'workspace_datasets',

  // Git sync tables
  'git_commits',
  'metadata_changes',

  // Supporting tables
  'configurations',
  'audit_logs',
  'invitations',

  // Optional tables (can keep)
  'environments',
  'connections',
  'macros',
  'templates',
  'template_fragments'
]);

// Tables that are deprecated/replaced in new architecture
const DEPRECATED_TABLES = {
  'nodes': {
    status: 'REPLACED',
    replacedBy: 'datasets',
    reason: 'Renamed to datasets with added multi-tenancy (company_id, owner_id, visibility)',
    hasData: false
  },
  'node_items': {
    status: 'REPLACED',
    replacedBy: 'columns',
    reason: 'Renamed to columns with self-referencing references (no separate references table)',
    hasData: false
  },
  'node_lineage': {
    status: 'REPLACED',
    replacedBy: 'lineage',
    reason: 'Renamed to lineage with company_id isolation',
    hasData: false
  },
  'relationships': {
    status: 'ELIMINATED',
    replacedBy: 'columns.reference_column_id',
    reason: 'References now stored directly on columns table (self-referencing FK)',
    hasData: false
  },
  'references': {
    status: 'ELIMINATED',
    replacedBy: 'columns.reference_column_id',
    reason: 'References now stored directly on columns table (self-referencing FK)',
    hasData: false
  },
  'data_models': {
    status: 'POTENTIALLY_DEPRECATED',
    replacedBy: 'datasets',
    reason: 'Might be redundant with new datasets table - needs review',
    hasData: false
  },
  'data_model_members': {
    status: 'POTENTIALLY_DEPRECATED',
    replacedBy: 'N/A',
    reason: 'If data_models is removed, this becomes unnecessary',
    hasData: false
  },
  'branches': {
    status: 'REPLACED',
    replacedBy: 'workspaces',
    reason: 'Renamed to workspaces in refactored architecture',
    hasData: false
  }
};

async function analyzeTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        return { exists: false, rowCount: 0 };
      }
      return { exists: true, rowCount: 0, error: error.message };
    }

    return { exists: true, rowCount: count || 0 };
  } catch (err) {
    return { exists: false, rowCount: 0, error: err.message };
  }
}

async function analyzeDeprecatedTables() {
  console.log('🔍 Analyzing Deprecated Tables\n');
  console.log('=' .repeat(80));
  console.log('\n');

  const results = {
    canRemove: [],
    mustKeep: [],
    needsReview: []
  };

  // Check each deprecated table
  for (const [tableName, info] of Object.entries(DEPRECATED_TABLES)) {
    const analysis = await analyzeTable(tableName);

    if (!analysis.exists) {
      console.log(`✅ ${tableName}`);
      console.log(`   Status: Does not exist (already removed or never created)`);
      console.log(`   Expected: ${info.status} → ${info.replacedBy}`);
      console.log(`   Reason: ${info.reason}\n`);
      continue;
    }

    const hasData = analysis.rowCount > 0;

    if (hasData) {
      console.log(`⚠️  ${tableName}`);
      console.log(`   Status: ${info.status} (HAS DATA!)`);
      console.log(`   Rows: ${analysis.rowCount}`);
      console.log(`   Replaced by: ${info.replacedBy}`);
      console.log(`   Reason: ${info.reason}`);
      console.log(`   ⚠️  ACTION REQUIRED: Migrate data before removing!`);

      if (info.status === 'ELIMINATED') {
        console.log(`   💡 Migration: Data needs to be transformed to new structure`);
      } else {
        console.log(`   💡 Migration: Run rename/migration script to preserve data`);
      }

      results.needsReview.push({
        table: tableName,
        rows: analysis.rowCount,
        info
      });
    } else {
      console.log(`🗑️  ${tableName}`);
      console.log(`   Status: ${info.status} (empty)`);
      console.log(`   Rows: 0`);
      console.log(`   Replaced by: ${info.replacedBy}`);
      console.log(`   Reason: ${info.reason}`);
      console.log(`   ✅ SAFE TO REMOVE`);

      results.canRemove.push({
        table: tableName,
        info
      });
    }

    console.log('');
  }

  // Check for unexpected tables not in our lists
  console.log('=' .repeat(80));
  console.log('\n📊 Checking for unexpected tables...\n');

  const allKnownTables = new Set([
    ...REQUIRED_TABLES,
    ...Object.keys(DEPRECATED_TABLES)
  ]);

  const potentialTables = [
    'nodes', 'node_items', 'node_lineage', 'relationships', 'references',
    'data_models', 'data_model_members', 'branches',
    'users', 'companies', 'workspaces', 'projects',
    'datasets', 'columns', 'lineage'
  ];

  for (const tableName of potentialTables) {
    if (!allKnownTables.has(tableName)) {
      const analysis = await analyzeTable(tableName);
      if (analysis.exists) {
        console.log(`⚠️  Found unexpected table: ${tableName} (${analysis.rowCount} rows)`);
        console.log(`   This table is not in the required or deprecated lists`);
        console.log(`   Please review if this should be kept or removed\n`);
      }
    }
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('\n📋 SUMMARY\n');
  console.log('=' .repeat(80));
  console.log('');

  if (results.canRemove.length > 0) {
    console.log(`🗑️  SAFE TO REMOVE (${results.canRemove.length} tables):`);
    console.log('   These tables are empty and have been replaced:\n');
    results.canRemove.forEach(({ table, info }) => {
      console.log(`   • ${table} → ${info.replacedBy}`);
    });
    console.log('');
  }

  if (results.needsReview.length > 0) {
    console.log(`⚠️  NEEDS REVIEW (${results.needsReview.length} tables):`);
    console.log('   These tables have data and require migration:\n');
    results.needsReview.forEach(({ table, rows, info }) => {
      console.log(`   • ${table} (${rows} rows) → ${info.replacedBy}`);
    });
    console.log('');
    console.log('   🚨 DO NOT REMOVE until data is migrated!');
    console.log('');
  }

  // Generate removal SQL
  if (results.canRemove.length > 0) {
    console.log('=' .repeat(80));
    console.log('\n🔧 SQL TO REMOVE DEPRECATED TABLES\n');
    console.log('=' .repeat(80));
    console.log('');
    console.log('-- Run this SQL in Supabase to remove deprecated empty tables');
    console.log('-- ⚠️  Only run if you\'ve verified the tables are truly empty!\n');
    console.log('BEGIN;\n');

    results.canRemove.forEach(({ table, info }) => {
      console.log(`-- Remove ${table} (${info.status})`);
      console.log(`-- Replaced by: ${info.replacedBy}`);
      console.log(`DROP TABLE IF EXISTS ${table} CASCADE;`);
      console.log('');
    });

    console.log('COMMIT;\n');
  }

  // Architecture comparison
  console.log('=' .repeat(80));
  console.log('\n🏗️  ARCHITECTURE CHANGES\n');
  console.log('=' .repeat(80));
  console.log('');
  console.log('OLD Architecture:');
  console.log('  - nodes → datasets (individual records)');
  console.log('  - node_items → columns');
  console.log('  - node_lineage → lineage');
  console.log('  - relationships → ELIMINATED (separate table)');
  console.log('  - data_models → possibly redundant');
  console.log('');
  console.log('NEW Architecture:');
  console.log('  ✅ datasets (with company_id, owner_id, visibility)');
  console.log('  ✅ columns (with self-referencing reference_column_id)');
  console.log('  ✅ lineage (with company_id isolation)');
  console.log('  ✅ project_datasets (mapping for shared resources)');
  console.log('  ✅ workspace_datasets (mapping with canvas positions)');
  console.log('  ✅ NO separate references/relationships table!');
  console.log('');

  return results;
}

analyzeDeprecatedTables().catch(console.error);
