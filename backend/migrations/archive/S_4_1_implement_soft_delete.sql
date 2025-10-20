-- =====================================================
-- MIGRATION: Implement Soft Delete Functionality
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Implements soft delete functionality across all core tables
--   by adding deleted_at columns, indexes, helper functions, and views
--
-- Tables affected:
--   - accounts
--   - columns
--   - configurations
--   - connections
--   - datasets
--   - environments
--   - invitations
--   - macros
--   - projects
--   - templates
--   - users
--   - workspaces
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: Add deleted_at columns to tables that don't have it
-- =====================================================

DO $$
BEGIN
  -- Add deleted_at to accounts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE accounts ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to accounts table';
  END IF;

  -- Add deleted_by to accounts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE accounts ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to accounts table';
  END IF;

  -- Add deleted_at to columns table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'columns' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE columns ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to columns table';
  END IF;

  -- Add deleted_by to columns table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'columns' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE columns ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to columns table';
  END IF;

  -- Add deleted_at to configurations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configurations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE configurations ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to configurations table';
  END IF;

  -- Add deleted_by to configurations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configurations' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE configurations ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to configurations table';
  END IF;

  -- Add deleted_at to connections table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE connections ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to connections table';
  END IF;

  -- Add deleted_by to connections table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE connections ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to connections table';
  END IF;

  -- Add deleted_at to datasets table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'datasets' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE datasets ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to datasets table';
  END IF;

  -- Add deleted_by to datasets table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'datasets' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE datasets ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to datasets table';
  END IF;

  -- Add deleted_at to environments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'environments' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE environments ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to environments table';
  END IF;

  -- Add deleted_by to environments table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'environments' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE environments ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to environments table';
  END IF;

  -- Add deleted_at to invitations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE invitations ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to invitations table';
  END IF;

  -- Add deleted_by to invitations table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invitations' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE invitations ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to invitations table';
  END IF;

  -- Add deleted_at to macros table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'macros' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE macros ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to macros table';
  END IF;

  -- Add deleted_by to macros table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'macros' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE macros ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to macros table';
  END IF;

  -- Add deleted_at to projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to projects table';
  END IF;

  -- Add deleted_by to projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to projects table';
  END IF;

  -- Add deleted_at to templates table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE templates ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to templates table';
  END IF;

  -- Add deleted_by to templates table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE templates ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to templates table';
  END IF;

  -- Add deleted_at to users table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to users table';
  END IF;

  -- Add deleted_by to users table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE users ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to users table';
  END IF;

  -- Add deleted_at to workspaces table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN deleted_at TIMESTAMP;
    RAISE NOTICE 'Added deleted_at to workspaces table';
  END IF;

  -- Add deleted_by to workspaces table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN deleted_by UUID REFERENCES users(id);
    RAISE NOTICE 'Added deleted_by to workspaces table';
  END IF;
END $$;

-- =====================================================
-- SECTION 2: Add comments to deleted_at columns
-- =====================================================

COMMENT ON COLUMN accounts.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN accounts.deleted_by IS 'User who soft deleted this account';

COMMENT ON COLUMN columns.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN columns.deleted_by IS 'User who soft deleted this column';

COMMENT ON COLUMN configurations.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN configurations.deleted_by IS 'User who soft deleted this configuration';

COMMENT ON COLUMN connections.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN connections.deleted_by IS 'User who soft deleted this connection';

COMMENT ON COLUMN datasets.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN datasets.deleted_by IS 'User who soft deleted this dataset';

COMMENT ON COLUMN environments.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN environments.deleted_by IS 'User who soft deleted this environment';

COMMENT ON COLUMN invitations.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN invitations.deleted_by IS 'User who soft deleted this invitation';

COMMENT ON COLUMN macros.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN macros.deleted_by IS 'User who soft deleted this macro';

COMMENT ON COLUMN projects.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN projects.deleted_by IS 'User who soft deleted this project';

COMMENT ON COLUMN templates.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN templates.deleted_by IS 'User who soft deleted this template';

COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN users.deleted_by IS 'User who soft deleted this user';

COMMENT ON COLUMN workspaces.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN workspaces.deleted_by IS 'User who soft deleted this workspace';

-- =====================================================
-- SECTION 3: Create indexes on deleted_at columns
-- =====================================================

