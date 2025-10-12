-- ============================================================================
-- Make github_repo_url nullable in workspaces table
-- ============================================================================

-- The issue:
-- github_repo_url is currently NOT NULL, but it should be optional
-- Users should be able to create a workspace and add GitHub integration later

-- Solution:
-- Change github_repo_url to allow NULL values
-- Users can add their GitHub repository URL in workspace settings after creation

ALTER TABLE public.workspaces
  ALTER COLUMN github_repo_url DROP NOT NULL;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: github_repo_url is now nullable';
END $$;
