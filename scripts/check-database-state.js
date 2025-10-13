#!/usr/bin/env node

/**
 * Check current Supabase database state for specific tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL not found in environment variables');
  process.exit(1);
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  serviceKey
);

async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');

  try {
    // Query to get all tables
    const { data: allTables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
    });

    if (tablesError) {
      console.error('❌ Error querying tables:', tablesError.message);

      // Fallback: Check specific tables we care about
      console.log('\n📋 Checking specific tables...\n');

      const tablesToCheck = [
        'databricks_connections',
        'environments',
        'metadata_changes',
        'audit_logs',
        'company_members',
        'company_users',
        'project_members',
        'project_users',
        'workspace_members',
        'workspace_users',
        'git_commits',
        'source_code_commits'
      ];

      for (const tableName of tablesToCheck) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.code === '42P01') {
            console.log(`  ❌ ${tableName} - DOES NOT EXIST`);
          } else {
            console.log(`  ⚠️  ${tableName} - Error: ${error.message}`);
          }
        } else {
          console.log(`  ✅ ${tableName} - EXISTS`);
        }
      }
      return;
    }

    const tables = allTables[0]?.table_name ? allTables.map(t => t.table_name) : [];

    console.log(`📊 Total tables found: ${tables.length}\n`);

    // Check specific tables we need to know about
    const criticalTables = {
      'databricks_connections': tables.includes('databricks_connections'),
      'environments': tables.includes('environments'),
      'metadata_changes': tables.includes('metadata_changes'),
      'audit_logs': tables.includes('audit_logs'),
      'company_members': tables.includes('company_members'),
      'company_users': tables.includes('company_users'),
      'project_members': tables.includes('project_members'),
      'project_users': tables.includes('project_users'),
      'workspace_members': tables.includes('workspace_members'),
      'workspace_users': tables.includes('workspace_users'),
      'git_commits': tables.includes('git_commits'),
      'source_code_commits': tables.includes('source_code_commits')
    };

    console.log('📋 CRITICAL TABLES STATUS:\n');
    console.log('Membership Tables:');
    console.log(`  ${criticalTables.company_members ? '✅' : '❌'} company_members (should rename to company_users)`);
    console.log(`  ${criticalTables.company_users ? '✅' : '❌'} company_users (target name)`);
    console.log(`  ${criticalTables.project_members ? '✅' : '❌'} project_members (should rename to project_users)`);
    console.log(`  ${criticalTables.project_users ? '✅' : '❌'} project_users (target name)`);
    console.log(`  ${criticalTables.workspace_members ? '✅' : '❌'} workspace_members (should rename to workspace_users)`);
    console.log(`  ${criticalTables.workspace_users ? '✅' : '❌'} workspace_users (target name)`);
    console.log();

    console.log('Source Control Tables:');
    console.log(`  ${criticalTables.git_commits ? '✅' : '❌'} git_commits (should rename to source_code_commits)`);
    console.log(`  ${criticalTables.source_code_commits ? '✅' : '❌'} source_code_commits (target name)`);
    console.log();

    console.log('Platform Tables:');
    console.log(`  ${criticalTables.databricks_connections ? '✅' : '❌'} databricks_connections (should rename to environments)`);
    console.log(`  ${criticalTables.environments ? '✅' : '❌'} environments (target name)`);
    console.log();

    console.log('Audit Tables:');
    console.log(`  ${criticalTables.metadata_changes ? '✅' : '❌'} metadata_changes (should rename to audit_logs)`);
    console.log(`  ${criticalTables.audit_logs ? '✅' : '❌'} audit_logs (target name)`);
    console.log();

    // Check for columns in key tables if they exist
    if (criticalTables.databricks_connections) {
      console.log('🔎 Checking databricks_connections columns...');
      const { data: columns } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'databricks_connections'
          ORDER BY ordinal_position
        `
      });

      if (columns) {
        console.log('  Columns:', columns.map(c => c.column_name).join(', '));
      }
      console.log();
    }

    if (criticalTables.metadata_changes) {
      console.log('🔎 Checking metadata_changes columns...');
      const { data: columns } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'metadata_changes'
          ORDER BY ordinal_position
        `
      });

      if (columns) {
        console.log('  Columns:', columns.map(c => c.column_name).join(', '));
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabaseState();
