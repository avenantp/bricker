/**
 * Database Schema Validation Script
 * Validates datasets and columns tables per Feature 4 specification
 * Task 4.1.1: Database Schema Validation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dhclhobnxhdkkxrbtmkb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY2xob2JueGhka2t4cmJ0bWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ1NjQsImV4cCI6MjA3NTM3MDU2NH0.c5YGbmUX_CB9J7y256tICcxyxy4ikkF40TDB3eMii88';

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected schema for datasets table
const DATASETS_REQUIRED_COLUMNS = [
  'id',
  'account_id',
  'workspace_id',
  'project_id',
  'fqn',
  'name',
  'medallion_layer',
  'entity_type',
  'entity_subtype',
  'materialization_type',
  'description',
  'metadata',
  'ai_confidence_score',
  'owner_id',
  'visibility',
  'is_locked',
  'source_control_file_path',
  'source_control_commit_sha',
  'has_uncommitted_changes',
  'last_synced_at',
  'sync_status',
  'sync_error_message',
  'created_by',
  'created_at',
  'updated_at',
];

// Expected schema for columns table
const COLUMNS_REQUIRED_COLUMNS = [
  'id',
  'dataset_id',
  'fqn',
  'name',
  'data_type',
  'description',
  'business_name',
  'is_primary_key',
  'is_foreign_key',
  'is_nullable',
  'default_value',
  'reference_column_id',
  'reference_type',
  'reference_description',
  'transformation_logic',
  'ai_confidence_score',
  'ai_suggestions',
  'last_ai_enhancement',
  'position',
  'custom_metadata',
  'created_at',
  'updated_at',
];

// Validation results
let validationResults = {
  passed: [],
  failed: [],
  warnings: [],
};

function logPass(test) {
  console.log(`✅ PASS: ${test}`);
  validationResults.passed.push(test);
}

function logFail(test, details) {
  console.log(`❌ FAIL: ${test}`);
  console.log(`   Details: ${details}`);
  validationResults.failed.push({ test, details });
}

function logWarning(test, details) {
  console.log(`⚠️  WARNING: ${test}`);
  console.log(`   Details: ${details}`);
  validationResults.warnings.push({ test, details });
}

/**
 * 4.1.1.1: Verify datasets table exists with all required columns
 */
async function validateDatasetsTable() {
  console.log('\n🔍 4.1.1.1: Validating datasets table structure...');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .limit(0);

    if (error) {
      logFail('4.1.1.1: Datasets table exists', error.message);
      return false;
    }

    logPass('4.1.1.1: Datasets table exists');

    // Check for required columns by attempting a select
    for (const column of DATASETS_REQUIRED_COLUMNS) {
      const { error: colError } = await supabase
        .from('datasets')
        .select(column)
        .limit(0);

      if (colError) {
        logFail(`4.1.1.1: datasets.${column} column exists`, colError.message);
      } else {
        logPass(`4.1.1.1: datasets.${column} column exists`);
      }
    }

    return true;
  } catch (err) {
    logFail('4.1.1.1: Datasets table validation', err.message);
    return false;
  }
}

/**
 * 4.1.1.2: Verify columns table exists with reference columns
 */
async function validateColumnsTable() {
  console.log('\n🔍 4.1.1.2: Validating columns table structure...');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .limit(0);

    if (error) {
      logFail('4.1.1.2: Columns table exists', error.message);
      return false;
    }

    logPass('4.1.1.2: Columns table exists');

    // Check for required columns
    for (const column of COLUMNS_REQUIRED_COLUMNS) {
      const { error: colError } = await supabase
        .from('columns')
        .select(column)
        .limit(0);

      if (colError) {
        logFail(`4.1.1.2: columns.${column} column exists`, colError.message);
      } else {
        logPass(`4.1.1.2: columns.${column} column exists`);
      }
    }

    // Specifically verify reference columns
    const referenceColumns = ['reference_column_id', 'reference_type', 'reference_description'];
    for (const column of referenceColumns) {
      const { error: refError } = await supabase
        .from('columns')
        .select(column)
        .limit(0);

      if (refError) {
        logFail(`4.1.1.2: columns.${column} (reference) exists`, refError.message);
      } else {
        logPass(`4.1.1.2: columns.${column} (reference) exists`);
      }
    }

    return true;
  } catch (err) {
    logFail('4.1.1.2: Columns table validation', err.message);
    return false;
  }
}

/**
 * 4.1.1.3: Verify account_id exists on both tables for multi-tenancy
 */
