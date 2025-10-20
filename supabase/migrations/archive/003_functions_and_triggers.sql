-- =====================================================
-- Database Functions and Triggers
-- Migration: 003_functions_and_triggers
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR ACCESS CONTROL
-- =====================================================

-- Function: has_project_access
-- Purpose: Check if a user has access to a project
-- Returns: Boolean
CREATE OR REPLACE FUNCTION has_project_access(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = p_project_id
      AND (
        -- User is project owner
        p.owner_id = p_user_id
        OR
        -- User is account member
        p.account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = p_user_id
        )
        OR
        -- User is project member
        p.id IN (
          SELECT project_id
          FROM project_users
          WHERE user_id = p_user_id
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION has_project_access IS 'Check if a user has access to a specific project';

-- =====================================================

-- Function: get_project_user_role
-- Purpose: Get the role of a user in a project
-- Returns: Role string or NULL if no access
CREATE OR REPLACE FUNCTION get_project_user_role(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- Check if user is the project owner
  SELECT 'owner' INTO v_role
  FROM projects
  WHERE id = p_project_id
    AND owner_id = p_user_id;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user is account admin
  SELECT 'admin' INTO v_role
  FROM projects p
  INNER JOIN account_users au ON au.account_id = p.account_id
  WHERE p.id = p_project_id
    AND au.user_id = p_user_id
    AND au.role = 'admin';

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check project_users table for specific role
  SELECT role INTO v_role
  FROM project_users
  WHERE project_id = p_project_id
    AND user_id = p_user_id;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user has account-level access (default to viewer)
  SELECT 'viewer' INTO v_role
  FROM projects p
  INNER JOIN account_users au ON au.account_id = p.account_id
  WHERE p.id = p_project_id
    AND au.user_id = p_user_id;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION get_project_user_role IS 'Get the role of a user in a specific project';

-- =====================================================

-- Function: has_workspace_access
-- Purpose: Check if a user has access to a workspace
-- Returns: Boolean
CREATE OR REPLACE FUNCTION has_workspace_access(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspaces w
    WHERE w.id = p_workspace_id
      AND (
        -- User is workspace owner
        w.owner_id = p_user_id
        OR
        -- User is account member
        w.account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = p_user_id
        )
        OR
        -- User is project member
        w.project_id IN (
          SELECT project_id
          FROM project_users
          WHERE user_id = p_user_id
        )
        OR
        -- User is workspace member
        w.id IN (
          SELECT workspace_id
          FROM workspace_users
          WHERE user_id = p_user_id
        )
      )
  );
END;
$$;

COMMENT ON FUNCTION has_workspace_access IS 'Check if a user has access to a specific workspace';

-- =====================================================

-- Function: get_workspace_user_role
-- Purpose: Get the role of a user in a workspace
-- Returns: Role string or NULL if no access
CREATE OR REPLACE FUNCTION get_workspace_user_role(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- Check if user is the workspace owner
  SELECT 'owner' INTO v_role
  FROM workspaces
  WHERE id = p_workspace_id
    AND owner_id = p_user_id;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user is account admin
  SELECT 'admin' INTO v_role
  FROM workspaces w
  INNER JOIN account_users au ON au.account_id = w.account_id
  WHERE w.id = p_workspace_id
    AND au.user_id = p_user_id
    AND au.role = 'admin';

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user is project owner/admin
  SELECT pu.role INTO v_role
  FROM workspaces w
  INNER JOIN project_users pu ON pu.project_id = w.project_id
  WHERE w.id = p_workspace_id
    AND pu.user_id = p_user_id
    AND pu.role IN ('owner', 'admin');

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check workspace_users table for specific role
  SELECT role INTO v_role
  FROM workspace_users
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user has project-level access (default to their project role)
  SELECT pu.role INTO v_role
  FROM workspaces w
  INNER JOIN project_users pu ON pu.project_id = w.project_id
  WHERE w.id = p_workspace_id
    AND pu.user_id = p_user_id;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Check if user has account-level access (default to viewer)
  SELECT 'viewer' INTO v_role
  FROM workspaces w
  INNER JOIN account_users au ON au.account_id = w.account_id
  WHERE w.id = p_workspace_id
    AND au.user_id = p_user_id;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION get_workspace_user_role IS 'Get the role of a user in a specific workspace';

-- =====================================================
-- TIMESTAMP UPDATE TRIGGERS
-- =====================================================

-- Function: update_updated_at_column
-- Purpose: Generic function to update updated_at timestamp
-- Used by: Multiple tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically update updated_at timestamp on row update';

-- =====================================================

-- Trigger: projects_updated_at
-- Purpose: Auto-update updated_at on projects table
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER projects_updated_at ON projects IS 'Automatically update updated_at when project is modified';

-- =====================================================

-- Trigger: workspaces_updated_at
-- Purpose: Auto-update updated_at on workspaces table
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER workspaces_updated_at ON workspaces IS 'Automatically update updated_at when workspace is modified';

-- =====================================================
-- AUTOMATIC OWNER ASSIGNMENT TRIGGERS
-- =====================================================

-- Function: add_project_owner_to_project_users
-- Purpose: Automatically add project owner to project_users table
CREATE OR REPLACE FUNCTION add_project_owner_to_project_users()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only add if owner_id is set
  IF NEW.owner_id IS NOT NULL THEN
    -- Insert owner into project_users (ignore if already exists)
    INSERT INTO project_users (project_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET role = 'owner';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_project_owner_to_project_users IS 'Automatically add project owner to project_users table';

-- =====================================================

-- Trigger: project_owner_to_users
-- Purpose: Add project owner to project_users after project creation
CREATE TRIGGER project_owner_to_users
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner_to_project_users();

COMMENT ON TRIGGER project_owner_to_users ON projects IS 'Add project owner to project_users table automatically';

-- =====================================================

-- Function: add_workspace_owner_to_workspace_users
-- Purpose: Automatically add workspace owner to workspace_users table
CREATE OR REPLACE FUNCTION add_workspace_owner_to_workspace_users()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only add if owner_id is set
  IF NEW.owner_id IS NOT NULL THEN
    -- Insert owner into workspace_users (ignore if already exists)
    INSERT INTO workspace_users (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET role = 'owner';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_workspace_owner_to_workspace_users IS 'Automatically add workspace owner to workspace_users table';

-- =====================================================

-- Trigger: workspace_owner_to_users
-- Purpose: Add workspace owner to workspace_users after workspace creation
CREATE TRIGGER workspace_owner_to_users
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_workspace_owner_to_workspace_users();

COMMENT ON TRIGGER workspace_owner_to_users ON workspaces IS 'Add workspace owner to workspace_users table automatically';

-- =====================================================
-- UTILITY FUNCTIONS FOR QUERIES
-- =====================================================

-- Function: get_user_projects
-- Purpose: Get all projects accessible by a user with their role
-- Returns: Table of projects with user role
CREATE OR REPLACE FUNCTION get_user_projects(p_user_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name VARCHAR,
  project_type VARCHAR,
  account_id UUID,
  user_role VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS project_id,
    p.name AS project_name,
    p.project_type,
    p.account_id,
    get_project_user_role(p.id, p_user_id) AS user_role,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.account_id IN (
    SELECT account_id FROM account_users WHERE user_id = p_user_id
  )
  ORDER BY p.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_projects IS 'Get all projects accessible by a user with their role';

-- =====================================================

-- Function: get_user_workspaces
-- Purpose: Get all workspaces accessible by a user with their role
-- Returns: Table of workspaces with user role
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
  source_control_status VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
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
    w.source_control_connection_status AS source_control_status,
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

COMMENT ON FUNCTION get_user_workspaces IS 'Get all workspaces accessible by a user with their role';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
