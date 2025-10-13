// List all tables in the public schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Querying Supabase database...\n');

  // Query to get all tables in public schema with row counts
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `
  });

  if (error) {
    // Fallback: Try using information_schema
    console.log('⚠️ RPC method not available, using direct query...\n');

    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error querying tables:', tablesError.message);

      // Last resort: Try to query specific known tables
      console.log('\n🔄 Attempting to check known tables...\n');
      await checkKnownTables();
      return;
    }

    console.log('📊 Tables in public schema:\n');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    console.log(`\n✅ Total tables: ${tables.length}`);
    return;
  }

  console.log('📊 Tables in public schema:\n');
  data.forEach((table, index) => {
    const rlsStatus = table.rls_enabled ? '🔒' : '🔓';
    console.log(`${index + 1}. ${table.tablename} ${rlsStatus}`);
  });
  console.log(`\n✅ Total tables: ${data.length}`);
  console.log('\n🔒 = RLS Enabled | 🔓 = RLS Disabled');
}

async function checkKnownTables() {
  const knownTables = [
    'users',
    'companies',
    'company_members',
    'subscription_plans',
    'workspaces',
    'projects',
    'project_members',
    'data_models',
    'data_model_members',
    'configurations',
    'audit_logs',
    'invitations',
    'datasets',
    'columns',
    'lineage',
    'project_datasets',
    'workspace_datasets',
    'git_commits',
    'metadata_changes'
  ];

  console.log('Known tables status:\n');

  for (const tableName of knownTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${tableName} - does not exist`);
        } else {
          console.log(`⚠️  ${tableName} - error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${tableName} - exists (${count} rows)`);
      }
    } catch (err) {
      console.log(`⚠️  ${tableName} - ${err.message}`);
    }
  }
}

listTables().catch(console.error);
