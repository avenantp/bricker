-- =====================================================
-- Refactor Source Control Structure
-- Migration: 005_refactor_source_control
-- Purpose: Move source control from workspace to project level
--          Remove project_type field
-- =====================================================

-- =====================================================
-- PART 1: ADD SOURCE CONTROL TO PROJECTS TABLE
-- =====================================================

-- Add source control provider enum if not exists
DO $$ BEGIN
    CREATE TYPE source_control_provider AS ENUM ('github', 'gitlab', 'bitbucket', 'azure', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add source control connection status enum if not exists
DO $$ BEGIN
    CREATE TYPE source_control_connection_status AS ENUM ('not_connected', 'connected', 'disconnected', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add source control columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS source_control_provider source_control_provider,
ADD COLUMN IF NOT EXISTS source_control_repo_url TEXT,
ADD COLUMN IF NOT EXISTS source_control_connection_status source_control_connection_status DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS source_control_last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_control_default_branch TEXT DEFAULT 'main';

-- Add indexes for source control queries
CREATE INDEX IF NOT EXISTS idx_projects_source_control_status
ON projects(source_control_connection_status);

CREATE INDEX IF NOT EXISTS idx_projects_source_control_provider
ON projects(source_control_provider);

-- Add comment
COMMENT ON COLUMN projects.source_control_provider IS 'Source control provider for the project repository';
COMMENT ON COLUMN projects.source_control_repo_url IS 'URL of the repository connected to this project';
COMMENT ON COLUMN projects.source_control_connection_status IS 'Current connection status to the repository';
COMMENT ON COLUMN projects.source_control_last_synced_at IS 'Last time project was synced with repository';
COMMENT ON COLUMN projects.source_control_default_branch IS 'Default branch for the repository';

-- =====================================================
-- PART 2: MAKE PROJECT_TYPE NULLABLE (BACKWARD COMPATIBLE)
-- =====================================================

-- Instead of dropping project_type, make it nullable for backward compatibility
-- This allows existing projects to keep their type while new projects can omit it
ALTER TABLE projects
ALTER COLUMN project_type DROP NOT NULL;

-- Add comment explaining deprecation
COMMENT ON COLUMN projects.project_type IS 'DEPRECATED: Project type field. Projects now support multiple types based on mappings and lineage. Kept for backward compatibility.';

-- =====================================================
-- PART 3: CREATE SOURCE CONTROL CREDENTIALS TABLE
-- =====================================================

-- Create table for storing encrypted source control credentials
CREATE TABLE IF NOT EXISTS project_source_control_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider source_control_provider NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one credential per project
    CONSTRAINT unique_project_credentials UNIQUE(project_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_project_credentials_project_id
ON project_source_control_credentials(project_id);

-- Add comments
COMMENT ON TABLE project_source_control_credentials IS 'Encrypted source control credentials for projects';
COMMENT ON COLUMN project_source_control_credentials.access_token_encrypted IS 'Encrypted access token for source control provider';
COMMENT ON COLUMN project_source_control_credentials.refresh_token_encrypted IS 'Encrypted refresh token (if supported by provider)';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_project_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_credentials_updated_at
    BEFORE UPDATE ON project_source_control_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_project_credentials_updated_at();

-- =====================================================
-- PART 4: UPDATE WORKSPACES TABLE
-- =====================================================

-- Remove source control fields that now belong to project level
-- Keep branch-specific fields
ALTER TABLE workspaces
DROP COLUMN IF EXISTS source_control_repo_url,
DROP COLUMN IF EXISTS source_control_provider;

-- Ensure branch column exists (should already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspaces' AND column_name = 'source_control_branch'
    ) THEN
        ALTER TABLE workspaces ADD COLUMN source_control_branch TEXT;
    END IF;
END $$;

-- Update comments
COMMENT ON COLUMN workspaces.source_control_branch IS 'Branch within the project repository that this workspace is connected to';
COMMENT ON COLUMN workspaces.source_control_commit_sha IS 'Current commit SHA for this workspace branch';
COMMENT ON COLUMN workspaces.source_control_connection_status IS 'Workspace-specific connection status (can differ from project)';

-- =====================================================
-- PART 5: DATA MIGRATION
-- =====================================================

-- Migrate existing workspace source control data to project level
-- This handles the case where workspaces have source control but projects don't
-- Strategy: Take the first workspace's source control settings for each project

-- Note: This migration only runs if the workspaces table has source_control_provider column
-- If your workspaces table doesn't have these columns yet, this will be skipped

DO $$
BEGIN
    -- Check if workspaces table has source_control_provider column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspaces'
        AND column_name = 'source_control_provider'
    ) THEN
        -- Perform data migration
        WITH workspace_source_control AS (
            SELECT DISTINCT ON (project_id)
                project_id,
                source_control_provider::text AS provider_text,
                source_control_repo_url,
                source_control_connection_status::text AS status_text,
                last_synced_at
            FROM workspaces
            WHERE source_control_repo_url IS NOT NULL
                AND source_control_provider IS NOT NULL
            ORDER BY project_id, created_at ASC
        )
        UPDATE projects p
        SET
            source_control_provider = wsc.provider_text::source_control_provider,
            source_control_repo_url = wsc.source_control_repo_url,
            source_control_connection_status = COALESCE(wsc.status_text::source_control_connection_status, 'not_connected'),
            source_control_last_synced_at = wsc.last_synced_at,
            source_control_default_branch = 'main'
        FROM workspace_source_control wsc
        WHERE p.id = wsc.project_id
            AND p.source_control_repo_url IS NULL;

        RAISE NOTICE 'Data migration completed: Migrated workspace source control to projects';
    ELSE
        RAISE NOTICE 'Skipping data migration: workspaces table does not have source_control_provider column';
    END IF;
END $$;

-- =====================================================
-- PART 6: UPDATE EXISTING VIEWS/FUNCTIONS (IF ANY)
-- =====================================================

-- Drop and recreate views that depend on project_type or source control fields
-- Add this as needed based on your existing views

-- Example: If you have a view that uses project_type, update it here
-- DROP VIEW IF EXISTS project_summary;
-- CREATE VIEW project_summary AS ...

-- =====================================================
-- ROLLBACK SCRIPT (FOR REFERENCE - COMMENTED OUT)
-- =====================================================

/*
-- To rollback this migration:

-- 1. Restore source control to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS source_control_repo_url TEXT,
ADD COLUMN IF NOT EXISTS source_control_provider source_control_provider;

-- 2. Make project_type required again
ALTER TABLE projects
ALTER COLUMN project_type SET NOT NULL;

-- 3. Remove source control from projects
ALTER TABLE projects
DROP COLUMN IF EXISTS source_control_provider,
DROP COLUMN IF EXISTS source_control_repo_url,
DROP COLUMN IF EXISTS source_control_connection_status,
DROP COLUMN IF EXISTS source_control_last_synced_at,
DROP COLUMN IF EXISTS source_control_default_branch;

-- 4. Drop credentials table
DROP TABLE IF EXISTS project_source_control_credentials;

-- 5. Drop enums (only if not used elsewhere)
-- DROP TYPE IF EXISTS source_control_provider CASCADE;
-- DROP TYPE IF EXISTS source_control_connection_status CASCADE;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify projects with source control
-- SELECT
--     id,
--     name,
--     source_control_provider,
--     source_control_repo_url,
--     source_control_connection_status
-- FROM projects
-- WHERE source_control_provider IS NOT NULL;

-- Verify workspaces still have branch info
-- SELECT
--     id,
--     name,
--     project_id,
--     source_control_branch,
--     source_control_commit_sha
-- FROM workspaces
-- WHERE source_control_branch IS NOT NULL;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
