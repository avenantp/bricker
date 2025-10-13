#!/usr/bin/env node

/**
 * Check column structure of existing tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, serviceKey);

async function checkTableColumns() {
  const tables = [
    'company_users',
    'project_users',
    'workspace_users',
    'datasets',
    'columns',
    'lineage',
    'source_code_commits',
    'audit_logs'
  ];

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        console.log(`\n📋 ${tableName}:`);
        console.log(`   Columns: ${columns.join(', ')}`);

        // Check for primary key-like columns
        const pkCandidates = columns.filter(c =>
          c.endsWith('_id') || c === 'id' || c.includes('uuid')
        );
        console.log(`   PK candidates: ${pkCandidates.join(', ') || 'none found'}`);
      }
    } catch (e) {
      console.log(`❌ ${tableName}: ${e.message}`);
    }
  }
}

checkTableColumns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
