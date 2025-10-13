#!/usr/bin/env node

/**
 * Check existing tables in Supabase database
 * This script helps identify which tables exist and their column structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

async function checkExistingTables() {
  console.log('🔍 Checking existing tables in database...\n');

  const tables = [
    'companies',
    'subscription_plans',
    'users',
    'company_users',
    'projects',
    'project_users',
    'workspaces',
    'workspace_users',
    'datasets',
    'columns',
    'lineage',
    'project_datasets',
    'workspace_datasets',
    'environments',
    'connections',
    'macros',
    'templates',
    'template_fragments',
    'source_code_commits',
    'audit_logs',
    'configurations',
    'invitations'
  ];

  const results = {
    existing: [],
    missing: [],
    withoutId: []
  };

  for (const tableName of tables) {
    try {
      // Try to select from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          results.missing.push(tableName);
        } else {
          console.log(`⚠️  ${tableName}: ${error.message}`);
        }
      } else {
        // Table exists - check if it has 'id' column
        const { data: sample } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (sample !== null) {
          results.existing.push(tableName);
        } else {
          results.withoutId.push(tableName);
        }
      }
    } catch (e) {
      console.log(`❌ ${tableName}: ${e.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Existing tables with 'id' column: ${results.existing.length}`);
  if (results.existing.length > 0) {
    results.existing.forEach(t => console.log(`   - ${t}`));
  }

  console.log(`\n❌ Missing tables: ${results.missing.length}`);
  if (results.missing.length > 0) {
    results.missing.forEach(t => console.log(`   - ${t}`));
  }

  console.log(`\n⚠️  Tables without 'id' column: ${results.withoutId.length}`);
  if (results.withoutId.length > 0) {
    results.withoutId.forEach(t => console.log(`   - ${t}`));
  }

  console.log('\n💡 Recommendation:');
  if (results.withoutId.length > 0) {
    console.log('   Tables exist but without "id" column - you need to ALTER them first');
  } else if (results.existing.length > 0) {
    console.log('   Some tables already exist - initial_schema.sql will skip them');
    console.log('   You may need to run ALTER statements for existing tables');
  } else {
    console.log('   No tables exist - safe to run initial_schema.sql');
  }
}

checkExistingTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
