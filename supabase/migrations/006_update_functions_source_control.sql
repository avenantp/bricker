-- =====================================================
-- Update Database Functions for Source Control Refactoring
-- Migration: 006_update_functions_source_control
-- Purpose: Update functions to support project-level source control
-- =====================================================

-- =====================================================
-- PART 1: UPDATE EXISTING FUNCTIONS
-- =====================================================

-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS get_user_projects(UUID);
DROP FUNCTION IF EXISTS get_user_workspaces(UUID, UUID);

-- Update get_user_projects function to include source control fields
CREATE OR REPLACE FUNCTION get_user_projects(p_user_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name VARCHAR,
  project_type VARCHAR,
  account_id UUID,
  user_role VARCHAR,
  source_control_provider VARCHAR,
  source_control_repo_url TEXT,
  source_control_connection_status VARCHAR,
  source_control_last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS project_id,
    p.name AS project_name,
    p.project_type::VARCHAR,
    p.account_id,
    get_project_user_role(p.id, p_user_id) AS user_role,
    p.source_control_provider::VARCHAR,
    p.source_control_repo_url,
    p.source_control_connection_status::VARCHAR,
    p.source_control_last_synced_at,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.account_id IN (
    SELECT account_id FROM account_users WHERE user_id = p_user_id
  )
  ORDER BY p.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_projects IS 'Get all projects accessible by a user with their role and source control info';

-- =====================================================

-- Update get_user_workspaces function to include project source control
CREATE OR REPLACE FUNCTION get_user_workspaces(
  p_user_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name VARCHAR,
  project_id UUID,
  project_name VARCHAR,
  account_id UUID,
  user_role VARCHAR,
  workspace_branch TEXT,
  workspace_commit_sha TEXT,
  workspace_connection_status VARCHAR,
  project_source_control_provider VARCHAR,
  project_source_control_repo_url TEXT,
  project_source_control_default_branch TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.project_id,
    proj.name AS project_name,
    w.account_id,
    get_workspace_user_role(w.id, p_user_id) AS user_role,
    w.source_control_branch,
    w.source_control_commit_sha,
    w.source_control_connection_status::VARCHAR AS workspace_connection_status,
    proj.source_control_provider::VARCHAR AS project_source_control_provider,
    proj.source_control_repo_url AS project_source_control_repo_url,
    proj.source_control_default_branch AS project_source_control_default_branch,
    w.created_at,
    w.updated_at
  FROM workspaces w
  INNER JOIN projects proj ON proj.id = w.project_id
  WHERE w.account_id IN (
    SELECT account_id FROM account_users WHERE user_id = p_user_id
  )
  AND (p_project_id IS NULL OR w.project_id = p_project_id)
  ORDER BY w.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_workspaces IS 'Get all workspaces accessible by a user with their role and inherited project source control';

-- =====================================================
-- PART 2: SOURCE CONTROL MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: connect_project_source_control
-- Purpose: Connect a project to a source control repository
-- Returns: Success boolean and message
CREATE OR REPLACE FUNCTION connect_project_source_control(
  p_project_id UUID,
  p_provider VARCHAR,
  p_repo_url TEXT,
  p_default_branch TEXT DEFAULT 'main'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update project with source control information
  UPDATE projects
  SET
    source_control_provider = p_provider::source_control_provider,
    source_control_repo_url = p_repo_url,
    source_control_connection_status = 'connected'::source_control_connection_status,
    source_control_default_branch = p_default_branch,
    source_control_last_synced_at = NOW()
  WHERE id = p_project_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Project source control connected successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Project not found'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION connect_project_source_control IS 'Connect a project to a source control repository';

-- =====================================================

-- Function: disconnect_project_source_control
-- Purpose: Disconnect a project from source control
-- Returns: Success boolean and message
CREATE OR REPLACE FUNCTION disconnect_project_source_control(
  p_project_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update project to disconnect source control
  UPDATE projects
  SET
    source_control_provider = NULL,
    source_control_repo_url = NULL,
    source_control_connection_status = 'not_connected'::source_control_connection_status,
    source_control_default_branch = NULL,
    source_control_last_synced_at = NULL
  WHERE id = p_project_id;

  -- Delete stored credentials
  DELETE FROM project_source_control_credentials
  WHERE project_id = p_project_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Project source control disconnected successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Project not found'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION disconnect_project_source_control IS 'Disconnect a project from source control and delete credentials';

-- =====================================================

-- Function: update_project_source_control_status
-- Purpose: Update the connection status of project source control
-- Returns: Success boolean
CREATE OR REPLACE FUNCTION update_project_source_control_status(
  p_project_id UUID,
  p_status VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE projects
  SET
    source_control_connection_status = p_status::source_control_connection_status,
    source_control_last_synced_at = CASE
      WHEN p_status = 'connected' THEN NOW()
      ELSE source_control_last_synced_at
    END
  WHERE id = p_project_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION update_project_source_control_status IS 'Update the connection status of project source control';

-- =====================================================

-- Function: get_project_source_control_status
-- Purpose: Get comprehensive source control status for a project
-- Returns: Source control status information
CREATE OR REPLACE FUNCTION get_project_source_control_status(
  p_project_id UUID
)
RETURNS TABLE (
  provider VARCHAR,
  repo_url TEXT,
  connection_status VARCHAR,
  default_branch TEXT,
  last_synced_at TIMESTAMPTZ,
  has_credentials BOOLEAN,
  workspace_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.source_control_provider::VARCHAR,
    p.source_control_repo_url,
    p.source_control_connection_status::VARCHAR,
    p.source_control_default_branch,
    p.source_control_last_synced_at,
    EXISTS(
      SELECT 1 FROM project_source_control_credentials
      WHERE project_id = p_project_id
    ) AS has_credentials,
    (SELECT COUNT(*)::INTEGER FROM workspaces WHERE project_id = p_project_id) AS workspace_count
  FROM projects p
  WHERE p.id = p_project_id;
END;
$$;

COMMENT ON FUNCTION get_project_source_control_status IS 'Get comprehensive source control status for a project';

-- =====================================================

-- Function: get_workspace_available_branches
-- Purpose: Get available branches from project's repository for workspace
-- Note: This is a placeholder - actual branch fetching happens in application layer via provider API
-- Returns: Project source control information needed to fetch branches
CREATE OR REPLACE FUNCTION get_workspace_available_branches(
  p_workspace_id UUID
)
RETURNS TABLE (
  project_id UUID,
  provider VARCHAR,
  repo_url TEXT,
  current_branch TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.project_id,
    p.source_control_provider::VARCHAR AS provider,
    p.source_control_repo_url AS repo_url,
    w.source_control_branch AS current_branch
  FROM workspaces w
  INNER JOIN projects p ON p.id = w.project_id
  WHERE w.id = p_workspace_id;
END;
$$;

COMMENT ON FUNCTION get_workspace_available_branches IS 'Get project source control info needed to fetch available branches';

-- =====================================================

-- Function: update_workspace_branch
-- Purpose: Update the branch a workspace is connected to
-- Returns: Success boolean and message
CREATE OR REPLACE FUNCTION update_workspace_branch(
  p_workspace_id UUID,
  p_branch TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_connected BOOLEAN;
BEGIN
  -- Check if parent project has source control connected
  SELECT EXISTS(
    SELECT 1 FROM workspaces w
    INNER JOIN projects p ON p.id = w.project_id
    WHERE w.id = p_workspace_id
      AND p.source_control_provider IS NOT NULL
      AND p.source_control_repo_url IS NOT NULL
  ) INTO v_project_connected;

  IF NOT v_project_connected THEN
    RETURN QUERY SELECT FALSE, 'Project source control not configured'::TEXT;
    RETURN;
  END IF;

  -- Update workspace branch
  UPDATE workspaces
  SET
    source_control_branch = p_branch,
    source_control_commit_sha = NULL, -- Reset commit SHA when switching branches
    source_control_connection_status = 'connected'::source_control_connection_status
  WHERE id = p_workspace_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Workspace branch updated successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Workspace not found'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_workspace_branch IS 'Update the branch a workspace is connected to';

-- =====================================================
-- PART 3: CREDENTIAL MANAGEMENT FUNCTIONS
-- =====================================================

-- Note: Actual encryption/decryption should be handled in application layer
-- using a secure key management system (KMS) or vault
-- These functions just store/retrieve the encrypted values

-- Function: has_project_credentials
-- Purpose: Check if a project has stored credentials
-- Returns: Boolean
CREATE OR REPLACE FUNCTION has_project_credentials(
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM project_source_control_credentials
    WHERE project_id = p_project_id
  );
END;
$$;

COMMENT ON FUNCTION has_project_credentials IS 'Check if a project has stored source control credentials';

-- =====================================================

-- Function: validate_project_source_control_setup
-- Purpose: Validate that a project has complete source control configuration
-- Returns: Validation status and missing items
CREATE OR REPLACE FUNCTION validate_project_source_control_setup(
  p_project_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  has_provider BOOLEAN,
  has_repo_url BOOLEAN,
  has_credentials BOOLEAN,
  has_default_branch BOOLEAN,
  missing_items TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider VARCHAR;
  v_repo_url TEXT;
  v_default_branch TEXT;
  v_has_credentials BOOLEAN;
  v_missing TEXT[];
BEGIN
  -- Get project source control configuration
  SELECT
    p.source_control_provider::VARCHAR,
    p.source_control_repo_url,
    p.source_control_default_branch,
    has_project_credentials(p.id)
  INTO
    v_provider,
    v_repo_url,
    v_default_branch,
    v_has_credentials
  FROM projects p
  WHERE p.id = p_project_id;

  -- Build list of missing items
  v_missing := ARRAY[]::TEXT[];

  IF v_provider IS NULL THEN
    v_missing := array_append(v_missing, 'provider');
  END IF;

  IF v_repo_url IS NULL THEN
    v_missing := array_append(v_missing, 'repository_url');
  END IF;

  IF v_default_branch IS NULL THEN
    v_missing := array_append(v_missing, 'default_branch');
  END IF;

  IF NOT v_has_credentials THEN
    v_missing := array_append(v_missing, 'credentials');
  END IF;

  RETURN QUERY SELECT
    (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0) AS is_valid,
    v_provider IS NOT NULL AS has_provider,
    v_repo_url IS NOT NULL AS has_repo_url,
    v_has_credentials AS has_credentials,
    v_default_branch IS NOT NULL AS has_default_branch,
    v_missing AS missing_items;
END;
$$;

COMMENT ON FUNCTION validate_project_source_control_setup IS 'Validate that a project has complete source control configuration';

-- =====================================================
-- PART 4: STATISTICS AND REPORTING FUNCTIONS
-- =====================================================

-- Function: get_project_source_control_stats
-- Purpose: Get statistics about source control across all projects
-- Returns: Aggregated statistics
CREATE OR REPLACE FUNCTION get_project_source_control_stats(
  p_account_id UUID
)
RETURNS TABLE (
  total_projects INTEGER,
  projects_with_source_control INTEGER,
  projects_connected INTEGER,
  projects_error INTEGER,
  github_count INTEGER,
  gitlab_count INTEGER,
  bitbucket_count INTEGER,
  azure_count INTEGER,
  other_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_projects,
    COUNT(CASE WHEN source_control_provider IS NOT NULL THEN 1 END)::INTEGER AS projects_with_source_control,
    COUNT(CASE WHEN source_control_connection_status = 'connected' THEN 1 END)::INTEGER AS projects_connected,
    COUNT(CASE WHEN source_control_connection_status = 'error' THEN 1 END)::INTEGER AS projects_error,
    COUNT(CASE WHEN source_control_provider = 'github' THEN 1 END)::INTEGER AS github_count,
    COUNT(CASE WHEN source_control_provider = 'gitlab' THEN 1 END)::INTEGER AS gitlab_count,
    COUNT(CASE WHEN source_control_provider = 'bitbucket' THEN 1 END)::INTEGER AS bitbucket_count,
    COUNT(CASE WHEN source_control_provider = 'azure' THEN 1 END)::INTEGER AS azure_count,
    COUNT(CASE WHEN source_control_provider = 'other' THEN 1 END)::INTEGER AS other_count
  FROM projects
  WHERE account_id = p_account_id;
END;
$$;

COMMENT ON FUNCTION get_project_source_control_stats IS 'Get statistics about source control usage across projects';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
