-- =====================================================
-- MIGRATION: Consolidate Project Source Control Credentials
-- =====================================================
-- Date: 2025-10-17
-- Description:
--   Consolidate project_source_control_credentials table into projects table.
--   The project_source_control_credentials table has a 1:1 relationship with projects,
--   making it redundant. Moving all credential fields to the projects table will:
--   1. Reduce table joins
--   2. Improve query performance
--   3. Simplify the data model
--   4. Reduce redundancy (provider field exists in both tables)
--
-- This migration:
--   1. Adds credential columns to projects table
--   2. Migrates existing data from project_source_control_credentials
--   3. Drops project_source_control_credentials table and related objects
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Add credential columns to projects table
-- =====================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS source_control_access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS source_control_refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS source_control_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_control_username TEXT;

-- Add comments
COMMENT ON COLUMN projects.source_control_access_token_encrypted IS 'Encrypted access token for source control provider';
COMMENT ON COLUMN projects.source_control_refresh_token_encrypted IS 'Encrypted refresh token (if supported by provider)';
COMMENT ON COLUMN projects.source_control_token_expires_at IS 'Expiration timestamp for the access token';
COMMENT ON COLUMN projects.source_control_username IS 'Username for source control authentication';

-- =====================================================
-- STEP 2: Migrate data from project_source_control_credentials to projects
-- =====================================================

-- Update projects with credentials from project_source_control_credentials
UPDATE projects p
SET
  source_control_access_token_encrypted = c.access_token_encrypted,
  source_control_refresh_token_encrypted = c.refresh_token_encrypted,
  source_control_token_expires_at = c.token_expires_at,
  source_control_username = c.username
FROM project_source_control_credentials c
WHERE p.id = c.project_id;

-- Verify migration
DO $$
DECLARE
  credential_count INTEGER;
  migrated_count INTEGER;
BEGIN
  -- Count credentials in old table
  SELECT COUNT(*) INTO credential_count FROM project_source_control_credentials;

  -- Count migrated credentials in projects table
  SELECT COUNT(*) INTO migrated_count
  FROM projects
  WHERE source_control_access_token_encrypted IS NOT NULL;

  IF credential_count > 0 AND migrated_count = credential_count THEN
    RAISE NOTICE 'SUCCESS: Migrated % credential records', migrated_count;
  ELSIF credential_count > 0 AND migrated_count != credential_count THEN
    RAISE WARNING 'WARNING: Expected % credentials but only migrated %', credential_count, migrated_count;
  ELSE
    RAISE NOTICE 'INFO: No credentials to migrate';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Drop project_source_control_credentials table
-- =====================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS project_credentials_updated_at ON project_source_control_credentials;

-- Drop function
DROP FUNCTION IF EXISTS update_project_credentials_updated_at();

-- Drop index
DROP INDEX IF EXISTS idx_project_credentials_project_id;

-- Drop the table
DROP TABLE IF EXISTS project_source_control_credentials CASCADE;

-- =====================================================
-- STEP 4: Add index for credential queries
-- =====================================================

-- Add index for queries filtering by projects with credentials
CREATE INDEX IF NOT EXISTS idx_projects_has_credentials
ON projects(id)
WHERE source_control_access_token_encrypted IS NOT NULL;

-- Add index for token expiration queries
CREATE INDEX IF NOT EXISTS idx_projects_token_expires_at
ON projects(source_control_token_expires_at)
WHERE source_control_token_expires_at IS NOT NULL;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
BEGIN
  -- Verify project_source_control_credentials table is dropped
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_source_control_credentials'
  ) THEN
    RAISE EXCEPTION 'FAILED: project_source_control_credentials table still exists';
  ELSE
    RAISE NOTICE 'SUCCESS: project_source_control_credentials table dropped';
  END IF;

  -- Verify new columns exist in projects table
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'source_control_access_token_encrypted'
  ) THEN
    RAISE NOTICE 'SUCCESS: projects.source_control_access_token_encrypted exists';
  ELSE
    RAISE EXCEPTION 'FAILED: projects.source_control_access_token_encrypted does not exist';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'source_control_refresh_token_encrypted'
  ) THEN
    RAISE NOTICE 'SUCCESS: projects.source_control_refresh_token_encrypted exists';
  ELSE
    RAISE EXCEPTION 'FAILED: projects.source_control_refresh_token_encrypted does not exist';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'source_control_token_expires_at'
  ) THEN
    RAISE NOTICE 'SUCCESS: projects.source_control_token_expires_at exists';
  ELSE
    RAISE EXCEPTION 'FAILED: projects.source_control_token_expires_at does not exist';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'source_control_username'
  ) THEN
    RAISE NOTICE 'SUCCESS: projects.source_control_username exists';
  ELSE
    RAISE EXCEPTION 'FAILED: projects.source_control_username does not exist';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- New structure:
--   All source control data is now in the projects table:
--   - source_control_provider (existing)
--   - source_control_repo_url (existing)
--   - source_control_connection_status (existing)
--   - source_control_last_synced_at (existing)
--   - source_control_default_branch (existing)
--   - source_control_access_token_encrypted (NEW)
--   - source_control_refresh_token_encrypted (NEW)
--   - source_control_token_expires_at (NEW)
--   - source_control_username (NEW)
--
-- To check projects with credentials:
--   SELECT * FROM projects
--   WHERE source_control_access_token_encrypted IS NOT NULL;
--
-- To find projects with expiring tokens:
--   SELECT id, name, source_control_token_expires_at
--   FROM projects
--   WHERE source_control_token_expires_at < NOW() + INTERVAL '7 days'
--     AND source_control_token_expires_at IS NOT NULL;
--
-- =====================================================
