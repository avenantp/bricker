-- =====================================================
-- Migration 013: Refactor Connections to Account Level
-- =====================================================
-- Removes workspace_id from connections table
-- Connections are now account-level only
-- Creates project_connections junction table for project associations
-- =====================================================

-- Drop existing unique constraint
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_account_id_workspace_id_name_key;

-- Drop workspace_id column
ALTER TABLE connections DROP COLUMN IF EXISTS workspace_id;

-- Add new unique constraint (account_id, name)
ALTER TABLE connections ADD CONSTRAINT connections_account_id_name_unique UNIQUE(account_id, name);

-- Drop old workspace index
DROP INDEX IF EXISTS idx_connections_workspace;

-- Create project_connections junction table
CREATE TABLE project_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, connection_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_project_connections_project ON project_connections(project_id);
CREATE INDEX idx_project_connections_connection ON project_connections(connection_id);
CREATE INDEX idx_project_connections_created_by ON project_connections(created_by);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE project_connections ENABLE ROW LEVEL SECURITY;

-- Users can view project connections if they have access to the project
CREATE POLICY project_connections_select_policy ON project_connections
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE account_id IN (
        SELECT account_id FROM account_users WHERE user_id = auth.uid()
      )
    )
  );

-- Users with project access can create project connections
CREATE POLICY project_connections_insert_policy ON project_connections
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE account_id IN (
        SELECT account_id FROM account_users WHERE user_id = auth.uid()
      )
    )
    AND
    connection_id IN (
      SELECT id FROM connections
      WHERE account_id IN (
        SELECT account_id FROM account_users WHERE user_id = auth.uid()
      )
    )
  );

-- Only project owners/admins or connection owners can delete project connections
CREATE POLICY project_connections_delete_policy ON project_connections
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid()
      OR account_id IN (
        SELECT account_id FROM account_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- No updated_at on project_connections (it's immutable once created)

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE project_connections IS 'Junction table associating connections with projects';
COMMENT ON COLUMN project_connections.project_id IS 'Reference to the project';
COMMENT ON COLUMN project_connections.connection_id IS 'Reference to the connection';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
