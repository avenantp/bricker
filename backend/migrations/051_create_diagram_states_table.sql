-- Migration: 051 - Create diagram_states table
-- Purpose: Persist diagram view state (viewport, positions, expansions, edge routes) per workspace
-- Related: Dataset Diagram View Feature (docs/prp/051-dataset-diagram-view-specification.md)
-- Date: 2025-01-15

-- =====================================================
-- Create diagram_states table
-- =====================================================

CREATE TABLE IF NOT EXISTS diagram_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset',

  -- State Data
  view_mode VARCHAR NOT NULL DEFAULT 'relationships', -- 'relationships' | 'lineage'
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  node_positions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {node_id: {x, y}}
  node_expansions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {node_id: boolean}
  edge_routes JSONB DEFAULT '{}'::jsonb, -- {edge_id: {path, controlPoints, alignmentType, userModified}}
  filters JSONB DEFAULT '{}'::jsonb, -- Current filter state

  -- Metadata
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,

  UNIQUE(workspace_id, diagram_type)
);

-- =====================================================
-- Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_diagram_states_workspace ON diagram_states(workspace_id);
CREATE INDEX IF NOT EXISTS idx_diagram_states_account ON diagram_states(account_id);
CREATE INDEX IF NOT EXISTS idx_diagram_states_type ON diagram_states(diagram_type);

-- =====================================================
-- Enable Row-Level Security
-- =====================================================

ALTER TABLE diagram_states ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policy: Users can only access diagram states in their account
-- =====================================================

DROP POLICY IF EXISTS diagram_states_select_policy ON diagram_states;
CREATE POLICY diagram_states_select_policy ON diagram_states
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policy: Users can insert diagram states in their account
-- =====================================================

DROP POLICY IF EXISTS diagram_states_insert_policy ON diagram_states;
CREATE POLICY diagram_states_insert_policy ON diagram_states
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policy: Users can update diagram states in their account
-- =====================================================

DROP POLICY IF EXISTS diagram_states_update_policy ON diagram_states;
CREATE POLICY diagram_states_update_policy ON diagram_states
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policy: Users can delete diagram states in their account
-- =====================================================

DROP POLICY IF EXISTS diagram_states_delete_policy ON diagram_states;
CREATE POLICY diagram_states_delete_policy ON diagram_states
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Add table comment
-- =====================================================

COMMENT ON TABLE diagram_states IS 'Persists diagram view state (viewport, positions, expansions, edge routes) per workspace';

-- =====================================================
-- Column comments
-- =====================================================

COMMENT ON COLUMN diagram_states.diagram_type IS 'Type of diagram: dataset | business_model | lineage';
COMMENT ON COLUMN diagram_states.view_mode IS 'Current view mode: relationships | lineage';
COMMENT ON COLUMN diagram_states.viewport IS 'Canvas viewport state: {x: number, y: number, zoom: number}';
COMMENT ON COLUMN diagram_states.node_positions IS 'Node positions on canvas: {node_id: {x: number, y: number}}';
COMMENT ON COLUMN diagram_states.node_expansions IS 'Node expansion state: {node_id: boolean}';
COMMENT ON COLUMN diagram_states.edge_routes IS 'Custom edge routes: {edge_id: {path: string, controlPoints: [], alignmentType: string, userModified: boolean}}';
COMMENT ON COLUMN diagram_states.filters IS 'Active filters: {medallionLayers: [], entityTypes: [], searchQuery: string, etc.}';
COMMENT ON COLUMN diagram_states.version IS 'Version number for conflict resolution';

-- =====================================================
-- Create trigger to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_diagram_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_diagram_states_updated_at ON diagram_states;
CREATE TRIGGER trigger_diagram_states_updated_at
  BEFORE UPDATE ON diagram_states
  FOR EACH ROW
  EXECUTE FUNCTION update_diagram_states_updated_at();

-- =====================================================
-- Grant permissions
-- =====================================================

-- Grant access to authenticated users (via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON diagram_states TO authenticated;
-- Note: No sequence needed for UUID primary key with uuid_generate_v4()

-- =====================================================
-- Verification queries
-- =====================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'diagram_states'
  ) THEN
    RAISE NOTICE 'SUCCESS: diagram_states table created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: diagram_states table was not created';
  END IF;
END $$;

-- Verify indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'diagram_states'
    AND indexname IN ('idx_diagram_states_workspace', 'idx_diagram_states_account')
  ) THEN
    RAISE NOTICE 'SUCCESS: Indexes created successfully';
  ELSE
    RAISE EXCEPTION 'FAILED: Indexes were not created';
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'diagram_states'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS is enabled on diagram_states';
  ELSE
    RAISE EXCEPTION 'FAILED: RLS is not enabled on diagram_states';
  END IF;
END $$;

-- =====================================================
-- End of migration
-- =====================================================
