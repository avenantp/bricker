-- =====================================================
-- MIGRATION: Update Source Control Functions
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Update database functions that reference project_source_control_credentials
--   table to use the consolidated structure where credentials are stored
--   directly in the projects table.
--
-- This migration updates:
--   1. disconnect_project_source_control - Remove DELETE from credentials table
--   2. get_project_source_control_status - Check credentials in projects table
--   3. has_project_credentials - Check credentials in projects table
--   4. validate_project_source_control_setup - Updated via has_project_credentials
-- =====================================================

BEGIN;

-- =====================================================
-- Function: disconnect_project_source_control
-- Purpose: Disconnect a project from source control
-- Returns: Success boolean and message
-- Updated: Clear credential fields in projects table instead of deleting from separate table
-- =====================================================

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
  -- Update project to disconnect source control and clear credentials
  UPDATE projects
  SET
    source_control_provider = NULL,
    source_control_repo_url = NULL,
    source_control_connection_status = 'not_connected'::source_control_connection_status,
    source_control_default_branch = NULL,
    source_control_last_synced_at = NULL,
    source_control_access_token_encrypted = NULL,
    source_control_refresh_token_encrypted = NULL,
    source_control_token_expires_at = NULL,
    source_control_username = NULL
  WHERE id = p_project_id;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Project source control disconnected successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Project not found'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION disconnect_project_source_control IS 'Disconnect a project from source control and clear all credentials';

-- =====================================================
-- Function: get_project_source_control_status
-- Purpose: Get comprehensive source control status for a project
-- Returns: Source control status information
-- Updated: Check for credentials in projects table
-- =====================================================

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
    (p.source_control_access_token_encrypted IS NOT NULL) AS has_credentials,
    (SELECT COUNT(*)::INTEGER FROM workspaces WHERE project_id = p_project_id) AS workspace_count
  FROM projects p
  WHERE p.id = p_project_id;
END;
$$;

COMMENT ON FUNCTION get_project_source_control_status IS 'Get comprehensive source control status for a project (credentials now in projects table)';

-- =====================================================
-- Function: has_project_credentials
-- Purpose: Check if a project has stored credentials
-- Returns: Boolean
-- Updated: Check for credentials in projects table
-- =====================================================

CREATE OR REPLACE FUNCTION has_project_credentials(
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND source_control_access_token_encrypted IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION has_project_credentials IS 'Check if a project has stored source control credentials (credentials now in projects table)';

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  -- Verify disconnect_project_source_control function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'disconnect_project_source_control'
  ) THEN
    RAISE NOTICE 'SUCCESS: disconnect_project_source_control function updated';
  ELSE
    RAISE EXCEPTION 'FAILED: disconnect_project_source_control function not found';
  END IF;

  -- Verify get_project_source_control_status function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_project_source_control_status'
  ) THEN
    RAISE NOTICE 'SUCCESS: get_project_source_control_status function updated';
  ELSE
    RAISE EXCEPTION 'FAILED: get_project_source_control_status function not found';
  END IF;

  -- Verify has_project_credentials function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'has_project_credentials'
  ) THEN
    RAISE NOTICE 'SUCCESS: has_project_credentials function updated';
  ELSE
    RAISE EXCEPTION 'FAILED: has_project_credentials function not found';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- Updated functions now work with credentials stored in projects table:
--
-- disconnect_project_source_control:
--   - Clears all source control fields including credential fields
--   - No longer deletes from project_source_control_credentials table
--
-- get_project_source_control_status:
--   - Checks for credentials by testing if source_control_access_token_encrypted IS NOT NULL
--
-- has_project_credentials:
--   - Checks projects table instead of project_source_control_credentials table
--
-- validate_project_source_control_setup:
--   - No changes needed (uses has_project_credentials internally)
--
-- =====================================================
