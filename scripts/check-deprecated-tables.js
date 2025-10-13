// Check which deprecated tables actually exist
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEPRECATED_TABLES = [
  'nodes',
  'node_items',
  'node_lineage',
  'relationships',
  'references',
  'data_models',
  'data_model_members',
  'branches'
];

async function checkTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        return { exists: false, rowCount: 0 };
      }
      return { exists: false, rowCount: 0, error: error.message };
    }

    return { exists: true, rowCount: count || 0 };
  } catch (err) {
    return { exists: false, rowCount: 0, error: err.message };
  }
}

async function checkDeprecatedTables() {
  console.log('🔍 Checking for deprecated tables...\n');

  const existingTables = [];
  const missingTables = [];

  for (const tableName of DEPRECATED_TABLES) {
    const result = await checkTable(tableName);

    if (result.exists) {
      console.log(`✅ ${tableName} - EXISTS (${result.rowCount} rows)`);
      existingTables.push({ name: tableName, rows: result.rowCount });
    } else {
      console.log(`❌ ${tableName} - does not exist`);
      missingTables.push(tableName);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY\n');
  console.log(`Tables that exist: ${existingTables.length}`);
  console.log(`Tables that don't exist: ${missingTables.length}`);

  if (existingTables.length > 0) {
    console.log('\n🗑️  Tables to remove:');
    existingTables.forEach(t => console.log(`   • ${t.name} (${t.rows} rows)`));
  }

  if (missingTables.length > 0) {
    console.log('\n✅ Tables already removed:');
    missingTables.forEach(t => console.log(`   • ${t}`));
  }

  return { existingTables, missingTables };
}

checkDeprecatedTables().catch(console.error);
