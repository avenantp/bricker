-- =====================================================
-- Migration: 011_add_workspace_diagrams
-- Add workspace_diagrams table to support multiple diagrams per workspace
-- =====================================================

-- Create workspace_diagrams table
CREATE TABLE IF NOT EXISTS workspace_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Diagram metadata
  is_default BOOLEAN DEFAULT false,
  diagram_type VARCHAR(50) DEFAULT 'dataset' CHECK (diagram_type IN ('dataset', 'workflow', 'pipeline')),

  -- Multi-tenancy
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE workspace_diagrams IS 'Stores multiple diagrams per workspace (dataset diagrams, workflow diagrams, etc.)';
COMMENT ON COLUMN workspace_diagrams.workspace_id IS 'Reference to the parent workspace';
COMMENT ON COLUMN workspace_diagrams.name IS 'Display name for the diagram';
COMMENT ON COLUMN workspace_diagrams.description IS 'Optional description of what the diagram represents';
COMMENT ON COLUMN workspace_diagrams.is_default IS 'Whether this is the default diagram to open for the workspace';
COMMENT ON COLUMN workspace_diagrams.diagram_type IS 'Type of diagram: dataset, workflow, or pipeline';
COMMENT ON COLUMN workspace_diagrams.account_id IS 'Account/Company ID for multi-tenant isolation';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_diagrams_workspace_id ON workspace_diagrams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_diagrams_account_id ON workspace_diagrams(account_id);
CREATE INDEX IF NOT EXISTS idx_workspace_diagrams_created_by ON workspace_diagrams(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_diagrams_is_default ON workspace_diagrams(workspace_id, is_default) WHERE is_default = true;

-- Add unique constraint: only one default diagram per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_diagrams_unique_default
  ON workspace_diagrams(workspace_id)
  WHERE is_default = true AND deleted_at IS NULL;

-- Add unique constraint: diagram name must be unique within a workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_diagrams_unique_name
  ON workspace_diagrams(workspace_id, name)
  WHERE deleted_at IS NULL;

-- Update datasets table to reference workspace_diagrams
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS workspace_diagram_id UUID REFERENCES workspace_diagrams(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN datasets.workspace_diagram_id IS 'Optional reference to a specific workspace diagram this dataset belongs to';

-- Create index for diagram-specific queries
CREATE INDEX IF NOT EXISTS idx_datasets_workspace_diagram_id ON datasets(workspace_diagram_id);

-- =====================================================
-- Trigger: Auto-set updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_workspace_diagrams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_diagrams_updated_at ON workspace_diagrams;

CREATE TRIGGER trigger_workspace_diagrams_updated_at
  BEFORE UPDATE ON workspace_diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_diagrams_updated_at();

-- =====================================================
-- Trigger: Auto-set account_id from workspace
-- =====================================================

CREATE OR REPLACE FUNCTION set_workspace_diagram_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Set account_id from workspace if not already set
  IF NEW.account_id IS NULL THEN
    NEW.account_id := (
      SELECT account_id
      FROM workspaces
      WHERE id = NEW.workspace_id
    );
  END IF;

  -- Set created_by to current user if not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_workspace_diagram_account ON workspace_diagrams;

CREATE TRIGGER trigger_set_workspace_diagram_account
  BEFORE INSERT ON workspace_diagrams
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_diagram_account();

-- =====================================================
-- Trigger: Ensure only one default diagram per workspace
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_single_default_diagram()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this diagram as default, unset all others in the same workspace
  IF NEW.is_default = true THEN
    UPDATE workspace_diagrams
    SET is_default = false
    WHERE workspace_id = NEW.workspace_id
      AND id != NEW.id
      AND is_default = true
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_single_default_diagram ON workspace_diagrams;

CREATE TRIGGER trigger_enforce_single_default_diagram
  BEFORE INSERT OR UPDATE ON workspace_diagrams
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_diagram();

-- =====================================================
-- Migration: Create default diagram for existing workspaces
-- =====================================================

-- For each existing workspace, create a default diagram
-- Note: workspaces don't have account_id directly, we get it from the project
INSERT INTO workspace_diagrams (workspace_id, name, description, is_default, account_id, created_by)
SELECT
  w.id,
  'Main Diagram' AS name,
  'Default diagram for ' || w.name AS description,
  true AS is_default,
  p.account_id,
  w.owner_id
FROM workspaces w
INNER JOIN projects p ON p.id = w.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_diagrams wd WHERE wd.workspace_id = w.id
)
AND w.deleted_at IS NULL;

-- Update existing datasets to link to their workspace's default diagram
UPDATE datasets d
SET workspace_diagram_id = (
  SELECT wd.id
  FROM workspace_diagrams wd
  WHERE wd.workspace_id = d.workspace_id
    AND wd.is_default = true
    AND wd.deleted_at IS NULL
  LIMIT 1
)
WHERE d.workspace_diagram_id IS NULL
  AND d.workspace_id IS NOT NULL;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- NOTE: RLS is currently DISABLED per migration 004_disable_rls.sql
-- Access control is handled at the application layer.
-- The following policies are provided for reference but are COMMENTED OUT.
-- Uncomment and enable RLS if you want database-level access control.
-- =====================================================

/*
-- Enable RLS on workspace_diagrams table
ALTER TABLE workspace_diagrams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see diagrams from their account
CREATE POLICY IF NOT EXISTS workspace_diagrams_isolation_policy ON workspace_diagrams
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create diagrams in their account's workspaces
CREATE POLICY IF NOT EXISTS workspace_diagrams_create_policy ON workspace_diagrams
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT w.id
      FROM workspaces w
      INNER JOIN account_users au ON au.account_id = w.account_id
      WHERE au.user_id = auth.uid()
    )
  );

-- Policy: Users can update diagrams in their account
CREATE POLICY IF NOT EXISTS workspace_diagrams_update_policy ON workspace_diagrams
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete diagrams they created or if they're admin
CREATE POLICY IF NOT EXISTS workspace_diagrams_delete_policy ON workspace_diagrams
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM account_users
      WHERE account_id = workspace_diagrams.account_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- IMPORTANT NOTES:
-- 1. This migration creates a default "Main Diagram" for all existing workspaces
-- 2. All existing datasets are linked to their workspace's default diagram
-- 3. Only one diagram can be marked as default per workspace (enforced by trigger)
-- 4. Diagram names must be unique within a workspace
-- 5. RLS policies are commented out but available for future use
