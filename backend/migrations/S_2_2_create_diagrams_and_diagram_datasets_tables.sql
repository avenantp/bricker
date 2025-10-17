-- =====================================================
-- MIGRATION: Create Diagrams and Diagram Datasets Tables
-- =====================================================
-- Date: 2025-10-16
-- Description:
--   1. Create diagrams table (combines metadata + state from diagram_states)
--   2. Create diagram_datasets mapping table
--   3. Migrate data from diagram_states if exists
--   4. Deprecate diagram_states table (keep for rollback)
--
-- Rationale:
--   - Diagrams should be first-class entities, not just state
--   - Need to track which datasets are in each diagram
--   - Separate diagram metadata from diagram state for clarity
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create diagrams table
-- =====================================================

CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Diagram Metadata
  name VARCHAR NOT NULL,
  description TEXT,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset' CHECK (diagram_type IN ('dataset', 'business_model', 'lineage', 'erd')),

  -- Diagram State
  view_mode VARCHAR NOT NULL DEFAULT 'relationships' CHECK (view_mode IN ('relationships', 'lineage')),
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  node_positions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {node_id: {x, y}}
  node_expansions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {node_id: boolean}
  edge_routes JSONB DEFAULT '{}'::jsonb, -- {edge_id: {path, controlPoints, alignmentType, userModified}}
  filters JSONB DEFAULT '{}'::jsonb, -- Current filter state

  -- Layout Settings
  layout_type VARCHAR DEFAULT 'hierarchical' CHECK (layout_type IN ('hierarchical', 'force', 'circular', 'dagre', 'manual')),
  layout_direction VARCHAR DEFAULT 'LR' CHECK (layout_direction IN ('LR', 'TB', 'RL', 'BT')),
  auto_layout BOOLEAN DEFAULT false,

  -- Ownership and Access
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
  is_template BOOLEAN DEFAULT false, -- Can be used as template for new diagrams

  -- Metadata
  tags VARCHAR[],
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Version Control
  version INTEGER DEFAULT 1,
  last_modified_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(workspace_id, name)
);

COMMENT ON TABLE diagrams IS 'Diagram entities with metadata and state';
COMMENT ON COLUMN diagrams.diagram_type IS 'Type: dataset | business_model | lineage | erd';
COMMENT ON COLUMN diagrams.view_mode IS 'View mode: relationships | lineage';
COMMENT ON COLUMN diagrams.viewport IS 'Canvas viewport: {x, y, zoom}';
COMMENT ON COLUMN diagrams.node_positions IS 'Node positions: {node_id: {x, y}}';
COMMENT ON COLUMN diagrams.node_expansions IS 'Expansion state: {node_id: boolean}';
COMMENT ON COLUMN diagrams.edge_routes IS 'Custom routes: {edge_id: {path, controlPoints, ...}}';
COMMENT ON COLUMN diagrams.filters IS 'Active filters: {medallionLayers, searchQuery, ...}';
COMMENT ON COLUMN diagrams.layout_type IS 'Layout algorithm: hierarchical | force | circular | dagre | manual';
COMMENT ON COLUMN diagrams.is_template IS 'Can be used as template for new diagrams';

-- =====================================================
-- STEP 2: Create diagram_datasets mapping table
-- =====================================================

CREATE TABLE IF NOT EXISTS diagram_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

  -- Location on diagram (can override node_positions JSONB)
  location JSONB, -- {x: number, y: number}

  -- Visual state
  is_expanded BOOLEAN DEFAULT false,
  is_highlighted BOOLEAN DEFAULT false,
  z_index INTEGER DEFAULT 0, -- Layering/stacking order

  -- Metadata
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT, -- User notes about why this dataset is in the diagram

  UNIQUE(diagram_id, dataset_id)
);

COMMENT ON TABLE diagram_datasets IS 'Tracks which datasets are included in each diagram';
COMMENT ON COLUMN diagram_datasets.location IS 'Dataset location on diagram canvas';
COMMENT ON COLUMN diagram_datasets.is_expanded IS 'Whether columns are shown';
COMMENT ON COLUMN diagram_datasets.z_index IS 'Stacking order (higher = on top)';
COMMENT ON COLUMN diagram_datasets.notes IS 'User notes about this dataset in this diagram';

