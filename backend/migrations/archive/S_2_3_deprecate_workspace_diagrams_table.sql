-- =====================================================
-- MIGRATION: Deprecate workspace_diagrams Table
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   The workspace_diagrams table is being deprecated in favor of the diagrams table.
--   The diagrams table (created in S_2_2) provides better structure:
--   1. diagrams table already has workspace_id (diagrams belong to workspaces)
--   2. diagram_datasets mapping table provides many-to-many relationship
--   3. Better separation of concerns between diagram metadata and dataset membership
--
-- This migration:
--   1. Removes workspace_diagram_id column from datasets table
--   2. Drops the workspace_diagrams table and its indexes/triggers
--   3. Ensures diagrams table properly links workspaces to datasets
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Remove workspace_diagram_id from datasets table
-- =====================================================

-- Drop index first
DROP INDEX IF EXISTS idx_datasets_workspace_diagram_id;

-- Remove the foreign key column
ALTER TABLE datasets DROP COLUMN IF EXISTS workspace_diagram_id CASCADE;

COMMENT ON TABLE datasets IS 'Datasets no longer directly reference diagrams; use diagram_datasets for diagram membership';

-- =====================================================
-- STEP 2: Drop workspace_diagrams table, indexes, and triggers
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_workspace_diagrams_updated_at ON workspace_diagrams;
DROP TRIGGER IF EXISTS trigger_set_workspace_diagram_account ON workspace_diagrams;
DROP TRIGGER IF EXISTS trigger_enforce_single_default_diagram ON workspace_diagrams;

-- Drop functions
DROP FUNCTION IF EXISTS update_workspace_diagrams_updated_at();
DROP FUNCTION IF EXISTS set_workspace_diagram_account();
DROP FUNCTION IF EXISTS enforce_single_default_diagram();

-- Drop indexes
DROP INDEX IF EXISTS idx_workspace_diagrams_workspace_id;
DROP INDEX IF EXISTS idx_workspace_diagrams_account_id;
DROP INDEX IF EXISTS idx_workspace_diagrams_created_by;
DROP INDEX IF EXISTS idx_workspace_diagrams_is_default;
DROP INDEX IF EXISTS idx_workspace_diagrams_unique_default;
DROP INDEX IF EXISTS idx_workspace_diagrams_unique_name;

-- Drop the table
DROP TABLE IF EXISTS workspace_diagrams CASCADE;

-- =====================================================
-- STEP 3: Add comments documenting the new structure
-- =====================================================

COMMENT ON TABLE diagrams IS 'Diagrams belong to workspaces via workspace_id; datasets belong to diagrams via diagram_datasets mapping table';
COMMENT ON TABLE diagram_datasets IS 'Many-to-many mapping between diagrams and datasets (replaces workspace_diagram_id on datasets)';

-- =====================================================
-- STEP 4: Verification
-- =====================================================

DO $$
BEGIN
  -- Verify workspace_diagrams table is dropped
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_diagrams'
  ) THEN
    RAISE EXCEPTION 'FAILED: workspace_diagrams table still exists';
  ELSE
    RAISE NOTICE 'SUCCESS: workspace_diagrams table dropped';
  END IF;

  -- Verify workspace_diagram_id column is removed from datasets
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'datasets'
      AND column_name = 'workspace_diagram_id'
  ) THEN
    RAISE EXCEPTION 'FAILED: datasets.workspace_diagram_id column still exists';
  ELSE
    RAISE NOTICE 'SUCCESS: datasets.workspace_diagram_id column removed';
  END IF;

  -- Verify diagrams table exists with workspace_id
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'diagrams'
      AND column_name = 'workspace_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: diagrams.workspace_id exists';
  ELSE
    RAISE EXCEPTION 'FAILED: diagrams.workspace_id does not exist';
  END IF;

  -- Verify diagram_datasets table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'diagram_datasets'
  ) THEN
    RAISE NOTICE 'SUCCESS: diagram_datasets table exists';
  ELSE
    RAISE EXCEPTION 'FAILED: diagram_datasets table does not exist';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- New relationship structure:
--   Workspace (1) -> (M) Diagrams (via diagrams.workspace_id)
--   Diagram (M) <-> (M) Datasets (via diagram_datasets mapping table)
--
-- To get all datasets in a workspace:
--   SELECT DISTINCT d.* FROM datasets d
--   JOIN diagram_datasets dd ON dd.dataset_id = d.id
--   JOIN diagrams dg ON dg.id = dd.diagram_id
--   WHERE dg.workspace_id = 'workspace-uuid';
--
-- To get all diagrams for a workspace:
--   SELECT * FROM diagrams WHERE workspace_id = 'workspace-uuid';
--
-- To get all datasets in a specific diagram:
--   SELECT d.* FROM datasets d
--   JOIN diagram_datasets dd ON dd.dataset_id = d.id
--   WHERE dd.diagram_id = 'diagram-uuid';
--
-- =====================================================
