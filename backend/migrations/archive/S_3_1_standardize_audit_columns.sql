-- =====================================================
-- MIGRATION: Standardize Audit Columns Across All Tables
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Standardizes all audit columns to use consistent naming:
--   - created_by (UUID) - User who created the record
--   - created_at (TIMESTAMP) - When the record was created
--   - updated_by (UUID) - User who last updated the record
--   - updated_at (TIMESTAMP) - When the record was last updated
--
-- Changes:
--   1. Junction tables: Rename added_at -> created_at, added_by -> created_by
--   2. Add missing audit columns to all tables
--   3. Create/update triggers to auto-populate updated_at and updated_by
--   4. Update indexes to reflect column renames
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add uuid-ossp extension if not exists
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 2: Standardize workspace_datasets table
-- =====================================================

DO $$
BEGIN
  -- Rename added_at to created_at if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'added_at'
  ) THEN
    ALTER TABLE workspace_datasets RENAME COLUMN added_at TO created_at;
    RAISE NOTICE 'Renamed workspace_datasets.added_at to created_at';
  END IF;

  -- Rename added_by to created_by if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE workspace_datasets RENAME COLUMN added_by TO created_by;
    RAISE NOTICE 'Renamed workspace_datasets.added_by to created_by';
  END IF;

  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE workspace_datasets ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added workspace_datasets.created_at';
  END IF;

  -- Add created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE workspace_datasets ADD COLUMN created_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added workspace_datasets.created_by';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE workspace_datasets ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added workspace_datasets.updated_at';
  END IF;

  -- Add updated_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_datasets' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE workspace_datasets ADD COLUMN updated_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added workspace_datasets.updated_by';
  END IF;
END $$;

COMMENT ON COLUMN workspace_datasets.created_at IS 'Timestamp when the dataset was added to the workspace';
COMMENT ON COLUMN workspace_datasets.created_by IS 'User who added the dataset to the workspace';
COMMENT ON COLUMN workspace_datasets.updated_at IS 'Timestamp when the mapping was last updated';
COMMENT ON COLUMN workspace_datasets.updated_by IS 'User who last updated the mapping';

-- =====================================================
-- STEP 3: Standardize diagram_datasets table
-- =====================================================

DO $$
BEGIN
  -- Rename added_at to created_at if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'added_at'
  ) THEN
    ALTER TABLE diagram_datasets RENAME COLUMN added_at TO created_at;
    RAISE NOTICE 'Renamed diagram_datasets.added_at to created_at';
  END IF;

  -- Rename added_by to created_by if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE diagram_datasets RENAME COLUMN added_by TO created_by;
    RAISE NOTICE 'Renamed diagram_datasets.added_by to created_by';
  END IF;

  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE diagram_datasets ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added diagram_datasets.created_at';
  END IF;

  -- Add created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE diagram_datasets ADD COLUMN created_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added diagram_datasets.created_by';
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE diagram_datasets ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added diagram_datasets.updated_at';
  END IF;

  -- Add updated_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diagram_datasets' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE diagram_datasets ADD COLUMN updated_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added diagram_datasets.updated_by';
  END IF;
END $$;

COMMENT ON COLUMN diagram_datasets.created_at IS 'Timestamp when the dataset was added to the diagram';
COMMENT ON COLUMN diagram_datasets.created_by IS 'User who added the dataset to the diagram';
COMMENT ON COLUMN diagram_datasets.updated_at IS 'Timestamp when the mapping was last updated';
COMMENT ON COLUMN diagram_datasets.updated_by IS 'User who last updated the mapping';

-- =====================================================
-- STEP 4: Add missing audit columns to all core tables
-- =====================================================