-- =====================================================
-- STEP 3: Create indexes
-- =====================================================

-- Diagrams table indexes
CREATE INDEX IF NOT EXISTS idx_diagrams_account ON diagrams(account_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_workspace ON diagrams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_owner ON diagrams(owner_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_type ON diagrams(diagram_type);
CREATE INDEX IF NOT EXISTS idx_diagrams_visibility ON diagrams(visibility);
CREATE INDEX IF NOT EXISTS idx_diagrams_template ON diagrams(is_template) WHERE is_template = true;

-- Diagram datasets mapping indexes
CREATE INDEX IF NOT EXISTS idx_diagram_datasets_diagram ON diagram_datasets(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_datasets_dataset ON diagram_datasets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_diagram_datasets_added_by ON diagram_datasets(added_by);

-- =====================================================
-- STEP 4: Create triggers
-- =====================================================

-- Trigger to update updated_at and increment version
CREATE OR REPLACE FUNCTION update_diagrams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_diagrams_updated_at ON diagrams;
CREATE TRIGGER trigger_diagrams_updated_at
  BEFORE UPDATE ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_diagrams_updated_at();

-- =====================================================
-- STEP 5: Migrate data from diagram_states (if exists)
-- =====================================================

DO $$
BEGIN
  -- Check if diagram_states table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'diagram_states'
  ) THEN
    -- Migrate data from diagram_states to diagrams
    INSERT INTO diagrams (
      id,
      account_id,
      workspace_id,
      name,
      description,
      diagram_type,
      view_mode,
      viewport,
      node_positions,
      node_expansions,
      edge_routes,
      filters,
      version,
      last_modified_by,
      created_at,
      updated_at
    )
    SELECT
      id,
      account_id,
      workspace_id,
      'Diagram ' || diagram_type, -- Generate name from type
      'Migrated from diagram_states', -- Default description
      diagram_type,
      view_mode,
      viewport,
      node_positions,
      node_expansions,
      edge_routes,
      filters,
      version,
      last_modified_by,
      created_at,
      updated_at
    FROM diagram_states
    ON CONFLICT (workspace_id, name) DO NOTHING;

    RAISE NOTICE 'Migrated data from diagram_states to diagrams';
  ELSE
    RAISE NOTICE 'diagram_states table does not exist, skipping migration';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Enable Row-Level Security (RLS)
-- =====================================================

ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagrams table

-- SELECT: Users can view diagrams in their account or public diagrams
DROP POLICY IF EXISTS diagrams_select_policy ON diagrams;
CREATE POLICY diagrams_select_policy ON diagrams
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    OR visibility = 'public'
  );

-- INSERT: Users can create diagrams in their account
DROP POLICY IF EXISTS diagrams_insert_policy ON diagrams;
CREATE POLICY diagrams_insert_policy ON diagrams
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can update diagrams they own or have access to
DROP POLICY IF EXISTS diagrams_update_policy ON diagrams;
CREATE POLICY diagrams_update_policy ON diagrams
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can delete diagrams they own
DROP POLICY IF EXISTS diagrams_delete_policy ON diagrams;
CREATE POLICY diagrams_delete_policy ON diagrams
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for diagram_datasets table

-- SELECT: Users can view diagram_datasets if they can view the diagram
DROP POLICY IF EXISTS diagram_datasets_select_policy ON diagram_datasets;
CREATE POLICY diagram_datasets_select_policy ON diagram_datasets
  FOR SELECT
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
      OR visibility = 'public'
    )
  );

-- INSERT: Users can add datasets to diagrams they have access to
DROP POLICY IF EXISTS diagram_datasets_insert_policy ON diagram_datasets;
CREATE POLICY diagram_datasets_insert_policy ON diagram_datasets
  FOR INSERT
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Users can update diagram_datasets if they have access to the diagram
DROP POLICY IF EXISTS diagram_datasets_update_policy ON diagram_datasets;
CREATE POLICY diagram_datasets_update_policy ON diagram_datasets
  FOR UPDATE
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Users can remove datasets from diagrams they have access to
DROP POLICY IF EXISTS diagram_datasets_delete_policy ON diagram_datasets;
CREATE POLICY diagram_datasets_delete_policy ON diagram_datasets
  FOR DELETE
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- STEP 7: Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON diagrams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diagram_datasets TO authenticated;