-- Partial indexes for active records (WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(id, account_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_deleted ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_columns_active ON columns(dataset_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_columns_deleted ON columns(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_configurations_active ON configurations(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_configurations_deleted ON configurations(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_connections_active ON connections(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_connections_deleted ON connections(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datasets_active ON datasets(account_id, workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_datasets_deleted ON datasets(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_environments_active ON environments(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_environments_deleted ON environments(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_active ON invitations(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_deleted ON invitations(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_macros_active ON macros(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_macros_deleted ON macros(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_templates_deleted ON templates(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(account_id, project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted ON workspaces(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- SECTION 4: Create soft delete helper functions
-- =====================================================

-- Generic soft delete function
CREATE OR REPLACE FUNCTION soft_delete(
  p_table_name TEXT,
  p_record_id UUID,
  p_deleted_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Build and execute dynamic SQL
  v_sql := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_deleted_by, p_record_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete IS 'Generic soft delete function - sets deleted_at and deleted_by';

-- Restore (un-delete) function
CREATE OR REPLACE FUNCTION restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Build and execute dynamic SQL
  v_sql := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION restore_deleted IS 'Restores a soft-deleted record by clearing deleted_at and deleted_by';

-- Permanent delete function (for cleanup)
CREATE OR REPLACE FUNCTION permanent_delete(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Build and execute dynamic SQL
  v_sql := format(
    'DELETE FROM %I WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION permanent_delete IS 'Permanently deletes a soft-deleted record (only works if already soft deleted)';

-- Cleanup old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_records(
  p_table_name TEXT,
  p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_sql TEXT;
  v_deleted_count INTEGER;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  -- Build and execute dynamic SQL
  v_sql := format(
    'DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - ($1 || '' days'')::INTERVAL',
    p_table_name
  );

  EXECUTE v_sql USING p_days_old;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_soft_deleted_records IS 'Permanently deletes soft-deleted records older than specified days';

-- Specific soft delete functions for each table (with cascade logic)

-- Soft delete account (cascades to related entities)
CREATE OR REPLACE FUNCTION soft_delete_account(
  p_account_id UUID,
  p_deleted_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_projects_count INTEGER;
  v_workspaces_count INTEGER;
  v_datasets_count INTEGER;
BEGIN
  -- Soft delete account
  UPDATE accounts
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account not found or already deleted');
  END IF;

  -- Cascade soft delete to projects
  UPDATE projects
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;

  -- Cascade soft delete to workspaces
  UPDATE workspaces
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_workspaces_count = ROW_COUNT;

  -- Cascade soft delete to datasets
  UPDATE datasets
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_datasets_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'account_id', p_account_id,
    'projects_deleted', v_projects_count,
    'workspaces_deleted', v_workspaces_count,
    'datasets_deleted', v_datasets_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_account IS 'Soft deletes an account and cascades to related projects, workspaces, and datasets';

-- Soft delete project (cascades to workspaces)
CREATE OR REPLACE FUNCTION soft_delete_project(
  p_project_id UUID,
  p_deleted_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_workspaces_count INTEGER;
BEGIN
  -- Soft delete project
  UPDATE projects
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Project not found or already deleted');
  END IF;

  -- Cascade soft delete to workspaces
  UPDATE workspaces
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE project_id = p_project_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_workspaces_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'workspaces_deleted', v_workspaces_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_project IS 'Soft deletes a project and cascades to related workspaces';

-- Soft delete dataset (cascades to columns)
CREATE OR REPLACE FUNCTION soft_delete_dataset(
  p_dataset_id UUID,
  p_deleted_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_columns_count INTEGER;
BEGIN
  -- Soft delete dataset
  UPDATE datasets
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_dataset_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dataset not found or already deleted');
  END IF;

  -- Cascade soft delete to columns
  UPDATE columns
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE dataset_id = p_dataset_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_columns_count = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'dataset_id', p_dataset_id,
    'columns_deleted', v_columns_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_dataset IS 'Soft deletes a dataset and cascades to related columns';

-- =====================================================
-- SECTION 5: Create views for active records only
-- =====================================================

-- Active accounts view
CREATE OR REPLACE VIEW accounts_active AS
SELECT * FROM accounts WHERE deleted_at IS NULL;

COMMENT ON VIEW accounts_active IS 'View of active (non-deleted) accounts';

-- Active projects view
CREATE OR REPLACE VIEW projects_active AS
SELECT * FROM projects WHERE deleted_at IS NULL;

COMMENT ON VIEW projects_active IS 'View of active (non-deleted) projects';

-- Active workspaces view
CREATE OR REPLACE VIEW workspaces_active AS
SELECT * FROM workspaces WHERE deleted_at IS NULL;

COMMENT ON VIEW workspaces_active IS 'View of active (non-deleted) workspaces';

-- Active datasets view
CREATE OR REPLACE VIEW datasets_active AS
SELECT * FROM datasets WHERE deleted_at IS NULL;

COMMENT ON VIEW datasets_active IS 'View of active (non-deleted) datasets';

-- Active columns view
CREATE OR REPLACE VIEW columns_active AS
SELECT * FROM columns WHERE deleted_at IS NULL;

COMMENT ON VIEW columns_active IS 'View of active (non-deleted) columns';

-- Active connections view
CREATE OR REPLACE VIEW connections_active AS
SELECT * FROM connections WHERE deleted_at IS NULL;

COMMENT ON VIEW connections_active IS 'View of active (non-deleted) connections';

-- Active configurations view
CREATE OR REPLACE VIEW configurations_active AS
SELECT * FROM configurations WHERE deleted_at IS NULL;

COMMENT ON VIEW configurations_active IS 'View of active (non-deleted) configurations';

-- Active environments view
CREATE OR REPLACE VIEW environments_active AS
SELECT * FROM environments WHERE deleted_at IS NULL;

COMMENT ON VIEW environments_active IS 'View of active (non-deleted) environments';

-- Active users view
CREATE OR REPLACE VIEW users_active AS
SELECT * FROM users WHERE deleted_at IS NULL;

COMMENT ON VIEW users_active IS 'View of active (non-deleted) users';

-- Active macros view
CREATE OR REPLACE VIEW macros_active AS
SELECT * FROM macros WHERE deleted_at IS NULL;

COMMENT ON VIEW macros_active IS 'View of active (non-deleted) macros';

-- Active templates view
CREATE OR REPLACE VIEW templates_active AS
SELECT * FROM templates WHERE deleted_at IS NULL;

COMMENT ON VIEW templates_active IS 'View of active (non-deleted) templates';

-- Active invitations view
CREATE OR REPLACE VIEW invitations_active AS
SELECT * FROM invitations WHERE deleted_at IS NULL;

COMMENT ON VIEW invitations_active IS 'View of active (non-deleted) invitations';

-- =====================================================
-- SECTION 6: Grant permissions on views
-- =====================================================

GRANT SELECT ON accounts_active TO authenticated;
GRANT SELECT ON projects_active TO authenticated;
GRANT SELECT ON workspaces_active TO authenticated;
GRANT SELECT ON datasets_active TO authenticated;
GRANT SELECT ON columns_active TO authenticated;
GRANT SELECT ON connections_active TO authenticated;
GRANT SELECT ON configurations_active TO authenticated;
GRANT SELECT ON environments_active TO authenticated;
GRANT SELECT ON users_active TO authenticated;
GRANT SELECT ON macros_active TO authenticated;
GRANT SELECT ON templates_active TO authenticated;
GRANT SELECT ON invitations_active TO authenticated;

-- =====================================================
-- SECTION 7: Verification
-- =====================================================

DO $$
DECLARE
  v_tables_with_deleted_at INTEGER;
  v_missing_tables TEXT;
BEGIN
  -- Count tables with deleted_at column
  SELECT COUNT(DISTINCT table_name) INTO v_tables_with_deleted_at
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      'accounts', 'columns', 'configurations', 'connections', 'datasets',
      'environments', 'invitations', 'macros', 'projects', 'templates',
      'users', 'workspaces'
    )
    AND column_name = 'deleted_at';

  IF v_tables_with_deleted_at = 12 THEN
    RAISE NOTICE 'SUCCESS: All 12 tables have deleted_at column';
  ELSE
    -- Find which tables are missing deleted_at
    SELECT string_agg(t.table_name, ', ') INTO v_missing_tables
    FROM (
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'accounts', 'columns', 'configurations', 'connections', 'datasets',
          'environments', 'invitations', 'macros', 'projects', 'templates',
          'users', 'workspaces'
        )
      EXCEPT
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'deleted_at'
    ) t;

    RAISE WARNING 'Only % tables have deleted_at. Missing: %', v_tables_with_deleted_at, COALESCE(v_missing_tables, 'unknown');
  END IF;

  -- Verify views exist
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name IN (
        'accounts_active', 'projects_active', 'workspaces_active',
        'datasets_active', 'columns_active', 'connections_active',
        'configurations_active', 'environments_active', 'users_active',
        'macros_active', 'templates_active', 'invitations_active'
      )
    HAVING COUNT(*) = 12
  ) THEN
    RAISE NOTICE 'SUCCESS: All 12 active views created';
  ELSE
    RAISE WARNING 'Not all active views were created';
  END IF;

  -- Verify functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN (
      'soft_delete', 'restore_deleted', 'permanent_delete',
      'cleanup_soft_deleted_records', 'soft_delete_account',
      'soft_delete_project', 'soft_delete_dataset'
    )
    HAVING COUNT(*) = 7
  ) THEN
    RAISE NOTICE 'SUCCESS: All 7 soft delete functions created';
  ELSE
    RAISE WARNING 'Not all soft delete functions were created';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Soft delete a dataset
-- SELECT soft_delete_dataset('dataset-uuid', 'user-uuid');

-- Restore a deleted dataset
-- SELECT restore_deleted('datasets', 'dataset-uuid');

-- Permanently delete old soft-deleted records (90+ days old)
-- SELECT cleanup_soft_deleted_records('datasets', 90);

-- Query active datasets only
-- SELECT * FROM datasets_active;

-- Or explicitly in queries
-- SELECT * FROM datasets WHERE deleted_at IS NULL;

-- Find all deleted records in a table
-- SELECT * FROM datasets WHERE deleted_at IS NOT NULL;

-- Soft delete an account with cascade
-- SELECT soft_delete_account('account-uuid', 'user-uuid');

-- =====================================================
-- END OF MIGRATION
-- =====================================================
