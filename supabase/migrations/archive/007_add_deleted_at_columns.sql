-- =====================================================
-- Add deleted_at columns for soft deletes
-- Migration: 007_add_deleted_at_columns
-- Purpose: Add deleted_at timestamp columns to support soft deletes
--          and fix trigger error "record 'old' has no field 'deleted_at'"
-- =====================================================

-- Add deleted_at column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to project_users table
ALTER TABLE project_users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to workspace_users table
ALTER TABLE workspace_users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for querying non-deleted records
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
ON projects(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at
ON workspaces(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_users_deleted_at
ON project_users(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_users_deleted_at
ON workspace_users(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON COLUMN projects.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN workspaces.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN project_users.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';
COMMENT ON COLUMN workspace_users.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';

-- =====================================================
-- Update RLS policies to exclude soft-deleted records
-- =====================================================

-- Drop existing SELECT policies and recreate with deleted_at check

-- Projects SELECT policy
DROP POLICY IF EXISTS projects_select_policy ON projects;
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Workspaces SELECT policy
DROP POLICY IF EXISTS workspaces_select_policy ON workspaces;
CREATE POLICY workspaces_select_policy ON workspaces
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Project Users SELECT policy
DROP POLICY IF EXISTS project_users_select_policy ON project_users;
CREATE POLICY project_users_select_policy ON project_users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND
    project_id IN (
      SELECT id
      FROM projects
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Workspace Users SELECT policy
DROP POLICY IF EXISTS workspace_users_select_policy ON workspace_users;
CREATE POLICY workspace_users_select_policy ON workspace_users
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND
    workspace_id IN (
      SELECT id
      FROM workspaces
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- Update existing functions to handle soft deletes
-- =====================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_projects(UUID);
DROP FUNCTION IF EXISTS get_user_workspaces(UUID, UUID);
DROP FUNCTION IF EXISTS has_project_access(UUID, UUID);
DROP FUNCTION IF EXISTS has_workspace_access(UUID, UUID);

-- Recreate get_user_projects function to exclude deleted projects
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
  WHERE p.deleted_at IS NULL
    AND p.account_id IN (
      SELECT account_id FROM account_users WHERE user_id = p_user_id
    )
  ORDER BY p.updated_at DESC;
END;
$$;

-- Recreate get_user_workspaces function to exclude deleted workspaces
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
  WHERE w.deleted_at IS NULL
    AND proj.deleted_at IS NULL
    AND w.account_id IN (
      SELECT account_id FROM account_users WHERE user_id = p_user_id
    )
    AND (p_project_id IS NULL OR w.project_id = p_project_id)
  ORDER BY w.updated_at DESC;
END;
$$;

-- Recreate has_project_access to exclude deleted projects
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
      AND p.deleted_at IS NULL
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
            AND deleted_at IS NULL
        )
      )
  );
END;
$$;

-- Recreate has_workspace_access to exclude deleted workspaces
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
      AND w.deleted_at IS NULL
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
            AND deleted_at IS NULL
        )
        OR
        -- User is workspace member
        w.id IN (
          SELECT workspace_id
          FROM workspace_users
          WHERE user_id = p_user_id
            AND deleted_at IS NULL
        )
      )
  );
END;
$$;

-- =====================================================
-- Helper function for soft delete
-- =====================================================

-- Function to soft delete a project
CREATE OR REPLACE FUNCTION soft_delete_project(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE projects
  SET deleted_at = NOW()
  WHERE id = p_project_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION soft_delete_project IS 'Soft delete a project by setting deleted_at timestamp';

-- Function to soft delete a workspace
CREATE OR REPLACE FUNCTION soft_delete_workspace(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE workspaces
  SET deleted_at = NOW()
  WHERE id = p_workspace_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION soft_delete_workspace IS 'Soft delete a workspace by setting deleted_at timestamp';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
