-- Template Fragments Migration
-- This schema supports composable Jinja templates with decision tree logic

-- ============================================================================
-- TEMPLATE FRAGMENTS
-- ============================================================================

-- Template fragments (reusable template pieces)
CREATE TABLE public.template_fragments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'data_vault', 'data_mart', 'staging', 'landing', 'jobs', 'pipelines', 'custom'
  )),
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  fragment_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Variables this fragment uses
  dependencies JSONB DEFAULT '[]'::jsonb, -- IDs of fragments this depends on
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false, -- System templates (only editable in dev mode)
  cloned_from_id UUID REFERENCES public.template_fragments(id) ON DELETE SET NULL, -- Track clones
  github_path TEXT, -- Path in GitHub repo for workspace templates
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template compositions (decision tree for combining fragments)
CREATE TABLE public.template_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "process-staging-table"
  description TEXT,
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  flow_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- React Flow nodes and edges
  is_system_template BOOLEAN DEFAULT false, -- System templates (only editable in dev mode)
  cloned_from_id UUID REFERENCES public.template_compositions(id) ON DELETE SET NULL, -- Track clones
  github_path TEXT, -- Path in GitHub repo for workspace templates
  yaml_valid BOOLEAN DEFAULT true, -- YAML validation status
  yaml_errors JSONB DEFAULT '[]'::jsonb, -- Validation errors if any
  last_validated_at TIMESTAMPTZ, -- Last validation timestamp
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false
);

-- Template composition nodes (individual decision/fragment nodes in the flow)
CREATE TABLE public.template_composition_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- React Flow node ID
  node_type TEXT NOT NULL CHECK (node_type IN (
    'fragment', 'condition', 'start', 'end', 'merge'
  )),
  fragment_id UUID REFERENCES public.template_fragments(id) ON DELETE SET NULL,
  position JSONB NOT NULL DEFAULT '{}'::jsonb, -- {x, y} position
  data JSONB DEFAULT '{}'::jsonb, -- Node-specific data (conditions, labels, etc.)
  is_enabled BOOLEAN DEFAULT true, -- Toggle on/off
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (composition_id, node_id)
);

-- Template composition edges (connections between nodes)
CREATE TABLE public.template_composition_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL, -- React Flow edge ID
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  edge_type TEXT DEFAULT 'default',
  label TEXT,
  condition JSONB DEFAULT '{}'::jsonb, -- Condition for this edge to be followed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (composition_id, edge_id)
);

-- Template composition versions (for version history)
CREATE TABLE public.template_composition_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  flow_data JSONB NOT NULL,
  compiled_template TEXT, -- The compiled Jinja template result
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,
  UNIQUE (composition_id, version_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_template_fragments_workspace ON public.template_fragments(workspace_id);
CREATE INDEX idx_template_fragments_category ON public.template_fragments(category);
CREATE INDEX idx_template_fragments_public ON public.template_fragments(is_public) WHERE is_public = true;
CREATE INDEX idx_template_fragments_system ON public.template_fragments(is_system_template) WHERE is_system_template = true;
CREATE INDEX idx_template_fragments_cloned_from ON public.template_fragments(cloned_from_id);

CREATE INDEX idx_template_compositions_workspace ON public.template_compositions(workspace_id);
CREATE INDEX idx_template_compositions_archived ON public.template_compositions(is_archived);
CREATE INDEX idx_template_compositions_system ON public.template_compositions(is_system_template) WHERE is_system_template = true;
CREATE INDEX idx_template_compositions_cloned_from ON public.template_compositions(cloned_from_id);
CREATE INDEX idx_template_compositions_invalid ON public.template_compositions(yaml_valid) WHERE yaml_valid = false;

CREATE INDEX idx_composition_nodes_composition ON public.template_composition_nodes(composition_id);
CREATE INDEX idx_composition_nodes_fragment ON public.template_composition_nodes(fragment_id);

CREATE INDEX idx_composition_edges_composition ON public.template_composition_edges(composition_id);

CREATE INDEX idx_composition_versions_composition ON public.template_composition_versions(composition_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for template_fragments
CREATE TRIGGER update_template_fragments_updated_at
  BEFORE UPDATE ON public.template_fragments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for template_compositions
CREATE TRIGGER update_template_compositions_updated_at
  BEFORE UPDATE ON public.template_compositions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for template_composition_nodes
CREATE TRIGGER update_composition_nodes_updated_at
  BEFORE UPDATE ON public.template_composition_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.template_fragments IS 'Reusable Jinja template fragments that can be composed together';
COMMENT ON TABLE public.template_compositions IS 'Main template compositions (e.g., process-staging-table) with decision tree flow';
COMMENT ON TABLE public.template_composition_nodes IS 'Individual nodes in the template composition flow';
COMMENT ON TABLE public.template_composition_edges IS 'Connections between nodes in the template composition flow';
COMMENT ON TABLE public.template_composition_versions IS 'Version history for template compositions';

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user can edit template (dev mode required for system templates)
CREATE OR REPLACE FUNCTION public.can_edit_template_composition(
  composition_uuid UUID,
  user_uuid UUID,
  dev_mode_enabled BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  is_system BOOLEAN;
  workspace_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get composition info
  SELECT is_system_template, workspace_id INTO is_system, workspace_uuid
  FROM public.template_compositions
  WHERE id = composition_uuid;

  -- System templates require dev mode
  IF is_system AND NOT dev_mode_enabled THEN
    RETURN false;
  END IF;

  -- Check workspace permissions
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid;

  -- Admins and editors can edit workspace templates
  RETURN user_role IN ('owner', 'admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit template fragment
CREATE OR REPLACE FUNCTION public.can_edit_template_fragment(
  fragment_uuid UUID,
  user_uuid UUID,
  dev_mode_enabled BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  is_system BOOLEAN;
  workspace_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get fragment info
  SELECT is_system_template, workspace_id INTO is_system, workspace_uuid
  FROM public.template_fragments
  WHERE id = fragment_uuid;

  -- System templates require dev mode
  IF is_system AND NOT dev_mode_enabled THEN
    RETURN false;
  END IF;

  -- Check workspace permissions
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid;

  -- Admins and editors can edit workspace templates
  RETURN user_role IN ('owner', 'admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
