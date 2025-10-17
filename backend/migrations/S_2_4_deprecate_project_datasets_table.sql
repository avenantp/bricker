-- =====================================================
-- MIGRATION: Deprecate project_datasets Table
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   The project_datasets table is being deprecated because:
--   1. Datasets belong to workspaces (workspace_datasets mapping)
--   2. Workspaces belong to projects (workspaces.project_id)
--   3. Therefore: project datasets can be derived via project → workspaces → workspace_datasets → datasets
--   4. This removes redundant mapping and ensures single source of truth
--
-- This migration:
--   1. Drops the project_datasets table and its indexes
--   2. Documents the new relationship structure
--   3. Ensures workspace_datasets table properly links datasets to workspaces
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop project_datasets table and indexes
-- =====================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_project_datasets_project;
DROP INDEX IF EXISTS idx_project_datasets_dataset;

-- Drop the table
DROP TABLE IF EXISTS project_datasets CASCADE;

COMMENT ON TABLE workspace_datasets IS 'Datasets belong to workspaces; project datasets derived via workspaces.project_id';

-- =====================================================
-- STEP 2: Verification
-- =====================================================

DO $$
BEGIN
  -- Verify project_datasets table is dropped
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_datasets'
  ) THEN
    RAISE EXCEPTION 'FAILED: project_datasets table still exists';
  ELSE
    RAISE NOTICE 'SUCCESS: project_datasets table dropped';
  END IF;

  -- Verify workspace_datasets table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_datasets'
  ) THEN
    RAISE NOTICE 'SUCCESS: workspace_datasets table exists';
  ELSE
    RAISE EXCEPTION 'FAILED: workspace_datasets table does not exist';
  END IF;

  -- Verify workspaces.project_id exists
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'project_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: workspaces.project_id exists';
  ELSE
    RAISE EXCEPTION 'FAILED: workspaces.project_id does not exist';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- New relationship structure:
--   Project (1) -> (M) Workspaces (via workspaces.project_id)
--   Workspace (1) -> (M) Datasets (via workspace_datasets.workspace_id)
--
-- To get all datasets in a project:
--   SELECT DISTINCT d.* FROM datasets d
--   JOIN workspace_datasets wd ON wd.dataset_id = d.id
--   JOIN workspaces w ON w.id = wd.workspace_id
--   WHERE w.project_id = 'project-uuid';
--
-- To get all workspaces in a project:
--   SELECT * FROM workspaces WHERE project_id = 'project-uuid';
--
-- To get all datasets in a workspace:
--   SELECT d.* FROM datasets d
--   JOIN workspace_datasets wd ON wd.dataset_id = d.id
--   WHERE wd.workspace_id = 'workspace-uuid';
--
-- =====================================================
