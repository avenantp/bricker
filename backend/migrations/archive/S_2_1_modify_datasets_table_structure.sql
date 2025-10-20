-- =====================================================
-- MIGRATION: Modify Datasets Table Structure
-- =====================================================
-- Date: 2025-10-16
-- Description:
--   1. Remove workspace_id, project_id, and fqn columns from datasets
--   2. Add schema column if it doesn't exist
--   3. Add connection_id foreign key to datasets
--   4. Add catalog column to connections table
--   5. Add fully_qualified_name as a generated column (connection.catalog.schema.name)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add catalog column to connections table
-- =====================================================

-- Add catalog column to connections if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'catalog'
  ) THEN
    ALTER TABLE connections ADD COLUMN catalog VARCHAR;
  END IF;
END $$;

COMMENT ON COLUMN connections.catalog IS 'Catalog name (e.g., Unity Catalog in Databricks)';

-- =====================================================
-- STEP 2: Add connection_id and schema to datasets table
-- =====================================================

-- Add connection_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'datasets' AND column_name = 'connection_id'
  ) THEN
    ALTER TABLE datasets ADD COLUMN connection_id UUID REFERENCES connections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add schema column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'datasets' AND column_name = 'schema'
  ) THEN
    ALTER TABLE datasets ADD COLUMN schema VARCHAR;
  END IF;
END $$;

COMMENT ON COLUMN datasets.connection_id IS 'Reference to the connection this dataset belongs to';
COMMENT ON COLUMN datasets.schema IS 'Schema name within the catalog';

-- =====================================================
-- STEP 3: Create fully_qualified_name as a generated column
-- =====================================================

-- First, we need to add a helper function to get connection details
CREATE OR REPLACE FUNCTION get_dataset_fqn(
  p_connection_id UUID,
  p_schema VARCHAR,
  p_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_catalog VARCHAR;
BEGIN
  -- Get catalog from connection
  SELECT catalog INTO v_catalog
  FROM connections
  WHERE id = p_connection_id;

  -- Build FQN: catalog.schema.name
  IF v_catalog IS NOT NULL AND p_schema IS NOT NULL THEN
    RETURN v_catalog || '.' || p_schema || '.' || p_name;
  ELSIF p_schema IS NOT NULL THEN
    RETURN p_schema || '.' || p_name;
  ELSE
    RETURN p_name;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add fully_qualified_name as a generated column
-- Note: PostgreSQL doesn't support GENERATED ALWAYS for computed columns with functions
-- So we'll use a trigger-based approach instead
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'datasets' AND column_name = 'fully_qualified_name'
  ) THEN
    ALTER TABLE datasets ADD COLUMN fully_qualified_name VARCHAR;
  END IF;
END $$;

COMMENT ON COLUMN datasets.fully_qualified_name IS 'Fully qualified name: connection.catalog.schema.name (auto-generated)';

-- Create trigger function to auto-populate fully_qualified_name
CREATE OR REPLACE FUNCTION update_dataset_fqn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fully_qualified_name := get_dataset_fqn(NEW.connection_id, NEW.schema, NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_dataset_fqn ON datasets;
CREATE TRIGGER trigger_update_dataset_fqn
  BEFORE INSERT OR UPDATE OF connection_id, schema, name
  ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_dataset_fqn();

-- =====================================================
-- STEP 4: Migrate existing data (if needed)
-- =====================================================

-- Update existing rows to populate fully_qualified_name based on current fqn
UPDATE datasets
SET fully_qualified_name = fqn
WHERE fully_qualified_name IS NULL AND fqn IS NOT NULL;

-- =====================================================
-- STEP 5: Remove old columns from datasets table
-- =====================================================

-- Drop the old fqn column (replaced by fully_qualified_name)
ALTER TABLE datasets DROP COLUMN IF EXISTS fqn;

-- Drop workspace_id column
ALTER TABLE datasets DROP COLUMN IF EXISTS workspace_id;

-- Drop project_id column
ALTER TABLE datasets DROP COLUMN IF EXISTS project_id;

-- =====================================================
-- STEP 6: Update indexes
-- =====================================================

-- Drop old indexes that referenced removed columns
DROP INDEX IF EXISTS idx_datasets_workspace;
DROP INDEX IF EXISTS idx_datasets_project;
DROP INDEX IF EXISTS idx_datasets_fqn;

-- Create new indexes for new columns
CREATE INDEX IF NOT EXISTS idx_datasets_connection ON datasets(connection_id);
CREATE INDEX IF NOT EXISTS idx_datasets_schema ON datasets(schema);
CREATE INDEX IF NOT EXISTS idx_datasets_fully_qualified_name ON datasets(fully_qualified_name);

-- =====================================================
-- STEP 7: Update unique constraint
-- =====================================================

-- Drop old unique constraint on (account_id, fqn)
-- Note: The constraint name might vary, so we check first
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'datasets'::regclass
    AND contype = 'u'
    AND conkey = ARRAY(
      SELECT attnum FROM pg_attribute
      WHERE attrelid = 'datasets'::regclass
        AND attname IN ('account_id', 'fqn')
    );

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE datasets DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- Create new unique constraint on (account_id, fully_qualified_name)
-- Only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'datasets'::regclass
      AND contype = 'u'
      AND conkey = ARRAY(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'datasets'::regclass
          AND attname IN ('account_id', 'fully_qualified_name')
      )
  ) THEN
    ALTER TABLE datasets ADD CONSTRAINT datasets_account_fqn_unique
      UNIQUE (account_id, fully_qualified_name);
  END IF;
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (run these to verify changes)
-- =====================================================

-- Check datasets table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'datasets'
-- ORDER BY ordinal_position;

-- Check connections table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'connections'
-- ORDER BY ordinal_position;

-- Check indexes on datasets
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'datasets';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