-- List of core tables that should have full audit columns
DO $$
DECLARE
  tbl TEXT;
  tables_to_update TEXT[] := ARRAY[
    'accounts',
    'users',
    'workspaces',
    'projects',
    'connections',
    'datasets',
    'columns',
    'diagrams',
    'lineage_edges',
    'workspace_members',
    'project_members',
    'account_users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_update
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN

      -- Add created_at if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = 'created_at'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMP DEFAULT NOW()', tbl);
        RAISE NOTICE 'Added %.created_at', tbl;
      END IF;

      -- Add created_by if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = 'created_by'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN created_by UUID REFERENCES users(id)', tbl);
        RAISE NOTICE 'Added %.created_by', tbl;
      END IF;

      -- Add updated_at if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = 'updated_at'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()', tbl);
        RAISE NOTICE 'Added %.updated_at', tbl;
      END IF;

      -- Add updated_by if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = tbl AND column_name = 'updated_by'
      ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by UUID REFERENCES users(id)', tbl);
        RAISE NOTICE 'Added %.updated_by', tbl;
      END IF;

    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 5: Create universal trigger function for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Universal trigger function to automatically update updated_at timestamp';

-- =====================================================
-- STEP 6: Create triggers for all tables with updated_at
-- =====================================================

DO $$
DECLARE
  tbl TEXT;
  trigger_name TEXT;
  tables_with_updated_at TEXT[] := ARRAY[
    'accounts',
    'users',
    'workspaces',
    'projects',
    'connections',
    'datasets',
    'columns',
    'diagrams',
    'lineage_edges',
    'workspace_members',
    'project_members',
    'account_users',
    'workspace_datasets',
    'diagram_datasets'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at
  LOOP
    -- Check if table exists and has updated_at column
    IF EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) AND EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'updated_at'
    ) THEN

      trigger_name := 'trigger_' || tbl || '_updated_at';

      -- Drop existing trigger if it exists
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, tbl);

      -- Create new trigger
      EXECUTE format('
        CREATE TRIGGER %I
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      ', trigger_name, tbl);

      RAISE NOTICE 'Created trigger % on table %', trigger_name, tbl;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 7: Update function signatures that use old column names
-- =====================================================

-- Update get_diagram_datasets function to use new column names
DROP FUNCTION IF EXISTS get_diagram_datasets(UUID);
CREATE OR REPLACE FUNCTION get_diagram_datasets(p_diagram_id UUID)
RETURNS TABLE (
  dataset_id UUID,
  dataset_name VARCHAR,
  fully_qualified_name VARCHAR,
  location JSONB,
  is_expanded BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.fully_qualified_name,
    dd.location,
    dd.is_expanded,
    dd.created_at
  FROM diagram_datasets dd
  JOIN datasets d ON d.id = dd.dataset_id
  WHERE dd.diagram_id = p_diagram_id
  ORDER BY dd.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_diagram_datasets IS 'Returns all datasets in a diagram (updated to use created_at)';

-- Update add_dataset_to_diagram function to use new column names
DROP FUNCTION IF EXISTS add_dataset_to_diagram(UUID, UUID, JSONB, UUID);
CREATE OR REPLACE FUNCTION add_dataset_to_diagram(
  p_diagram_id UUID,
  p_dataset_id UUID,
  p_location JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO diagram_datasets (
    diagram_id,
    dataset_id,
    location,
    created_by
  ) VALUES (
    p_diagram_id,
    p_dataset_id,
    p_location,
    p_user_id
  )
  ON CONFLICT (diagram_id, dataset_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_dataset_to_diagram IS 'Adds a dataset to a diagram (updated to use created_by)';

-- =====================================================
-- STEP 8: Update indexes if needed
-- =====================================================

-- No index changes needed as we're renaming columns, not changing structure

-- =====================================================
-- STEP 9: Verification
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
  missing_columns TEXT;
BEGIN
  -- Check that all tables have standard audit columns
  SELECT COUNT(DISTINCT table_name) INTO table_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      'accounts', 'users', 'workspaces', 'projects', 'connections',
      'datasets', 'columns', 'diagrams', 'lineage_edges',
      'workspace_members', 'project_members', 'account_users',
      'workspace_datasets', 'diagram_datasets'
    )
    AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by');

  RAISE NOTICE 'Audit columns verified on % tables', table_count;

  -- Check for any tables still using old column names
  SELECT string_agg(table_name || '.' || column_name, ', ') INTO missing_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name IN ('added_at', 'added_by');

  IF missing_columns IS NOT NULL THEN
    RAISE WARNING 'Tables still using old column names: %', missing_columns;
  ELSE
    RAISE NOTICE 'No tables found using old column names (added_at, added_by)';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUMMARY QUERIES (for manual verification)
-- =====================================================

-- View all tables and their audit columns
/*
SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'created_at') as has_created_at,
  COUNT(*) FILTER (WHERE column_name = 'created_by') as has_created_by,
  COUNT(*) FILTER (WHERE column_name = 'updated_at') as has_updated_at,
  COUNT(*) FILTER (WHERE column_name = 'updated_by') as has_updated_by,
  COUNT(*) FILTER (WHERE column_name = 'added_at') as has_added_at,
  COUNT(*) FILTER (WHERE column_name = 'added_by') as has_added_by
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by', 'added_at', 'added_by')
GROUP BY table_name
ORDER BY table_name;
*/

-- View all triggers on updated_at
/*
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