async function validateMultiTenancy() {
  console.log('\n🔍 4.1.1.3: Validating multi-tenancy (account_id) columns...');

  // Check datasets.account_id
  const { error: datasetsError } = await supabase
    .from('datasets')
    .select('account_id')
    .limit(0);

  if (datasetsError) {
    logFail('4.1.1.3: datasets.account_id exists', datasetsError.message);
  } else {
    logPass('4.1.1.3: datasets.account_id exists for multi-tenancy');
  }

  // Check columns table has dataset_id (inherits account_id through dataset)
  const { error: columnsError } = await supabase
    .from('columns')
    .select('dataset_id')
    .limit(0);

  if (columnsError) {
    logFail('4.1.1.3: columns.dataset_id exists', columnsError.message);
  } else {
    logPass('4.1.1.3: columns.dataset_id exists (for dataset relationship)');
  }
}

/**
 * 4.1.1.4: Verify owner_id and visibility columns exist
 */
async function validateOwnershipColumns() {
  console.log('\n🔍 4.1.1.4: Validating ownership and visibility columns...');

  // Check datasets.owner_id
  const { error: ownerError } = await supabase
    .from('datasets')
    .select('owner_id')
    .limit(0);

  if (ownerError) {
    logFail('4.1.1.4: datasets.owner_id exists', ownerError.message);
  } else {
    logPass('4.1.1.4: datasets.owner_id exists');
  }

  // Check datasets.visibility
  const { error: visibilityError } = await supabase
    .from('datasets')
    .select('visibility')
    .limit(0);

  if (visibilityError) {
    logFail('4.1.1.4: datasets.visibility exists', visibilityError.message);
  } else {
    logPass('4.1.1.4: datasets.visibility exists');
  }

  // Check datasets.is_locked
  const { error: lockedError } = await supabase
    .from('datasets')
    .select('is_locked')
    .limit(0);

  if (lockedError) {
    logFail('4.1.1.4: datasets.is_locked exists', lockedError.message);
  } else {
    logPass('4.1.1.4: datasets.is_locked exists');
  }
}

/**
 * 4.1.1.5: Test RLS policies for company isolation
 */
async function validateRLSPolicies() {
  console.log('\n🔍 4.1.1.5: Validating RLS policies...');

  // Note: RLS policy validation requires direct database access or admin privileges
  // This is a basic test that checks if we can query the tables
  // (which means RLS is either enabled and working, or disabled)

  const { error: datasetsRLSError } = await supabase
    .from('datasets')
    .select('id')
    .limit(1);

  if (datasetsRLSError) {
    // Check if error is RLS-related
    if (datasetsRLSError.message.includes('policy') || datasetsRLSError.message.includes('RLS')) {
      logPass('4.1.1.5: Datasets RLS is enabled (policy enforcement active)');
    } else {
      logWarning('4.1.1.5: Datasets RLS status unclear', datasetsRLSError.message);
    }
  } else {
    logWarning('4.1.1.5: Datasets accessible (RLS may be disabled or policies allow access)',
      'This is expected if RLS is disabled per migration 004_disable_rls.sql');
  }

  const { error: columnsRLSError } = await supabase
    .from('columns')
    .select('id')
    .limit(1);

  if (columnsRLSError) {
    if (columnsRLSError.message.includes('policy') || columnsRLSError.message.includes('RLS')) {
      logPass('4.1.1.5: Columns RLS is enabled (policy enforcement active)');
    } else {
      logWarning('4.1.1.5: Columns RLS status unclear', columnsRLSError.message);
    }
  } else {
    logWarning('4.1.1.5: Columns accessible (RLS may be disabled or policies allow access)',
      'This is expected if RLS is disabled per migration 004_disable_rls.sql');
  }
}

/**
 * 4.1.1.6: Verify indexes are created
 */
async function validateIndexes() {
  console.log('\n🔍 4.1.1.6: Validating indexes...');

  // Note: Index validation requires admin access to pg_indexes
  // We can infer index existence through query performance or admin queries
  logWarning('4.1.1.6: Index validation requires admin access to pg_indexes',
    'Manual verification needed via Supabase dashboard or direct PostgreSQL access');

  // Expected indexes per specification:
  const expectedIndexes = [
    'idx_datasets_account',
    'idx_datasets_workspace',
    'idx_datasets_project',
    'idx_datasets_owner',
    'idx_datasets_fqn',
    'idx_datasets_name',
    'idx_datasets_visibility',
    'idx_datasets_sync_status',
    'idx_datasets_uncommitted',
    'idx_columns_dataset',
    'idx_columns_fqn',
    'idx_columns_name',
    'idx_columns_reference',
    'idx_columns_is_pk',
    'idx_columns_is_fk',
  ];

  console.log('   Expected indexes:', expectedIndexes.join(', '));
}

