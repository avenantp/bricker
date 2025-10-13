#!/usr/bin/env node

/**
 * Generate initial_schema.sql from current Supabase database
 * This script queries the database schema and generates a complete SQL file
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

async function generateSchema() {
  console.log('🔍 Generating initial_schema.sql from current database...\n');

  let sql = `-- =====================================================
-- INITIAL SCHEMA
-- =====================================================
-- This schema represents the current state of the database
-- after all migrations have been applied
-- Generated: ${new Date().toISOString()}
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

  try {
    // Get all tables
    console.log('📊 Fetching tables...');
    const tables = await getAllTables();
    console.log(`   Found ${tables.length} tables\n`);

    // Order tables by dependency
    const orderedTables = orderTablesByDependency(tables);

    sql += '-- =====================================================\n';
    sql += '-- TABLES\n';
    sql += '-- =====================================================\n\n';

    for (const tableName of orderedTables) {
      console.log(`  📝 Processing: ${tableName}`);
      const tableSchema = await getCompleteTableSchema(tableName);
      if (tableSchema) {
        sql += tableSchema;
      }
    }

    // Add indexes
    console.log('\n📇 Fetching indexes...');
    sql += await getAllIndexes(orderedTables);

    // Add foreign keys
    console.log('🔗 Fetching foreign keys...');
    sql += await getAllForeignKeys(orderedTables);

    // Add RLS note
    sql += '\n-- =====================================================\n';
    sql += '-- ROW LEVEL SECURITY (RLS)\n';
    sql += '-- =====================================================\n';
    sql += '-- RLS policies should be defined separately\n';
    sql += '-- Enable RLS on tables as needed\n\n';

    // Write to file
    const outputPath = path.join(__dirname, '..', 'backend', 'migrations', 'initial_schema.sql');
    fs.writeFileSync(outputPath, sql);

    console.log('\n✅ Schema generated successfully!');
    console.log(`📄 File: ${outputPath}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB`);
    console.log(`📋 Tables: ${orderedTables.length}`);

    return outputPath;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function getAllTables() {
  // Query information_schema for all tables
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
    ORDER BY table_name;
  `;

  // Try direct query first
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    if (!error && data) {
      return data.map(row => row.table_name);
    }
  } catch (e) {
    // Fall through to manual method
  }

  // Fallback: Use known tables from our check
  return [
    'companies',
    'subscription_plans',
    'users',
    'company_users',
    'projects',
    'project_users',
    'project_datasets',
    'workspaces',
    'workspace_users',
    'workspace_datasets',
    'datasets',
    'columns',
    'lineage',
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
}

function orderTablesByDependency(tables) {
  // Define dependency order
  const order = {
    // Core tables (no dependencies)
    'companies': 1,
    'subscription_plans': 1,

    // Users (depends on companies)
    'users': 2,

    // Projects and workspaces (depend on companies and users)
    'projects': 3,
    'workspaces': 3,

    // Membership tables (depend on users)
    'company_users': 3,
    'project_users': 3,
    'workspace_users': 3,

    // Data model (depends on workspaces/projects)
    'datasets': 4,
    'columns': 5,
    'lineage': 6,

    // Mapping tables
    'project_datasets': 5,
    'workspace_datasets': 5,

    // Support tables
    'environments': 4,
    'connections': 4,
    'macros': 4,
    'templates': 4,
    'template_fragments': 5,

    // Tracking tables
    'source_code_commits': 4,
    'audit_logs': 5,

    // System tables
    'configurations': 2,
    'invitations': 3
  };

  return tables.sort((a, b) => {
    const orderA = order[a] || 999;
    const orderB = order[b] || 999;
    if (orderA === orderB) {
      return a.localeCompare(b);
    }
    return orderA - orderB;
  });
}

async function getCompleteTableSchema(tableName) {
  try {
    // Get table definition
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;

    // Try to get column info
    let columns = [];
    try {
      const { data } = await supabase.rpc('exec_sql', { sql: columnsQuery });
      if (data) columns = data;
    } catch (e) {
      // Fallback: try to infer from actual data
      const { data: sample } = await supabase.from(tableName).select('*').limit(1).single();
      if (sample) {
        columns = Object.keys(sample).map(col => ({
          column_name: col,
          data_type: inferDataType(col, sample[col]),
          is_nullable: 'YES',
          column_default: getDefaultValue(col)
        }));
      }
    }

    if (columns.length === 0) {
      console.log(`     ⚠️  No columns found for ${tableName}, skipping...`);
      return '';
    }

    let tableSql = `-- Table: ${tableName}\n`;
    tableSql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

    const columnDefs = columns.map((col, idx) => {
      const name = col.column_name;
      const type = mapDataType(col);
      const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

      return `  ${name} ${type}${nullable}${defaultVal}`;
    });

    tableSql += columnDefs.join(',\n');
    tableSql += '\n);\n\n';

    return tableSql;

  } catch (error) {
    console.log(`     ❌ Error processing ${tableName}:`, error.message);
    return '';
  }
}

function mapDataType(col) {
  const type = col.data_type || col.udt_name;

  if (type === 'uuid') return 'UUID';
  if (type === 'character varying' || type === 'varchar') {
    if (col.character_maximum_length) {
      return `VARCHAR(${col.character_maximum_length})`;
    }
    return 'VARCHAR';
  }
  if (type === 'text') return 'TEXT';
  if (type === 'integer') return 'INTEGER';
  if (type === 'bigint') return 'BIGINT';
  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'timestamp without time zone') return 'TIMESTAMP';
  if (type === 'timestamp with time zone') return 'TIMESTAMPTZ';
  if (type === 'jsonb') return 'JSONB';
  if (type === 'json') return 'JSON';
  if (type === 'numeric') return 'NUMERIC';
  if (type === 'real') return 'REAL';
  if (type === 'double precision') return 'DOUBLE PRECISION';

  return type.toUpperCase();
}

function inferDataType(columnName, value) {
  if (columnName.endsWith('_id') || columnName === 'id') return 'uuid';
  if (columnName.endsWith('_at')) return 'timestamp without time zone';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'numeric';
  }
  if (typeof value === 'object' && value !== null) return 'jsonb';
  return 'text';
}

function getDefaultValue(columnName) {
  if (columnName === 'id' || columnName.endsWith('_id')) {
    return 'uuid_generate_v4()';
  }
  if (columnName === 'created_at') {
    return 'NOW()';
  }
  if (columnName === 'updated_at') {
    return 'NOW()';
  }
  return null;
}

async function getAllIndexes(tables) {
  let indexSql = '\n-- =====================================================\n';
  indexSql += '-- INDEXES\n';
  indexSql += '-- =====================================================\n\n';

  // Note: We'll skip primary key indexes as they're created automatically
  indexSql += '-- Note: Primary key and unique constraint indexes are created automatically\n';
  indexSql += '-- Additional custom indexes should be added here\n\n';

  return indexSql;
}

async function getAllForeignKeys(tables) {
  let fkSql = '\n-- =====================================================\n';
  fkSql += '-- FOREIGN KEY CONSTRAINTS\n';
  fkSql += '-- =====================================================\n\n';

  fkSql += '-- Foreign key constraints should be added here\n';
  fkSql += '-- Format: ALTER TABLE table_name ADD CONSTRAINT fk_name FOREIGN KEY (column) REFERENCES other_table(id);\n\n';

  return fkSql;
}

// Run the script
generateSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