-- =====================================================
-- STEP 8: Create helper functions
-- =====================================================

-- Function to get all datasets in a diagram
CREATE OR REPLACE FUNCTION get_diagram_datasets(p_diagram_id UUID)
RETURNS TABLE (
  dataset_id UUID,
  dataset_name VARCHAR,
  fully_qualified_name VARCHAR,
  location JSONB,
  is_expanded BOOLEAN,
  added_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.fully_qualified_name,
    dd.location,
    dd.is_expanded,
    dd.added_at
  FROM diagram_datasets dd
  JOIN datasets d ON d.id = dd.dataset_id
  WHERE dd.diagram_id = p_diagram_id
  ORDER BY dd.added_at;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_diagram_datasets IS 'Returns all datasets in a diagram with their locations';

-- Function to add dataset to diagram
CREATE OR REPLACE FUNCTION add_dataset_to_diagram(
  p_diagram_id UUID,
  p_dataset_id UUID,
  p_location JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO diagram_datasets (
    diagram_id,
    dataset_id,
    location,
    added_by
  ) VALUES (
    p_diagram_id,
    p_dataset_id,
    p_location,
    p_user_id
  )
  ON CONFLICT (diagram_id, dataset_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_dataset_to_diagram IS 'Adds a dataset to a diagram (idempotent)';

-- Function to remove dataset from diagram
CREATE OR REPLACE FUNCTION remove_dataset_from_diagram(
  p_diagram_id UUID,
  p_dataset_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM diagram_datasets
  WHERE diagram_id = p_diagram_id
    AND dataset_id = p_dataset_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_dataset_from_diagram IS 'Removes a dataset from a diagram';

-- =====================================================
-- STEP 9: Create view for diagram summary
-- =====================================================

CREATE OR REPLACE VIEW diagram_summary AS
SELECT
  d.id,
  d.account_id,
  d.workspace_id,
  d.name,
  d.description,
  d.diagram_type,
  d.visibility,
  d.owner_id,
  d.is_template,
  d.created_at,
  d.updated_at,
  COUNT(DISTINCT dd.dataset_id) AS dataset_count,
  ARRAY_AGG(DISTINCT d.tags) FILTER (WHERE d.tags IS NOT NULL) AS all_tags
FROM diagrams d
LEFT JOIN diagram_datasets dd ON dd.diagram_id = d.id
GROUP BY d.id, d.account_id, d.workspace_id, d.name, d.description,
         d.diagram_type, d.visibility, d.owner_id, d.is_template,
         d.created_at, d.updated_at;

COMMENT ON VIEW diagram_summary IS 'Summary view of diagrams with dataset counts';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify diagrams table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'diagrams'
  ) THEN
    RAISE NOTICE 'SUCCESS: diagrams table created';
  ELSE
    RAISE EXCEPTION 'FAILED: diagrams table not created';
  END IF;
END $$;

-- Verify diagram_datasets table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'diagram_datasets'
  ) THEN
    RAISE NOTICE 'SUCCESS: diagram_datasets table created';
  ELSE
    RAISE EXCEPTION 'FAILED: diagram_datasets table not created';
  END IF;
END $$;

-- Verify indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'diagrams'
    AND indexname IN ('idx_diagrams_workspace', 'idx_diagrams_account')
  ) THEN
    RAISE NOTICE 'SUCCESS: Diagram indexes created';
  END IF;
END $$;

-- =====================================================
-- SAMPLE QUERIES FOR REFERENCE
-- =====================================================

-- Get all diagrams for a workspace
-- SELECT * FROM diagrams WHERE workspace_id = 'workspace-uuid';

-- Get all datasets in a diagram
-- SELECT * FROM get_diagram_datasets('diagram-uuid');

-- Add dataset to diagram
-- SELECT add_dataset_to_diagram(
--   'diagram-uuid',
--   'dataset-uuid',
--   '{"x": 100, "y": 200}'::jsonb,  -- location
--   'user-uuid'
-- );

-- Get diagram summary
-- SELECT * FROM diagram_summary WHERE workspace_id = 'workspace-uuid';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