/**
 * 4.1.1.7: Test foreign key constraints
 */
async function validateForeignKeys() {
  console.log('\n🔍 4.1.1.7: Validating foreign key constraints...');

  // Test datasets foreign keys by attempting invalid inserts
  // (These should fail due to FK constraints)

  // Test 1: datasets.account_id -> accounts.id
  logWarning('4.1.1.7: datasets.account_id FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 2: datasets.workspace_id -> workspaces.id
  logWarning('4.1.1.7: datasets.workspace_id FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 3: datasets.project_id -> projects.id
  logWarning('4.1.1.7: datasets.project_id FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 4: datasets.owner_id -> users.id
  logWarning('4.1.1.7: datasets.owner_id FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 5: datasets.created_by -> users.id
  logWarning('4.1.1.7: datasets.created_by FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 6: columns.dataset_id -> datasets.id
  logWarning('4.1.1.7: columns.dataset_id FK constraint',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  // Test 7: columns.reference_column_id -> columns.id
  logWarning('4.1.1.7: columns.reference_column_id FK constraint (self-reference)',
    'Cannot test FK constraints with anon key - requires valid test data or admin access');

  console.log('   ℹ️  FK constraints should be tested via integration tests with valid data');
}

/**
 * 4.1.1.8: Verify unique constraints
 */
async function validateUniqueConstraints() {
  console.log('\n🔍 4.1.1.8: Validating unique constraints...');

  // Expected unique constraints per specification:
  // - datasets: UNIQUE(account_id, fqn)
  // - columns: UNIQUE(dataset_id, name)

  logWarning('4.1.1.8: UNIQUE(account_id, fqn) on datasets',
    'Cannot test unique constraints with anon key - requires valid test data or admin access');

  logWarning('4.1.1.8: UNIQUE(dataset_id, name) on columns',
    'Cannot test unique constraints with anon key - requires valid test data or admin access');

  console.log('   ℹ️  Unique constraints should be tested via integration tests with duplicate data attempts');
}

/**
 * Generate SQL migration if tables don't exist
 */
function generateMigrationSQL() {
  return `-- =====================================================
-- Migration: 009_create_datasets_columns_tables
-- Feature 4: Dataset and Column Metadata Management
-- =====================================================

-- =====================================================
-- DATASETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Classification
  medallion_layer VARCHAR CHECK (medallion_layer IN ('Raw', 'Bronze', 'Silver', 'Gold')),
  entity_type VARCHAR CHECK (entity_type IN ('Table', 'Staging', 'PersistentStaging', 'DataVault', 'DataMart')),
  entity_subtype VARCHAR CHECK (entity_subtype IN ('Dimension', 'Fact', 'Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge')),
  materialization_type VARCHAR CHECK (materialization_type IN ('Table', 'View', 'MaterializedView')),

  -- Documentation
  description TEXT,
  metadata JSONB,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- Ownership and Security
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Source control sync tracking
  source_control_file_path VARCHAR,
  source_control_commit_sha VARCHAR,
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error_message TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, fqn)
);

-- =====================================================
-- COLUMNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Data type
  data_type VARCHAR NOT NULL,

  -- Documentation
  description TEXT,
  business_name VARCHAR,

  -- Properties
  is_primary_key BOOLEAN DEFAULT false,
  is_foreign_key BOOLEAN DEFAULT false,
  is_nullable BOOLEAN DEFAULT true,
  default_value TEXT,

  -- Reference (replaces separate references table)
  reference_column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  reference_type VARCHAR CHECK (reference_type IN ('FK', 'BusinessKey', 'NaturalKey')),
  reference_description TEXT,

  -- Transformation
  transformation_logic TEXT,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  ai_suggestions JSONB,
  last_ai_enhancement TIMESTAMP,

  -- Position
  position INTEGER,

  -- Custom metadata
  custom_metadata JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(dataset_id, name)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Datasets indexes
CREATE INDEX IF NOT EXISTS idx_datasets_account ON datasets(account_id);
CREATE INDEX IF NOT EXISTS idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_datasets_owner ON datasets(owner_id);
CREATE INDEX IF NOT EXISTS idx_datasets_fqn ON datasets(fqn);
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name);
CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON datasets(visibility);
CREATE INDEX IF NOT EXISTS idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX IF NOT EXISTS idx_datasets_uncommitted ON datasets(has_uncommitted_changes)
  WHERE has_uncommitted_changes = true;

-- Columns indexes
CREATE INDEX IF NOT EXISTS idx_columns_dataset ON columns(dataset_id);
CREATE INDEX IF NOT EXISTS idx_columns_fqn ON columns(fqn);
CREATE INDEX IF NOT EXISTS idx_columns_name ON columns(name);
CREATE INDEX IF NOT EXISTS idx_columns_reference ON columns(reference_column_id);
CREATE INDEX IF NOT EXISTS idx_columns_is_pk ON columns(is_primary_key)
  WHERE is_primary_key = true;
CREATE INDEX IF NOT EXISTS idx_columns_is_fk ON columns(is_foreign_key)
  WHERE is_foreign_key = true;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_datasets_search ON datasets
  USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_columns_search ON columns
  USING gin(to_tsvector('english', name || ' ' || COALESCE(business_name, '') || ' ' || COALESCE(description, '')));

-- =====================================================
-- RLS POLICIES (if RLS is enabled)
-- =====================================================

-- Enable RLS on datasets table
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Datasets SELECT policy: Users can only see datasets from their account
CREATE POLICY datasets_select_policy ON datasets
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Datasets INSERT policy: Account members can create datasets
CREATE POLICY datasets_insert_policy ON datasets
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Datasets UPDATE policy: Owner and account admins can update
CREATE POLICY datasets_update_policy ON datasets
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Datasets DELETE policy: Only owner and account admins can delete
CREATE POLICY datasets_delete_policy ON datasets
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Enable RLS on columns table
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

-- Columns inherit dataset permissions via dataset_id
CREATE POLICY columns_select_policy ON columns
  FOR SELECT
  USING (
    dataset_id IN (
      SELECT id FROM datasets
      WHERE account_id IN (
        SELECT account_id FROM account_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY columns_insert_policy ON columns
  FOR INSERT
  WITH CHECK (
    dataset_id IN (
      SELECT id FROM datasets
      WHERE account_id IN (
        SELECT account_id FROM account_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY columns_update_policy ON columns
  FOR UPDATE
  USING (
    dataset_id IN (
      SELECT id FROM datasets
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id FROM account_users WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
  );

CREATE POLICY columns_delete_policy ON columns
  FOR DELETE
  USING (
    dataset_id IN (
      SELECT id FROM datasets
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id FROM account_users WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp on datasets
CREATE OR REPLACE FUNCTION update_datasets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_datasets_updated_at();

-- Update updated_at timestamp on columns
CREATE OR REPLACE FUNCTION update_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_columns_updated_at
  BEFORE UPDATE ON columns
  FOR EACH ROW
  EXECUTE FUNCTION update_columns_updated_at();

-- Mark dataset as having uncommitted changes when columns are modified
CREATE OR REPLACE FUNCTION mark_dataset_uncommitted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE datasets
  SET has_uncommitted_changes = true
  WHERE id = COALESCE(NEW.dataset_id, OLD.dataset_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_columns_mark_uncommitted
  AFTER INSERT OR UPDATE OR DELETE ON columns
  FOR EACH ROW
  EXECUTE FUNCTION mark_dataset_uncommitted();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
`;
}

/**
 * Main validation function
 */
async function runValidation() {
  console.log('═'.repeat(70));
  console.log('📋 DATABASE SCHEMA VALIDATION');
  console.log('Feature 4: Dataset and Column Metadata Management');
  console.log('Task 4.1.1: Database Schema Validation');
  console.log('═'.repeat(70));

  await validateDatasetsTable();
  await validateColumnsTable();
  await validateMultiTenancy();
  await validateOwnershipColumns();
  await validateRLSPolicies();
  await validateIndexes();
  await validateForeignKeys();
  await validateUniqueConstraints();

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 VALIDATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Passed: ${validationResults.passed.length}`);
  console.log(`❌ Failed: ${validationResults.failed.length}`);
  console.log(`⚠️  Warnings: ${validationResults.warnings.length}`);

  if (validationResults.failed.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    validationResults.failed.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure.test}`);
      console.log(`     ${failure.details}`);
    });

    console.log('\n📝 REQUIRED ACTIONS:');
    console.log('   1. Create migration file: supabase/migrations/009_create_datasets_columns_tables.sql');
    console.log('   2. Copy the SQL below into the migration file');
    console.log('   3. Run: supabase db push (or apply via Supabase dashboard)');
    console.log('   4. Re-run this validation script\n');

    console.log('💾 MIGRATION SQL:');
    console.log('═'.repeat(70));
    console.log(generateMigrationSQL());
    console.log('═'.repeat(70));
  } else if (validationResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (manual verification recommended):');
    validationResults.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning.test}`);
      console.log(`     ${warning.details}`);
    });
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('   Database schema is valid for Feature 4 implementation.');
  }

  console.log('\n' + '═'.repeat(70));
}

// Run validation
runValidation().catch(console.error);
