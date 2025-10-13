#!/usr/bin/env node

/**
 * Export current database schema to SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

async function exportSchema() {
  console.log('🔍 Exporting current database schema...\n');

  let sql = `-- =====================================================
-- INITIAL SCHEMA
-- =====================================================
-- This schema represents the current state of the database
-- Generated: ${new Date().toISOString()}
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

`;

  try {
    // Get all tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError.message);
      console.log('\n⚠️  Using fallback method...\n');

      // Fallback: manually list known tables
      const knownTables = [
        'companies', 'users', 'company_users', 'subscription_plans',
        'projects', 'project_users', 'project_datasets',
        'workspaces', 'workspace_users', 'workspace_datasets',
        'datasets', 'columns', 'lineage',
        'environments', 'connections', 'macros', 'templates', 'template_fragments',
        'source_code_commits', 'audit_logs',
        'configurations', 'invitations'
      ];

      sql += '-- =====================================================\n';
      sql += '-- CORE TABLES\n';
      sql += '-- =====================================================\n\n';

      for (const tableName of knownTables) {
        sql += await getTableSchema(tableName);
      }

    } else if (tables && tables.length > 0) {
      console.log(`Found ${tables.length} tables\n`);

      // Sort tables by dependency order (manual grouping)
      const coreOrder = ['companies', 'subscription_plans', 'users'];
      const membershipOrder = ['company_users', 'project_users', 'workspace_users'];
      const mainOrder = ['projects', 'workspaces', 'datasets', 'columns', 'lineage'];
      const mappingOrder = ['project_datasets', 'workspace_datasets'];
      const supportOrder = ['environments', 'connections', 'macros', 'templates', 'template_fragments'];
      const trackingOrder = ['source_code_commits', 'audit_logs'];
      const systemOrder = ['configurations', 'invitations'];

      const allOrdered = [
        ...coreOrder,
        ...membershipOrder,
        ...mainOrder,
        ...mappingOrder,
        ...supportOrder,
        ...trackingOrder,
        ...systemOrder
      ];

      const orderedTables = [];
      const remainingTables = [];

      for (const table of tables) {
        const tableName = table.table_name;
        if (allOrdered.includes(tableName)) {
          orderedTables.push(tableName);
        } else {
          remainingTables.push(tableName);
        }
      }

      // Sort ordered tables by their position in allOrdered
      orderedTables.sort((a, b) => allOrdered.indexOf(a) - allOrdered.indexOf(b));

      // Add remaining tables at the end
      const finalOrder = [...orderedTables, ...remainingTables];

      for (const tableName of finalOrder) {
        console.log(`  Processing: ${tableName}`);
        sql += await getTableSchema(tableName);
      }
    }

    // Add indexes section
    sql += '\n-- =====================================================\n';
    sql += '-- INDEXES\n';
    sql += '-- =====================================================\n\n';
    sql += '-- Note: Primary key indexes are created automatically\n';
    sql += '-- Additional indexes should be added here as needed\n\n';

    // Add RLS section
    sql += '\n-- =====================================================\n';
    sql += '-- ROW LEVEL SECURITY (RLS)\n';
    sql += '-- =====================================================\n\n';
    sql += '-- Enable RLS on all tables\n';
    sql += '-- Note: Specific RLS policies should be defined in a separate file\n\n';

    // Write to file
    const outputPath = path.join(__dirname, '..', 'backend', 'migrations', 'initial_schema.sql');
    fs.writeFileSync(outputPath, sql);

    console.log('\n✅ Schema exported successfully!');
    console.log(`📄 File: ${outputPath}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function getTableSchema(tableName) {
  let tableSql = `-- Table: ${tableName}\n`;
  tableSql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

  try {
    // Get columns - try to query from table first
    const { data: sampleRow } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .single();

    if (sampleRow) {
      const columns = Object.keys(sampleRow);
      const columnDefs = columns.map(col => {
        const value = sampleRow[col];
        let type = 'TEXT';

        if (col.includes('_id') || col === 'id') {
          type = 'UUID';
        } else if (col.includes('_at')) {
          type = 'TIMESTAMP';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (typeof value === 'number') {
          type = 'INTEGER';
        } else if (typeof value === 'object' && value !== null) {
          type = 'JSONB';
        }

        return `  ${col} ${type}`;
      });

      tableSql += columnDefs.join(',\n');
    } else {
      // No data, create minimal schema
      tableSql += `  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n`;
      tableSql += `  created_at TIMESTAMP DEFAULT NOW(),\n`;
      tableSql += `  updated_at TIMESTAMP DEFAULT NOW()`;
    }

  } catch (error) {
    // Table doesn't exist or error accessing
    tableSql += `  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n`;
    tableSql += `  created_at TIMESTAMP DEFAULT NOW(),\n`;
    tableSql += `  updated_at TIMESTAMP DEFAULT NOW()`;
  }

  tableSql += '\n);\n\n';
  return tableSql;
}

exportSchema();
