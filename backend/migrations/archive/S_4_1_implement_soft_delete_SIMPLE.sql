-- =====================================================
-- MIGRATION: Implement Soft Delete Functionality (SIMPLIFIED)
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Simplified version that adds deleted_at/deleted_by columns
--   Uses straightforward ALTER TABLE with IF NOT EXISTS
-- =====================================================

-- =====================================================
-- STEP 1: Add deleted_at and deleted_by columns
-- =====================================================

-- Accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Columns
ALTER TABLE columns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE columns ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Configurations
ALTER TABLE configurations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE configurations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Connections
ALTER TABLE connections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Datasets
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Environments
ALTER TABLE environments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Macros
ALTER TABLE macros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE macros ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- =====================================================
-- STEP 2: Add comments
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
-- STEP 3: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(id, account_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_deleted ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_columns_active ON columns(dataset_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_columns_deleted ON columns(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_configurations_active ON configurations(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_configurations_deleted ON configurations(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_connections_active ON connections(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_connections_deleted ON connections(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datasets_active ON datasets(account_id) WHERE deleted_at IS NULL;
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

CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted ON workspaces(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- STEP 4: Create helper functions
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
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_deleted_by, p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Restore deleted function
CREATE OR REPLACE FUNCTION restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Permanent delete function
CREATE OR REPLACE FUNCTION permanent_delete(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_rows_affected INTEGER;
BEGIN
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'DELETE FROM %I WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

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
  IF p_table_name NOT IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;

  v_sql := format(
    'DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - ($1 || '' days'')::INTERVAL',
    p_table_name
  );

  EXECUTE v_sql USING p_days_old;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Soft delete account with cascade
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
  UPDATE accounts
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_account_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account not found or already deleted');
  END IF;

  UPDATE projects SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_projects_count = ROW_COUNT;

  UPDATE workspaces SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE account_id = p_account_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_workspaces_count = ROW_COUNT;

  UPDATE datasets SET deleted_at = NOW(), deleted_by = p_deleted_by
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

-- Soft delete project with cascade
CREATE OR REPLACE FUNCTION soft_delete_project(
  p_project_id UUID,
  p_deleted_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_workspaces_count INTEGER;
BEGIN
  UPDATE projects
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Project not found or already deleted');
  END IF;

  UPDATE workspaces SET deleted_at = NOW(), deleted_by = p_deleted_by
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

-- Soft delete dataset with cascade
CREATE OR REPLACE FUNCTION soft_delete_dataset(
  p_dataset_id UUID,
  p_deleted_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_columns_count INTEGER;
BEGIN
  UPDATE datasets
  SET deleted_at = NOW(), deleted_by = p_deleted_by
  WHERE id = p_dataset_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Dataset not found or already deleted');
  END IF;

  UPDATE columns SET deleted_at = NOW(), deleted_by = p_deleted_by
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

-- =====================================================
-- STEP 5: Create active views
-- =====================================================

CREATE OR REPLACE VIEW accounts_active AS
SELECT * FROM accounts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW projects_active AS
SELECT * FROM projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW workspaces_active AS
SELECT * FROM workspaces WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW datasets_active AS
SELECT * FROM datasets WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW columns_active AS
SELECT * FROM columns WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW connections_active AS
SELECT * FROM connections WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW configurations_active AS
SELECT * FROM configurations WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW environments_active AS
SELECT * FROM environments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW users_active AS
SELECT * FROM users WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW macros_active AS
SELECT * FROM macros WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW templates_active AS
SELECT * FROM templates WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW invitations_active AS
SELECT * FROM invitations WHERE deleted_at IS NULL;

-- =====================================================
-- STEP 6: Grant permissions
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
-- Verification
-- =====================================================

SELECT 'Soft delete implementation completed successfully!' AS status;

-- Check that all tables have the columns
SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'deleted_at') as has_deleted_at,
  COUNT(*) FILTER (WHERE column_name = 'deleted_by') as has_deleted_by
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  )
  AND column_name IN ('deleted_at', 'deleted_by')
GROUP BY table_name
ORDER BY table_name;
