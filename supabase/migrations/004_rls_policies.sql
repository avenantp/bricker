-- ============================================================================
-- UROQ Database Schema - Row Level Security (RLS) Policies
-- Phase 1.2: Supabase Setup - Comprehensive RLS Policies
-- ============================================================================
-- These policies ensure users can only access data they're authorized to see

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uuid_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_composition_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_composition_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_composition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.databricks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view workspace member profiles"
  ON public.users
  FOR SELECT
  USING (
    id IN (
      SELECT user_id
      FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- WORKSPACES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view their workspaces"
  ON public.workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspaces"
  ON public.workspaces
  FOR UPDATE
  USING (
    id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- WORKSPACE MEMBERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (
    -- User is viewing members of a workspace they own
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- User is a member of this workspace (direct check, no recursion)
    user_id = auth.uid()
  );

CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is the workspace owner (check via workspaces table to avoid recursion)
    workspace_id IN (
      SELECT id
      FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
    OR
    -- Allow if user is already a workspace member with owner/admin role
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON public.workspace_members
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can remove members"
  ON public.workspace_members
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace projects"
  ON public.projects
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editors can update projects"
  ON public.projects
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Owners and admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- UUID REGISTRY & NODE STATE POLICIES
-- ============================================================================

CREATE POLICY "Users can view project UUIDs"
  ON public.uuid_registry
  FOR SELECT
  USING (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can create UUIDs"
  ON public.uuid_registry
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Editors can update UUIDs"
  ON public.uuid_registry
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can view node state"
  ON public.node_state
  FOR SELECT
  USING (
    node_uuid IN (
      SELECT uuid
      FROM public.uuid_registry
      WHERE project_id IN (
        SELECT id
        FROM public.projects
        WHERE workspace_id IN (
          SELECT workspace_id
          FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Editors can manage node state"
  ON public.node_state
  FOR ALL
  USING (
    node_uuid IN (
      SELECT uuid
      FROM public.uuid_registry
      WHERE project_id IN (
        SELECT id
        FROM public.projects
        WHERE workspace_id IN (
          SELECT workspace_id
          FROM public.workspace_members
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'editor')
        )
      )
    )
  );

-- ============================================================================
-- DATA MODELS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace models"
  ON public.data_models
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create models"
  ON public.data_models
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Editors can update models"
  ON public.data_models
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Owners and admins can delete models"
  ON public.data_models
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view model versions"
  ON public.model_versions
  FOR SELECT
  USING (
    model_id IN (
      SELECT id
      FROM public.data_models
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create model versions"
  ON public.model_versions
  FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id
      FROM public.data_models
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ============================================================================
-- TEMPLATES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view templates"
  ON public.templates
  FOR SELECT
  USING (
    is_public = true
    OR is_system = true
    OR workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create templates"
  ON public.templates
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own templates"
  ON public.templates
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.templates
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- TEMPLATE FRAGMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view template fragments"
  ON public.template_fragments
  FOR SELECT
  USING (
    is_public = true
    OR is_system_template = true
    OR workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create fragments"
  ON public.template_fragments
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own fragments"
  ON public.template_fragments
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own fragments"
  ON public.template_fragments
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================================
-- TEMPLATE COMPOSITIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view compositions"
  ON public.template_compositions
  FOR SELECT
  USING (
    is_system_template = true
    OR workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create compositions"
  ON public.template_compositions
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own compositions"
  ON public.template_compositions
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own compositions"
  ON public.template_compositions
  FOR DELETE
  USING (created_by = auth.uid());

-- Composition nodes and edges inherit from parent composition
CREATE POLICY "Users can view composition nodes"
  ON public.template_composition_nodes
  FOR ALL
  USING (
    composition_id IN (
      SELECT id
      FROM public.template_compositions
      WHERE is_system_template = true
        OR workspace_id IN (
          SELECT workspace_id
          FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view composition edges"
  ON public.template_composition_edges
  FOR ALL
  USING (
    composition_id IN (
      SELECT id
      FROM public.template_compositions
      WHERE is_system_template = true
        OR workspace_id IN (
          SELECT workspace_id
          FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can view composition versions"
  ON public.template_composition_versions
  FOR SELECT
  USING (
    composition_id IN (
      SELECT id
      FROM public.template_compositions
      WHERE is_system_template = true
        OR workspace_id IN (
          SELECT workspace_id
          FROM public.workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Editors can create composition versions"
  ON public.template_composition_versions
  FOR INSERT
  WITH CHECK (
    composition_id IN (
      SELECT id
      FROM public.template_compositions
      WHERE workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- ============================================================================
-- MACROS TABLE POLICIES (All macros are public)
-- ============================================================================

CREATE POLICY "All users can view macros"
  ON public.macros
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create macros"
  ON public.macros
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update own macros"
  ON public.macros
  FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can delete own macros"
  ON public.macros
  FOR DELETE
  USING (created_by_user_id = auth.uid());

-- ============================================================================
-- CONNECTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace connections"
  ON public.connections
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create connections"
  ON public.connections
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editors can update connections"
  ON public.connections
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Owners and admins can delete connections"
  ON public.connections
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- DATABRICKS CONNECTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view databricks connections"
  ON public.databricks_connections
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create databricks connections"
  ON public.databricks_connections
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Editors can update databricks connections"
  ON public.databricks_connections
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Owners and admins can delete databricks connections"
  ON public.databricks_connections
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- CONFIGURATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace configurations"
  ON public.configurations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create configurations"
  ON public.configurations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Editors can update configurations"
  ON public.configurations
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Owners and admins can delete configurations"
  ON public.configurations
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- SCRIPT GENERATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace script generations"
  ON public.script_generations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create script generations"
  ON public.script_generations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own script generations"
  ON public.script_generations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own script generations"
  ON public.script_generations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- CONVERSATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view workspace conversations"
  ON public.conversations
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own conversations"
  ON public.conversations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON public.conversations
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view conversation messages"
  ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id
      FROM public.conversations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id
      FROM public.conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Workspace admins can view workspace audit logs
CREATE POLICY "Admins can view workspace audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
