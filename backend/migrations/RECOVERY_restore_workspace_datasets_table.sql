-- =====================================================
-- RECOVERY: Restore workspace_datasets Table
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Restores the workspace_datasets table that was accidentally dropped.
--   This table provides a many-to-many mapping between workspaces and datasets,
--   allowing the same dataset to be used in multiple workspaces.
--
-- Table Structure:
--   - id: UUID primary key
--   - workspace_id: Foreign key to workspaces table
--   - dataset_id: Foreign key to datasets table
--   - canvas_position: JSONB for storing position on canvas
--   - added_at: Timestamp when dataset was added
--   - added_by: User who added the dataset
--   - Unique constraint on (workspace_id, dataset_id)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Verify table doesn't already exist
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_datasets'
  ) THEN
    RAISE EXCEPTION 'workspace_datasets table already exists. Aborting to prevent data loss.';
  END IF;

  RAISE NOTICE 'Proceeding with workspace_datasets table recreation...';
END $$;

-- =====================================================
-- STEP 2: Create workspace_datasets table
-- =====================================================

CREATE TABLE workspace_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  canvas_position JSONB,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, dataset_id)
);

-- =====================================================
-- STEP 3: Create indexes
-- =====================================================

CREATE INDEX idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

-- =====================================================
-- STEP 4: Add table and column comments
-- =====================================================

COMMENT ON TABLE workspace_datasets IS 'Many-to-many mapping between workspaces and datasets, allowing datasets to be shared across workspaces';
COMMENT ON COLUMN workspace_datasets.id IS 'Unique identifier for the workspace-dataset mapping';
COMMENT ON COLUMN workspace_datasets.workspace_id IS 'Reference to the workspace containing this dataset';
COMMENT ON COLUMN workspace_datasets.dataset_id IS 'Reference to the dataset in this workspace';
COMMENT ON COLUMN workspace_datasets.canvas_position IS 'JSON object storing the position of the dataset on the canvas (x, y coordinates)';
COMMENT ON COLUMN workspace_datasets.added_at IS 'Timestamp when the dataset was added to the workspace';
COMMENT ON COLUMN workspace_datasets.added_by IS 'User who added the dataset to the workspace';

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
BEGIN
  -- Verify table was created
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_datasets'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'FAILED: workspace_datasets table was not created';
  ELSE
    RAISE NOTICE 'SUCCESS: workspace_datasets table created';
  END IF;

  -- Verify indexes were created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'workspace_datasets';

  IF index_count < 2 THEN
    RAISE WARNING 'WARNING: Expected at least 2 indexes, found %', index_count;
  ELSE
    RAISE NOTICE 'SUCCESS: % indexes created', index_count;
  END IF;

  -- Verify foreign key constraints
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints
    WHERE table_name = 'workspace_datasets' AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE EXCEPTION 'FAILED: Foreign key constraints not found';
  ELSE
    RAISE NOTICE 'SUCCESS: Foreign key constraints created';
  END IF;

  -- Verify unique constraint
  IF NOT EXISTS (
    SELECT FROM information_schema.table_constraints
    WHERE table_name = 'workspace_datasets' AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE EXCEPTION 'FAILED: Unique constraint not found';
  ELSE
    RAISE NOTICE 'SUCCESS: Unique constraint created';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'workspace_datasets table successfully restored!';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- The workspace_datasets table has been successfully recreated with:
--   ✓ All original columns and data types
--   ✓ Primary key constraint on id
--   ✓ Foreign key constraints to workspaces and datasets tables
--   ✓ Unique constraint on (workspace_id, dataset_id)
--   ✓ Two indexes for performance (workspace_id and dataset_id)
--   ✓ Cascade delete on workspace and dataset deletion
--
-- Relationship Structure:
--   Workspace (1) -> (M) workspace_datasets (M) <- (1) Dataset
--
-- This table allows:
--   - Same dataset to be used in multiple workspaces
--   - Tracking which datasets are in which workspace
--   - Storing canvas position for each dataset in each workspace
--
-- To query datasets in a workspace:
--   SELECT d.* FROM datasets d
--   JOIN workspace_datasets wd ON wd.dataset_id = d.id
--   WHERE wd.workspace_id = 'your-workspace-uuid';
--
-- To query workspaces containing a dataset:
--   SELECT w.* FROM workspaces w
--   JOIN workspace_datasets wd ON wd.workspace_id = w.id
--   WHERE wd.dataset_id = 'your-dataset-uuid';
--
-- =====================================================
